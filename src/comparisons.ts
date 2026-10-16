import type { Lang } from './cards';
import { CZK_PER, type Currency } from './treasure';

/**
 * What the treasure would already buy. Prices are rough, in Kč, converted for € and $.
 * Czech uses "N×" so the nouns never need declining.
 */
export interface Comparison {
  id: string;
  czk: number;
  /** Jungkook things: one is always in the list when she can afford one (D45). */
  jungkook?: true;
  /** Japan, South Korea and China, where she'd love to go: one is always in the list too (D46). */
  asia?: true;
  en: [one: string, many: (n: string) => string];
  cs: (n: string) => string;
}

export const COMPARISONS: Comparison[] = [
  { id: 'jp-onigiri', czk: 30, asia: true, en: ['a tuna-mayo onigiri from a Tokyo konbini. I’m choosing not to ask questions.', (n) => `${n} tuna-mayo onigiri from a Tokyo konbini. I’m choosing not to ask questions.`], cs: (n) => `${n}× onigiri s tuňákem a majonézou z tokijské večerky. Radši se neptám.` },
  { id: 'tuna-can', czk: 45, en: ['a can of tuna. Your cousin. Too soon?', (n) => `${n} cans of tuna. Your cousins. Too soon?`], cs: (n) => `${n}× konzerva tuňáka. Tvoji bratranci. Moc brzo?` },
  { id: 'cn-bubble-tea', czk: 55, asia: true, en: ['a bubble tea in Shanghai, size: enormous', (n) => `${n} bubble teas in Shanghai, size: enormous`], cs: (n) => `${n}× bubble tea v Šanghaji, velikost: obrovská` },
  { id: 'jp-gachapon', czk: 60, asia: true, en: ['a gachapon capsule toy in Tokyo. Could be a tiny sushi. Could be a tiny me.', (n) => `${n} gachapon capsule toys in Tokyo. Statistically, one of them is a tiny me.`], cs: (n) => `${n}× hračka z tokijského automatu gačapon. Třeba malé sushi. Třeba malý já.` },
  { id: 'kr-tteokbokki', czk: 75, asia: true, en: ['a portion of street tteokbokki in Seoul, spicy enough to forget your own name', (n) => `${n} portions of street tteokbokki in Seoul, spicy enough to forget your own name`], cs: (n) => `${n}× porce pouličních tteokbokki v Soulu, tak pálivých, že zapomeneš, jak se jmenuješ` },
  { id: 'chai', czk: 90, en: ['a fancy spiced chai with oat milk and attitude', (n) => `${n} fancy spiced chais with oat milk and attitude`], cs: (n) => `${n}× drahý kořeněný čaj chai s ovesným mlékem a postojem` },
  { id: 'rubber-duck', czk: 100, en: ['a rubber duck, to assert dominance in the bath', (n) => `${n} rubber ducks, to assert dominance in the bath`], cs: (n) => `${n}× gumová kachnička na prosazení dominance ve vaně` },
  { id: 'cn-xiaolongbao', czk: 100, asia: true, en: ['a basket of soup dumplings in Shanghai. Bite, slurp, burn your tongue, repeat.', (n) => `${n} baskets of soup dumplings in Shanghai. Bite, slurp, burn your tongue, repeat.`], cs: (n) => `${n}× košík knedlíčků s polévkou v Šanghaji. Kousnout, srknout, spálit si jazyk, znova.` },
  { id: 'cn-tea-house', czk: 100, asia: true, en: ['a pot of tea in a Chengdu tea house. Ear cleaning optional. Yes, really.', (n) => `${n} pots of tea in a Chengdu tea house. Ear cleaning optional. Yes, really.`], cs: (n) => `${n}× konvička čaje v čajovně v Čcheng-tu. Čištění uší volitelné. Fakt.` },
  { id: 'jp-kitkat', czk: 120, asia: true, en: ['a bag of Japanese KitKats in flavours that shouldn’t exist. Wasabi. Sake. Why.', (n) => `${n} bags of Japanese KitKats in flavours that shouldn’t exist. Wasabi. Sake. Why.`], cs: (n) => `${n}× sáček japonských KitKatů v příchutích, které by neměly existovat. Wasabi. Saké. Proč.` },
  { id: 'kebab', czk: 150, en: ['a kebab at 2 a.m., zero regrets', (n) => `${n} kebabs at 2 a.m., zero regrets`], cs: (n) => `${n}× kebab ve dvě ráno, nula výčitek` },
  { id: 'jp-genmaicha', czk: 150, asia: true, en: ['a bag of genmaicha from Kyoto: rice tea, like your homemade one, but well travelled', (n) => `${n} bags of genmaicha from Kyoto: rice tea, like your homemade one, but well travelled`], cs: (n) => `${n}× sáček čaje genmaiča z Kjóta: rýžový čaj jako ten tvůj domácí, jen víc procestovaný` },
  { id: 'cn-maglev', czk: 160, asia: true, en: ['a ride on the Shanghai maglev, the train that floats', (n) => `${n} rides on the Shanghai maglev, the train that floats`], cs: (n) => `${n}× jízda šanghajským maglevem, vlakem, který se vznáší` },
  { id: 'jp-ghibli', czk: 170, asia: true, en: ['a ticket to the Ghibli Museum in Tokyo. Totoro is expecting you.', (n) => `${n} tickets to the Ghibli Museum in Tokyo. Totoro is expecting you all.`], cs: (n) => `${n}× vstupenka do muzea Ghibli v Tokiu. Totoro už čeká.` },
  { id: 'cn-pandas', czk: 180, asia: true, en: ['a ticket to see the giant pandas in Chengdu. Lazier than a tuna on a Sunday.', (n) => `${n} tickets to see the giant pandas in Chengdu. Lazier than a tuna on a Sunday.`], cs: (n) => `${n}× vstupenka k pandám velkým v Čcheng-tu. Línější než tuňák v neděli.` },
  { id: 'spotify', czk: 199, en: ['a month of Spotify Premium. No ads, only bangers.', (n) => `${n} months of Spotify Premium. No ads, only bangers.`], cs: (n) => `${n}× měsíc Spotify Premium. Žádné reklamy, jen pecky.` },
  { id: 'jp-ramen', czk: 200, asia: true, en: ['a bowl of ramen in a tiny Tokyo shop with eight seats and a queue', (n) => `${n} bowls of ramen in tiny Tokyo shops with eight seats and a queue`], cs: (n) => `${n}× miska ramenu v malém tokijském bistru s osmi místy a frontou` },
  { id: 'kr-sheet-masks', czk: 200, asia: true, en: ['ten Korean sheet masks, for looking like a ghost on purpose', (n) => `${n} packs of ten Korean sheet masks, for looking like a ghost on purpose`], cs: (n) => `${n}× deset korejských pleťových masek, abys schválně vypadala jako duch` },
  { id: 'pizza', czk: 250, en: ['a large pizza you swear you’ll share', (n) => `${n} large pizzas you swear you’ll share`], cs: (n) => `${n}× velká pizza, o kterou se prý rozdělíš` },
  { id: 'cinema', czk: 250, en: ['a cinema ticket (popcorn not included, priorities)', (n) => `${n} cinema tickets (popcorn not included, priorities)`], cs: (n) => `${n}× lístek do kina (popcorn zvlášť, priority)` },
  { id: 'netflix', czk: 300, en: ['a month of Netflix to rewatch the same show again', (n) => `${n} months of Netflix to rewatch the same show again`], cs: (n) => `${n}× měsíc Netflixu na pětadvacáté zhlédnutí stejného seriálu` },
  { id: 'jk-photocard', czk: 350, jungkook: true, en: ['a Jungkook photocard. The rare one. You know the one.', (n) => `${n} Jungkook photocards. The rare ones. Trade wisely.`], cs: (n) => `${n}× fotokartička s Jungkookem. Ta vzácná. Víš, která.` },
  { id: 'kr-noraebang', czk: 350, asia: true, jungkook: true, en: ['an hour in a Seoul karaoke room. Seven is mandatory.', (n) => `${n} hours in a Seoul karaoke room. Seven is mandatory.`], cs: (n) => `${n}× hodina v soulském karaoke. Seven je povinná.` },
  { id: 'train-vienna', czk: 400, en: ['a train ticket Prague → Vienna', (n) => `${n} train tickets Prague → Vienna`], cs: (n) => `${n}× vlak Praha → Vídeň` },
  { id: 'kr-hanbok', czk: 450, asia: true, en: ['a day in a rented hanbok, which gets you into Gyeongbokgung Palace for free', (n) => `${n} days in a rented hanbok, which gets you into Gyeongbokgung Palace for free`], cs: (n) => `${n}× den v půjčeném hanboku. V něm tě do paláce Kjongbokkung pustí zadarmo.` },
  { id: 'sushi', czk: 600, en: ['a sushi dinner (no tuna, out of respect)', (n) => `${n} sushi dinners (no tuna, out of respect)`], cs: (n) => `${n}× večeře v sushi baru (bez tuňáka, z úcty)` },
  { id: 'jk-golden', czk: 600, jungkook: true, en: ['Jungkook’s album Golden. For the songs. And the photocard.', (n) => `${n} copies of Golden. For the songs. Mostly the photocards.`], cs: (n) => `${n}× Jungkookovo album Golden. Kvůli písničkám. A fotokartičkám.` },
  { id: 'bus-berlin', czk: 600, en: ['a bus ticket Prague → Berlin', (n) => `${n} bus tickets Prague → Berlin`], cs: (n) => `${n}× autobus Praha → Berlín` },
  { id: 'hostel', czk: 600, en: ['a night in a hostel bunk above someone who snores', (n) => `${n} nights in a hostel bunk above someone who snores`], cs: (n) => `${n}× noc v hostelu na palandě nad někým, kdo chrápe` },
  { id: 'kr-bbq', czk: 600, asia: true, en: ['a Korean barbecue dinner in Seoul, grilled at your own table', (n) => `${n} Korean barbecue dinners in Seoul, grilled at your own table`], cs: (n) => `${n}× korejské barbecue v Soulu, které si griluješ sama u stolu` },
  { id: 'jp-tea-ceremony', czk: 600, asia: true, en: ['a tea ceremony in Kyoto. Very calm. Very slow. No slurping.', (n) => `${n} tea ceremonies in Kyoto. Very calm. Very slow. No slurping.`], cs: (n) => `${n}× čajový obřad v Kjótu. Klid. Pomalu. Žádné srkání.` },
  { id: 'massage', czk: 900, en: ['an hour-long massage', (n) => `${n} hour-long massages`], cs: (n) => `${n}× hodinová masáž` },
  { id: 'cn-great-wall', czk: 900, asia: true, en: ['a day on the Great Wall at Mutianyu, with a toboggan ride back down', (n) => `${n} days on the Great Wall at Mutianyu, with a toboggan ride back down`], cs: (n) => `${n}× den na Velké čínské zdi v Mu-tchien-jü a dolů po bobové dráze` },
  { id: 'kr-jeju', czk: 900, asia: true, en: ['a flight from Seoul to Jeju Island, for the tangerines', (n) => `${n} flights from Seoul to Jeju Island, for the tangerines`], cs: (n) => `${n}× letenka ze Soulu na ostrov Čedžu, kvůli mandarinkám` },
  { id: 'kr-ktx', czk: 1000, asia: true, en: ['a KTX bullet train Seoul → Busan. No zombies this time.', (n) => `${n} KTX bullet trains Seoul → Busan. No zombies this time.`], cs: (n) => `${n}× rychlovlak KTX Soul → Pusan. Tentokrát bez zombií.` },
  { id: 'cn-peking-duck', czk: 1200, asia: true, en: ['a whole Peking duck in Beijing. Ducks aren’t fish. Not my problem.', (n) => `${n} whole Peking ducks in Beijing. Ducks aren’t fish. Not my problem.`], cs: (n) => `${n}× celá pekingská kachna v Pekingu. Kachny nejsou ryby. Není to můj problém.` },
  { id: 'jk-army-bomb', czk: 1500, jungkook: true, en: ['an ARMY Bomb, to wave at Jungkook from very far away', (n) => `${n} ARMY Bombs, to wave at Jungkook from very far away`], cs: (n) => `${n}× ARMY Bomb na mávání Jungkookovi z velké dálky` },
  { id: 'jp-disneysea', czk: 1500, asia: true, en: ['a day at Tokyo DisneySea, the only sea I’ll let you visit without me', (n) => `${n} days at Tokyo DisneySea, the only sea I’ll let you visit without me`], cs: (n) => `${n}× den v Tokyo DisneySea, jediném moři, kam tě pustím beze mě` },
  { id: 'flight-london', czk: 2000, en: ['a one-way flight to London. Mind the gap.', (n) => `${n} one-way flights to London. Mind the gap.`], cs: (n) => `${n}× letenka do Londýna. Mind the gap.` },
  { id: 'jp-shinkansen', czk: 2200, asia: true, en: ['a Shinkansen ticket Tokyo → Kyoto, at 285 km/h', (n) => `${n} Shinkansen tickets Tokyo → Kyoto, at 285 km/h`], cs: (n) => `${n}× šinkansen Tokio → Kjóto, 285 km/h` },
  { id: 'flight-barcelona', czk: 2500, en: ['a one-way flight to Barcelona', (n) => `${n} one-way flights to Barcelona`], cs: (n) => `${n}× letenka do Barcelony` },
  { id: 'flight-lisbon', czk: 3500, en: ['a return flight to Lisbon, pastéis de nata extra', (n) => `${n} return flights to Lisbon, pastéis de nata extra`], cs: (n) => `${n}× zpáteční letenka do Lisabonu, pastéis de nata navíc` },
  { id: 'jk-ticket', czk: 4000, jungkook: true, en: ['a ticket to see Jungkook live (front row, elbows out, screaming included)', (n) => `${n} tickets to see Jungkook live (front row, elbows out, screaming included)`], cs: (n) => `${n}× lístek na Jungkooka naživo (první řada, lokty od těla, ječení v ceně)` },
  { id: 'jp-ryokan', czk: 4500, asia: true, en: ['a night in a ryokan with a hot spring. Robe and tiny slippers included.', (n) => `${n} nights in a ryokan with a hot spring. Robe and tiny slippers included.`], cs: (n) => `${n}× noc v rjokanu s horkým pramenem. Župan a malinké pantofle v ceně.` },
  { id: 'aquarium', czk: 5000, en: ['a real aquarium, for your real fish friends', (n) => `${n} real aquariums, for your real fish friends`], cs: (n) => `${n}× opravdové akvárium pro opravdové rybí kamarády` },
  { id: 'flight-iceland', czk: 6000, en: ['a return flight to Iceland, to stare at volcanoes', (n) => `${n} return flights to Iceland, to stare at volcanoes`], cs: (n) => `${n}× zpáteční letenka na Island, koukat na sopky` },
  { id: 'interrail', czk: 8000, en: ['an Interrail pass: 7 days, all of Europe', (n) => `${n} Interrail passes: 7 days, all of Europe`], cs: (n) => `${n}× Interrail: 7 dní, celá Evropa` },
  { id: 'jp-rail-pass', czk: 8000, asia: true, en: ['a 7-day Japan Rail Pass: bullet trains all week', (n) => `${n} 7-day Japan Rail Passes: bullet trains all week`], cs: (n) => `${n}× Japan Rail Pass na 7 dní: celý týden šinkansenem` },
  { id: 'rome', czk: 9000, en: ['a weekend in Rome (flights + 2 nights)', (n) => `${n} weekends in Rome (flights + 2 nights)`], cs: (n) => `${n}× víkend v Římě (letenky + 2 noci)` },
  { id: 'jk-soundcheck', czk: 12000, jungkook: true, en: ['a VIP soundcheck ticket: hear Jungkook warm up before everyone else', (n) => `${n} VIP soundcheck tickets: hear Jungkook warm up before everyone else`], cs: (n) => `${n}× VIP lístek na soundcheck: slyšet Jungkooka rozezpívávat se dřív než všichni ostatní` },
  { id: 'coffin', czk: 15000, en: ['a very nice coffin. No longer needed. Love that.', (n) => `${n} very nice coffins. No longer needed. Love that.`], cs: (n) => `${n}× moc pěkná rakev. Už ji nepotřebuješ. Paráda.` },
  { id: 'cn-beijing', czk: 17000, asia: true, en: ['a return flight to Beijing, to see the Forbidden City (now allowed)', (n) => `${n} return flights to Beijing, to see the Forbidden City (now allowed)`], cs: (n) => `${n}× zpáteční letenka do Pekingu, do Zakázaného města (už povoleného)` },
  { id: 'seoul', czk: 20000, asia: true, jungkook: true, en: ['a return flight to Seoul. The HYBE building is very photogenic.', (n) => `${n} return flights to Seoul. The HYBE building is very photogenic.`], cs: (n) => `${n}× zpáteční letenka do Soulu. Budova HYBE je moc fotogenická.` },
  { id: 'tokyo', czk: 22000, asia: true, en: ['a return flight to Tokyo', (n) => `${n} return flights to Tokyo`], cs: (n) => `${n}× zpáteční letenka do Tokia` },
  { id: 'busan', czk: 26000, asia: true, jungkook: true, en: ['a trip to Busan, Jungkook’s hometown. Skip the fish market. For me.', (n) => `${n} trips to Busan, Jungkook’s hometown. Skip the fish market. For me.`], cs: (n) => `${n}× výlet do Pusanu, Jungkookova rodného města. Rybí trh vynech. Kvůli mně.` },
  { id: 'bali', czk: 30000, en: ['two weeks in Bali, doing absolutely nothing', (n) => `${n} two-week trips to Bali, doing absolutely nothing`], cs: (n) => `${n}× dva týdny na Bali, nicneděláním` },
  { id: 'jk-concert-trip', czk: 40000, asia: true, jungkook: true, en: ['a trip to Seoul to see Jungkook live: flights, hotel, ticket, ARMY Bomb', (n) => `${n} trips to Seoul to see Jungkook live: flights, hotel, ticket, ARMY Bomb`], cs: (n) => `${n}× výlet do Soulu na Jungkooka naživo: letenky, hotel, lístek, ARMY Bomb` },
  { id: 'cn-tour', czk: 55000, asia: true, en: ['two weeks in China: the Great Wall, the Terracotta Army and Shanghai at night', (n) => `${n} two-week trips around China: the Great Wall, the Terracotta Army and Shanghai at night`], cs: (n) => `${n}× dva týdny v Číně: Velká zeď, terakotová armáda a Šanghaj v noci` },
  { id: 'maldives', czk: 60000, en: ['a trip to swim with whale sharks in the Maldives', (n) => `${n} trips to swim with whale sharks in the Maldives`], cs: (n) => `${n}× plavání se žraloky velrybími na Maledivách` },
  { id: 'jp-sakura', czk: 70000, asia: true, en: ['two weeks in Japan in cherry blossom season', (n) => `${n} two-week trips to Japan in cherry blossom season`], cs: (n) => `${n}× dva týdny v Japonsku, když kvetou sakury` },
  { id: 'east-asia', czk: 90000, asia: true, en: ['a month in Tokyo, Seoul and Beijing, all in one trip', (n) => `${n} month-long trips to Tokyo, Seoul and Beijing`], cs: (n) => `${n}× měsíc v Tokiu, Soulu a Pekingu, všechno v jednom výletu` },
];

