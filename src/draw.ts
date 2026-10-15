import type { Card, Rarity } from './cards';

/** Tunable draw settings (decision record D16–D18). */
export const DRAW_SETTINGS = {
  tierChances: { common: 55, uncommon: 28, rare: 14, legendary: 3 } as Record<Rarity, number>,
  /** After this many draws without a rare or legendary, the next one is at least rare. */
  pityAfter: 8,
  /** Weight of a card she hasn't caught yet, relative to a caught one. */
  uncaughtWeight: 3,
};

export interface DrawState {
  drawsSinceRare: number;
  previousCardId: string | null;
}

export interface DrawInput {
  cards: Card[];
  caughtIds: Set<string>;
  state: DrawState;
  /** When set, draw evenly from these card IDs and ignore tiers. */
  favouriteIds?: Set<string>;
  random?: () => number;
}

function weightedPick<T>(items: T[], weight: (item: T) => number, random: () => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

function withoutPrevious(cards: Card[], previousId: string | null): Card[] {
  if (cards.length <= 1) return cards;
  const filtered = cards.filter((c) => c.id !== previousId);
  return filtered.length ? filtered : cards;
}

export function drawCard({ cards, caughtIds, state, favouriteIds, random = Math.random }: DrawInput): {
  card: Card;
  state: DrawState;
} {
  let card: Card;

  const favourites = favouriteIds ? cards.filter((c) => favouriteIds.has(c.id)) : [];
  if (favourites.length) {
    card = weightedPick(withoutPrevious(favourites, state.previousCardId), () => 1, random);
  } else {
    const available = (Object.keys(DRAW_SETTINGS.tierChances) as Rarity[]).filter((r) =>
      cards.some((c) => c.rarity === r),
    );
    const pity = state.drawsSinceRare >= DRAW_SETTINGS.pityAfter;
    let tiers = pity ? available.filter((r) => r === 'rare' || r === 'legendary') : available;
    if (!tiers.length) tiers = available;
    const tier = weightedPick(tiers, (r) => DRAW_SETTINGS.tierChances[r], random);
    const inTier = withoutPrevious(
      cards.filter((c) => c.rarity === tier),
      state.previousCardId,
    );
    card = weightedPick(inTier, (c) => (caughtIds.has(c.id) ? 1 : DRAW_SETTINGS.uncaughtWeight), random);
  }

  const isRare = card.rarity === 'rare' || card.rarity === 'legendary';
  return {
    card,
    state: { drawsSinceRare: isRare ? 0 : state.drawsSinceRare + 1, previousCardId: card.id },
  };
}
