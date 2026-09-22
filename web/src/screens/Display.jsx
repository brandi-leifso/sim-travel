// Golden Egg Rebuy — PUBLIC DISPLAY (pure renderer).
// The relay is the single source of truth: it owns the board, the golden eggs, the
// phase, and the reveal timeline, and broadcasts { t:"state", ... } to every client.
// This screen just renders the latest state — so any number of Display machines stay
// in sync, and a Display opened mid-event instantly catches up. Audio and the staged
// suspense animation are run locally (off the state transitions it observes) because
// the sound must come from the screen on the room's speakers.
import { useState, useEffect, useRef } from "react";
import { TOTAL_EGGS, GOLDEN_COUNT, BUYIN, money } from "../lib/constants.js";
import { Sound } from "../lib/sound.js";
import { useCountUp, useWakeLock } from "../lib/hooks.js";
import { makeBus } from "../lib/bus.js";
import Foil from "../components/Foil.jsx";
import Egg from "../components/Egg.jsx";
import Confetti from "../components/Confetti.jsx";
import CoinShower from "../components/CoinShower.jsx";
import Rays from "../components/Rays.jsx";
import VClubMark from "../components/VClubMark.jsx";
import "../styles/rebuy.css";

const PLACEHOLDER_BOARD = Array.from({ length: TOTAL_EGGS }, (_, i) => ({
  n: i + 1,
  isGolden: false,
  status: "available",
}));

