import type { AppData } from '../storage';
import { CZK_PER, savedAt } from '../treasure';

/**
 * A treasure chest on the seabed. `fill` (0–1) sets how high the gold is piled; closed when not counting.
 */
export function Chest({ fill, open, size = 240 }: { fill: number; open: boolean; size?: number }) {
  const heap = 8 + Math.max(0, Math.min(1, fill)) * 42; // gold rises above the rim as the treasure grows
  const spilled = open ? Math.round(Math.max(0, Math.min(1, fill)) * 6) : 0;
  const spill = [
    [34, 162, 0],
    [206, 160, 0],
    [24, 168, 1],
    [218, 167, 1],
    [44, 170, 0],
    [196, 171, 1],
  ].slice(0, spilled);
  return (
    <svg class={`chest ${open ? 'open' : ''}`} width={size} height={size * 0.75} viewBox="0 0 240 180" aria-hidden="true">
      <defs>
        <radialGradient id="chestGlow" cx="50%" cy="55%" r="50%">
          <stop offset="0" stop-color="#f2c14e" stop-opacity={open ? 0.55 : 0.12} />
          <stop offset="1" stop-color="#f2c14e" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe9a3" />
          <stop offset="1" stop-color="#e0a419" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9a6531" />
          <stop offset="1" stop-color="#6e4420" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="100" rx="118" ry="80" fill="url(#chestGlow)" />
      <ellipse cx="120" cy="166" rx="112" ry="12" fill="#0a2233" />

      {open && (
        <g>
          {/* lid tipped back */}
          <path d="M50 98 L58 46 Q120 30 182 46 L190 98 Z" fill="#5c3818" />
          <path d="M60 92 L66 52 Q120 38 174 52 L180 92 Z" fill="#3e2510" />
          <rect x="70" y="45" width="8" height="50" fill="#c99a2e" transform="rotate(-3 74 70)" />
          <rect x="162" y="45" width="8" height="50" fill="#c99a2e" transform="rotate(3 166 70)" />
          {/* the gold */}
          <path d={`M54 100 Q120 ${100 - heap * 2} 186 100 Z`} fill="url(#gold)" />
          {[
            [86, 0.55],
            [108, 0.85],
            [132, 0.8],
            [152, 0.5],
            [120, 0.98],
            [97, 0.7],
            [142, 0.66],
          ].map(([x, h], i) => (
            <ellipse key={i} cx={x} cy={100 - heap * h * 0.95} rx="7" ry="3" fill="#ffd96b" stroke="#c98e12" stroke-width="1" />
          ))}
          <g class="chest-sparkles" fill="#fff">
            <path d={`M100 ${92 - heap} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z`} />
            <path d={`M146 ${96 - heap * 0.7} l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z`} />
            <path d={`M124 ${84 - heap} l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z`} />
          </g>
        </g>
      )}

      {/* box */}
      <rect x="46" y="98" width="148" height="64" rx="6" fill="url(#wood)" />
      <path d="M46 120 H194 M46 141 H194" stroke="#5a3717" stroke-width="2" />
      <rect x="60" y="98" width="10" height="64" fill="#c99a2e" />
      <rect x="170" y="98" width="10" height="64" fill="#c99a2e" />
      <rect x="44" y="96" width="152" height="8" rx="3" fill="#c99a2e" />

      {!open && (
        <g>
          <path d="M46 100 V82 Q120 52 194 82 V100 Z" fill="url(#wood)" />
          <path d="M46 92 Q120 66 194 92" stroke="#5a3717" stroke-width="2" fill="none" />
          <path d="M60 100 V77 Q65 75 70 74 V100 Z" fill="#c99a2e" />
          <path d="M170 74 Q175 75 180 77 V100 H170 Z" fill="#c99a2e" />
        </g>
      )}

      {/* lock */}
      <rect x="110" y="104" width="20" height="22" rx="4" fill="#e3b23c" stroke="#9c7212" stroke-width="2" />
      <circle cx="120" cy="113" r="3" fill="#4a3110" />
      <rect x="119" y="114" width="2" height="6" fill="#4a3110" />

      {spill.map(([x, y, tilt], i) => (
        <ellipse key={i} cx={x} cy={y} rx="7" ry={tilt ? 3.5 : 2.6} fill="#ffd96b" stroke="#c98e12" stroke-width="1" />
      ))}
    </svg>
  );
}

/** How full the chest looks for an amount (in Kč): grows quickly at first, then slowly, full around 50 000 Kč. */
export const chestFill = (amountCzk: number) => Math.min(1, Math.log10(1 + amountCzk) / Math.log10(50_000));

/** How full her chest looks now: 0 until she counts the money. */
export const treasureFill = (data: AppData, now = Date.now()) =>
  data.treasure && data.quitDate ? chestFill(savedAt(data.treasure, data.quitDate, now) * CZK_PER[data.settings.currency]) : 0;
