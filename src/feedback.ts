/**
 * Sounds and vibration. Sounds are synthesised with Web Audio, so there are no audio files to load.
 *
 * Vibration: Android uses navigator.vibrate. iPhone: see the note above `vibrate` below.
 */
import type { Rarity } from './cards';
import { isIOS } from './platform';

let enabled = { sound: true, haptics: true };
export function configureFeedback(opts: { sound: boolean; haptics: boolean }) {
  enabled = opts;
}

// ---------- Sound ----------

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!enabled.sound) return null;
  try {
    if (!ctx) {
      // "ambient" mixes with her music or game and respects the iPhone's silent switch.
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'ambient';
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state !== 'running') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  { freq, to, start = 0, dur = 0.15, type = 'sine', gain = 0.18 }:
    { freq: number; to?: number; start?: number; dur?: number; type?: OscillatorType; gain?: number },
) {
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(ac: AudioContext, { start = 0, dur = 0.3, from = 800, to = 3000, gain = 0.12 } = {}) {
  const t = ac.currentTime + start;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t);
}

const bubble = (ac: AudioContext, start = 0, base = 500) =>
  tone(ac, { freq: base, to: base * 2.2, start, dur: 0.09, gain: 0.14 });

/**
 * A cue is one sound plus a vibration rhythm built from the same timings, so what she hears and what
 * she feels can't drift apart. Each beat is [start ms, length ms]. Vibration rhythms play on phones
 * with navigator.vibrate (Android); iPhone gets its tick from the tap itself (see Haptic.tsx).
 */
export type Beat = [number, number];

function cue(beats: Beat[], play: (ac: AudioContext) => void) {
  const ac = audio();
  if (ac) play(ac);
  playBeats(beats);
}

const notes = (freqs: number[], step: number, beat = 18): Beat[] => freqs.map((_, i) => [i * step, beat]);