export default function Display() {
  const [eggs, setEggs] = useState(PLACEHOLDER_BOARD);
  const [phase, setPhase] = useState("browse"); // browse | armed | revealing | result
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null); // golden | miss
  const [runId, setRunId] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  const [sound, setSound] = useState(true);
  const [shake, setShake] = useState(false);
  const [live, setLive] = useState(false); // attract gate; first tap unlocks audio
  const [isFs, setIsFs] = useState(false);

  const stageTimers = useRef([]);
  const busRef = useRef(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const prev = useRef({ phase: null, runId: -1 }); // for transition detection

  const goldFound = eggs.filter((e) => e.status === "golden").length;
  const goldRemaining = Math.max(0, GOLDEN_COUNT - goldFound);
  const claimed = eggs.filter((e) => e.status !== "available").length;

  const clearStageTimers = () => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
  };

  const cash = useCountUp(result === "golden" ? BUYIN : 0, runId, { delay: 700, duration: 1000 });

  // ── adopt authoritative state from the relay ──
  useEffect(() => {
    const bus = makeBus(
      (m) => {
        if (!m || m.t !== "state") return;
        if (Array.isArray(m.eggs)) setEggs(m.eggs);
        if (m.phase) setPhase(m.phase);
        setSelected(m.selected == null ? null : m.selected);
        setResult(m.result == null ? null : m.result);
        if (typeof m.sound === "boolean") setSound(m.sound);
        if (typeof m.runId === "number") setRunId(m.runId);
      },
      { role: "display", onOpen: () => bus.send({ t: "hello" }) }
    );
    busRef.current = bus;
    return () => {
      clearStageTimers();
      bus.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── play audio + run the staged suspense off state transitions ──
  useEffect(() => {
    const p = prev.current;
    const firstState = p.phase === null; // don't fire audio on the initial catch-up
    const on = soundRef.current;

    if (phase === "armed" && p.phase !== "armed") {
      if (!firstState) Sound.lock(on);
    }

    if (phase === "revealing" && runId !== p.runId) {
      clearStageTimers();
      setRevealStage(0);
      if (firstState) {
        // joined mid-reveal — show a tense mid-stage rather than restarting it
        setRevealStage(2);
      } else {
        Sound.suspense(on);
        stageTimers.current.push(
          setTimeout(() => {
            setRevealStage(1);
            Sound.tick(soundRef.current);
          }, 900)
        );
        stageTimers.current.push(
          setTimeout(() => {
            setRevealStage(2);
            Sound.tick(soundRef.current);
          }, 1900)
        );
        stageTimers.current.push(
          setTimeout(() => {
            setRevealStage(3);
            Sound.crackHit(soundRef.current);
          }, 2900)
        );
      }
    }

    if (phase === "result" && p.phase !== "result") {
      clearStageTimers();
      if (!firstState) {
        if (result === "golden") {
          Sound.golden(on);
          setShake(true);
          stageTimers.current.push(setTimeout(() => setShake(false), 700));
        } else if (result === "miss") {
          Sound.miss(on);
        }
      }
    }

    if (phase === "browse" || phase === "armed") clearStageTimers();

    prev.current = { phase, runId };
  }, [phase, runId, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const selEgg = eggs.find((e) => e.n === selected);

  // ── full screen (the big screen should fill the room) ──
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const enterFullscreen = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try {
      const pr = req.call(el);
      if (pr && pr.catch) pr.catch(() => {});
    } catch (e) {}
  };
  const exitFullscreen = () => {
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (!ex || !fsElement()) return;
    try {
      const pr = ex.call(document);
      if (pr && pr.catch) pr.catch(() => {});
    } catch (e) {}
  };
  const toggleFullscreen = () => (fsElement() ? exitFullscreen() : enterFullscreen());

  useEffect(() => {
    const onFsChange = () => setIsFs(!!fsElement());
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    const onKey = (e) => {
      if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goLive = () => {
    Sound.unlock();
    Sound.lock(true);
    enterFullscreen(); // the gate tap is the user gesture the Fullscreen API requires
    setLive(true);
  };

  // Keep the room TV from going to sleep once the show has started.
  useWakeLock(live);

  return (
    <div className={"ge-root ge-display" + (shake ? " ge-shake" : "")}>
      <div className="ge-bg-glow" />
      <div className="ge-bg-grain" />

      <header className="ge-head">
        <div className="ge-head-l">
          <VClubMark height={34} />
          <div className="ge-head-titles">
            <div className="ge-kicker">Spring Series · Main Event Day 1B</div>
            <h1 className="ge-title">
              <Foil>Golden Egg</Foil> Rebuy
            </h1>
          </div>
        </div>
        <div className="ge-head-r">
          <div className="ge-counter">
            <div className="ge-counter-eggs">
              {Array.from({ length: GOLDEN_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={"ge-mini-egg" + (i < goldRemaining ? " is-live" : " is-found")}
                />
              ))}
            </div>
            <div className="ge-counter-text">
              <strong>{goldRemaining}</strong> of {GOLDEN_COUNT} golden eggs left
            </div>
          </div>
        </div>
      </header>

      <div className="ge-instruction">
        Call your egg to the floor — crack a <span className="ge-gold-word">golden egg</span> and your
        entire
        <strong> {money(BUYIN)}</strong> buy-in is credited back. Free rebuy.
      </div>

      <div className="ge-grid">
        {eggs.map((e) => (
          <Egg
            key={e.n}
            n={e.n}
            variant={
              e.status === "available" ? "available" : e.status === "golden" ? "golden" : "miss"
            }
            style={{ animationDelay: (e.n % 10) * 0.03 + Math.floor(e.n / 10) * 0.04 + "s" }}
          />
        ))}
      </div>

      <footer className="ge-foot">
        <span>
          {claimed} of {TOTAL_EGGS} eggs opened
        </span>
        <span className="ge-foot-dot">·</span>
        <span>Good luck, and run good in the Main Event.</span>
      </footer>

      {/* ── Full-screen toggle (subtle; hidden during the reveal & fanfare) ── */}
      {live && phase !== "revealing" && phase !== "result" && (
        <button
          className="ge-fs-btn"
          onClick={toggleFullscreen}
          aria-label={isFs ? "Exit full screen" : "Enter full screen"}
          title={isFs ? "Exit full screen (F)" : "Full screen (F)"}
        >
          {isFs ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          )}
        </button>
      )}

      {/* ── Attract gate: one tap unlocks audio + full screen and starts the show ── */}
      {!live && (
        <div className="ge-modal ge-startgate" onClick={goLive} role="button" tabIndex={0}>
          <div className="ge-startgate-rays" />
          <div className="ge-startgate-inner">
            <VClubMark height={48} />
            <div className="ge-startgate-kicker">Spring Series · Main Event Day 1B</div>
            <h1 className="ge-startgate-title">
              <Foil>Golden Egg</Foil> Rebuy
            </h1>
            <div className="ge-startgate-egg">
              <Egg n={"?"} variant="hero" big />
            </div>
            <button className="ge-btn ge-btn-gold ge-startgate-btn" onClick={goLive}>
              Tap to go live
            </button>
            <div className="ge-startgate-note">
              enables sound &amp; full screen · keep this screen on the room
            </div>
          </div>
        </div>
      )}

      {/* ── Armed: locked in, holding for the reveal ── */}
      {phase === "armed" && selEgg && (
        <div className="ge-modal ge-modal-dark">
          <div className="ge-armed">
            <div className="ge-armed-aura" />
            <div className="ge-armed-egg">
              <Egg n={selEgg.n} variant="hero" big />
            </div>
            <div className="ge-armed-kicker">Locked in</div>
            <div className="ge-armed-num">Egg #{selEgg.n}</div>
            <div className="ge-armed-sub">All eyes on the egg — the floor is cracking it open.</div>
          </div>
        </div>
      )}

      {/* ── Revealing: staged suspense ── */}
      {phase === "revealing" && selEgg && (
        <div className="ge-modal ge-modal-dark ge-reveal-modal" data-stage={revealStage}>
          <div className="ge-reveal-flash" />
          <div className="ge-reveal">
            <div className="ge-reveal-aura" />
            <div className={"ge-reveal-egg ge-reveal-s" + revealStage}>
              <Egg n={selEgg.n} variant="hero" big />
            </div>
            <div className="ge-reveal-kicker">Egg #{selEgg.n}</div>
            <div className="ge-reveal-text">
              {revealStage === 0 && "Here we go…"}
              {revealStage === 1 && "Hold your breath…"}
              {revealStage === 2 && "Cracking it open…"}
              {revealStage >= 3 && " "}
            </div>
            <div className="ge-reveal-bar">
              <i />
            </div>
          </div>
        </div>
      )}

      {/* ── Result: MISS ── */}
      {phase === "result" && result === "miss" && selEgg && (
        <div className="ge-modal ge-modal-dark">
          <div className="ge-miss">
            <div className="ge-miss-egg-shape">
              <Egg n={selEgg.n} variant="miss" big />
            </div>
            <div className="ge-miss-title">Not this time</div>
            <div className="ge-miss-sub">
              Egg #{selEgg.n} wasn't golden. Still {goldRemaining} out there — get 'em next rebuy.
            </div>
          </div>
        </div>
      )}

      {/* ── Result: GOLDEN fanfare ── */}
      {phase === "result" && result === "golden" && selEgg && (
        <div className="ge-modal ge-golden">
          <Rays />
          <Confetti runId={runId} count={90} />
          <CoinShower runId={runId} count={30} />
          <div className="ge-golden-inner">
            <div className="ge-golden-egg">
              <Egg n={selEgg.n} variant="golden" big />
            </div>
            <div className="ge-golden-kicker">Egg #{selEgg.n} cracked open</div>
            <h2 className="ge-golden-title">
              <Foil className="ge-shimmer">GOLDEN EGG!</Foil>
            </h2>
            <div className="ge-golden-refund">
              <div className="ge-golden-refund-cap">Buy-in refunded</div>
              <div className="ge-golden-refund-amt">
                <Foil className="ge-shimmer">{money(cash)}</Foil>
              </div>
              <div className="ge-golden-refund-sub">
                credited back — this rebuy is on the house
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
