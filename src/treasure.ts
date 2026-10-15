/**
 * Sunken Treasure: money not spent on vaping since the start date. Calculated from the start date and
 * the weekly amount(s), never added up step by step, so it's always exact, keeps counting while the
 * app is closed, and never resets.
 */
import type { Lang } from './cards';

export type Currency = 'CZK' | 'EUR' | 'USD';
export const CURRENCIES: Currency[] = ['CZK', 'EUR', 'USD'];

export interface Rate {
  /** When this weekly amount took effect (ISO time). The first rate counts from the start date. */
  from: string;
  /** Weekly amount, in the treasure's currency. */
  perWeek: number;
}

export interface Treasure {
  /** Local calendar day counting starts on (YYYY-MM-DD), from its midnight. */
  startDate: string;
  rates: Rate[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Rough exchange rates, only for converting when she switches currency and for the comparisons. */
export const CZK_PER: Record<Currency, number> = { CZK: 1, EUR: 25, USD: 23 };

/** Correcting the amount this soon after setting it counts as fixing a typo, not a new period. */
const TYPO_FIX_MS = 10 * 60 * 1000;

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function startTime(t: Treasure): number {
  const [y, m, d] = t.startDate.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Total saved at `now`. Each weekly amount applies from when it was set until the next one. */
export function savedAt(t: Treasure, now = Date.now()): number {
  const start = startTime(t);
  let total = 0;
  t.rates.forEach((rate, i) => {
    const from = i === 0 ? start : Math.max(start, Date.parse(rate.from));
    const next = t.rates[i + 1];
    const to = next ? Math.max(start, Date.parse(next.from)) : now;
    const a = Math.min(from, now);
    const b = Math.min(to, now);
    if (b > a) total += (rate.perWeek * (b - a)) / WEEK_MS;
  });
  return total;
}

export const currentRate = (t: Treasure) => t.rates[t.rates.length - 1]?.perWeek ?? 0;

/** Set a new weekly amount from `now` on. What was already saved keeps its old amount. */
export function withWeeklyAmount(t: Treasure, perWeek: number, now = new Date()): Treasure {
  const last = t.rates[t.rates.length - 1];
  if (last && now.getTime() - Date.parse(last.from) < TYPO_FIX_MS) {
    return { ...t, rates: [...t.rates.slice(0, -1), { ...last, perWeek }] };
  }
  return { ...t, rates: [...t.rates, { from: now.toISOString(), perWeek }] };
}

export function newTreasure(perWeek: number, startDate: string, now = new Date()): Treasure {
  return { startDate, rates: [{ from: now.toISOString(), perWeek }] };
}

/** Re-express all amounts in another currency (at the rough rates above). */
export function convertTreasure(t: Treasure, from: Currency, to: Currency): Treasure {
  const f = CZK_PER[from] / CZK_PER[to];
  return { ...t, rates: t.rates.map((r) => ({ ...r, perWeek: Math.round(r.perWeek * f * 100) / 100 })) };
}

export const defaultCurrency = (lang: Lang): Currency => (lang === 'cs' ? 'CZK' : 'EUR');

const locale = (lang: Lang) => (lang === 'cs' ? 'cs-CZ' : 'en-GB');

export function formatMoney(amount: number, currency: Currency, lang: Lang, digits = 2): string {
  return new Intl.NumberFormat(locale(lang), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** The amount split for display: the normal money string, with extra sub-cent digits after the cents. */
export function moneyParts(amount: number, currency: Currency, lang: Lang, extraDigits = 4) {
  // Format the amount cut (not rounded) to cents, so the cents never run ahead of the digits after them.
  const cents = Math.floor(amount * 100) / 100;
  const parts = new Intl.NumberFormat(locale(lang), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(cents);
  const extra = String(Math.floor((amount - cents) * 10 ** (2 + extraDigits))).padStart(extraDigits, '0').slice(-extraDigits);
  const i = parts.findIndex((p) => p.type === 'fraction');
  return {
    before: parts.slice(0, i + 1).map((p) => p.value).join(''),
    extra,
    after: parts.slice(i + 1).map((p) => p.value).join(''),
  };
}

/** Parse what she typed: accepts "300", "300,50", "1 200", "1.200,5". */
export function parseAmount(text: string): number | null {
  let s = text.replace(/[\s ]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 1e7 ? n : null;
}
