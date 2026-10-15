import type { Lang } from './cards';
import { CZK_PER, type Currency } from './treasure';

/**
 * What the treasure would already buy. Prices are rough, in Kč, converted for € and $.
 * Czech uses "N×" so the nouns never need declining.
 */
export interface Comparison {
  id: string;
  czk: number;
  /** Trips get an emoji when shown as the headline. */
  travel?: string;
  /** Jungkook things: one is always in the list when she can afford one (D45). */
  jungkook?: true;
  en: [one: string, many: (n: string) => string];
  cs: (n: string) => string;
}

export const COMPARISONS: Comparison[] = [
  { id: 'tuna-can', czk: 45, en: ['a can of tuna. Your cousin. Too soon?', (n) => `${n} cans of tuna. Your cousins. Too soon?`], cs: (n) => `${n}× konzerva tuňáka. Tvoji bratranci. Moc brzo?` },
  { id: 'coffee', czk: 90, en: ['a fancy coffee with oat milk and attitude', (n) => `${n} fancy coffees with oat milk and attitude`], cs: (n) => `${n}× drahé kafe s ovesným mlékem a postojem` },
  { id: 'rubber-duck', czk: 100, en: ['a rubber duck, to assert dominance in the bath', (n) => `${n} rubber ducks, to assert dominance in the bath`], cs: (n) => `${n}× gumová kachnička na prosazení dominance ve vaně` },
  { id: 'kebab', czk: 150, en: ['a kebab at 2 a.m., zero regrets', (n) => `${n} kebabs at 2 a.m., zero regrets`], cs: (n) => `${n}× kebab ve dvě ráno, nula výčitek` },
  { id: 'spotify', czk: 199, en: ['a month of Spotify Premium. No ads, only bangers.', (n) => `${n} months of Spotify Premium. No ads, only bangers.`], cs: (n) => `${n}× měsíc Spotify Premium. Žádné reklamy, jen pecky.` },
  { id: 'pizza', czk: 250, en: ['a large pizza you swear you’ll share', (n) => `${n} large pizzas you swear you’ll share`], cs: (n) => `${n}× velká pizza, o kterou se prý rozdělíš` },
  { id: 'cinema', czk: 250, en: ['a cinema ticket (popcorn not included, priorities)', (n) => `${n} cinema tickets (popcorn not included, priorities)`], cs: (n) => `${n}× lístek do kina (popcorn zvlášť, priority)` },
  { id: 'netflix', czk: 300, en: ['a month of Netflix to rewatch the same show again', (n) => `${n} months of Netflix to rewatch the same show again`], cs: (n) => `${n}× měsíc Netflixu na pětadvacáté zhlédnutí stejného seriálu` },
  { id: 'jk-photocard', czk: 350, jungkook: true, en: ['a Jungkook photocard. The rare one. You know the one.', (n) => `${n} Jungkook photocards. The rare ones. Trade wisely.`], cs: (n) => `${n}× fotokartička s Jungkookem. Ta vzácná. Víš, která.` },
  { id: 'train-vienna', czk: 400, travel: '🚆', en: ['a train ticket Prague → Vienna', (n) => `${n} train tickets Prague → Vienna`], cs: (n) => `${n}× vlak Praha → Vídeň` },
  { id: 'sushi', czk: 600, en: ['a sushi dinner (no tuna, out of respect)', (n) => `${n} sushi dinners (no tuna, out of respect)`], cs: (n) => `${n}× večeře v sushi baru (bez tuňáka, z úcty)` },
  { id: 'jk-golden', czk: 600, jungkook: true, en: ['Jungkook’s album Golden. For the songs. And the photocard.', (n) => `${n} copies of Golden. For the songs. Mostly the photocards.`], cs: (n) => `${n}× Jungkookovo album Golden. Kvůli písničkám. A fotokartičkám.` },
  { id: 'bus-berlin', czk: 600, travel: '🚌', en: ['a bus ticket Prague → Berlin', (n) => `${n} bus tickets Prague → Berlin`], cs: (n) => `${n}× autobus Praha → Berlín` },
  { id: 'hostel', czk: 600, travel: '🛏️', en: ['a night in a hostel bunk above someone who snores', (n) => `${n} nights in a hostel bunk above someone who snores`], cs: (n) => `${n}× noc v hostelu na palandě nad někým, kdo chrápe` },
  { id: 'massage', czk: 900, en: ['an hour-long massage', (n) => `${n} hour-long massages`], cs: (n) => `${n}× hodinová masáž` },
  { id: 'jk-army-bomb', czk: 1500, jungkook: true, en: ['an ARMY Bomb, to wave at Jungkook from very far away', (n) => `${n} ARMY Bombs, to wave at Jungkook from very far away`], cs: (n) => `${n}× ARMY Bomb na mávání Jungkookovi z velké dálky` },
  { id: 'flight-london', czk: 2000, travel: '✈️', en: ['a one-way flight to London. Mind the gap.', (n) => `${n} one-way flights to London. Mind the gap.`], cs: (n) => `${n}× letenka do Londýna. Mind the gap.` },
  { id: 'flight-barcelona', czk: 2500, travel: '✈️', en: ['a one-way flight to Barcelona', (n) => `${n} one-way flights to Barcelona`], cs: (n) => `${n}× letenka do Barcelony` },
  { id: 'flight-lisbon', czk: 3500, travel: '✈️', en: ['a return flight to Lisbon, pastéis de nata extra', (n) => `${n} return flights to Lisbon, pastéis de nata extra`], cs: (n) => `${n}× zpáteční letenka do Lisabonu, pastéis de nata navíc` },
  { id: 'jk-ticket', czk: 4000, jungkook: true, en: ['a ticket to see Jungkook live (front row, elbows out, screaming included)', (n) => `${n} tickets to see Jungkook live (front row, elbows out, screaming included)`], cs: (n) => `${n}× lístek na Jungkooka naživo (první řada, lokty od těla, ječení v ceně)` },
  { id: 'aquarium', czk: 5000, en: ['a real aquarium, for your real fish friends', (n) => `${n} real aquariums, for your real fish friends`], cs: (n) => `${n}× opravdové akvárium pro opravdové rybí kamarády` },
  { id: 'flight-iceland', czk: 6000, travel: '🌋', en: ['a return flight to Iceland, to stare at volcanoes', (n) => `${n} return flights to Iceland, to stare at volcanoes`], cs: (n) => `${n}× zpáteční letenka na Island, koukat na sopky` },
  { id: 'interrail', czk: 8000, travel: '🚆', en: ['an Interrail pass: 7 days, all of Europe', (n) => `${n} Interrail passes: 7 days, all of Europe`], cs: (n) => `${n}× Interrail: 7 dní, celá Evropa` },
  { id: 'rome', czk: 9000, travel: '🏛️', en: ['a weekend in Rome (flights + 2 nights)', (n) => `${n} weekends in Rome (flights + 2 nights)`], cs: (n) => `${n}× víkend v Římě (letenky + 2 noci)` },
  { id: 'jk-soundcheck', czk: 12000, jungkook: true, en: ['a VIP soundcheck ticket: hear Jungkook warm up before everyone else', (n) => `${n} VIP soundcheck tickets: hear Jungkook warm up before everyone else`], cs: (n) => `${n}× VIP lístek na soundcheck: slyšet Jungkooka rozezpívávat se dřív než všichni ostatní` },
  { id: 'coffin', czk: 15000, en: ['a very nice coffin. No longer needed. Love that.', (n) => `${n} very nice coffins. No longer needed. Love that.`], cs: (n) => `${n}× moc pěkná rakev. Už ji nepotřebuješ. Paráda.` },
  { id: 'seoul', czk: 20000, travel: '🇰🇷', jungkook: true, en: ['a return flight to Seoul. The HYBE building is very photogenic.', (n) => `${n} return flights to Seoul. The HYBE building is very photogenic.`], cs: (n) => `${n}× zpáteční letenka do Soulu. Budova HYBE je moc fotogenická.` },
  { id: 'tokyo', czk: 22000, travel: '✈️', en: ['a return flight to Tokyo', (n) => `${n} return flights to Tokyo`], cs: (n) => `${n}× zpáteční letenka do Tokia` },
  { id: 'busan', czk: 26000, travel: '🐟', jungkook: true, en: ['a trip to Busan, Jungkook’s hometown. Skip the fish market. For me.', (n) => `${n} trips to Busan, Jungkook’s hometown. Skip the fish market. For me.`], cs: (n) => `${n}× výlet do Pusanu, Jungkookova rodného města. Rybí trh vynech. Kvůli mně.` },
  { id: 'bali', czk: 30000, travel: '🏝️', en: ['two weeks in Bali, doing absolutely nothing', (n) => `${n} two-week trips to Bali, doing absolutely nothing`], cs: (n) => `${n}× dva týdny na Bali, nicneděláním` },
  { id: 'jk-concert-trip', czk: 40000, travel: '💜', jungkook: true, en: ['a trip to Seoul to see Jungkook live: flights, hotel, ticket, ARMY Bomb', (n) => `${n} trips to Seoul to see Jungkook live: flights, hotel, ticket, ARMY Bomb`], cs: (n) => `${n}× výlet do Soulu na Jungkooka naživo: letenky, hotel, lístek, ARMY Bomb` },
  { id: 'maldives', czk: 60000, travel: '🦈', en: ['a trip to swim with whale sharks in the Maldives', (n) => `${n} trips to swim with whale sharks in the Maldives`], cs: (n) => `${n}× plavání se žraloky velrybími na Maledivách` },
];

