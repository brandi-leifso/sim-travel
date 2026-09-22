// Evio Airlines — check-in kiosk. A single self-guided flow on one iPad:
// Home (attract) → Passport Selection → Destination Reveal → Continue loops
// back to Home for the next guest. No server round-trip, no second device —
// the whole thing runs client-side in this one tab.
import { useEffect, useRef, useState } from "react";
import { DESTINATIONS, PASSPORT_COUNT, pickDestination, randomFlightDetails } from "../lib/constants.js";
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

export default function Kiosk() {
  const [screen, setScreen] = useState("home"); // home | select | reveal
  const [stampedIndex, setStampedIndex] = useState(null);
  const [destination, setDestination] = useState(null);
  const [rollText, setRollText] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [flight, setFlight] = useState(null);
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
    const finalDestination = pickDestination();
    timers.current.push(
      setTimeout(() => {
        setDestination(finalDestination);
        setRollText(pickDestination()); // avoids a blank first frame
        setFlight(randomFlightDetails());
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
        return;
      }
      const decoy = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
      setRollText(decoy);
      Sound.flip(true);
      delay *= ROLL_GROWTH;
      timers.current.push(setTimeout(tick, delay));
    };
    timers.current.push(setTimeout(tick, delay));
    return clearTimers; // eslint-disable-line react-hooks/exhaustive-deps
  }, [screen, destination]);

  const startOver = () => {
    Sound.tap(true);
    Sound.stopAnnouncement();
    clearTimers();
    setDestination(null);
    setRollText(null);
    setFlight(null);
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

      {screen === "home" && (
        <div className="ek-screen ek-home">
          <EvioMark size={60} style={{ animationDelay: "0s" }} className="ek-in" />
          <div className="ek-kicker ek-in" style={{ animationDelay: "0.08s" }}>
            <Plane size={22} className="ek-kicker-plane" />
            Now Boarding
          </div>
          <div className="ek-route ek-in" style={{ animationDelay: "0.14s" }} aria-hidden="true">
            <span className="ek-route-line" />
            <Plane size={16} className="ek-route-plane" />
          </div>
          <p className="ek-body ek-in" style={{ animationDelay: "0.2s" }}>
            Choose your passport to reveal your destination.
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
          <div className="ek-kicker ek-in">Check-In Complete</div>
          <div className="ek-next ek-in" style={{ animationDelay: "0.06s" }}>
            Next Stop:
          </div>
          <h1 className={"ek-destination" + (rolling ? " is-rolling" : "")} key={rollKey.current}>
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
          <p className={"ek-body" + (rolling ? " is-hidden" : "")}>You're flight-ready.</p>
          <div className={"ek-baggage" + (rolling ? " is-hidden" : "")}>
            Head to Baggage Drop
            <span className="ek-baggage-arrow" aria-hidden="true">
              →
            </span>
          </div>
          <div className={"ek-tagline" + (rolling ? " is-hidden" : "")}>Less Stress. More Travel.</div>
          <button
            className={"ek-btn ek-btn-invert ek-btn-quiet" + (rolling ? " is-hidden" : "")}
            onClick={startOver}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
