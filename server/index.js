// Golden Egg Rebuy — WebSocket relay + static host + AUTHORITATIVE game engine.
//
// The relay is the single source of truth for the game (the board, which eggs are
// golden, what's opened, the current phase, and the reveal timeline). Every Display
// is a pure renderer: it connects, instantly receives the full state, and renders
// it — so any number of Display machines stay perfectly in sync (same golden eggs,
// same opened history, same reveal at the same time, and late-joiners catch up).
//
// Flow:
//   Admin → POST /cmd { arm | reveal | close | reset | sound }   (also accepted over WS)
//   relay  mutates the canonical game state, runs the reveal timeline, and
//   relay → broadcasts { t:"state", ... } to every connected client (Displays + Admin)
//
// Displays play audio and run the staged suspense animation locally off the state
// transitions they observe (audio must come from the screen on the room's speakers).

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, "..", "web", "dist");
const STATE_FILE = path.join(os.tmpdir(), "golden-egg-state.json");

const TOTAL_EGGS = 50;
const GOLDEN_COUNT = 5;
const BUYIN = 590;
const REVEAL_MS = 3150; // staged suspense length before the result
const HOLD_GOLDEN_MS = 10000; // how long the golden fanfare holds before auto-return
const HOLD_MISS_MS = 6000; // how long the miss screen holds before auto-return

// ── canonical game state ──
function freshBoard() {
  const golden = new Set();
  while (golden.size < GOLDEN_COUNT) golden.add(1 + Math.floor(Math.random() * TOTAL_EGGS));
  return Array.from({ length: TOTAL_EGGS }, (_, i) => ({
    n: i + 1,
    isGolden: golden.has(i + 1),
    status: "available", // available | miss | golden
  }));
}

let game = {
  eggs: freshBoard(),
  phase: "browse", // browse | armed | revealing | result
  selected: null,
  result: null, // golden | miss
  sound: true,
  runId: 0, // bumps each reveal so clients re-trigger animations/count-up
};
let revealTimer = null;
let holdTimer = null;

// ── persistence (survives a process restart within a deploy) ──
function saveState() {
  try {
    fs.writeFile(STATE_FILE, JSON.stringify(game), () => {});
  } catch (e) {}
}
function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const g = JSON.parse(raw);
    if (g && Array.isArray(g.eggs) && g.eggs.length === TOTAL_EGGS) {
      // resume the board, but never resume mid-reveal — settle to a stable view
      game = {
        eggs: g.eggs,
        phase: g.phase === "armed" ? "browse" : g.phase === "revealing" ? "browse" : g.phase || "browse",
        selected: g.phase === "result" ? g.selected : null,
        result: g.phase === "result" ? g.result : null,
        sound: typeof g.sound === "boolean" ? g.sound : true,
        runId: g.runId || 0,
      };
    }
  } catch (e) {
    /* no saved state — keep the fresh board */
  }
}
loadState();

// ── state snapshot + broadcast ──
function snapshot() {
  const goldRemaining = Math.max(0, GOLDEN_COUNT - game.eggs.filter((e) => e.status === "golden").length);
  const claimed = game.eggs.filter((e) => e.status !== "available").length;
  return {
    t: "state",
    eggs: game.eggs,
    phase: game.phase,
    selected: game.selected,
    result: game.result,
    sound: game.sound,
    runId: game.runId,
    goldRemaining,
    claimed,
    displays: countDisplays(),
    total: TOTAL_EGGS,
    goldenCount: GOLDEN_COUNT,
    buyin: BUYIN,
  };
}
function broadcastState() {
  const str = JSON.stringify(snapshot());
  wss.clients.forEach((c) => {
    if (c.readyState === 1) {
      try {
        c.send(str);
      } catch (e) {}
    }
  });
}

// ── game actions ──
function clearGameTimers() {
  if (revealTimer) clearTimeout(revealTimer);
  if (holdTimer) clearTimeout(holdTimer);
  revealTimer = null;
  holdTimer = null;
}

function arm(n) {
  if (!Number.isInteger(n)) return;
  clearGameTimers();
  game.selected = n;
  game.phase = "armed";
  game.result = null;
  saveState();
  broadcastState();
}

function reveal(n, force) {
  const egg = game.eggs.find((e) => e.n === n);
  if (!egg) return;
  let isGold = egg.isGolden;
  if (force === "golden") isGold = true;
  if (force === "miss") isGold = false;
  const goldLeft = GOLDEN_COUNT - game.eggs.filter((e) => e.status === "golden").length;
  if (isGold && goldLeft <= 0 && force !== "golden") isGold = false;

  clearGameTimers();
  game.selected = n;
  game.phase = "revealing";
  game.result = null;
  game.runId += 1;
  broadcastState(); // displays start the staged suspense + audio off this

  revealTimer = setTimeout(() => {
    revealTimer = null;
    const e = game.eggs.find((x) => x.n === n);
    if (e) {
      e.status = isGold ? "golden" : "miss";
      e.isGolden = isGold || e.isGolden;
    }
    game.phase = "result";
    game.result = isGold ? "golden" : "miss";
    game.runId += 1;
    saveState();
    broadcastState();

    // auto-return to the board so the room sees the full board again
    holdTimer = setTimeout(() => {
      holdTimer = null;
      closeBoard();
    }, isGold ? HOLD_GOLDEN_MS : HOLD_MISS_MS);
  }, REVEAL_MS);
}

