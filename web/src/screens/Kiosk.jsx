// Evio Airlines — check-in kiosk. A single self-guided flow on one iPad:
// Home (attract) → Passport Selection → Destination Reveal → Continue loops
// back to Home for the next guest. No server round-trip, no second device —
// the whole thing runs client-side in this one tab.
import { useEffect, useRef, useState } from "react";
import { PASSPORT_COUNT, pickDestination, pickNextDestination, randomFlightDetails } from "../lib/constants.js";
import { useWakeLock } from "../lib/hooks.js";
import { Sound } from "../lib/sound.js";
import EvioMark from "../components/EvioMark.jsx";
import Plane from "../components/Plane.jsx";
import "../styles/kiosk.css";

// How long the tapped passport holds its stamp before the reveal transition.
const STAMP_MS = 480;
// The departure-board roll before landing on the real destination: each step
// waits longer than the last, so it starts fast and settles like it's slowing
// down to a stop.
const ROLL_STEPS = 7;
const ROLL_START_MS = 70;
const ROLL_GROWTH = 1.35;
// How long the destination stays on screen alone before the reveal gives way
// to the closing "go to the scale" end state.
const CLOSING_DELAY_MS = 3200;
// The text bubble under "Baggage Drop" types itself out at this pace, after
// a short pause once the headline lands.
const TYPE_TEXT = "ILY, text me when you land.";
const TYPE_START_DELAY_MS = 500;
const TYPE_CHAR_MS = 55;

