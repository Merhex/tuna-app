import type { Rarity } from '../cards';

/**
 * One fish per rarity tier: sardine, mackerel, swordfish, golden bluefin. All face left like the mascot.
 * With `silhouette`, every part is filled with currentColor (used for uncaught cards).
 */
export function RarityFish({ rarity, silhouette = false, size = 120 }: { rarity: Rarity; silhouette?: boolean; size?: number }) {
  const c = (color: string) => (silhouette ? 'currentColor' : color);
  const eye = !silhouette;
  return (
    <svg class={`rarity-fish fish-${rarity}`} width={size} height={size / 2} viewBox="0 0 160 80" aria-hidden="true">
      {rarity === 'common' && (
        <g>
          <path d="M118 40 L146 24 L140 40 L146 56 Z" fill={c('#7f9fb3')} />
          <ellipse cx="74" cy="40" rx="50" ry="13" fill={c('#a9c3d2')} />
          <path d="M26 38 Q74 22 122 38 Q74 30 26 38 Z" fill={c('#6f93aa')} />
          <path d="M30 44 Q74 52 120 43" stroke={c('#e6eef3')} stroke-width="3" fill="none" />
          {!silhouette && [52, 64, 76, 88].map((x) => <circle cx={x} cy="36" r="1.6" fill="#4d7690" />)}
          {eye && <circle cx="36" cy="38" r="4" fill="#fff" />}
          {eye && <circle cx="35" cy="38" r="2" fill="#0b1f2e" />}
        </g>
      )}
      {rarity === 'uncommon' && (
        <g>
          <path d="M124 40 L152 20 L144 40 L152 60 Z" fill={c('#2f7d74')} />
          <path d="M70 22 L84 12 L92 24 Z" fill={c('#2f7d74')} />
          <ellipse cx="76" cy="40" rx="56" ry="18" fill={c('#d6e3e6')} />
          <path d="M20 40 Q76 10 132 38 Q76 34 20 40 Z" fill={c('#3a9a8e')} />
          {!silhouette && (
            <g stroke="#1d4f4a" stroke-width="2.4" fill="none" stroke-linecap="round">
              <path d="M54 24 q4 6 0 12" /><path d="M66 22 q4 6 0 12" /><path d="M78 22 q4 6 0 12" />
              <path d="M90 23 q4 6 0 12" /><path d="M102 25 q4 6 0 11" /><path d="M113 28 q3 5 0 9" />
            </g>
          )}
          {!silhouette && [112, 118, 124].map((x) => <path d={`M${x} 56 l3 5 l3 -5`} fill="#2f7d74" />)}
          {eye && <circle cx="34" cy="38" r="5" fill="#fff" />}
          {eye && <circle cx="33" cy="38" r="2.5" fill="#0b1f2e" />}
        </g>
      )}
      {rarity === 'rare' && (
        <g>
          <path d="M130 40 L156 14 L146 40 L156 66 Z" fill={c('#5d4f9a')} />
          <path d="M60 25 Q66 2 86 8 Q74 14 80 26 Z" fill={c('#5d4f9a')} />
          <path d="M4 37 L44 35 L44 42 Z" fill={c('#8a7cc9')} />
          <ellipse cx="88" cy="40" rx="48" ry="17" fill={c('#7d6fc0')} />
          <path d="M44 44 Q88 60 134 42 Q88 50 44 44 Z" fill={c('#d9d3f2')} />
          {eye && <circle cx="56" cy="37" r="5" fill="#fff" />}
          {eye && <circle cx="55" cy="37" r="2.5" fill="#0b1f2e" />}
        </g>
      )}
      {rarity === 'legendary' && (
        <g>
          {!silhouette && (
            <defs>
              <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#ffe08a" />
                <stop offset="1" stop-color="#d99a14" />
              </linearGradient>
            </defs>
          )}
          <path d="M120 40 L150 16 L142 40 L150 64 Z" fill={c('#c98a0e')} />
          <path d="M62 20 L76 6 L86 22 Z" fill={c('#c98a0e')} />
          <path d="M68 58 L78 72 L86 58 Z" fill={c('#c98a0e')} />
          <ellipse cx="72" cy="40" rx="54" ry="24" fill={c('url(#gold)')} />
          <path d="M22 44 Q72 72 124 44 Q72 58 22 44 Z" fill={c('#fff3c4')} />
          {!silhouette && [96, 104, 112].map((x) => <path d={`M${x} 18 l4 -4 l3 6 z`} fill="#c98a0e" />)}
          {eye && <circle cx="38" cy="36" r="6" fill="#fff" />}
          {eye && <circle cx="37" cy="36" r="3" fill="#0b1f2e" />}
          {eye && <path d="M20 46 Q27 51 34 47" stroke="#0b1f2e" stroke-width="2.5" fill="none" stroke-linecap="round" />}
          {!silhouette && (
            <g fill="#fff">
              <path d="M128 10 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" />
              <path d="M18 14 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 z" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
