import { describe, expect, it } from 'vitest';
import { MILESTONES } from './milestones';
import { coralLook, DECORATION_NAMES, emptySeabed, markSeen, monthsSince, withEarned } from './seabed';
import { isDrawn } from './components/Seabed';

const ids = (s: ReturnType<typeof emptySeabed>) => Object.keys(s.earned).sort();

describe('seabed', () => {
  it('has a decoration for every milestone, in both languages', () => {
    for (const m of MILESTONES) {
      const name = DECORATION_NAMES[m.id];
      expect(name?.en && name?.cs, m.id).toBeTruthy();
    }
    expect(Object.keys(DECORATION_NAMES).length).toBe(MILESTONES.length);
  });

  it('has art and a spot on the seabed for every milestone', () => {
    for (const m of MILESTONES) expect(isDrawn(m.id), m.id).toBe(true);
  });

  it('earns a decoration for every milestone reached, and none ahead', () => {
    const s = withEarned(emptySeabed(), '2026-10-01', new Date(2026, 9, 4, 12));
    expect(ids(s)).toEqual(['day-1', 'day-3', 'quit-day']);
    expect(Object.values(s.earned).every((e) => !e.seen)).toBe(true);
  });

  it('earns nothing without a quit date', () => {
    const empty = emptySeabed();
    expect(withEarned(empty, null)).toBe(empty);
  });

  it('never takes a decoration away, even if the quit date moves later', () => {
    const earned = withEarned(emptySeabed(), '2026-09-01', new Date(2026, 9, 15));
    expect(ids(earned)).toHaveLength(6); // up to 1 month
    const moved = withEarned(earned, '2026-10-15', new Date(2026, 9, 15));
    expect(moved).toBe(earned);
  });

  it('keeps what was already seen when more is earned', () => {
    const first = markSeen(withEarned(emptySeabed(), '2026-10-01', new Date(2026, 9, 1)), ['quit-day']);
    const later = withEarned(first, '2026-10-01', new Date(2026, 9, 2));
    expect(later.earned['quit-day'].seen).toBe(true);
    expect(later.earned['day-1'].seen).toBe(false);
  });

  it('counts whole calendar months', () => {
    expect(monthsSince('2026-01-31', new Date(2026, 1, 28))).toBe(0);
    expect(monthsSince('2026-01-31', new Date(2026, 2, 1))).toBe(1);
    expect(monthsSince('2025-10-15', new Date(2026, 9, 15))).toBe(12);
    expect(monthsSince('2026-10-20', new Date(2026, 9, 15))).toBe(0);
  });

  it('grows the coral every month after a year, and never shrinks it', () => {
    const year = withEarned(emptySeabed(), '2025-10-15', new Date(2026, 9, 15));
    expect(year.coralMonths).toBe(0);
    const later = withEarned(year, '2025-10-15', new Date(2027, 0, 20));
    expect(later.coralMonths).toBe(3);
    expect(withEarned(later, '2026-05-01', new Date(2027, 0, 20))).toBe(later);
  });

  it('keeps changing the coral’s colour, but stops growing it after another year', () => {
    const hues = new Set(Array.from({ length: 14 }, (_, i) => coralLook(i).hue));
    expect(hues.size).toBe(14);
    expect(coralLook(0)).toEqual({ scale: 1, hue: 0 });
    expect(coralLook(30).scale).toBe(coralLook(12).scale);
  });
});
