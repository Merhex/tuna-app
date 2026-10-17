import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { MILESTONES } from '../milestones';
import { coralLook, markSeen, withEarned } from '../seabed';
import { useApp } from '../state';

/**
 * Earns the decorations she has reached (D43) and returns the ones that are new on this visit, in
 * timeline order, for their sparkle; they're marked as seen straight away. Used by the home screen,
 * whether it shows the 3D tank (D55) or the drawn seabed below.
 */
export function useSeabed(): string[] {
  const { data, update } = useApp();
  const [sparkling, setSparkling] = useState<string[]>([]);
  const earned = data.seabed.earned;

  // Earn what's been reached. Only on the home screen, so a date she merely scrolls past in a date
  // picker never earns anything (earned is for good). Checked again every minute in case the day
  // turns over while the app is open.
  useEffect(() => {
    const earn = () =>
      update((d) => {
        const seabed = withEarned(d.seabed, d.quitDate);
        return seabed === d.seabed ? d : { ...d, seabed };
      });
    earn();
    const id = setInterval(earn, 60_000);
    return () => clearInterval(id);
  }, []);

  const unseen = MILESTONES.filter((m) => earned[m.id] && !earned[m.id].seen).map((m) => m.id);
  useEffect(() => {
    if (!unseen.length) return;
    setSparkling((s) => [...s, ...unseen.filter((id) => !s.includes(id))]);
    update((d) => ({ ...d, seabed: markSeen(d.seabed, unseen) }));
  }, [unseen.join()]);

  return sparkling;
}

/**
 * The drawn seabed (D43): sand and seaweed, plus a decoration for every milestone she has reached,
 * with `sparkling` ones (see useSeabed) sparkling. The home screen shows it until the 3D tank is
 * ready, and instead of it on a phone without 3D. Everything here is backdrop: behind the school,
 * nothing to tap, hidden from screen readers.
 */
export function Seabed({ sparkling }: { sparkling: string[] }) {
  const { data } = useApp();
  const earned = data.seabed.earned;

  const coral = coralLook(data.seabed.coralMonths);
  const layer = (which: 'back' | 'front') =>
    MILESTONES.filter((m) => earned[m.id] && SPOTS[m.id]?.layer === which).map((m) => {
      const spot = SPOTS[m.id];
      const order = sparkling.indexOf(m.id);
      const isCoral = m.id === CORAL;
      const style: Record<string, string> = {
        left: `${spot.left}%`,
        bottom: `${spot.bottom}px`,
        '--tilt': `${spot.tilt ?? 0}deg`,
        '--delay': `${0.5 + Math.max(0, order) * 0.45}s`,
      };
      if (isCoral) style['--hue'] = `${coral.hue}deg`;
      return (
        <div key={m.id} class={`deco deco-${m.id}${order >= 0 ? ' sparkle' : ''}`} style={style}>
          <Decoration id={m.id} width={spot.width * (isCoral ? coral.scale : 1)} />
          {order >= 0 && <Sparkles />}
        </div>
      );
    });

  return (
    <>
      <div class="decos">{layer('back')}</div>
      <svg class="seabed" viewBox="0 0 400 120" preserveAspectRatio="none">
        <g class="weed weed-a">
          <path d="M40 120 C30 90 52 75 40 50 C30 30 46 20 42 6" />
          <path d="M58 120 C66 96 48 84 60 62 C70 44 56 36 62 24" />
        </g>
        <g class="weed weed-b">
          <path d="M330 120 C320 96 342 82 330 58 C320 38 336 28 332 14" />
          <path d="M352 120 C360 100 344 90 354 72" />
        </g>
        <path class="sand" d="M0 120 V92 C60 80 110 100 170 94 C240 86 290 78 400 92 V120 Z" />
        <ellipse class="pebble" cx="250" cy="100" rx="9" ry="5" />
        <ellipse class="pebble" cx="120" cy="104" rx="6" ry="3.5" />
      </svg>
      <div class="decos">{layer('front')}</div>
    </>
  );
}

/** True when a decoration has both art and a spot on the seabed (tests check every milestone has one). */
export const isDrawn = (id: string) => !!ART[id] && !!SPOTS[id];

/** The coral is the one that keeps growing after a year (D43). */
const CORAL = 'week-1';

