// Evio Airlines — SFX (synthesized at runtime, no asset files).
// Kept deliberately quiet and short: a soft UI tap, a stamp thunk, the
// departure-board's tick as the destination rolls, a warm two-note chime
// when it lands, a spoken "final boarding call for [destination]" PA
// announcement right after (via the browser's built-in text-to-speech —
// there's no recorded voice asset here, so quality follows whatever voice
// the device has), and a quick "swoosh" when the text-bubble screen sends.
// Needs a user gesture first — Kiosk's "Check In" tap unlocks the
// AudioContext, same pattern as any browser autoplay-restricted audio.

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
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

// A short, soft burst of filtered noise — the split-flap "tick".
function tick(ctx, t0, gain = 0.05, hp = 1800) {
  const len = Math.floor(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hpf = ctx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(hpf);
  hpf.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
}

export const Sound = {
  unlock() {
    const c = audioCtx();
    return !!c;
  },
  // iOS Safari ties speech synthesis to a user gesture far more strictly than
  // WebAudio: a speak() call made later from a setTimeout (like the real
  // announcement, which fires after the destination roll finishes) can
  // silently do nothing unless the engine was already "primed" by a speak()
  // call made directly inside a real tap. This does that priming with an
  // inaudible utterance, right when Check In is tapped.
  unlockSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  },
  // soft UI confirmation — Check In / Continue
  tap(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    tone(c, 880, c.currentTime, 0.05, 0.045, "sine");
  },
  // the passport stamp — a low, short thunk
  stamp(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    tone(c, 150, t, 0.16, 0.13, "sine");
    tick(c, t, 0.07, 1200);
  },
  // one departure-board flip, played on every roll step
  flip(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    tick(c, c.currentTime, 0.045);
  },
  // destination lands — a warm, brief two-note chime (no fanfare)
  chime(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    tone(c, 784, t, 0.24, 0.08, "triangle");
    tone(c, 1047, t + 0.12, 0.32, 0.07, "triangle");
  },
  // the text bubble sending — a quick rising "swoosh", echoing iMessage's own
  // sent sound without literally sampling it.
  messageSent(on) {
    if (!on) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(1400, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + 0.18);
  },
  // the PA announcement after a destination lands — spoken via the browser's
  // built-in text-to-speech, since this needs actual words, not a tone.
  announce(text) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // never let two announcements overlap
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  },
  stopAnnouncement() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
  },
};

// Audio must never break the experience — wrap every method so a WebAudio
// error (suspended context, unsupported browser) can't throw into the caller.
Object.keys(Sound).forEach((k) => {
  const fn = Sound[k];
  Sound[k] = (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      if (!Sound._warned) {
        Sound._warned = true;
        try {
          console.warn("[evio] audio disabled (error in Sound." + k + "):", e && e.message);
        } catch (e2) {}
      }
    }
  };
});
