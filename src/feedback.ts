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
    if (ctx.state === 'suspended') void ctx.resume();
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

export const sound = {
  tap() {
    const ac = audio();
    if (ac) bubble(ac, 0, 520 + Math.random() * 120);
  },
  hookDrop() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 900, to: 180, dur: 0.35, type: 'triangle', gain: 0.12 });
    noise(ac, { start: 0.3, dur: 0.35, from: 2500, to: 400, gain: 0.1 });
    [0.45, 0.55, 0.68].forEach((s, i) => bubble(ac, s, 420 + i * 90));
  },
  flip() {
    const ac = audio();
    if (ac) noise(ac, { dur: 0.22, from: 600, to: 4000, gain: 0.09 });
  },
  reveal(rarity: Rarity) {
    const ac = audio();
    if (!ac) return;
    const notes: Record<Rarity, number[]> = {
      common: [659],
      uncommon: [587, 880],
      rare: [523, 659, 784, 1047],
      legendary: [523, 659, 784, 1047, 1319, 1568],
    };
    notes[rarity].forEach((f, i) => tone(ac, { freq: f, start: i * 0.09, dur: 0.5, type: 'triangle', gain: 0.13 }));
    if (rarity === 'legendary') {
      for (let i = 0; i < 10; i++) bubble(ac, 0.5 + i * 0.07, 600 + Math.random() * 600);
      tone(ac, { freq: 2093, start: 0.55, dur: 1.2, gain: 0.05 });
    }
  },
  done() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 784, dur: 0.12, type: 'triangle' });
    tone(ac, { freq: 1175, start: 0.08, dur: 0.25, type: 'triangle' });
  },
  timerEnd() {
    const ac = audio();
    if (!ac) return;
    [0, 0.25].forEach((s) => tone(ac, { freq: 1047, start: s, dur: 0.4, type: 'sine', gain: 0.16 }));
  },
  celebrate() {
    const ac = audio();
    if (!ac) return;
    // The line snaps…
    tone(ac, { freq: 1800, to: 300, dur: 0.12, type: 'square', gain: 0.05 });
    // …and a happy arpeggio.
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(ac, { freq: f, start: 0.15 + i * 0.08, dur: 0.35, type: 'triangle', gain: 0.12 }),
    );
    for (let i = 0; i < 6; i++) bubble(ac, 0.6 + i * 0.09, 450 + i * 80);
  },
  gentle() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 392, dur: 0.5, gain: 0.08 });
    tone(ac, { freq: 523, start: 0.2, dur: 0.6, gain: 0.07 });
  },
};

// ---------- Vibration ----------

/**
 * iPhone Safari has no vibration API. A native `<input type="checkbox" switch>` gives a system haptic
 * when the user toggles it, but since iOS 26.5 only a real finger tap counts (flipping one from code
 * no longer vibrates). So on iPhone, tappable buttons carry an invisible switch under the finger
 * (see components/Haptic.tsx), and these functions do nothing there.
 */
export const usesTapSwitchHaptics = () => isIOS() && typeof navigator.vibrate !== 'function';

function vibrate(pattern: number | number[]) {
  if (!enabled.haptics || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

export const haptic = {
  tap: () => vibrate(10),
  success: () => vibrate([20, 60, 30]),
  big: () => vibrate([30, 50, 30, 50, 60]),
  soft: () => vibrate(15),
};
