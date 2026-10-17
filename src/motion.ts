/**
 * How hard she's moving, from the phone's accelerometer, for Current Run (D58). Pure: samples in,
 * an intensity from 0 (still) to 1 (brisk) out. The device side (permission, listening, keeping the
 * screen on) is in sensors.ts.
 *
 * It measures how much the phone moves, not steps, so marching, dancing, stairs or arm swings all
 * count, in a hand, a pocket or on an armband. The size of the acceleration doesn't depend on which
 * way the phone is held, and gravity (and slowly tilting the phone) is filtered out. Moving harder than
 * brisk gives nothing extra: intensity stops at 1, so nobody is pushed past comfortable.
 */

export const MOTION_SETTINGS = {
  /** Seconds the running mean of the acceleration size follows over. Subtracting it removes gravity. */
  gravitySeconds: 1,
  /** A mean size above this (m/s²) means the readings include gravity, about 9.8. */
  gravityAtLeast: 5,
  /** Seconds of movement the strength is measured over (root mean square). */
  windowSeconds: 1.5,
  /**
   * Movement strength (m/s², RMS) read as still, and as brisk. Between them, intensity goes 0 → 1.
   * Holding the phone still gives about 0.1; marching on the spot with it in a hand or pocket gives
   * 1.5–3. Deliberately easy to reach: tune on a real phone with `?motion=1` (see components/Run.tsx).
   */
  still: 0.35,
  brisk: 1.4,
  /** Seconds intensity takes to rise, and to fall, so the tuna doesn't flicker between steps. */
  attackSeconds: 0.3,
  releaseSeconds: 1.2,
  /** A gap between samples longer than this (s) is treated as this long: the app was in the background. */
  maxGap: 0.25,
};

const S = MOTION_SETTINGS;

export interface Sample {
  /** Seconds. */
  t: number;
  /** m/s², with or without gravity. Null when the browser has no reading. */
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface Motion {
  /** Running mean of the acceleration size. */
  mean: number | null;
  /** Recent squared movement, weighted by how long each sample stood for. */
  window: { t: number; v: number; w: number }[];
  /** Movement strength now, m/s² RMS. */
  rms: number;
  /** 0–1, smoothed. */
  level: number;
  lastT: number | null;
  /** Samples taken, for the debug overlay and for noticing a sensor that never sends anything. */
  samples: number;
}

export function createMotion(): Motion {
  return { mean: null, window: [], rms: 0, level: 0, lastT: null, samples: 0 };
}

const finite = (v: number | null): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function feed(m: Motion, s: Sample) {
  if (!finite(s.x) || !finite(s.y) || !finite(s.z) || !Number.isFinite(s.t)) return;
  const size = Math.hypot(s.x, s.y, s.z);
  if (!Number.isFinite(size)) return;
  const dt = m.lastT === null ? 0 : Math.min(S.maxGap, Math.max(0, s.t - m.lastT));
  m.lastT = s.t;
  m.samples++;

  // Gravity out: what's left is the movement. Readings without gravity (only some browsers) have
  // nothing to take out, and their mean is just the movement folded over, so they're used as they are.
  if (m.mean === null) m.mean = size;
  else m.mean += (size - m.mean) * (1 - Math.exp(-dt / S.gravitySeconds));
  const moving = m.mean > S.gravityAtLeast ? size - m.mean : size;

  // The window keeps each sample with the time it stood for, so uneven sample rates read the same.
  m.window.push({ t: s.t, v: moving * moving, w: Math.max(dt, 1e-3) });
  while (m.window.length > 1 && m.window[0].t < s.t - S.windowSeconds) m.window.shift();
  let sum = 0;
  let weight = 0;
  for (const e of m.window) {
    sum += e.v * e.w;
    weight += e.w;
  }
  m.rms = weight > 0 ? Math.sqrt(sum / weight) : 0;

  const target = clamp01((m.rms - S.still) / (S.brisk - S.still));
  const tau = target > m.level ? S.attackSeconds : S.releaseSeconds;
  m.level = clamp01(m.level + (target - m.level) * (1 - Math.exp(-dt / tau)));
}

export const intensity = (m: Motion) => m.level;