/**
 * Where each decoration sits: centre as a percentage of the screen width, bottom in px (the sand is
 * 23–37px deep, so things sink in a little), width in px. The two big ones sit behind the sand.
 */
const SPOTS: Record<string, { layer: 'back' | 'front'; left: number; bottom: number; width: number; tilt?: number }> = {
  'quit-day': { layer: 'front', left: 21, bottom: 16, width: 32, tilt: -18 },
  'day-1': { layer: 'front', left: 36, bottom: 15, width: 26, tilt: 8 },
  'day-3': { layer: 'front', left: 49, bottom: 14, width: 34, tilt: 14 },
  'week-1': { layer: 'front', left: 73, bottom: 25, width: 38 },
  'week-2': { layer: 'front', left: 94, bottom: 21, width: 31 },
  'month-1': { layer: 'front', left: 61, bottom: 21, width: 36 },
  'month-2': { layer: 'front', left: 81, bottom: 54, width: 24 },
  'month-3': { layer: 'front', left: 6, bottom: 16, width: 20 },
  'month-6': { layer: 'back', left: 30, bottom: 12, width: 108 },
  'year-1': { layer: 'back', left: 67, bottom: 15, width: 80 },
};

/** A few twinkling stars and a soft glow, the first time a decoration shows up. */
function Sparkles() {
  return (
    <>
      <span class="spark-halo" />
      <svg class="sparkles" viewBox="-32 -32 64 64" aria-hidden="true">
        {SPARKS.map(([x, y, s, d], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <path class="spark" d={STAR} style={{ animationDelay: `calc(var(--delay) + ${d}s)` }} />
          </g>
        ))}
      </svg>
    </>
  );
}

const STAR = 'M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z';
const SPARKS: [number, number, number, number][] = [
  [-16, -14, 1, 0],
  [17, -8, 0.8, 0.25],
  [-8, 14, 0.6, 0.5],
  [13, 15, 0.9, 0.7],
  [2, -22, 0.7, 0.95],
];

/** The art for one decoration, by milestone ID. Flat colours only (no gradient IDs to clash). */
export function Decoration({ id, width, class: cls }: { id: string; width: number; class?: string }) {
  const art = ART[id];
  if (!art) return null;
  const [x, y, w, h] = art.vb;
  return (
    <svg class={`deco-art${cls ? ` ${cls}` : ''}`} width={width} height={(width * h) / w} viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true">
      {art.body()}
    </svg>
  );
}

/** A decoration scaled to fit a square box, for lists. */
export function DecorationIcon({ id, box, silhouette = false }: { id: string; box: number; silhouette?: boolean }) {
  const art = ART[id];
  if (!art) return null;
  const [, , w, h] = art.vb;
  return <Decoration id={id} width={w >= h ? box : (box * w) / h} class={silhouette ? 'deco-silhouette' : undefined} />;
}

