import { describe, expect, it } from 'vitest';
import { CARDS, DECK_VERSION, fitsPlace, PLACES, RARITIES } from './cards';
import { drawCard, DRAW_SETTINGS, type DrawState } from './draw';

const fresh: DrawState = { drawsSinceRare: 0, previousCardId: null };

describe('drawCard', () => {
  it('guarantees a rare or better after the pity threshold', () => {
    for (let i = 0; i < 200; i++) {
      const { card } = drawCard({
        cards: CARDS,
        caughtIds: new Set(),
        state: { drawsSinceRare: DRAW_SETTINGS.pityAfter, previousCardId: null },
      });
      expect(['rare', 'legendary']).toContain(card.rarity);
    }
  });

  it('never repeats the previous card straight away', () => {
    let state = fresh;
    for (let i = 0; i < 500; i++) {
      const result = drawCard({ cards: CARDS, caughtIds: new Set(), state });
      expect(result.card.id).not.toBe(state.previousCardId);
      state = result.state;
    }
  });

  it('roughly follows the tier chances', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      // Keep the pity counter at zero so only base chances apply.
      const { card } = drawCard({ cards: CARDS, caughtIds: new Set(), state: fresh });
      counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    }
    expect(counts.common / 20000).toBeGreaterThan(0.5);
    expect(counts.common / 20000).toBeLessThan(0.6);
    expect(counts.legendary / 20000).toBeGreaterThan(0.015);
    expect(counts.legendary / 20000).toBeLessThan(0.045);
  });

  it('favours cards she has not caught yet', () => {
    const commons = CARDS.filter((c) => c.rarity === 'common');
    const caught = new Set(commons.slice(1).map((c) => c.id));
    const target = commons[0].id;
    let hits = 0;
    let commonDraws = 0;
    for (let i = 0; i < 20000; i++) {
      const { card } = drawCard({ cards: CARDS, caughtIds: caught, state: fresh });
      if (card.rarity !== 'common') continue;
      commonDraws++;
      if (card.id === target) hits++;
    }
    // 1 uncaught at weight 3 vs 19 caught at weight 1 → 3/22 ≈ 13.6%
    expect(hits / commonDraws).toBeGreaterThan(0.11);
    expect(hits / commonDraws).toBeLessThan(0.16);
  });

  it('draws only from favourites when given', () => {
    const favs = new Set([CARDS[0].id, CARDS[5].id]);
    let state = fresh;
    for (let i = 0; i < 50; i++) {
      const result = drawCard({ cards: CARDS, caughtIds: new Set(), state, favouriteIds: favs });
      expect(favs.has(result.card.id)).toBe(true);
      state = result.state;
    }
  });

  it('has 51 unique cards with both languages filled in', () => {
    expect(CARDS).toHaveLength(51);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(51);
    for (const c of CARDS) {
      expect(c.title.en && c.title.cs && c.task.en && c.task.cs).toBeTruthy();
    }
  });

  it('never has a card from a deck version that has not shipped', () => {
    for (const c of CARDS) expect(c.addedIn, c.id).toBeLessThanOrEqual(DECK_VERSION);
  });
});

describe('where she is (D39, D40)', () => {
  const out = CARDS.filter((c) => fitsPlace(c, 'out'));

  it('fits every card somewhere', () => {
    for (const c of CARDS) expect(PLACES.some((p) => fitsPlace(c, p)), c.id).toBe(true);
  });

  it('keeps cards that need a kitchen, a floor or privacy at home', () => {
    expect(out.map((c) => c.id)).not.toContain('ice-cube-hold');
    expect(out.map((c) => c.id)).not.toContain('landed-tuna');
    expect(out.map((c) => c.id)).toContain('five-four-three');
    expect(CARDS.filter((c) => fitsPlace(c, 'home'))).toHaveLength(CARDS.length);
  });

  it('keeps at least half the deck doable out of the house', () => {
    expect(out.length / CARDS.length).toBeGreaterThanOrEqual(0.5);
  });

  it('has at least two cards of every rarity out of the house', () => {
    // Two, so the guaranteed rare and the no-repeat rule still have something to pick from.
    for (const r of RARITIES) expect(out.filter((c) => c.rarity === r).length, r).toBeGreaterThanOrEqual(2);
  });

  it('still guarantees a rare or better when drawing only out-of-house cards', () => {
    for (let i = 0; i < 200; i++) {
      const { card } = drawCard({
        cards: out,
        caughtIds: new Set(),
        state: { drawsSinceRare: DRAW_SETTINGS.pityAfter, previousCardId: null },
      });
      expect(['rare', 'legendary']).toContain(card.rarity);
      expect(fitsPlace(card, 'out')).toBe(true);
    }
  });
});

describe('card length', () => {
  // Cards are quick routine breakers: everything must be doable in under a minute.
  it('keeps every timer at 60 seconds or less', () => {
    for (const c of CARDS) expect(c.timerSeconds ?? 0, c.id).toBeLessThanOrEqual(60);
  });
  it('never asks for minutes, a whole song or a long walk', () => {
    const tooLong = /\b(minutes?|full song|one song|around the block)\b|minut|celou (jednu )?písničku|obejdi blok/i;
    for (const c of CARDS) {
      expect(c.task.en, c.id).not.toMatch(tooLong);
      expect(c.task.cs, c.id).not.toMatch(tooLong);
    }
  });
});
