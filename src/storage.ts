import { createStore, get, setMany, getMany } from 'idb-keyval';
import type { Activity } from './activities';
import type { Lang, Place } from './cards';
import type { DrawState } from './draw';
import { emptySeabed, type Seabed } from './seabed';
import { defaultCurrency, type Currency, type Treasure } from './treasure';

/** 2: the quit date moved out of the treasure (D44), and the seabed was added (D43). */
export const SCHEMA_VERSION = 2;

export interface CollectionEntry {
  count: number;
  firstCaught: string;
  favourite: boolean;
}

export type HookResult = 'passed' | 'notyet' | 'slipped';

export interface HookEntry {
  id: string;
  startedAt: string;
  endedAt: string;
  before?: number;
  after?: number;
  /** Every card drawn, including ones thrown back. */
  cards: string[];
  /** Cards she actually completed (added later; older entries may not have it). */
  completed?: string[];
  /** Rounds of Dodge the hooks she played (D50); absent when none. */
  rounds?: number;
  /** Breaths taken in Bubbles, over all its rounds (D54); absent when none. */
  breaths?: number;
  result: HookResult;
  baitNote?: string;
}

export interface Settings {
  onboardingDone: boolean;
  /** Has seen the "how it works" intro. */
  introSeen: boolean;
  /** Deck version she last saw; null until first launch is finished. */
  lastDeckVersion: number | null;
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  lang: Lang;
  drawFrom: 'all' | 'favourites';
  currency: Currency;
  /** Where she said she was last time; only cards that fit are drawn. */
  place: Place;
  /** Day of the latest milestone she has seen in the treasure, for the "new milestone" dot. */
  milestoneSeen: number;
  /** What her last brutal hooks started with, newest last, so it's never the same three times running (D54). */
  brutalPicks: Activity[];
}

export interface AppData {
  collection: Record<string, CollectionEntry>;
  hooks: HookEntry[];
  drawState: DrawState;
  settings: Settings;
  /**
   * The day she quit (YYYY-MM-DD), asked at the end of the intro (D44). Milestones, seabed decorations
   * and the treasure all count from it. Null only until she has answered or skipped the question.
   */
  quitDate: string | null;
  /** Sunken Treasure, the money part; null until she sets it up (it's optional). */
  treasure: Treasure | null;
  /** Decorations earned at milestones (D43). */
  seabed: Seabed;
  /** Every tap on the tuna on the home screen, ever (D49). Shown in the Logbook. */
  pets: number;
}

let storeHandle: ReturnType<typeof createStore> | undefined;
// Opened on first use, so this module can also be imported where IndexedDB doesn't exist (tests).
const store = () => (storeHandle ??= createStore('off-the-hook', 'data'));
const KEYS = ['collection', 'hooks', 'drawState', 'settings', 'quitDate', 'treasure', 'seabed', 'pets'] as const;

function defaultLang(): Lang {
  return navigator.language?.toLowerCase().startsWith('cs') ? 'cs' : 'en';
}

export function defaultData(): AppData {
  const lang = defaultLang();
  return {
    collection: {},
    hooks: [],
    drawState: { drawsSinceRare: 0, previousCardId: null },
    settings: {
      onboardingDone: false,
      introSeen: false,
      lastDeckVersion: null,
      sound: true,
      haptics: true,
      reducedMotion: false,
      lang,
      drawFrom: 'all',
      currency: defaultCurrency(lang),
      place: 'home',
      milestoneSeen: 0,
      brutalPicks: [],
    },
    quitDate: null,
    treasure: null,
    seabed: emptySeabed(),
    pets: 0,
  };
}

/** Fill in anything missing, so older saves and backups keep working. */
function normalise(raw: Partial<AppData>): AppData {
  const d = defaultData();
  // Before D44 the quit date was the treasure's start date (schema 1, and older backups).
  const legacy = raw.treasure as (Treasure & { startDate?: string }) | null | undefined;
  return {
    collection: raw.collection ?? d.collection,
    hooks: raw.hooks ?? d.hooks,
    drawState: { ...d.drawState, ...raw.drawState },
    settings: {
      ...d.settings,
      ...raw.settings,
      currency: raw.settings?.currency ?? defaultCurrency(raw.settings?.lang ?? d.settings.lang),
    },
    quitDate: raw.quitDate ?? legacy?.startDate ?? null,
    treasure: legacy ? { rates: legacy.rates } : null,
    seabed: { ...d.seabed, ...raw.seabed },
    pets: raw.pets ?? d.pets,
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const version = await get<number>('schemaVersion', store());
    const values = await getMany(KEYS as unknown as string[], store());
    const raw: Partial<AppData> = {};
    KEYS.forEach((k, i) => {
      if (values[i] !== undefined) (raw as Record<string, unknown>)[k] = values[i];
    });
    // Schema migrations happen in normalise(), based on what's there, so backups get them too.
    void version;
    return normalise(raw);
  } catch {
    return defaultData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  await setMany(
    [
      ['schemaVersion', SCHEMA_VERSION],
      ...KEYS.map((k) => [k, data[k]] as [string, unknown]),
    ],
    store(),
  );
}

/** Ask the browser not to clear our storage (decision D24). */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* not supported, nothing to do */
  }
}

export function schoolSize(data: AppData): number {
  return data.hooks.filter((h) => h.result === 'passed').length;
}

/** Average drop in hook strength over hooks rated both before and after; null if none yet. */
export function averagePullDrop(data: AppData): number | null {
  const rated = data.hooks.filter((h) => h.before !== undefined && h.after !== undefined);
  if (!rated.length) return null;
  return rated.reduce((sum, h) => sum + (h.before! - h.after!), 0) / rated.length;
}

// ---- Backup and restore (decision D25) ----

export function makeBackup(data: AppData): string {
  return JSON.stringify(
    { app: 'off-the-hook', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...data },
    null,
    2,
  );
}

export function parseBackup(text: string): AppData {
  const raw = JSON.parse(text);
  if (raw?.app !== 'off-the-hook' || typeof raw.schemaVersion !== 'number') {
    throw new Error('not-a-backup');
  }
  return normalise(raw);
}