export default function Kiosk() {
  const [screen, setScreen] = useState("home"); // home | select | reveal
  const [stampedIndex, setStampedIndex] = useState(null);
  const [destination, setDestination] = useState(null);
  const [rollText, setRollText] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [flight, setFlight] = useState(null);
  const [revealPhase, setRevealPhase] = useState("destination"); // destination | closing
  const [typedText, setTypedText] = useState("");
  const rollKey = useRef(0);
  const timers = useRef([]);

  useWakeLock(true);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const enterFullscreen = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try {
      const pr = req.call(el);
      if (pr && pr.catch) pr.catch(() => {});
    } catch (e) {}
  };

  const checkIn = () => {
    Sound.unlock();
    Sound.unlockSpeech();
    Sound.tap(true);
    enterFullscreen();
    setScreen("select");
  };

  // Tap a passport → it stamps in place for a beat, then the reveal screen
  // opens on a departure-board roll that lands on the real destination.
  const choosePassport = (n) => {
    if (stampedIndex != null) return;
    setStampedIndex(n);
    Sound.stamp(true);
    Sound.unlockSpeech(); // re-prime — this tap is closer to when the announcement fires
    const finalDestination = pickNextDestination();
    timers.current.push(
      setTimeout(() => {
        setDestination(finalDestination);
        setRollText(pickDestination(finalDestination)); // avoids a blank first frame
        setFlight(randomFlightDetails());
        setRevealPhase("destination");
        setScreen("reveal");
        setStampedIndex(null);
      }, STAMP_MS)
    );
  };

  // Roll through a few random destinations, slowing down, before settling on
  // the real pick — the "sense of anticipation" moment.
  useEffect(() => {
    if (screen !== "reveal" || !destination) return;
    setRolling(true);
    let step = 0;
    let delay = ROLL_START_MS;
    let lastDecoy = null;
    const tick = () => {
      step += 1;
      rollKey.current += 1;
      if (step >= ROLL_STEPS) {
        setRollText(destination);
        setRolling(false);
        Sound.chime(true);
        timers.current.push(
          setTimeout(() => Sound.announce(`Final boarding call for ${destination}.`), 450)
        );
        timers.current.push(setTimeout(() => setRevealPhase("closing"), CLOSING_DELAY_MS));
        return;
      }
      const decoy = pickDestination(lastDecoy);
      lastDecoy = decoy;
      setRollText(decoy);
      Sound.flip(true);
      delay *= ROLL_GROWTH;
      timers.current.push(setTimeout(tick, delay));
    };
    timers.current.push(setTimeout(tick, delay));
    return clearTimers; // eslint-disable-line react-hooks/exhaustive-deps
  }, [screen, destination]);

  // Types the text bubble out character by character once the closing state
  // opens, then plays the "sent" swoosh.
  useEffect(() => {
    if (revealPhase !== "closing") {
      setTypedText("");
      return;
    }
    let i = 0;
    const step = () => {
      i += 1;
      setTypedText(TYPE_TEXT.slice(0, i));
      if (i < TYPE_TEXT.length) {
        timers.current.push(setTimeout(step, TYPE_CHAR_MS));
      } else {
        Sound.messageSent(true);
      }
    };
    timers.current.push(setTimeout(step, TYPE_START_DELAY_MS));
  }, [revealPhase]);

  const startOver = () => {
    Sound.tap(true);
    Sound.stopAnnouncement();
    clearTimers();
    setDestination(null);
    setRollText(null);
    setFlight(null);
    setRevealPhase("destination");
    setScreen("home");
  };

  return (
    <div className={"ek-root ek-" + screen}>
      <div className="ek-sky" aria-hidden="true">
        <span className="ek-cloud ek-cloud-a" />
        <span className="ek-cloud ek-cloud-b" />
        <span className="ek-cloud ek-cloud-c" />
        <span className="ek-cloud ek-cloud-d" />
      </div>

      {/* Persistent small brand mark, fixed top-center on every screen. */}
      <div className="ek-brand" aria-hidden="true">
        <EvioMark size={33} />
      </div>

      {screen === "home" && (
        <div className="ek-screen ek-home">
          <div className="ek-kicker ek-in" style={{ animationDelay: "0.08s" }}>
            <Plane size={28} className="ek-kicker-plane" />
            Now Boarding
          </div>
          <div className="ek-route ek-in" style={{ animationDelay: "0.14s" }} aria-hidden="true">
            <span className="ek-route-line" />
            <Plane size={22} className="ek-route-plane" />
          </div>
          <p className="ek-body ek-in" style={{ animationDelay: "0.2s" }}>
            Choose a passport to reveal your destination.
          </p>
          <button className="ek-btn ek-in" style={{ animationDelay: "0.28s" }} onClick={checkIn}>
            Check In
          </button>
        </div>
      )}

      {screen === "select" && (
        <div className="ek-screen ek-select">
          <div className="ek-kicker ek-in">Select Your Passport</div>
          <p className="ek-body ek-in" style={{ animationDelay: "0.06s" }}>
            Choose one to check in.
          </p>
          <div className="ek-passports">
            {Array.from({ length: PASSPORT_COUNT }, (_, i) => i + 1).map((n, i) => (
              <button
                key={n}
                className={"ek-passport ek-in" + (stampedIndex === n ? " is-stamped" : "")}
                style={{ animationDelay: 0.12 + i * 0.07 + "s" }}
                disabled={stampedIndex != null}
                onClick={() => choosePassport(n)}
              >
                <Plane size={22} />
                <span className="ek-passport-rule" aria-hidden="true" />
                Passport {String(n).padStart(2, "0")}
                <span className="ek-stamp" aria-hidden="true">
                  <span className="ek-stamp-ring">✓</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "reveal" && (
        <div className="ek-screen ek-reveal">
          <div className="ek-kicker ek-in">Check-In Complete.</div>

          {revealPhase === "destination" && (
            <>
              <div className="ek-next ek-in" style={{ animationDelay: "0.06s" }}>
                Next Stop:
              </div>
              <h1
                className={"ek-destination" + (rolling ? " is-rolling" : "")}
                key={rollKey.current}
              >
                {rollText}
              </h1>
              {flight && (
                <div className={"ek-ticket" + (rolling ? " is-hidden" : "")}>
                  <span>Gate {String(flight.gate).padStart(2, "0")}</span>
                  <span className="ek-ticket-dot">·</span>
                  <span>Seat {flight.seat}</span>
                  <span className="ek-ticket-dot">·</span>
                  <span>Flight {flight.flight}</span>
                </div>
              )}
            </>
          )}

          {/* The iPad part is over — a deliberately distinct end state, not
              more content stacked under the destination. Nothing here is
              interactive; the only live control is the corner reset below.
              Mirrors the "Next Stop: [destination]" reveal's own big-type
              energy, then the text bubble types itself out underneath —
              the one warm beat, folded into this same screen instead of a
              separate page. */}
          {revealPhase === "closing" && (
            <div className="ek-end" aria-hidden="true">
              <div className="ek-next ek-in">Next Step:</div>
              <h2 className="ek-end-headline ek-in">Baggage Drop</h2>
              <div className="ek-bubble-row ek-in" style={{ animationDelay: "0.15s" }}>
                <div className="ek-bubble-mono">
                  {typedText}
                  <span className="ek-caret" />
                </div>
              </div>
            </div>
          )}

          {revealPhase !== "destination" && (
            <button className="ek-corner-reset" onClick={startOver} aria-label="Reset for next guest">
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
