import { describe, expect, it } from 'vitest';
import { jokeDurationMs, makeBag, nextStreak, PET_SETTINGS } from './pet';
import { STRINGS } from './i18n';

describe('nextStreak', () => {
  it('starts at 1 on the first tap', () => {
    expect(nextStreak(null, 1000)).toBe(1);
  });
  it('grows while taps come quickly', () => {
    expect(nextStreak({ at: 1000, streak: 3 }, 1000 + PET_SETTINGS.streakGapMs)).toBe(4);
  });
  it('starts over after a pause', () => {
    expect(nextStreak({ at: 1000, streak: 4 }, 1001 + PET_SETTINGS.streakGapMs)).toBe(1);
  });
});

describe('makeBag', () => {
  it('hands out every item before repeating', () => {
    const next = makeBag(['a', 'b', 'c', 'd']);
    expect([next(), next(), next(), next()].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('never gives the same item twice in a row, even across refills', () => {
    const next = makeBag([1, 2, 3]);
    let prev = next();
    for (let i = 0; i < 300; i++) {
      const cur = next();
      expect(cur).not.toBe(prev);
      prev = cur;
    }
  });
  it('works with a single item', () => {
    const next = makeBag(['only']);
    expect([next(), next()]).toEqual(['only', 'only']);
  });
});

describe('jokes', () => {
  it('stay on screen between 5 and 11 seconds', () => {
    expect(jokeDurationMs('Hi')).toBe(5000);
    expect(jokeDurationMs('x'.repeat(1000))).toBe(11000);
  });
  for (const [lang, t] of Object.entries(STRINGS)) {
    it(`${lang}: both lists have jokes, with no duplicates and typographic quotes`, () => {
      for (const list of [t.petJokes, t.petDarkJokes]) {
        expect(list.length).toBeGreaterThanOrEqual(10);
        expect(new Set(list).size).toBe(list.length);
        for (const joke of list) expect(joke).not.toMatch(/['"]/);
      }
    });
  }
});
