import { createStore, get, setMany, getMany } from 'idb-keyval';
import type { Lang } from './cards';
import type { DrawState } from './draw';

export const SCHEMA_VERSION = 1;

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
  cards: string[];
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
}

export interface AppData {
  collection: Record<string, CollectionEntry>;
  hooks: HookEntry[];
  drawState: DrawState;
  settings: Settings;
}

const store = createStore('off-the-hook', 'data');
const KEYS = ['collection', 'hooks', 'drawState', 'settings'] as const;

function defaultLang(): Lang {
  return navigator.language?.toLowerCase().startsWith('cs') ? 'cs' : 'en';
}

export function defaultData(): AppData {
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
      lang: defaultLang(),
      drawFrom: 'all',
    },
  };
}

/** Fill in anything missing, so older saves and backups keep working. */
function normalise(raw: Partial<AppData>): AppData {
  const d = defaultData();
  return {
    collection: raw.collection ?? d.collection,
    hooks: raw.hooks ?? d.hooks,
    drawState: { ...d.drawState, ...raw.drawState },
    settings: { ...d.settings, ...raw.settings },
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const version = await get<number>('schemaVersion', store);
    const values = await getMany(KEYS as unknown as string[], store);
    const raw: Partial<AppData> = {};
    KEYS.forEach((k, i) => {
      if (values[i] !== undefined) (raw as Record<string, unknown>)[k] = values[i];
    });
    // Future schema migrations go here, keyed on `version`.
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
    store,
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
