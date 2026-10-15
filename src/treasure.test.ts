import { describe, expect, it } from 'vitest';
import { convertTreasure, moneyParts, newTreasure, parseAmount, savedAt, withWeeklyAmount, type Treasure } from './treasure';

const DAY = 24 * 60 * 60 * 1000;
const at = (s: string) => new Date(s);

describe('treasure', () => {
  // 700 a week = 100 a day, counting from local midnight of the quit date.
  const quit = '2026-10-01';
  const t = newTreasure(700, at('2026-10-05T12:00:00'));
  const saved = (tr: Treasure, now: number, from = quit) => savedAt(tr, from, now);

  it('counts from the quit date, not from when it was set up', () => {
    expect(saved(t, at('2026-10-01T00:00:00').getTime())).toBe(0);
    expect(saved(t, at('2026-10-03T00:00:00').getTime())).toBeCloseTo(200);
    expect(saved(t, at('2026-10-03T12:00:00').getTime())).toBeCloseTo(250);
  });

  it('is zero before the quit date', () => {
    expect(saved(t, at('2026-09-20T00:00:00').getTime())).toBe(0);
  });

  it('keeps what was already saved when the weekly amount changes', () => {
    const changed = withWeeklyAmount(t, 1400, at('2026-10-11T00:00:00'));
    expect(changed.rates).toHaveLength(2);
    expect(saved(changed, at('2026-10-11T00:00:00').getTime())).toBeCloseTo(1000); // 10 days at 100
    expect(saved(changed, at('2026-10-12T00:00:00').getTime())).toBeCloseTo(1200); // + 1 day at 200
  });

  it('treats a quick correction as fixing a typo', () => {
    const fixed = withWeeklyAmount(t, 350, at('2026-10-05T12:05:00'));
    expect(fixed.rates).toHaveLength(1);
    expect(saved(fixed, at('2026-10-03T00:00:00').getTime())).toBeCloseTo(100);
  });

  it('applies the first amount from a quit date moved earlier', () => {
    expect(saved(t, at('2026-10-01T00:00:00').getTime(), '2026-09-24')).toBeCloseTo(700);
  });

  it('converts between currencies', () => {
    expect(convertTreasure(t, 'CZK', 'EUR').rates[0].perWeek).toBeCloseTo(28);
    expect(convertTreasure(convertTreasure(t, 'CZK', 'EUR'), 'EUR', 'CZK').rates[0].perWeek).toBeCloseTo(700);
  });

  it('keeps counting for years without drifting', () => {
    expect(saved(t, at('2026-10-01T00:00:00').getTime() + 364 * DAY)).toBeCloseTo(36400, 6);
  });

  it('splits the amount into money and sub-cent digits', () => {
    expect(moneyParts(1284.376543, 'CZK', 'cs')).toEqual({ before: '1 284,37', extra: '6543', after: ' Kč' });
    expect(moneyParts(12.999999, 'EUR', 'en')).toEqual({ before: '€12.99', extra: '9999', after: '' });
  });

  it('reads amounts the way people type them', () => {
    expect(parseAmount('300')).toBe(300);
    expect(parseAmount('300,50')).toBe(300.5);
    expect(parseAmount('1 200')).toBe(1200);
    expect(parseAmount('1.200,5')).toBe(1200.5);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});
