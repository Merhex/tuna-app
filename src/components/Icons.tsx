// Line icons, drawn with currentColor so they follow the text colour.
type P = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2.2,
  'stroke-linecap': 'round' as const,
  'stroke-linejoin': 'round' as const,
  'aria-hidden': 'true' as const,
});

/** A proper fishhook: eye, shank, bend, point and barb. */
export function FishHook({ size = 64, stroke = 5 }: P & { stroke?: number }) {
  return (
    <svg width={size * 0.66} height={size} viewBox="0 0 44 66" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="30" cy="7" r="4.5" />
      <path d="M30 11.5 V46 A12.5 12.5 0 0 1 5 46 V35" />
      <path d="M5 35 L12.5 42.5" />
    </svg>
  );
}

export function Gear({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

/** Fishbowl with a little fish. */
export function Bowl({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M7 4h10M8 4c-3 2-4.5 4.6-4.5 8a8.5 8.5 0 0 0 17 0c0-3.4-1.5-6-4.5-8" />
      <path d="M4 12.5c2.5 1 5.5-1 8 0s5.5 1 8 0" />
      <path d="M9 16.5c1.2-1.4 3.4-1.4 4.6 0-1.2 1.4-3.4 1.4-4.6 0zM13.6 16.5l1.6-1.1v2.2z" />
    </svg>
  );
}

export function Close({ size = 20 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" stroke-width={2.6}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Back({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" stroke-width={2.6}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ShareIOS({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

export function PlusSquare({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function Download({ size = 20 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M12 4v11M7 10l5 5 5-5M5 19h14" />
    </svg>
  );
}

export function Upload({ size = 20 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M12 15V4M7 9l5-5 5 5M5 19h14" />
    </svg>
  );
}

export function Phone({ size = 20 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  );
}

export function Heart({ size = 18, filled = false }: P & { filled?: boolean }) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}
