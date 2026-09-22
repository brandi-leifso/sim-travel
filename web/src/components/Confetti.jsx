import { useMemo } from "react";
import { G } from "../lib/constants.js";

// Confetti burst — re-seeded whenever runId changes.
export default function Confetti({ runId, count = 70 }) {
  const cols = [G.goldBright, G.gold, G.goldPale, "#FFFFFF", G.goldDeep, "#E8C97A"];
  const parts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: 50 + (Math.random() - 0.5) * 90,
        x: (Math.random() - 0.5) * 520,
        y: 320 + Math.random() * 620,
        rot: Math.random() * 900 - 450,
        delay: Math.random() * 0.4,
        dur: 1.7 + Math.random() * 1.6,
        w: 7 + Math.random() * 8,
        h: 10 + Math.random() * 14,
        col: cols[i % cols.length],
      })),
    [count, runId] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <div className="ge-layer" aria-hidden="true">
      {parts.map((p, i) => (
        <span
          key={i}
          className="ge-confetti"
          style={{
            left: p.left + "%",
            width: p.w,
            height: p.h,
            background: p.col,
            "--x": p.x + "px",
            "--y": p.y + "px",
            "--rot": p.rot + "deg",
            animationDelay: p.delay + "s",
            animationDuration: p.dur + "s",
          }}
        />
      ))}
    </div>
  );
}
