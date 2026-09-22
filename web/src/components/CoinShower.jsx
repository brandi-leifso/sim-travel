import { useMemo } from "react";

// Gold coin shower — re-seeded whenever runId changes.
export default function CoinShower({ runId, count = 26 }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 1.8 + Math.random() * 1.4,
        size: 22 + Math.random() * 20,
        sway: (Math.random() - 0.5) * 80,
        spin: Math.random() > 0.5 ? 1 : -1,
      })),
    [count, runId]
  );
  return (
    <div className="ge-layer" aria-hidden="true">
      {parts.map((p, i) => (
        <span
          key={i}
          className="ge-coin"
          style={{
            left: p.left + "%",
            width: p.size,
            height: p.size,
            "--sway": p.sway + "px",
            "--spin": p.spin,
            animationDelay: p.delay + "s",
            animationDuration: p.dur + "s",
          }}
        >
          $
        </span>
      ))}
    </div>
  );
}
