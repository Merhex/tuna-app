import { describe, expect, it } from 'vitest';
import { alternatives, notYetRounds, pickActivity, rememberPick, type Activity } from './activities';
import { parseBackup } from './storage';

const TWO: Activity[] = ['dodge', 'breathe'];
const THREE: Activity[] = ['dodge', 'breathe', 'pack'];
const FOUR: Activity[] = ['dodge', 'breathe', 'pack', 'track'];

/** A seeded random, so runs are the same every time. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** The longest run of the same pick over `n` brutal hooks. */
function longestRun(enabled: Activity[], n = 500, random = seeded(7)) {
  let recent: Activity[] = [];
  let run = 0;
  let longest = 0;
  let last: Activity | null = null;
  const counts: Partial<Record<Activity, number>> = {};
  for (let i = 0; i < n; i++) {
    const a = pickActivity(recent, random, enabled);
    run = a === last ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = a;
    counts[a] = (counts[a] ?? 0) + 1;
    recent = rememberPick(recent, a);
  }
  return { longest, counts };
}

describe('what a brutal hook starts with', () => {
  it('with two activities, picks as before', () => {
    expect(pickActivity([], () => 0.1, TWO)).toBe('dodge');
    expect(pickActivity([], () => 0.9, TWO)).toBe('breathe');
    expect(pickActivity(['dodge', 'breathe'], () => 0.1, TWO)).toBe('dodge');
    expect(pickActivity(['dodge', 'dodge'], () => 0.1, TWO)).toBe('breathe');
    expect(pickActivity(['breathe', 'breathe'], () => 0.9, TWO)).toBe('dodge');
  });

  it('picks evenly across three or four, never one outside the list', () => {
    expect(pickActivity([], () => 0, THREE)).toBe('dodge');
    expect(pickActivity([], () => 0.5, THREE)).toBe('breathe');
    expect(pickActivity([], () => 0.99, THREE)).toBe('pack');
    expect(pickActivity([], () => 0.99, FOUR)).toBe('track');
    // A random of exactly 1 can't run off the end of the list.
    expect(pickActivity([], () => 1, THREE)).toBe('pack');
    for (const enabled of [THREE, FOUR]) {
      const { counts } = longestRun(enabled, 2000);
      expect(Object.keys(counts).sort()).toEqual([...enabled].sort());
      for (const a of enabled) expect(counts[a]).toBeGreaterThan(2000 / enabled.length / 1.5);
    }
  });

  it('never picks the same one three times in a row', () => {
    expect(pickActivity(['pack', 'pack'], () => 0.99, THREE)).not.toBe('pack');
    for (const enabled of [TWO, THREE, FOUR]) {
      expect(longestRun(enabled).longest).toBeLessThan(3);
      expect(longestRun(enabled, 500, Math.random).longest).toBeLessThan(3);
    }
  });

  it('keeps only the last two picks', () => {
    expect(rememberPick(['dodge', 'breathe'], 'dodge')).toEqual(['breathe', 'dodge']);
  });

  it('works with a made-up activity, with no change outside the list', () => {
    const extra = [...THREE, 'snorkel' as Activity];
    expect(pickActivity([], () => 0.99, extra)).toBe('snorkel');
    expect(alternatives('dodge', ['dodge'], extra)).toContain('snorkel');
  });
});

describe('the other ways out of a round', () => {
  it('with two activities, offers the other one, as before', () => {
    expect(alternatives('dodge', ['dodge'], TWO)).toEqual(['breathe']);
    expect(alternatives('breathe', ['dodge', 'breathe'], TWO)).toEqual(['dodge']);
  });

  it('puts the least recently picked first, ties in a fixed order', () => {
    // Nothing picked yet: the fixed order.
    expect(alternatives('dodge', [], FOUR)).toEqual(['breathe', 'pack', 'track']);
    // Never picked comes before picked; older picks before newer.
    expect(alternatives('pack', ['breathe', 'pack'], FOUR)).toEqual(['dodge', 'track', 'breathe']);
    expect(alternatives('dodge', ['pack', 'breathe'], THREE)).toEqual(['pack', 'breathe']);
    expect(alternatives(null, ['dodge'], THREE)).toEqual(['breathe', 'pack', 'dodge']);
  });

  it('"Give me another game" goes round every game before repeating one', () => {
    // As in the flow: the rounds shown this hook come after her earlier picks.
    for (const enabled of [TWO, THREE, FOUR]) {
      const picks: Activity[] = ['breathe', 'dodge'];
      const shown: Activity[] = ['dodge'];
      for (let i = 0; i < enabled.length * 3; i++) {
        shown.push(alternatives(shown.at(-1), [...picks, ...shown], enabled)[0]);
      }
      for (let i = 0; i + enabled.length <= shown.length; i++) {
        expect(new Set(shown.slice(i, i + enabled.length)).size).toBe(enabled.length);
      }
    }
  });

  it('"Not yet" offers two: the ones she didn\'t just do, least recently picked first', () => {
    // Two activities: both, the one she didn't just do first (D54).
    expect(notYetRounds('dodge', [], TWO)).toEqual(['breathe', 'dodge']);
    expect(notYetRounds('breathe', [], TWO)).toEqual(['dodge', 'breathe']);
    expect(notYetRounds(null, [], TWO)).toEqual(['dodge', 'breathe']);
    // More: never the one she just did.
    expect(notYetRounds('dodge', ['breathe', 'dodge'], THREE)).toEqual(['pack', 'breathe']);
    expect(notYetRounds('pack', ['pack'], FOUR)).toEqual(['dodge', 'breathe']);
    expect(notYetRounds('pack', ['dodge', 'pack'], FOUR)).toEqual(['breathe', 'track']);
    expect(notYetRounds(null, ['dodge', 'pack'], THREE)).toEqual(['breathe', 'dodge']);
  });

  it('loads the picks in an older save untouched', () => {
    const old = JSON.stringify({
      app: 'off-the-hook',
      schemaVersion: 2,
      settings: { brutalPicks: ['dodge', 'breathe'] },
    });
    expect(parseBackup(old).settings.brutalPicks).toEqual(['dodge', 'breathe']);
  });
});
