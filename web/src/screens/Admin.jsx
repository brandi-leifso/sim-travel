// Golden Egg Rebuy — ADMIN PICKER (floor control).
// The operator's screen. The player calls a number verbally; the operator taps it
// here (or types it), which ARMS that egg on the public Display(s). A deliberate
// second press — REVEAL — triggers the staged suspense + outcome.
// The relay is the source of truth: this screen mirrors the relay's broadcast state
// and sends intents (arm/reveal/close/reset/sound) over the reliable HTTP channel.
import { useState, useEffect, useRef } from "react";
import { TOTAL_EGGS, GOLDEN_COUNT, BUYIN, money } from "../lib/constants.js";
import { makeBus } from "../lib/bus.js";
import { useWakeLock } from "../lib/hooks.js";
import Foil from "../components/Foil.jsx";
import VClubMark from "../components/VClubMark.jsx";
import "../styles/admin.css";

const PLACEHOLDER_BOARD = Array.from({ length: TOTAL_EGGS }, (_, i) => ({
  n: i + 1,
  isGolden: false,
  status: "available",
}));

export default function Admin() {
  const [eggs, setEggs] = useState(PLACEHOLDER_BOARD);
  const [phase, setPhase] = useState("browse");
  const [armedN, setArmedN] = useState(null);
  const [result, setResult] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [force, setForce] = useState("auto");
  const [entry, setEntry] = useState("");
  const [connected, setConnected] = useState(false); // a Display is open

  const busRef = useRef(null);
  const handlerRef = useRef(null);

  // The operator only taps this screen once per rebuy call — keep the phone awake
  // in between so it doesn't lock and go dark on them.
  useWakeLock(true);

  handlerRef.current = (m) => {
    if (!m || m.t !== "state") return;
    setConnected((m.displays || 0) > 0); // "connected" = at least one Display open
    if (Array.isArray(m.eggs)) setEggs(m.eggs);
    if (m.phase) setPhase(m.phase);
    setArmedN(m.selected == null ? null : m.selected);
    setResult(m.result == null ? null : m.result);
    if (typeof m.sound === "boolean") setSoundOn(m.sound);
  };

  useEffect(() => {
    const bus = makeBus((m) => handlerRef.current && handlerRef.current(m), {
      role: "admin",
      onOpen: () => bus.post({ t: "hello" }), // ask the relay for current state
      onStatus: (open) => {
        if (!open) setConnected(false);
      },
    });
    busRef.current = bus;
    bus.post({ t: "hello" });
    return () => bus.close();
  }, []);

  // Operator intents go over the reliable HTTP command channel, not the WS.
  const send = (msg) => busRef.current && busRef.current.post(msg);
  const eggByN = (n) => eggs.find((e) => e.n === n);
  const isAvailable = (n) => {
    const e = eggByN(n);
    return !!e && e.status === "available";
  };

  const goldRemaining = Math.max(0, GOLDEN_COUNT - eggs.filter((e) => e.status === "golden").length);
  const claimed = eggs.filter((e) => e.status !== "available").length;

  const busy = phase === "revealing";
  const armed = phase === "armed";
  const showingResult = phase === "result";

  // Optimistic UI: update instantly on each action and command the relay, which
  // broadcasts authoritative state back to reconcile us (and every Display).
  const arm = (n) => {
    if (!isAvailable(n) || busy) return;
    setEntry("");
    setArmedN(n);
    setResult(null);
    setPhase("armed");
    send({ t: "arm", n });
  };

  const doReveal = () => {
    if (!armed || armedN == null) return;
    const n = armedN;
    const f = force;
    // Optimistic: flip to "revealing" instantly so the operator gets immediate
    // feedback and the button disables itself — otherwise, on a slow connection
    // the button stays "Reveal egg #N" until state round-trips back, and repeated
    // taps re-send (and restart) the reveal.
    setPhase("revealing");
    const p = send({ t: "reveal", n, force: f });
    if (p && p.then) p.then((ok) => { if (!ok) setPhase("armed"); }); // revert if delivery failed
  };
  const back = () => {
    setPhase("browse");
    setArmedN(null);
    setResult(null);
    send({ t: "close" });
  };
  const toggleSound = () => {
    setSoundOn((s) => !s);
    send({ t: "sound", on: !soundOn });
  };
  const resetBoard = () => {
    if (!window.confirm("Reset the board? Every egg goes back to unopened.")) return;
    setPhase("browse");
    setArmedN(null);
    setResult(null);
    send({ t: "reset" }); // relay reseeds the board and broadcasts to all screens
  };

  // physical keyboard: type a number, Enter to arm; Enter again to reveal
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.tagName === "INPUT") return;
      if (/^[0-9]$/.test(e.key)) {
        setEntry((s) => (s + e.key).slice(0, 2));
      } else if (e.key === "Backspace") {
        setEntry((s) => s.slice(0, -1));
      } else if (e.key === "Enter") {
        if (entry) {
          arm(parseInt(entry, 10));
        } else if (armed) {
          doReveal();
        } else if (showingResult) {
          back();
        }
      } else if (e.key === "Escape") {
        setEntry("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const entryN = entry ? parseInt(entry, 10) : null;
  const entryValid = entryN != null && isAvailable(entryN);

  // stage labels
  let label = "Ready",
    sub = "Tap the egg the player called — or type the number.";
  if (entry && !armed) {
    label = "Type → Enter";
    sub = entryValid
      ? `Egg #${entryN} is open — press Enter or tap to arm.`
      : `Egg #${entryN} isn't available.`;
  }
  if (armed) {
    label = "Armed";
    sub = "Confirm with the table, then reveal.";
  }
  if (busy) {
    label = "Revealing…";
    sub = "Cracking it open on the big screen.";
  }
  if (showingResult && result === "golden") {
    label = "Golden Egg!";
    sub = `${money(BUYIN)} refunded on the display.`;
  }
  if (showingResult && result === "miss") {
    label = "No win";
    sub = "Not this one. Back to the board when ready.";
  }

  const bigPick = armed || busy || showingResult ? armedN : entry ? entryN : null;

  return (
    <div className="ad-root">
      <div className="ad-panel">
        <div className="ad-top">
          <div className="ad-brand">
            <VClubMark height={26} />
            <div className="ad-brand-tt">
              <div className="ad-brand-k">Floor Control</div>
              <div className="ad-brand-t">
                <Foil>Golden Egg</Foil> Rebuy
              </div>
            </div>
          </div>
          <div className={"ad-conn" + (connected ? " is-on" : "")}>
            <span className="dot" />
            {connected ? "Display connected" : "Open the Display screen"}
          </div>
        </div>

        <div className="ad-stats">
          <div>
            <strong>{goldRemaining}</strong>
            <span>gold left</span>
          </div>
          <div>
            <strong>{claimed}</strong>
            <span>opened</span>
          </div>
          <div>
            <strong>{TOTAL_EGGS - claimed}</strong>
            <span>available</span>
          </div>
        </div>

        <div className="ad-stage" data-phase={phase} data-result={result || ""}>
          <div className="ad-stage-label">{label}</div>
          <div className={"ad-pick" + (bigPick == null ? " is-empty" : "")}>
            {bigPick == null ? "—" : "#" + bigPick}
          </div>
          <div className="ad-stage-sub">{sub}</div>

          <div className="ad-actions">
            {armed && (
              <>
                <button className="ad-btn ad-btn-gold ad-reveal" onClick={doReveal}>
                  Reveal egg #{armedN}
                </button>
                <button className="ad-btn ad-btn-ghost" onClick={back}>
                  Cancel
                </button>
              </>
            )}
            {busy && (
              <button className="ad-btn ad-btn-gold" disabled>
                Revealing on display…
              </button>
            )}
            {showingResult && (
              <button className="ad-btn ad-btn-gold" onClick={back}>
                Back to board
              </button>
            )}
            {phase === "browse" && (
              <button
                className="ad-btn ad-btn-gold"
                disabled={!entryValid}
                onClick={() => entryValid && arm(entryN)}
              >
                {entryValid ? `Arm egg #${entryN}` : "Pick a number to arm"}
              </button>
            )}
          </div>
        </div>

        <div className="ad-force">
          <span className="ad-force-label">Outcome</span>
          <div className="ad-seg">
            {[
              ["auto", "Auto"],
              ["golden", "Force golden"],
              ["miss", "Force miss"],
            ].map(([v, l]) => (
              <button key={v} data-on={force === v} disabled={busy} onClick={() => setForce(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="ad-gridwrap">
          <div className="ad-gridhead">
            <span>Pick an egg</span>
            <span className="ad-gridhead-hint">{entry ? `Typing: ${entry}` : "tap or type 1–50"}</span>
          </div>
          <div className="ad-grid">
            {eggs.map((e) => (
              <button
                key={e.n}
                className={
                  "ad-egg ad-" +
                  e.status +
                  (armedN === e.n && phase !== "browse" ? " is-armed" : "") +
                  (entryN === e.n && phase === "browse" ? " is-typed" : "")
                }
                disabled={e.status !== "available" || busy}
                onClick={() => arm(e.n)}
              >
                <span className="ad-egg-n">{e.n}</span>
                {e.status === "golden" && <span className="ad-egg-mark">★</span>}
                {e.status === "miss" && <span className="ad-egg-mark ad-egg-x">✕</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="ad-foot">
          <button className="ad-toggle" data-on={soundOn} onClick={toggleSound}>
            <span className="dot" />
            Sound {soundOn ? "on" : "off"}
          </button>
          <button className="ad-btn ad-btn-ghost ad-reset" onClick={resetBoard}>
            Reset board
          </button>
        </div>
      </div>
    </div>
  );
}
