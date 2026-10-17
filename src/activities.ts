import type { Settings } from './storage';

/**
 * The rounds a brutal hook (8 to 10) can start with (D54): Dodge the hooks, Bubbles, Net Packing,
 * School Tracker and Current Run. One is picked at random so none wears thin, but never the same one
 * three times in a row, which would feel broken. A new round is one more entry in `ACTIVITIES` and
 * `ENABLED`, plus its own component (see `components/HookFlow.tsx`).
 */
export type Activity = 'dodge' | 'breathe' | 'pack' | 'track' | 'run';

/** Every activity, in the fixed order used to break ties. */
export const ACTIVITIES: readonly Activity[] = ['dodge', 'breathe', 'pack', 'track', 'run'];

/** The ones that can be picked, if they're `eligible` right now. */
export const ENABLED: readonly Activity[] = ['dodge', 'breathe', 'pack', 'track', 'run'];

/**
 * The enabled activities she can be given right now. Current Run gets her moving, so only at home and
 * only while movement rounds are on in Settings (D58). Pass the result as `enabled` to the helpers below.
 */
export function eligible(
  settings: Pick<Settings, 'place' | 'movementRounds'>,
  enabled: readonly Activity[] = ENABLED,
): Activity[] {
  return enabled.filter((a) => {
    switch (a) {
      case 'run':
        return settings.place === 'home' && settings.movementRounds;
      default:
        return true;
    }
  });
}

/** `recent` is her last picks, newest last. */
export function pickActivity(
  recent: readonly Activity[],
  random: () => number = Math.random,
  enabled: readonly Activity[] = ENABLED,
): Activity {
  const [a, b] = recent.slice(-2);
  const twice = recent.length >= 2 && a === b;
  const pool = twice && enabled.length > 1 ? enabled.filter((x) => x !== a) : enabled;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** The picks to keep: only the last two matter. */
export const rememberPick = (recent: readonly Activity[], a: Activity): Activity[] => [...recent, a].slice(-2);

/**
 * The other enabled activities, the least recently picked first (one that isn't in `recent` at all
 * comes before any that is). Ties keep the order of `ACTIVITIES`.
 */
export function alternatives(
  current: Activity | null | undefined,
  recent: readonly Activity[],
  enabled: readonly Activity[] = ENABLED,
): Activity[] {
  const seen = (x: Activity) => recent.lastIndexOf(x);
  return enabled
    .filter((x) => x !== current)
    .sort((x, y) => seen(x) - seen(y) || ACTIVITIES.indexOf(x) - ACTIVITIES.indexOf(y));
}

/**
 * The two rounds "Not yet" offers: the ones she didn't just do, least recently picked first. With only
 * two activities that leaves one, so the one she just did comes second, as before (D54).
 */
export function notYetRounds(
  last: Activity | null | undefined,
  recent: readonly Activity[],
  enabled: readonly Activity[] = ENABLED,
): Activity[] {
  const rest = alternatives(last, recent, enabled);
  return (last && enabled.includes(last) ? [...rest, last] : rest).slice(0, 2);
}
