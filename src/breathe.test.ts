import { describe, expect, it } from 'vitest';
import { BREATHE_SETTINGS, createSession, momentAt, press, release, ROUND_SECONDS, step, type Session } from './breathe';

const run = (s: Session, seconds: number, each?: (s: Session) => void) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    step(s, 1 / 60);
    each?.(s);
  }
};

const { leadIn } = BREATHE_SETTINGS;

describe('bubbles', () => {
  it('lasts about two minutes: 12 breaths of in 4, out 6', () => {
    expect(ROUND_SECONDS).toBe(leadIn + 12 * 10);
  });

  it('goes in, then out, counting down each step', () => {
    expect(momentAt(0)).toMatchObject({ phase: 'ready', count: 3, fill: 0 });
    expect(momentAt(leadIn + 0.1)).toMatchObject({ phase: 'in', breath: 0, count: 4 });
    expect(momentAt(leadIn + 3.5)).toMatchObject({ phase: 'in', count: 1 });
    expect(momentAt(leadIn + 4.1)).toMatchObject({ phase: 'out', count: 6 });
    expect(momentAt(leadIn + 9.5)).toMatchObject({ phase: 'out', count: 1 });
    expect(momentAt(leadIn + 10.1)).toMatchObject({ phase: 'in', breath: 1 });
  });

  it('fills the bubble smoothly: empty, half way, full, half way, empty', () => {
    expect(momentAt(leadIn).fill).toBeCloseTo(0);
    expect(momentAt(leadIn + 2).fill).toBeCloseTo(0.5);
    expect(momentAt(leadIn + 4).fill).toBeCloseTo(1);
    expect(momentAt(leadIn + 7).fill).toBeCloseTo(0.5);
    expect(momentAt(leadIn + 10 - 1e-6).fill).toBeCloseTo(0);
  });

  it('announces every step and counts every breath, then ends', () => {
    const s = createSession();
    const phases: string[] = [];
    let breathEvents = 0;
    run(s, ROUND_SECONDS + 1, (s) => {
      for (const e of s.events) {
        if (e.type === 'phase') phases.push(e.phase);
        if (e.type === 'breath') breathEvents++;
      }
      s.events.length = 0;
    });
    expect(phases).toHaveLength(12 * 2);
    expect(phases.slice(0, 4)).toEqual(['in', 'out', 'in', 'out']);
    expect(s.breaths).toBe(12);
    expect(breathEvents).toBe(12);
    expect(s.over).toBe(true);
  });

  it('counts a breath once its out-breath is done', () => {
    const s = createSession();
    run(s, leadIn + 9);
    expect(s.breaths).toBe(0);
    run(s, 1.5);
    expect(s.breaths).toBe(1);
  });

  it('counts breaths she followed with her finger, a little early or late included', () => {
    const s = createSession();
    // Down a bit late for the in-breath, up a bit early for the out-breath: on the beat.
    run(s, leadIn + 0.5);
    press(s);
    run(s, 3);
    release(s);
    run(s, 6.5);
    expect(s.onBeat).toBe(1);
    expect(s.events).toContainEqual({ type: 'onBeat', n: 1 });
    // Second breath: lifted two seconds into the out-breath, so not on the beat.
    press(s);
    run(s, 6);
    release(s);
    run(s, 4);
    expect(s.onBeat).toBe(1);
    expect(s.touched).toBe(true);
  });

  it('counts nothing on the beat if she only watches', () => {
    const s = createSession();
    run(s, ROUND_SECONDS + 1);
    expect(s.onBeat).toBe(0);
    expect(s.touched).toBe(false);
  });
});
