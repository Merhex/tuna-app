/**
 * Milestones (decision D41): what to expect, counted in whole days from the treasure's start date (the day
 * she quit). Like the treasure, the count never resets. Sources for every claim are in docs/milestones.md.
 */
import data from './data/milestones.json';
import type { Lang } from './cards';

export interface Milestone {
  /** Permanent, like card IDs: later features (phase 3's bottles unlocked at milestones) can key on it. */
  id: string;
  /** Whole days after the quit date; the quit date itself is day 0. */
  day: number;
  when: Record<Lang, string>;
  title: Record<Lang, string>;
  body: Record<Lang, string>;
}

export const MILESTONES = [...(data.milestones as Milestone[])].sort((a, b) => a.day - b.day);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from the quit date (YYYY-MM-DD) to today, in local time. Never negative. */
export function daysSince(startDate: string, now = new Date()): number {
  const [y, m, d] = startDate.split('-').map(Number);
  // Compare calendar dates, not clock times, so a daylight-saving change never skips or repeats a day.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - Date.UTC(y, m - 1, d)) / DAY_MS));
}

/** The latest milestone reached (the quit day at least) and the next one ahead, or null after the last. */
export function milestoneProgress(days: number): { current: Milestone; next: Milestone | null } {
  const reached = MILESTONES.filter((m) => m.day <= days);
  return { current: reached[reached.length - 1], next: MILESTONES.find((m) => m.day > days) ?? null };
}

/** The local date a milestone is reached on. */
export function reachedOn(startDate: string, m: Milestone): Date {
  const [y, mo, d] = startDate.split('-').map(Number);
  return new Date(y, mo - 1, d + m.day);
}

/** Day of the latest milestone reached, for the home screen's "new milestone" dot. */
export function latestMilestoneDay(startDate: string, now = new Date()): number {
  return milestoneProgress(daysSince(startDate, now)).current.day;
}

/** A quit date that makes sense (YYYY-MM-DD): not in the future, and not decades back by a typing slip. */
export function isQuitDate(value: string, today: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2000-01-01' && value <= today;
}
