/**
 * Streaks (D57): whole days since her last fresh start. When she gets snagged she chooses whether to
 * start a fresh streak or just log it. Nothing else ever resets (D11): the quit date, milestones,
 * decorations, treasure and school stay. Worked out from the hooks each time, so a backup needs nothing new.
 */
import { daysSince } from './milestones';
import { dayKey } from './stats';
import type { HookEntry } from './storage';

export interface Streak {
  /** Days since her quit date or her latest fresh start. */
  current: number;
  /** Her longest streak, the current one included. */
  best: number;
  /** Days since she quit, minus the days she got snagged. */
  swamFree: number;
  /** Whether she has been snagged on or after her quit date; until then the streak is just the day count. */
  hasSlips: boolean;
}

/** Whole calendar days from one YYYY-MM-DD to another. */
function daysBetween(from: string, to: string): number {
  const [y, m, d] = to.split('-').map(Number);
  return daysSince(from, new Date(y, m - 1, d));
}

export function streakOf(hooks: HookEntry[], quitDate: string, now = new Date()): Streak {
  const today = dayKey(now.toISOString());
  // Slips before the quit date (it can be moved later) or somehow after today don't count.
  const slips = hooks.filter((h) => h.result === 'slipped').map((h) => ({ day: dayKey(h.endedAt), fresh: !!h.freshStart }))
    .filter((s) => s.day >= quitDate && s.day <= today);
  const starts = [quitDate, ...new Set(slips.filter((s) => s.fresh).map((s) => s.day).sort())];
  const lengths = starts.map((start, i) => daysBetween(start, starts[i + 1] ?? today));
  const slipDays = new Set(slips.map((s) => s.day)).size;
  return {
    current: lengths[lengths.length - 1],
    best: Math.max(...lengths),
    swamFree: Math.max(0, daysSince(quitDate, now) - slipDays),
    hasSlips: slips.length > 0,
  };
}
