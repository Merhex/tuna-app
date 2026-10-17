import { describe, expect, it } from 'vitest';
import { createMotion, feed, intensity, MOTION_SETTINGS, type Motion } from './motion';

const G = 9.81;

/** A seeded random, so the noise is the same every run. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/**
 * Feeds `seconds` of readings at `hz`: gravity along `axis` (tilted by `tilt(t)` radians if given) plus
 * a bounce of `amp` m/s² at `freq` Hz along the same axis, plus a little noise.
 */
function shake(
  m: Motion,
  { seconds, hz = 60, freq = 2, amp = 0, axis = 'z', noise = 0.05, from = 0, tilt, times }: {
    seconds: number; hz?: number; freq?: number; amp?: number; axis?: 'x' | 'y' | 'z'; noise?: number; from?: number;
    tilt?: (t: number) => number; times?: () => number;
  },
) {
  const rng = seeded(7);
  let t = from;
  while (t < from + seconds) {
    const a = tilt ? tilt(t) : 0;
    const bounce = amp * Math.sin(2 * Math.PI * freq * t);
    const along = G + bounce;
    const n = () => (rng() - 0.5) * 2 * noise;
    const v = { x: n(), y: n(), z: n() };
    // Gravity and the bounce point along `axis`, rotated by the tilt into the next axis.
    const next = axis === 'x' ? 'y' : axis === 'y' ? 'z' : 'x';
    v[axis] += along * Math.cos(a);
    v[next] += along * Math.sin(a);
    feed(m, { t, ...v });
    t += times ? times() : 1 / hz;
  }
  return t;
}

describe('motion: how hard she is moving', () => {
  it('reads a phone held still as still', () => {
    const m = createMotion();
    shake(m, { seconds: 5 });
    expect(intensity(m)).toBeLessThan(0.05);
  });

  it('reads marching on the spot as brisk once the window fills', () => {
    const m = createMotion();
    shake(m, { seconds: 4, freq: 2, amp: 3 });
    expect(intensity(m)).toBeGreaterThan(0.95);
  });

  it('reads a gentle sway as somewhere in between', () => {
    const m = createMotion();
    shake(m, { seconds: 6, freq: 1, amp: 1.2 });
    expect(intensity(m)).toBeGreaterThan(0.15);
    expect(intensity(m)).toBeLessThan(0.85);
  });

  it('lets a single bump fade back to still', () => {
    const m = createMotion();
    let t = shake(m, { seconds: 2 });
    feed(m, { t, x: 0, y: 0, z: G + 15 });
    t += 1 / 60;
    shake(m, { seconds: 8, from: t });
    expect(intensity(m)).toBeLessThan(0.05);
  });

  it("doesn't read slowly tilting the phone as movement", () => {
    const m = createMotion();
    shake(m, { seconds: 8, tilt: (t) => (t / 8) * Math.PI });
    expect(intensity(m)).toBeLessThan(0.05);
  });

  it('reads the same movement the same whichever way the phone is held', () => {
    const levels = (['x', 'y', 'z'] as const).map((axis) => {
      const m = createMotion();
      shake(m, { seconds: 6, freq: 1, amp: 1.2, axis });
      return intensity(m);
    });
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThan(0.02);
  });

  it('works without gravity in the readings too', () => {
    const m = createMotion();
    const rng = seeded(3);
    for (let i = 0; i < 240; i++) {
      const t = i / 60;
      feed(m, { t, x: (rng() - 0.5) * 0.05, y: 3 * Math.sin(2 * Math.PI * 2 * t), z: 0 });
    }
    expect(intensity(m)).toBeGreaterThan(0.95);
  });

  it('stays between 0 and 1 for anything, and skips missing readings', () => {
    const m = createMotion();
    let t = 0;
    for (let i = 0; i < 300; i++) {
      const v = i % 7 === 0 ? null : (i % 2 ? 1 : -1) * 1e6;
      feed(m, { t, x: v, y: i % 11 === 0 ? Number.NaN : 0, z: G });
      t += 1 / 60;
      expect(intensity(m)).toBeGreaterThanOrEqual(0);
      expect(intensity(m)).toBeLessThanOrEqual(1);
    }
    const before = m.samples;
    feed(m, { t, x: null, y: null, z: null });
    expect(m.samples).toBe(before);
  });

  it('gives about the same answer for uneven sample times', () => {
    const even = createMotion();
    shake(even, { seconds: 6, freq: 1, amp: 1.2 });
    const uneven = createMotion();
    const rng = seeded(11);
    shake(uneven, { seconds: 6, freq: 1, amp: 1.2, times: () => 1 / 60 + rng() * (1 / 20) });
    expect(Math.abs(intensity(even) - intensity(uneven))).toBeLessThan(0.15);
  });

  it('takes its thresholds from MOTION_SETTINGS', () => {
    const { brisk } = MOTION_SETTINGS;
    try {
      MOTION_SETTINGS.brisk = 100;
      const m = createMotion();
      shake(m, { seconds: 4, freq: 2, amp: 3 });
      expect(intensity(m)).toBeLessThan(0.1);
    } finally {
      MOTION_SETTINGS.brisk = brisk;
    }
  });
});