export const countOf = (c: Comparison, amount: number, currency: Currency) => Math.floor((amount * CZK_PER[currency]) / c.czk);

export function describeComparison(c: Comparison, n: number, lang: Lang): string {
  const num = new Intl.NumberFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB').format(n);
  if (lang === 'cs') return c.cs(num);
  return n === 1 ? c.en[0] : c.en[1](num);
}

/** Things she loves: once she can afford one of each, the list always has one (D45, D46). */
const ALWAYS_ONE: ((c: Comparison) => boolean | undefined)[] = [(c) => c.jungkook, (c) => c.asia];

/**
 * A few things she can already afford, all picked at random (D48). They always include a Jungkook
 * thing and something from Japan, South Korea or China, when she can afford them. `seed` picks
 * which; changing it shows a new set.
 */
export function pickComparisons(amount: number, currency: Currency, seed: number, count = 3): Comparison[] {
  const affordable = COMPARISONS.filter((c) => countOf(c, amount, currency) >= 1);
  // Deterministic shuffle so the list doesn't jump around while the counter ticks.
  const shuffled = affordable
    .map((c, i) => ({ c, k: Math.sin((i + 1) * 12.9898 + seed * 78.233) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);
  const picked = new Set<Comparison>();
  for (const loves of ALWAYS_ONE) {
    const c = shuffled.find(loves);
    if (c && ![...picked].some(loves)) picked.add(c);
  }
  for (const c of shuffled) picked.add(c);
  // Back in shuffled order, so the guaranteed ones aren't always on top.
  return [...picked].slice(0, count).sort((a, b) => shuffled.indexOf(a) - shuffled.indexOf(b));
}
