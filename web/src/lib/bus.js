// Golden Egg — cross-device sync bus (WebSocket).
//
// Replaces the prototype's BroadcastChannel/localStorage transport so the
// operator's phone and the venue big-screen can live on different machines.
// The message contract is unchanged and maps 1:1 onto relay events:
//   Admin → Display : { t:"arm", n }, { t:"reveal", n, force }, { t:"close" },
//                     { t:"reset" }, { t:"sound", on }, { t:"hello" }
//   Display → Admin : { t:"state", ... }  (full authoritative snapshot)
//
// The relay is a dumb rebroadcast hub; the Display remains the single source of
// truth for outcomes.
//
// RESILIENCE (matters for a live event on a phone over flaky Wi-Fi):
//   • Auto-reconnect with backoff; sends queue while down and flush on open.
//   • Keepalive: client sends { t:"ping" } every 8s so the connection (and any
//     NAT/proxy in between) stays warm and never idles out.
//   • Watchdog: the relay broadcasts { t:"ping" } every ~6s. If we go >14s
//     without ANY message, we treat the socket as half-open (TX alive but RX
//     dead — a common mobile failure) and force a fresh reconnect.
//   • Foreground reconnect: when a backgrounded tab becomes visible again we
//     drop the (likely zombie) socket and reconnect immediately.

const KEEPALIVE_MS = 8000;
const WATCHDOG_MS = 4000;
const RX_SILENCE_LIMIT_MS = 14000;

function resolveUrl() {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("relay") || import.meta.env.VITE_RELAY_URL;
  if (override) {
    if (/^wss?:\/\//.test(override)) return override;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${override.replace(/^\/+/, "")}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

// The HTTP command endpoint lives next to the WS endpoint: ws(s)://host/ws → http(s)://host/cmd
function cmdUrlFrom(wsUrl) {
  return wsUrl.replace(/^ws/, "http").replace(/\/ws(\?.*)?$/, "/cmd");
}

// makeBus(onMsg, { onOpen, onStatus, role }) → { send(msg), post(msg), close() }
export function makeBus(onMsg, { onOpen, onStatus, role } = {}) {
  const base = resolveUrl();
  const cmdUrl = cmdUrlFrom(base);
  // tag the connection role so the relay can report whether a Display is open
  const url = role ? base + (base.includes("?") ? "&" : "?") + "role=" + role : base;
  let ws = null;
  let closed = false;
  let retry = 0;
  let lastRecv = 0;
  const queue = [];

  const flush = () => {
    while (ws && ws.readyState === WebSocket.OPEN && queue.length) {
      try {
        ws.send(JSON.stringify(queue.shift()));
      } catch (e) {
        break;
      }
    }
  };

  const rawSend = (msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
        return true;
      } catch (e) {}
    }
    return false;
  };

  const schedule = () => {
    if (closed) return;
    retry = Math.min(retry + 1, 6);
    const delay = Math.min(500 * 2 ** (retry - 1), 8000); // 500ms → 8s
    setTimeout(connect, delay);
  };

  // Tear down the current socket WITHOUT triggering its onclose-scheduled
  // reconnect, then connect fresh. Used by the watchdog / visibility handler.
  const reconnectNow = () => {
    if (closed) return;
    if (ws) {
      try {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      } catch (e) {}
    }
    ws = null;
    connect();
  };

  function connect() {
    if (closed) return;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      schedule();
      return;
    }
    ws.onopen = () => {
      retry = 0;
      lastRecv = Date.now();
      if (onStatus) onStatus(true);
      if (onOpen) onOpen();
      flush();
    };
    ws.onmessage = (ev) => {
      lastRecv = Date.now();
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      if (data && data.t === "ping") return; // heartbeat — keep-alive only
      try {
        onMsg(data);
      } catch (e) {}
    };
    ws.onclose = () => {
      if (onStatus) onStatus(false);
      schedule();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch (e) {}
    };
  }

  connect();

  // Keepalive: tiny outbound frame keeps the path warm (prevents idle drops).
  const keepalive = setInterval(() => {
    rawSend({ t: "ping" });
  }, KEEPALIVE_MS);

  // Watchdog: detect a half-open socket (no inbound traffic) and force-reconnect.
  const watchdog = setInterval(() => {
    if (closed || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (Date.now() - lastRecv > RX_SILENCE_LIMIT_MS) {
      reconnectNow();
    }
  }, WATCHDOG_MS);

  // Mobile: a backgrounded tab often freezes its socket. Reconnect on return.
  const onVisible = () => {
    if (!closed && document.visibilityState === "visible") reconnectNow();
  };
  document.addEventListener("visibilitychange", onVisible);

  // Reliable command delivery over HTTP POST (one retry). Used by the Admin for
  // operator intents so a half-open WebSocket can never silently swallow a reveal.
  // Returns a Promise<boolean> indicating whether the relay accepted the command.
  const postCmd = async (msg) => {
    const opts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
      keepalive: true,
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(cmdUrl, opts);
        if (r.ok) return true;
      } catch (e) {}
    }
    return false;
  };

  return {
    send(msg) {
      if (!rawSend(msg)) queue.push(msg);
    },
    post(msg) {
      // Commands go over HTTP only (not the WS) so a half-open socket can't
      // swallow them and the Display never receives a duplicate intent.
      return postCmd(msg);
    },
    close() {
      closed = true;
      clearInterval(keepalive);
      clearInterval(watchdog);
      document.removeEventListener("visibilitychange", onVisible);
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
    },
  };
}
