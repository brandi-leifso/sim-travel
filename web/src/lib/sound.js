// Golden Egg Rebuy — WebAudio SFX (synthesized at runtime, no asset files).
// Needs a user gesture first: the Display's "Tap to go live" gate calls
// Sound.unlock() so every later remotely-driven reveal actually plays in the room.
// To swap in real SFX files, keep the same one-gesture-unlock pattern.

let _actx = null;
function audioCtx() {
  if (typeof window === "undefined") return null;
  if (!_actx) {
    try {
      _actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (_actx.state === "suspended") _actx.resume();
  return _actx;
}

function tone(ctx, freq, t0, dur, gain, type = "sine") {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(ctx, t0, dur, gain, freq, q) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
}

export const Sound = {
  unlock() {
    const c = audioCtx();
    return !!c;
  },
  pick(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    tone(c, 880, c.currentTime, 0.08, 0.12, "triangle");
  },
  lock(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    tone(c, 523, t, 0.1, 0.12, "triangle");
    tone(c, 784, t + 0.08, 0.14, 0.12, "triangle");
  },
  suspense(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    // low rising riser across the whole build-up (~2.9s)
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(340, t + 2.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.11, t + 2.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.05);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    o.connect(lp);
    lp.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + 3.1);
    // accelerating tension pulses (slow → fast) leading into the crack.
    // `gap` shrinks geometrically, so tp converges (~t+2.34) and would never
    // reach t+2.85 — guard on a minimum gap so the loop always terminates.
    let tp = t + 0.5,
      gap = 0.3;
    while (tp < t + 2.85 && gap > 0.04) {
      tone(c, 196, tp, 0.07, 0.05, "triangle");
      gap *= 0.86;
      tp += gap;
    }
  },
  tick(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    tone(c, 660, t, 0.06, 0.08, "square");
    tone(c, 990, t + 0.04, 0.06, 0.05, "square");
  },
  crackHit(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    noise(c, t, 0.09, 0.22, 4200, 1.2);
    tone(c, 120, t, 0.18, 0.16, "sine");
  },
  miss(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    noise(c, t, 0.12, 0.12, 2200, 1);
    tone(c, 392, t + 0.02, 0.22, 0.1, "sine");
    tone(c, 294, t + 0.14, 0.3, 0.1, "sine");
  },
  golden(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    noise(c, t, 0.06, 0.18, 5200, 1.4); // crack
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(c, f, t + 0.12 + i * 0.08, 0.4, 0.13, "triangle")
    ); // fanfare run
    tone(c, 1568, t + 0.55, 0.7, 0.1, "triangle"); // top
    tone(c, 2093, t + 0.6, 0.8, 0.05, "sine"); // shimmer
    for (let i = 0; i < 6; i++) noise(c, t + 0.7 + i * 0.09, 0.05, 0.08, 6000, 2); // coin sparkle
  },
};

// Audio must NEVER break the show. Wrap every Sound method so a WebAudio error
// (a quirky browser, a suspended context, an unsupported node) can't abort the
// caller — e.g. the reveal, which plays a sound *before* scheduling its timers.
// Warn once so the underlying cause is still visible in dev.
Object.keys(Sound).forEach((k) => {
  const fn = Sound[k];
  Sound[k] = (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      if (!Sound._warned) {
        Sound._warned = true;
        try {
          console.warn("[golden-egg] audio disabled (error in Sound." + k + "):", e && e.message);
        } catch (e2) {}
      }
    }
  };
});
