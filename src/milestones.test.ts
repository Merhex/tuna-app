import { describe, expect, it } from 'vitest';
import { daysSince, latestMilestoneDay, MILESTONES, milestoneProgress, reachedOn } from './milestones';

describe('milestones', () => {
  it('starts at the quit day, in order, with unique IDs and both languages', () => {
    expect(MILESTONES[0].day).toBe(0);
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
    expect(new Set(MILESTONES.map((m) => m.day)).size).toBe(MILESTONES.length);
    for (const m of MILESTONES) {
      for (const field of [m.when, m.title, m.body]) expect(field.en && field.cs, m.id).toBeTruthy();
    }
  });

  it('counts whole calendar days from the quit date', () => {
    expect(daysSince('2026-10-01', new Date(2026, 9, 1, 23, 59))).toBe(0);
    expect(daysSince('2026-10-01', new Date(2026, 9, 2, 0, 1))).toBe(1);
    expect(daysSince('2026-10-01', new Date(2027, 9, 1, 12))).toBe(365);
  });

  it('is not thrown off by daylight saving or a start date in the future', () => {
    // Europe switched clocks on 29 March 2026; whatever the machine's time zone, this is two days.
    expect(daysSince('2026-03-28', new Date(2026, 2, 30, 0, 30))).toBe(2);
    expect(daysSince('2026-10-20', new Date(2026, 9, 15))).toBe(0);
  });

  it('knows where she is and what comes next', () => {
    expect(milestoneProgress(0).current.id).toBe('quit-day');
    expect(milestoneProgress(0).next?.day).toBe(1);
    expect(milestoneProgress(5).current.day).toBe(3);
    expect(milestoneProgress(5).next?.day).toBe(7);
    expect(milestoneProgress(7).current.day).toBe(7);
    expect(milestoneProgress(5000).next).toBeNull();
  });

  it('dates each milestone from the quit date', () => {
    const week = MILESTONES.find((m) => m.day === 7)!;
    expect(reachedOn('2026-10-28', week)).toEqual(new Date(2026, 10, 4));
  });

  it('reports the latest milestone reached for the home-screen dot', () => {
    expect(latestMilestoneDay('2026-10-01', new Date(2026, 9, 16))).toBe(14);
  });
});
