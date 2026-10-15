import { describe, expect, it } from 'vitest';
import { CARDS } from './cards';
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

  it('has 40 unique cards with both languages filled in', () => {
    expect(CARDS).toHaveLength(40);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(40);
    for (const c of CARDS) {
      expect(c.title.en && c.title.cs && c.task.en && c.task.cs).toBeTruthy();
    }
  });
});
