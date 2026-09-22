import { useEffect, useRef } from "react";

// Keeps the kiosk iPad from auto-locking between guests. Not supported on older
// iOS Safari (<16.4) — fails silently there. Re-acquired on visibility change
// because the OS releases the lock whenever the tab is backgrounded.
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