const STARFISH = (() => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 7.5 : 17;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(20 + r * Math.cos(a)).toFixed(1)} ${(20 + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${points.join(' L')} Z`;
})();

const ART: Record<string, { vb: [number, number, number, number]; body: () => JSX.Element }> = {
  // Day 0, Cast Off: a small anchor, half sunk in the sand.
  'quit-day': {
    vb: [0, 0, 40, 48],
    body: () => (
      <g>
        <g fill="none" stroke="#9fb6c4" stroke-width="3.6" stroke-linecap="round">
          <circle cx="20" cy="7" r="4.4" />
          <path d="M20 11.5 V42" />
          <path d="M11 18 H29" />
          <path d="M6 30 Q8 43 20 43 Q32 43 34 30" />
        </g>
        <path d="M2.5 32.5 L6 25.5 L10.5 31.5 Z" fill="#9fb6c4" />
        <path d="M37.5 32.5 L34 25.5 L29.5 31.5 Z" fill="#9fb6c4" />
      </g>
    ),
  },
  // Day 1, First Tide: a scallop shell.
  'day-1': {
    vb: [0, 0, 40, 34],
    body: () => (
      <g>
        <path d="M14 29 H26 L24.5 33 H15.5 Z" fill="#d9a28c" />
        <path d="M20 31 C8 28 2 18 5 10 C9 2 31 2 35 10 C38 18 32 28 20 31 Z" fill="#f4cdb9" />
        <g stroke="#d49a84" stroke-width="1.6" stroke-linecap="round">
          <path d="M20 29 L8.5 11" />
          <path d="M20 29 L13.5 6.5" />
          <path d="M20 29 L20 4.8" />
          <path d="M20 29 L26.5 6.5" />
          <path d="M20 29 L31.5 11" />
        </g>
      </g>
    ),
  },
  // Day 3, Top of the Wave: usually the hardest day, so the brightest decoration.
  'day-3': {
    vb: [0, 0, 40, 40],
    body: () => (
      <g>
        <path d={STARFISH} fill="#ff8a5c" stroke="#ff8a5c" stroke-width="5" stroke-linejoin="round" />
        <g fill="#ffd3bf">
          <circle cx="20" cy="20" r="2.2" />
          {Array.from({ length: 5 }, (_, i) => {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
            return <circle key={i} cx={20 + 10 * Math.cos(a)} cy={20 + 10 * Math.sin(a)} r="1.5" />;
          })}
        </g>
      </g>
    ),
  },
  // Week 1, Open Water: a coral branch. After a year it grows and changes colour monthly.
  'week-1': {
    vb: [0, 0, 44, 52],
    body: () => (
      <g class="coral">
        <g fill="none" stroke="#f27a93" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 51 V31 Q22 23 16 17 V7" />
          <path d="M22 35 Q30 31 31 21 V10" />
          <path d="M16 23 Q9 21 8 13" />
          <path d="M31 23 Q37 21 38 15" />
          <path d="M22 43 Q13 41 10 33" />
        </g>
        <g fill="#ffb4c4">
          <circle cx="16" cy="7" r="2.4" />
          <circle cx="31" cy="10" r="2.4" />
          <circle cx="8" cy="13" r="2.2" />
          <circle cx="38" cy="15" r="2.2" />
          <circle cx="10" cy="33" r="2.2" />
        </g>
      </g>
    ),
  },
  // Week 2, Finding the Current: an anemone, swaying like the seaweed.
  'week-2': {
    vb: [0, 0, 40, 40],
    body: () => (
      <g>
        <g class="anemone-arms" fill="none" stroke="#c9a0f2" stroke-width="3" stroke-linecap="round">
          <path d="M14 27 Q7 19 5 10" />
          <path d="M17 26 Q13 16 13 6" />
          <path d="M20 26 Q20 15 21 4" />
          <path d="M23 26 Q27 16 27 6" />
          <path d="M26 27 Q33 19 35 10" />
        </g>
        <path d="M12 39 Q12 29 14 26 H26 Q28 29 28 39 Z" fill="#8a5cc4" />
        <ellipse cx="20" cy="26.5" rx="7" ry="2.4" fill="#b98ae8" />
      </g>
    ),
  },
  // Month 1, Deep Water: a pearl in an open clam.
  'month-1': {
    vb: [0, 0, 46, 34],
    body: () => (
      <g>
        <path d="M5 21 C5 8 15 2 24 2 C33 2 41 9 41 21 Z" fill="#8ea3bd" />
        <g stroke="#7389a6" stroke-width="1.5" stroke-linecap="round" fill="none">
          <path d="M23 20 L12 7" />
          <path d="M23 20 L23 3.5" />
          <path d="M23 20 L34 7" />
        </g>
        <ellipse cx="23" cy="21" rx="18" ry="4" fill="#33465c" />
        <circle class="pearl" cx="23" cy="18.5" r="4.6" fill="#f6f3ff" />
        <circle cx="21.4" cy="17" r="1.5" fill="#fff" />
        <path d="M5 21 Q23 37 41 21 Q23 27 5 21 Z" fill="#a3b5cc" />
      </g>
    ),
  },
  // Month 2, Calmer Waters: a glowing jellyfish, drifting just above the sand.
  'month-2': {
    vb: [0, 0, 30, 44],
    body: () => (
      <g>
        <g fill="none" stroke="#a8f0fa" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.85">
          <path d="M7 16 Q5 24 8 30 Q10 36 7 42" />
          <path d="M12 16 Q11 26 13 34" />
          <path d="M18 16 Q19 26 17 36" />
          <path d="M23 16 Q25 24 22 31 Q20 37 23 41" />
        </g>
        <path d="M3 16 Q3 2 15 2 Q27 2 27 16 Q24 14 21 16 Q18 14 15 16 Q12 14 9 16 Q6 14 3 16 Z" fill="#7fe0f0" fill-opacity="0.8" />
        <ellipse cx="10.5" cy="8" rx="3" ry="2" fill="#fff" opacity="0.55" />
      </g>
    ),
  },
  // Month 3, Rewired: a lantern with a warm light.
  'month-3': {
    vb: [3, 0, 20, 38],
    body: () => (
      <g>
        <path d="M9 8 Q9 1.5 13 1.5 Q17 1.5 17 8" fill="none" stroke="#5a6b79" stroke-width="2" />
        <rect x="6" y="7.5" width="14" height="4.5" rx="1.5" fill="#5a6b79" />
        <rect x="7" y="12" width="12" height="20" rx="2" fill="#ffd36b" />
        <path class="lantern-flame" d="M13 16.5 Q16.5 21 13 26 Q9.5 21 13 16.5 Z" fill="#fff5d1" />
        <path d="M7 19 H19 M7 26 H19" stroke="#5a6b79" stroke-width="1.4" />
        <rect x="5" y="32" width="16" height="5" rx="1.5" fill="#5a6b79" />
      </g>
    ),
  },
  // Month 6, Ocean Crosser: a small shipwreck, far back.
  'month-6': {
    vb: [0, 0, 120, 64],
    body: () => (
      <g>
        <path d="M52 31 L47 3" stroke="#2f607d" stroke-width="4" stroke-linecap="round" />
        <path d="M40 11 L58 8" stroke="#2f607d" stroke-width="3" stroke-linecap="round" />
        <path d="M41 12 L57 9 L54 23 L47 19 L43 25 Z" fill="#3a6c88" opacity="0.75" />
        <path d="M86 29 L88.5 17 L90 20 L91 14" fill="none" stroke="#2f607d" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M4 34 L108 26 Q104 44 92 54 Q56 62 20 56 Q10 48 4 34 Z" fill="#234a62" />
        <path d="M4 34 L108 26" stroke="#2f607d" stroke-width="3" stroke-linecap="round" />
        <g stroke="#1b3c51" stroke-width="1.5" fill="none">
          <path d="M10 44 Q56 46 102 37" />
          <path d="M16 51 Q56 55 96 46" />
        </g>
        <path d="M62 39 l8 -2 l2 8 l-6 4 l-6 -3 Z" fill="#10283a" />
        <g fill="#10283a">
          <circle cx="30" cy="41" r="2.6" />
          <circle cx="44" cy="40.5" r="2.6" />
          <circle cx="86" cy="36" r="2.6" />
        </g>
      </g>
    ),
  },
  // Year 1, Legend of the Deep: a sunken castle, far back.
  'year-1': {
    vb: [0, -4, 90, 74],
    body: () => (
      <g>
        <path d="M45 10 V-2" stroke="#2c5d7b" stroke-width="1.6" />
        <path d="M45.8 -2 L55 1 L45.8 4 Z" fill="#e8775a" opacity="0.85" />
        <g fill="#285571">
          <rect x="8" y="28" width="18" height="42" />
          <rect x="8" y="22" width="4" height="7" />
          <rect x="15" y="22" width="4" height="7" />
          <rect x="22" y="22" width="4" height="7" />
          <rect x="64" y="28" width="18" height="42" />
          <rect x="64" y="22" width="4" height="7" />
          <rect x="71" y="22" width="4" height="7" />
          <rect x="78" y="22" width="4" height="7" />
        </g>
        <g fill="#224b64">
          <rect x="26" y="42" width="38" height="28" />
          <rect x="28" y="37" width="4" height="6" />
          <rect x="58" y="37" width="4" height="6" />
        </g>
        <g fill="#2c5d7b">
          <rect x="36" y="16" width="18" height="54" />
          <rect x="36" y="10" width="4" height="7" />
          <rect x="43" y="10" width="4" height="7" />
          <rect x="50" y="10" width="4" height="7" />
        </g>
        <g fill="#10283a">
          <path d="M40 70 V61 A5 5 0 0 1 50 61 V70 Z" />
          <path d="M15 45 V40 A2 2 0 0 1 19 40 V45 Z" />
          <path d="M71 45 V40 A2 2 0 0 1 75 40 V45 Z" />
          <path d="M43 32 V27 A2 2 0 0 1 47 27 V32 Z" />
        </g>
      </g>
    ),
  },
};
