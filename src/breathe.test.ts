import { describe, expect, it } from 'vitest';
import { BREATHE_SETTINGS, createSession, momentAt, press, release, roundSeconds, step, type Session } from './breathe';

const run = (s: Session, seconds: number, each?: (s: Session) => void) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    step(s, 1 / 60);
    each?.(s);
  }
};

const { leadIn } = BREATHE_SETTINGS;

describe('bubbles: ride the wave', () => {
  it('lasts about two minutes with either pattern', () => {
    expect(roundSeconds('box')).toBe(leadIn + 8 * 16);
    expect(roundSeconds('gentle')).toBe(leadIn + 12 * 10);
  });

  it('goes in, hold, out, rest for a box breath, counting down each step', () => {
    expect(momentAt('box', 0)).toMatchObject({ phase: 'ready', count: 3, fill: 0 });
    expect(momentAt('box', leadIn + 0.1)).toMatchObject({ phase: 'in', breath: 0, count: 4 });
    expect(momentAt('box', leadIn + 3.5)).toMatchObject({ phase: 'in', count: 1 });
    expect(momentAt('box', leadIn + 5)).toMatchObject({ phase: 'hold', count: 3, fill: 1 });
    expect(momentAt('box', leadIn + 9)).toMatchObject({ phase: 'out', count: 3 });
    expect(momentAt('box', leadIn + 13)).toMatchObject({ phase: 'rest', fill: 0 });
    expect(momentAt('box', leadIn + 16.5)).toMatchObject({ phase: 'in', breath: 1 });
  });

  it('has no holds in the gentle pattern, and a longer out-breath', () => {
    expect(momentAt('gentle', leadIn + 3.9).phase).toBe('in');
    expect(momentAt('gentle', leadIn + 4.1)).toMatchObject({ phase: 'out', count: 6 });
    expect(momentAt('gentle', leadIn + 10.1)).toMatchObject({ phase: 'in', breath: 1 });
  });

  it('fills the bubble smoothly: empty, half way, full, half way, empty', () => {
    expect(momentAt('box', leadIn).fill).toBeCloseTo(0);
    expect(momentAt('box', leadIn + 2).fill).toBeCloseTo(0.5);
    expect(momentAt('box', leadIn + 4).fill).toBeCloseTo(1);
    expect(momentAt('box', leadIn + 10).fill).toBeCloseTo(0.5);
    expect(momentAt('box', leadIn + 12).fill).toBeCloseTo(0);
  });

  it('announces every step and counts every breath, then ends', () => {
    const s = createSession('box');
    const phases: string[] = [];
    run(s, roundSeconds('box') + 1, (s) => {
      for (const e of s.events) if (e.type === 'phase') phases.push(e.phase);
      s.events.length = 0;
    });
    expect(phases).toHaveLength(8 * 4);
    expect(phases.slice(0, 4)).toEqual(['in', 'hold', 'out', 'rest']);
    expect(s.breaths).toBe(8);
    expect(s.over).toBe(true);
  });

  it('counts the last breath of a gentle round, which has no rest after it', () => {
    const s = createSession('gentle');
    run(s, roundSeconds('gentle') + 1);
    expect(s.breaths).toBe(12);
  });

  it('counts breaths she followed with her finger, a little early or late included', () => {
    const s = createSession('box');
    // Down a bit late for the in-breath, up a bit early for the out-breath: on the beat.
    run(s, leadIn + 0.5);
    press(s);
    run(s, 8 - 1);
    release(s);
    run(s, 8 + 1);
    expect(s.onBeat).toBe(1);
    expect(s.events).toContainEqual({ type: 'onBeat', n: 1 });
    // Second breath: lifted halfway through the hold, so not on the beat.
    press(s);
    run(s, 6);
    release(s);
    run(s, 10);
    expect(s.onBeat).toBe(1);
    expect(s.touched).toBe(true);
  });

  it('counts nothing on the beat if she only watches', () => {
    const s = createSession('gentle');
    run(s, roundSeconds('gentle') + 1);
    expect(s.onBeat).toBe(0);
    expect(s.touched).toBe(false);
  });
});