function closeBoard() {
  clearGameTimers();
  game.phase = "browse";
  game.selected = null;
  game.result = null;
  saveState();
  broadcastState();
}

function resetBoard() {
  clearGameTimers();
  game.eggs = freshBoard();
  game.phase = "browse";
  game.selected = null;
  game.result = null;
  game.runId += 1;
  saveState();
  broadcastState();
}

function setSound(on) {
  game.sound = !!on;
  saveState();
  broadcastState();
}

// Import an exact board (e.g. migrate the in-progress state off an old Display's
// localStorage). Replaces the relay's board and settles to the browse view.
function loadBoardCmd(eggs) {
  if (!Array.isArray(eggs) || eggs.length !== TOTAL_EGGS) return;
  const ok = eggs.every(
    (e) =>
      e &&
      Number.isInteger(e.n) &&
      e.n >= 1 &&
      e.n <= TOTAL_EGGS &&
      ["available", "golden", "miss"].includes(e.status)
  );
  if (!ok) return;
  clearGameTimers();
  game.eggs = eggs
    .slice()
    .sort((a, b) => a.n - b.n)
    .map((e) => ({ n: e.n, isGolden: !!e.isGolden, status: e.status }));
  game.phase = "browse";
  game.selected = null;
  game.result = null;
  game.runId += 1;
  saveState();
  broadcastState();
}

function handleCommand(msg) {
  if (!msg || !msg.t) return;
  switch (msg.t) {
    case "arm":
      arm(msg.n);
      break;
    case "reveal":
      reveal(msg.n, msg.force);
      break;
    case "close":
      closeBoard();
      break;
    case "reset":
      resetBoard();
      break;
    case "sound":
      setSound(msg.on);
      break;
    case "load":
      loadBoardCmd(msg.eggs);
      break;
    case "hello":
      broadcastState();
      break;
    default:
      break;
  }
}

// ── static file server ──
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function sendFile(fp, res) {
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(fp).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    if (fp.includes(`${path.sep}assets${path.sep}`)) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    } else if (ext === ".html") {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

const hasDist = fs.existsSync(path.join(DIST, "index.html"));

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  if (urlPath === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method === "OPTIONS" && urlPath === "/cmd") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  // Operator command channel over HTTP POST (reliable; immune to half-open sockets).
  if (req.method === "POST" && urlPath === "/cmd") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 100000) req.destroy();
    });
    req.on("end", () => {
      let msg;
      try {
        msg = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end('{"ok":false,"error":"bad json"}');
        return;
      }
      if (msg && msg.t && msg.t !== "ping") handleCommand(msg);
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end('{"ok":true}');
    });
    return;
  }

  if (!hasDist) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Web app not built yet. Run `npm run build` in golden-egg/web.");
    return;
  }

  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(DIST, safe);
  if (candidate.startsWith(DIST)) {
    try {
      const st = fs.statSync(candidate);
      if (st.isFile()) return sendFile(candidate, res);
    } catch (e) {
      /* fall through to SPA index */
    }
  }
  sendFile(path.join(DIST, "index.html"), res);
});

// ── WebSocket: deliver state, accept commands, track Displays ──
const wss = new WebSocketServer({ server, path: "/ws" });

function countDisplays() {
  let n = 0;
  wss.clients.forEach((c) => {
    if (c.role === "display" && c.readyState === 1) n++;
  });
  return n;
}

wss.on("connection", (ws, req) => {
  ws.isAlive = true;
  // role is tagged via the WS url query (?role=display|admin) so the Admin can show
  // whether a Display is actually open.
  try {
    const q = new URL(req.url, "http://x").searchParams.get("role");
    ws.role = q === "display" ? "display" : q === "admin" ? "admin" : "unknown";
  } catch (e) {
    ws.role = "unknown";
  }

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // Send the full current state immediately so the new client catches up.
  try {
    ws.send(JSON.stringify(snapshot()));
  } catch (e) {}
  // Let everyone know the display count changed (Admin "Display connected" chip).
  if (ws.role === "display") broadcastState();

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }
    if (!msg || !msg.t || msg.t === "ping") return; // ping = keepalive only
    handleCommand(msg); // commands also accepted over WS (Admin uses POST primarily)
  });

  ws.on("close", () => {
    if (ws.role === "display") broadcastState();
  });
});

// Drop dead sockets (Render/proxies can leave half-open connections).
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (e) {}
  });
}, 30000);
wss.on("close", () => clearInterval(heartbeat));

// App-level heartbeat so clients can detect a half-open socket and reconnect.
const PING = JSON.stringify({ t: "ping" });
const appPing = setInterval(() => {
  wss.clients.forEach((c) => {
    if (c.readyState === 1) {
      try {
        c.send(PING);
      } catch (e) {}
    }
  });
}, 6000);
wss.on("close", () => clearInterval(appPing));

server.listen(PORT, () => {
  console.log(`[golden-egg] listening on :${PORT}`);
  console.log(`[golden-egg]   Display  →  /display`);
  console.log(`[golden-egg]   Admin    →  /admin`);
  console.log(`[golden-egg]   WS relay →  /ws   (relay is the game source of truth)`);
  if (!hasDist) {
    console.log("[golden-egg] WARNING: web/dist not found — build the web app first.");
  }
});
