import { describe, expect, it } from 'vitest';
import type { HookEntry } from './storage';
import { schoolOf, streakOf } from './streak';

/** A hook on a local day (YYYY-MM-DD), at noon. */
const hook = (day: string, result: HookEntry['result'], freshStart?: boolean): HookEntry => {
  const [y, m, d] = day.split('-').map(Number);
  const at = new Date(y, m - 1, d, 12).toISOString();
  return { id: at, startedAt: at, endedAt: at, cards: [], result, ...(freshStart ? { freshStart } : {}) };
};
const now = new Date(2026, 9, 31, 18);

describe('streak (D57)', () => {
  it('is the day count until she gets snagged', () => {
    const s = streakOf([hook('2026-10-05', 'passed'), hook('2026-10-06', 'notyet')], '2026-10-01', now);
    expect(s).toEqual({ current: 30, best: 30, swamFree: 30, hasSlips: false });
  });

  it('starts fresh from the day she chose to, and keeps her best', () => {
    const s = streakOf([hook('2026-10-24', 'slipped', true)], '2026-10-01', now);
    expect(s).toEqual({ current: 7, best: 23, swamFree: 29, hasSlips: true });
  });

  it('only logs a snag when she keeps her streak', () => {
    const s = streakOf([hook('2026-10-24', 'slipped')], '2026-10-01', now);
    expect(s.current).toBe(30);
    expect(s.best).toBe(30);
    expect(s.swamFree).toBe(29);
  });

  it('counts each day once, however many snags', () => {
    const s = streakOf(
      [hook('2026-10-10', 'slipped', true), hook('2026-10-10', 'slipped', true), hook('2026-10-20', 'slipped', true)],
      '2026-10-01',
      now,
    );
    expect(s).toEqual({ current: 11, best: 11, swamFree: 28, hasSlips: true });
  });

  it('is zero on the day of a fresh start', () => {
    expect(streakOf([hook('2026-10-31', 'slipped', true)], '2026-10-01', now).current).toBe(0);
  });

  it('ignores snags from before the quit date', () => {
    const s = streakOf([hook('2026-09-20', 'slipped', true)], '2026-10-01', now);
    expect(s).toEqual({ current: 30, best: 30, swamFree: 30, hasSlips: false });
  });
});

describe('her school', () => {
  it('has a tuna for every day off it and one for every hook beaten', () => {
    const hooks = [hook('2026-10-21', 'passed'), hook('2026-10-25', 'passed'), hook('2026-10-26', 'notyet')];
    expect(schoolOf({ hooks, quitDate: '2026-10-21' }, now)).toEqual({ days: 10, cravings: 2, total: 12 });
  });

  it("doesn't count the days she got snagged, and a fresh start takes nothing away", () => {
    const hooks = [hook('2026-10-25', 'passed'), hook('2026-10-26', 'slipped', true)];
    expect(schoolOf({ hooks, quitDate: '2026-10-21' }, now)).toEqual({ days: 9, cravings: 1, total: 10 });
  });

  it('is just the hooks beaten without a quit date', () => {
    expect(schoolOf({ hooks: [hook('2026-10-25', 'passed')], quitDate: null }, now)).toEqual({ days: 0, cravings: 1, total: 1 });
  });
});
