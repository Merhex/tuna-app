import deck from './data/cards.json';

export type Lang = 'en' | 'cs';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Category = 'physical' | 'sensory' | 'ridiculous' | 'social' | 'grounding';
export type Where = 'anywhere' | 'quiet' | 'home' | 'outside';

export interface Card {
  id: string;
  title: Record<Lang, string>;
  task: Record<Lang, string>;
  rarity: Rarity;
  category: Category;
  where: Where[];
  timerSeconds?: number;
  addedIn: number;
}

export const DECK_VERSION: number = deck.deckVersion;
export const CARDS = deck.cards as Card[];
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

const byId = new Map(CARDS.map((c) => [c.id, c]));
export const cardById = (id: string) => byId.get(id);
