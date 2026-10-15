import type { AppData, HookEntry } from './storage';

export type Rated = HookEntry & { before: number; after: number };

/** Hooks rated both at the start and at the end, oldest first. */
export function ratedHooks(data: AppData): Rated[] {
  return data.hooks
    .filter((h): h is Rated => h.before !== undefined && h.after !== undefined)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DayPoint {
  day: string; // YYYY-MM-DD, local time
  date: Date; // local midnight
  avgBefore: number;
  count: number;
}

/** Average starting strength per day over the last `days` days, for days that have a rating. */
export function dailyTrend(data: AppData, days = 30, now = new Date()): DayPoint[] {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const groups = new Map<string, number[]>();
  for (const h of data.hooks) {
    if (h.before === undefined || new Date(h.startedAt) < cutoff) continue;
    const k = dayKey(h.startedAt);
    groups.set(k, [...(groups.get(k) ?? []), h.before]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => {
      const [y, m, d] = day.split('-').map(Number);
      return { day, date: new Date(y, m - 1, d), avgBefore: values.reduce((s, v) => s + v, 0) / values.length, count: values.length };
    });
}

/** Change in starting strength: average of the last few days minus the first few. Negative = weaker. */
export function trendChange(points: DayPoint[]): number | null {
  if (points.length < 2) return null;
  const n = Math.min(3, Math.floor(points.length / 2));
  const avg = (ps: DayPoint[]) => ps.reduce((s, p) => s + p.avgBefore, 0) / ps.length;
  return avg(points.slice(-n)) - avg(points.slice(0, n));
}