export const countOf = (c: Comparison, amount: number, currency: Currency) => Math.floor((amount * CZK_PER[currency]) / c.czk);

export function describeComparison(c: Comparison, n: number, lang: Lang): string {
  const num = new Intl.NumberFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB').format(n);
  if (lang === 'cs') return c.cs(num);
  return n === 1 ? c.en[0] : c.en[1](num);
}

/**
 * The biggest trip she can already afford as the headline (she loves travelling), plus a few others.
 * One of the others is always a Jungkook thing, if she can afford one (D45).
 * `seed` picks which others; changing it shows a new set.
 */
export function pickComparisons(amount: number, currency: Currency, seed: number, others = 3) {
  const affordable = COMPARISONS.filter((c) => countOf(c, amount, currency) >= 1);
  const trips = affordable.filter((c) => c.travel);
  const headline = trips[trips.length - 1] ?? null;
  const rest = affordable.filter((c) => c !== headline);
  // Deterministic shuffle so the list doesn't jump around while the counter ticks.
  const shuffled = rest
    .map((c, i) => ({ c, k: Math.sin((i + 1) * 12.9898 + seed * 78.233) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);
  const shown = shuffled.slice(0, others);
  const jungkook = shuffled.find((c) => c.jungkook);
  if (jungkook && shown.length && !shown.some((c) => c.jungkook)) shown[shown.length - 1] = jungkook;
  return { headline, others: shown };
}
