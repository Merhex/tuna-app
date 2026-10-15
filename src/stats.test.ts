import { describe, expect, it } from 'vitest';
import { dailyTrend, ratedHooks, trendChange } from './stats';
import { averagePullDrop, defaultData, type AppData, type HookEntry } from './storage';

const hook = (startedAt: string, before?: number, after?: number): HookEntry => ({
  id: startedAt, startedAt, endedAt: startedAt, before, after, cards: [], result: 'passed',
});

const withHooks = (hooks: HookEntry[]): AppData => ({ ...defaultData(), hooks });

describe('stats', () => {
  const data = withHooks([
    hook('2026-10-10T09:00:00', 9, 4),
    hook('2026-10-10T20:00:00', 7, 3),
    hook('2026-10-12T10:00:00', 6),
    hook('2026-10-14T10:00:00', 4, 2),
    hook('2026-10-14T11:00:00'),
  ]);

  it('keeps only hooks rated before and after, oldest first', () => {
    expect(ratedHooks(data).map((h) => h.before)).toEqual([9, 7, 4]);
  });

  it('averages the drop', () => {
    expect(averagePullDrop(data)).toBeCloseTo((5 + 4 + 2) / 3);
  });

  it('groups starting strength per day', () => {
    const points = dailyTrend(data, 30, new Date('2026-10-15T12:00:00'));
    expect(points.map((p) => [p.day, p.avgBefore, p.count])).toEqual([
      ['2026-10-10', 8, 2],
      ['2026-10-12', 6, 1],
      ['2026-10-14', 4, 1],
    ]);
    expect(trendChange(points)).toBeCloseTo(4 - 8);
  });

  it('drops days outside the window', () => {
    expect(dailyTrend(data, 3, new Date('2026-10-15T12:00:00')).map((p) => p.day)).toEqual(['2026-10-14']);
  });
});