export const fx = {
  /** A single bubble pop: any button. */
  tap() {
    cue([[0, 12]], (ac) => bubble(ac, 0, 520 + Math.random() * 120));
  },
  /** The hook drops: a whoosh, a splash, three bubbles. */
  hookDrop() {
    cue([[0, 25], [300, 45], [450, 12], [550, 12], [680, 12]], (ac) => {
      tone(ac, { freq: 900, to: 180, dur: 0.35, type: 'triangle', gain: 0.12 });
      noise(ac, { start: 0.3, dur: 0.35, from: 2500, to: 400, gain: 0.1 });
      [0.45, 0.55, 0.68].forEach((s, i) => bubble(ac, s, 420 + i * 90));
    });
  },
  /** The card flips over, then its rarity chime: more notes and more beats the rarer it is. */
  reveal(rarity: Rarity) {
    const chord: Record<Rarity, number[]> = {
      common: [659],
      uncommon: [587, 880],
      rare: [523, 659, 784, 1047],
      legendary: [523, 659, 784, 1047, 1319, 1568],
    };
    const fizz = rarity === 'legendary' ? Array.from({ length: 10 }, (_, i) => 0.5 + i * 0.07) : [];
    const beats: Beat[] = [[0, 15], ...notes(chord[rarity], 90).map(([t, d]): Beat => [t + 120, d]), ...fizz.map((t): Beat => [t * 1000 + 120, 10])];
    cue(beats, (ac) => {
      noise(ac, { dur: 0.22, from: 600, to: 4000, gain: 0.09 });
      chord[rarity].forEach((f, i) => tone(ac, { freq: f, start: 0.12 + i * 0.09, dur: 0.5, type: 'triangle', gain: 0.13 }));
      fizz.forEach((t) => bubble(ac, t + 0.12, 600 + Math.random() * 600));
      if (rarity === 'legendary') tone(ac, { freq: 2093, start: 0.67, dur: 1.2, gain: 0.05 });
    });
  },
  /** Quest done: two rising notes. */
  done() {
    cue([[0, 18], [80, 25]], (ac) => {
      tone(ac, { freq: 784, dur: 0.12, type: 'triangle' });
      tone(ac, { freq: 1175, start: 0.08, dur: 0.25, type: 'triangle' });
    });
  },
  /** Timer finished: two bells. */
  timerEnd() {
    cue([[0, 60], [250, 60]], (ac) => {
      [0, 0.25].forEach((s) => tone(ac, { freq: 1047, start: s, dur: 0.4, type: 'sine', gain: 0.16 }));
    });
  },
  /** The line snaps and the tuna swims free: a twang, a happy arpeggio, then a stream of bubbles. */
  celebrate() {
    const arpeggio = [523, 659, 784, 1047, 1319];
    const bubbles = Array.from({ length: 6 }, (_, i) => 0.6 + i * 0.09);
    const beats: Beat[] = [[0, 40], ...arpeggio.map((_, i): Beat => [150 + i * 80, 15]), ...bubbles.map((t): Beat => [t * 1000, 10])];
    cue(beats, (ac) => {
      tone(ac, { freq: 1800, to: 300, dur: 0.12, type: 'square', gain: 0.05 });
      arpeggio.forEach((f, i) => tone(ac, { freq: f, start: 0.15 + i * 0.08, dur: 0.35, type: 'triangle', gain: 0.12 }));
      bubbles.forEach((t, i) => bubble(ac, t, 450 + i * 80));
    });
  },
  /** Coins clinking into the chest. */
  coins() {
    const clinks = [0, 70, 150, 260];
    cue(clinks.map((ms): Beat => [ms, 12]), (ac) => {
      clinks.forEach((ms, i) => {
        tone(ac, { freq: 2400 + i * 260, start: ms / 1000, dur: 0.09, type: 'triangle', gain: 0.07 });
        tone(ac, { freq: 3600 + i * 300, start: ms / 1000 + 0.01, dur: 0.06, type: 'sine', gain: 0.04 });
      });
    });
  },
  /** Soft and low, for the snag screen. */
  gentle() {
    cue([[0, 10], [200, 10]], (ac) => {
      tone(ac, { freq: 392, dur: 0.5, gain: 0.08 });
      tone(ac, { freq: 523, start: 0.2, dur: 0.6, gain: 0.07 });
    });
  },
  /** Petting the tuna: a soft blub that climbs a little with every tap in a row. */
  pet(streak: number) {
    cue([[0, 8]], (ac) => {
      const base = 380 + Math.min(streak, 6) * 45;
      tone(ac, { freq: base, to: base * 1.6, dur: 0.12, gain: 0.1 });
      tone(ac, { freq: 90, dur: 0.18, type: 'triangle', gain: 0.06 });
    });
  },
  /** The tuna tells a joke: a giggle of quick bubbles. */
  giggle() {
    const at = [0, 0.08, 0.16, 0.24, 0.32];
    cue(at.map((s): Beat => [s * 1000, 10]), (ac) => at.forEach((s, i) => bubble(ac, s, 600 + (i % 2) * 180 + i * 40)));
  },
  /** Dodge the hooks: a bubble caught. Climbs a little with every one in a row. Too frequent to vibrate. */
  catchBubble(streak: number) {
    cue([], (ac) => bubble(ac, 0, 460 + Math.min(streak, 12) * 35));
  },
  /** Dodge the hooks: a hook nicked the tuna. A soft bonk, not an alarm. */
  nick() {
    cue([[0, 40]], (ac) => {
      tone(ac, { freq: 240, to: 120, dur: 0.18, type: 'triangle', gain: 0.1 });
      noise(ac, { dur: 0.12, from: 900, to: 300, gain: 0.05 });
    });
  },
  /** ...or a joke it really shouldn't have: dun, dun, DUNNN. */
  ominous() {
    cue([[0, 120], [300, 120], [650, 400]], (ac) => {
      tone(ac, { freq: 98, dur: 0.25, type: 'sawtooth', gain: 0.06 });
      tone(ac, { freq: 92.5, start: 0.3, dur: 0.25, type: 'sawtooth', gain: 0.06 });
      tone(ac, { freq: 87.3, start: 0.65, dur: 1.3, type: 'sawtooth', gain: 0.06 });
      tone(ac, { freq: 123.5, start: 0.65, dur: 1.3, type: 'sawtooth', gain: 0.045 });
      tone(ac, { freq: 43.7, start: 0.65, dur: 1.5, gain: 0.14 });
    });
  },
};

// ---------- Vibration ----------

/**
 * iPhone Safari has no vibration API. A native `<input type="checkbox" switch>` gives a system haptic
 * when the user toggles it, but since iOS 26.5 only a real finger tap counts (flipping one from code
 * no longer vibrates). So on iPhone, tappable buttons carry an invisible switch under the finger
 * (see components/Haptic.tsx), and the vibration half of each cue does nothing there.
 */
export const usesTapSwitchHaptics = () => isIOS() && typeof navigator.vibrate !== 'function';

/** Turn [start, length] beats into a navigator.vibrate on/off pattern. */
export function beatsToPattern(beats: Beat[]): number[] {
  const pattern: number[] = [];
  let cursor = 0;
  for (const [at, len] of [...beats].sort((a, b) => a[0] - b[0])) {
    const gap = Math.max(0, Math.round(at - cursor));
    if (pattern.length === 0) {
      if (gap > 0) pattern.push(0, gap);
    } else pattern.push(gap);
    pattern.push(len);
    cursor = Math.max(cursor, at) + len;
  }
  return pattern;
}

function playBeats(beats: Beat[]) {
  if (!beats.length || !enabled.haptics || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(beatsToPattern(beats));
}
