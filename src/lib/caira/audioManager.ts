// audioManager.ts — Caira's state sounds, synthesised entirely with the Web Audio
// API (no files, no packages). Framework-agnostic: no React here.
//
// Design: soft, round, clay-toy tones. Quiet by default (peak gains well below 0.25)
// — Caira is a background presence, not a notification system. Every export is wrapped
// in try/catch: audio must NEVER crash the app or surface an error to the user. Some
// browsers block AudioContext entirely; in that case everything is a silent no-op.

let ctx: AudioContext | null = null;
let thinkingGain: GainNode | null = null;
let thinkingOsc: OscillatorNode | null = null;
let thinkingActive = false;
let muted = false;

// Lazily create (and resume) the AudioContext. Created only on first call — i.e. the
// first user interaction — satisfying mobile autoplay rules. SSR-safe.
function getContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type NoteOpts = {
  attack?: number;
  release?: number;
  filterFreq?: number;
  filterQ?: number;
  oscType?: OscillatorType;
  startAt?: number; // absolute ctx time; defaults to now
};

// Schedule one enveloped note. Returns the time the note finishes.
function playNote(frequency: number, sustain: number, peakGain: number, opts: NoteOpts = {}): number {
  const c = getContext();
  if (!c) return 0;
  const attack = opts.attack ?? 0.012;
  const release = opts.release ?? 0.12;
  const start = opts.startAt ?? c.currentTime;

  const osc = c.createOscillator();
  osc.type = opts.oscType ?? "sine";
  osc.frequency.setValueAtTime(frequency, start);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + attack);
  gain.gain.setValueAtTime(peakGain, start + attack + sustain);
  gain.gain.linearRampToValueAtTime(0, start + attack + sustain + release);

  // oscillator → [filter] → gain → destination
  let node: AudioNode = osc;
  if (opts.filterFreq) {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(opts.filterFreq, start);
    filter.Q.setValueAtTime(opts.filterQ ?? 0.8, start);
    osc.connect(filter);
    node = filter;
  }
  node.connect(gain);
  gain.connect(c.destination);

  const end = start + attack + sustain + release;
  osc.start(start);
  osc.stop(end + 0.02);
  return end;
}

type SeqNote = { freq: number; duration: number; gain: number };

// Play notes back-to-back with a gap between them. Shared envelope/filter opts apply
// to every note in the sequence.
function playSequence(notes: SeqNote[], gapSeconds: number, opts: NoteOpts = {}): void {
  const c = getContext();
  if (!c) return;
  let t = c.currentTime;
  for (const n of notes) {
    const end = playNote(n.freq, n.duration, n.gain, { ...opts, startAt: t });
    t = end + gapSeconds;
  }
}

// ─── Exported sounds ─────────────────────────────────────────────────────────

export function playWave(): void {
  if (muted) return;
  try {
    playSequence(
      [
        { freq: 523, duration: 0.18, gain: 0.14 },
        { freq: 659, duration: 0.18, gain: 0.14 },
      ],
      0.08,
      { attack: 0.015, release: 0.12, filterFreq: 900, filterQ: 0.8 },
    );
  } catch (err) {
    console.error("Caira audio (wave) failed:", err);
  }
}

export function startThinking(): void {
  if (muted || thinkingActive) return;
  try {
    const c = getContext();
    if (!c) return;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(196, c.currentTime);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, c.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    thinkingOsc = osc;
    thinkingGain = gain;
    thinkingActive = true;
  } catch (err) {
    console.error("Caira audio (thinking) failed:", err);
  }
}

export function stopThinking(): void {
  if (!thinkingActive) return;
  try {
    const c = getContext();
    if (c && thinkingGain) {
      thinkingGain.gain.cancelScheduledValues(c.currentTime);
      thinkingGain.gain.setValueAtTime(thinkingGain.gain.value, c.currentTime);
      thinkingGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
    }
    setTimeout(() => {
      try {
        thinkingOsc?.stop();
      } catch {
        /* already stopped */
      }
      thinkingOsc = null;
      thinkingGain = null;
      thinkingActive = false;
    }, 450);
  } catch (err) {
    console.error("Caira audio (stopThinking) failed:", err);
    thinkingOsc = null;
    thinkingGain = null;
    thinkingActive = false;
  }
}

export function playExcited(): void {
  if (muted) return;
  try {
    playSequence(
      [
        { freq: 523, duration: 0.12, gain: 0.16 },
        { freq: 659, duration: 0.12, gain: 0.16 },
        { freq: 784, duration: 0.12, gain: 0.16 },
      ],
      0.05,
      { attack: 0.01, release: 0.08, filterFreq: 1100, filterQ: 0.7 },
    );
  } catch (err) {
    console.error("Caira audio (excited) failed:", err);
  }
}

export function playError(): void {
  if (muted) return;
  try {
    playSequence(
      [
        { freq: 440, duration: 0.22, gain: 0.11 },
        { freq: 330, duration: 0.22, gain: 0.11 },
      ],
      0.07,
      { attack: 0.01, release: 0.18, filterFreq: 550, filterQ: 1.2 },
    );
  } catch (err) {
    console.error("Caira audio (error) failed:", err);
  }
}

export function playRecordStart(): void {
  if (muted) return;
  try {
    const c = getContext();
    if (!c) return;
    const start = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, start);
    osc.frequency.exponentialRampToValueAtTime(440, start + 0.18);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.008);
    gain.gain.linearRampToValueAtTime(0, start + 0.18);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  } catch (err) {
    console.error("Caira audio (recordStart) failed:", err);
  }
}

export function playRecordStop(): void {
  if (muted) return;
  try {
    const c = getContext();
    if (!c) return;
    const start = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, start);
    osc.frequency.exponentialRampToValueAtTime(349, start + 0.45);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(700, start);
    filter.Q.setValueAtTime(0.9, start);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.01);
    gain.gain.setValueAtTime(0.13, start + 0.4);
    gain.gain.linearRampToValueAtTime(0, start + 0.55);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.57);
  } catch (err) {
    console.error("Caira audio (recordStop) failed:", err);
  }
}

export function playSleep(): void {
  if (muted) return;
  try {
    const c = getContext();
    if (!c) return;
    const start = c.currentTime;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, start);
    filter.Q.setValueAtTime(2.0, start);
    const env = c.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(1, start + 0.4);
    env.gain.setValueAtTime(1, start + 0.9);
    env.gain.linearRampToValueAtTime(0, start + 1.5);
    filter.connect(env);
    env.connect(c.destination);

    for (const [freq, peak] of [
      [90, 0.028],
      [95, 0.018],
    ] as const) {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      const g = c.createGain();
      g.gain.setValueAtTime(peak, start);
      osc.connect(g);
      g.connect(filter);
      osc.start(start);
      osc.stop(start + 1.55);
    }
  } catch (err) {
    console.error("Caira audio (sleep) failed:", err);
  }
}

export function playIdle(): void {
  if (muted) return;
  try {
    const c = getContext();
    if (!c) return;
    const start = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, start);
    osc.frequency.exponentialRampToValueAtTime(370, start + 0.25);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(750, start);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.07, start + 0.01);
    gain.gain.linearRampToValueAtTime(0, start + 0.3);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.32);
  } catch (err) {
    console.error("Caira audio (idle) failed:", err);
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  if (value && thinkingActive) stopThinking();
}

export function isMuted(): boolean {
  return muted;
}
