import { useState, useEffect, useRef } from "react";

// Keeps the screen from auto-locking while this tab is open (the operator's phone
// between egg calls, or the room's TV). Not supported on older iOS Safari (<16.4) —
// fails silently there, same as before this hook existed. Re-acquired on visibility
// change because the OS releases the lock whenever the tab is backgrounded.
export function useWakeLock(enabled = true) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
      } catch (e) {
        // e.g. battery saver mode or hidden document — safe to ignore
      }
    };

    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !lockRef.current) acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (lockRef.current) {
        lockRef.current.release().catch(() => {});
        lockRef.current = null;
      }
    };
  }, [enabled]);
}

// Count-up hook (timer-backed so it settles even if rAF is throttled).
export function useCountUp(target, runId, { delay = 500, duration = 1100 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf, t0;
    setVal(0);
    const start = () => {
      const tick = (now) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / duration);
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setVal(Math.round(target * e));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const to = setTimeout(start, delay);
    const done = setTimeout(() => setVal(target), delay + duration + 80);
    return () => {
      clearTimeout(to);
      clearTimeout(done);
      cancelAnimationFrame(raf);
    };
  }, [target, runId, delay, duration]);
  return val;
}
