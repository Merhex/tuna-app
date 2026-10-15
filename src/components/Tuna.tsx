export type Mood = 'happy' | 'cheer' | 'smug' | 'soft';

/** The round-faced mascot. Faces left. */
export function Tuna({ mood = 'happy', size = 120, class: cls = '' }: { mood?: Mood; size?: number; class?: string }) {
  return (
    <svg class={`tuna ${cls}`} width={size} height={size * 0.6} viewBox="0 0 200 120" aria-hidden="true">
      <path d="M150 60 L192 22 L182 60 L192 98 Z" fill="var(--tuna-body)" />
      <path d="M78 26 L98 6 L112 30 Z" fill="var(--tuna-fin)" />
      <path d="M86 94 L100 112 L110 92 Z" fill="var(--tuna-fin)" />
      <ellipse cx="92" cy="60" rx="72" ry="36" fill="var(--tuna-body)" />
      <path d="M26 66 Q92 104 160 66 Q92 86 26 66 Z" fill="var(--tuna-belly)" />
      <g fill="var(--tuna-fin)">
        <path d="M126 30 l6 -6 l4 8 z" />
        <path d="M138 34 l6 -6 l4 8 z" />
        <path d="M126 90 l6 6 l4 -8 z" />
        <path d="M138 86 l6 6 l4 -8 z" />
      </g>
      <circle cx="48" cy="52" r="10" fill="#fff" />
      {mood === 'smug' ? (
        <path d="M39 52 Q48 46 57 52" stroke="var(--ink-dark)" stroke-width="4" fill="none" stroke-linecap="round" />
      ) : (
        <circle cx={mood === 'soft' ? 47 : 45} cy={mood === 'soft' ? 55 : 52} r="5" fill="var(--ink-dark)" />
      )}
      {mood === 'cheer' && <path d="M38 40 L56 44" stroke="var(--ink-dark)" stroke-width="3" stroke-linecap="round" />}
      {mood === 'soft' && <path d="M38 41 L55 39" stroke="var(--ink-dark)" stroke-width="3" stroke-linecap="round" />}
      {mood === 'cheer' ? (
        <path d="M22 64 Q32 80 44 66 Z" fill="var(--ink-dark)" />
      ) : mood === 'smug' ? (
        <path d="M24 68 Q34 70 44 62" stroke="var(--ink-dark)" stroke-width="3.5" fill="none" stroke-linecap="round" />
      ) : mood === 'soft' ? (
        <path d="M26 70 Q34 66 42 70" stroke="var(--ink-dark)" stroke-width="3.5" fill="none" stroke-linecap="round" />
      ) : (
        <path d="M24 66 Q32 74 42 68" stroke="var(--ink-dark)" stroke-width="3.5" fill="none" stroke-linecap="round" />
      )}
    </svg>
  );
}

/** A tiny tuna for the school on the home screen. Faces right. */
export function MiniTuna({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 60 30" aria-hidden="true">
      <path d="M10 15 L0 5 L3 15 L0 25 Z" fill="var(--tuna-body)" />
      <ellipse cx="32" cy="15" rx="22" ry="10" fill="var(--tuna-body)" />
      <path d="M12 17 Q32 28 54 17 Q32 22 12 17 Z" fill="var(--tuna-belly)" />
      <circle cx="46" cy="12" r="2.4" fill="#fff" />
    </svg>
  );
}

