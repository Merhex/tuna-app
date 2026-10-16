/**
 * What a brutal hook (8 to 10) starts with (D54): Dodge the hooks or Bubbles, picked at random so
 * neither wears thin, but never the same one three times in a row, which would feel broken.
 */
export type Activity = 'dodge' | 'breathe';

/** `recent` is her last picks, newest last. */
export function pickActivity(recent: Activity[], random: () => number = Math.random): Activity {
  const [a, b] = recent.slice(-2);
  if (recent.length >= 2 && a === b) return other(a);
  return random() < 0.5 ? 'dodge' : 'breathe';
}

export const other = (a: Activity): Activity => (a === 'dodge' ? 'breathe' : 'dodge');

/** The picks to keep: only the last two matter. */
export const rememberPick = (recent: Activity[], a: Activity): Activity[] => [...recent, a].slice(-2);
