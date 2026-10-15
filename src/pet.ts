/**
 * The petting Easter egg on the home screen: tap the tuna and it closes its eyes; tap it fast
 * enough times in a row and it tells a joke. Now and then the joke is a dark one, and often it's
 * about Jungkook, because she's a huge fan (D45).
 */
export const PET_SETTINGS = {
  /** A tap counts towards the streak if it lands within this long of the previous one. */
  streakGapMs: 600,
  /** Taps in a row that make the tuna talk. */
  tapsForJoke: 5,
  /** Chance that a joke comes from the dark list. */
  darkChance: 0.1,
  /** Chance that a joke is about Jungkook (D45). */
  jungkookChance: 0.3,
};

export type JokeKind = 'normal' | 'dark' | 'jungkook';

/** Which list the next joke comes from, given a roll in [0, 1). */
export function jokeKind(roll: number): JokeKind {
  if (roll < PET_SETTINGS.darkChance) return 'dark';
  if (roll < PET_SETTINGS.darkChance + PET_SETTINGS.jungkookChance) return 'jungkook';
  return 'normal';
}

/** The streak after a tap at `now`, given the previous tap's time and streak. */
export function nextStreak(prev: { at: number; streak: number } | null, now: number): number {
  if (!prev || now - prev.at > PET_SETTINGS.streakGapMs) return 1;
  return prev.streak + 1;
}

/**
 * A shuffled bag: hands out every item once, in random order, before any repeats, and never the
 * same item twice in a row across refills.
 */
export function makeBag<T>(items: T[], random = Math.random): () => T {
  let bag: T[] = [];
  let last: T | undefined;
  return () => {
    if (bag.length === 0) {
      bag = [...items];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // The bag is drawn from the end, so keep the previous item away from it.
      if (bag.length > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    last = bag.pop()!;
    return last;
  };
}

/** How long a joke stays up: long enough to read, gone before it gets in the way. */
export const jokeDurationMs = (text: string) => Math.min(11000, Math.max(5000, 3000 + text.length * 55));
