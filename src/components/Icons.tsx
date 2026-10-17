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

/** One big bubble and a small one, with a shine. */
export function BubbleIcon({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <circle cx="10" cy="14" r="7" />
      <circle cx="19" cy="5" r="2.5" />
      <path d="M7 11.5a3.5 3.5 0 0 1 2.5-2" />
    </svg>
  );
}

/** A little fish facing right, for the school. */
export function Fish({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M6 12c2.4-3.6 5.2-5.5 8.3-5.5 3 0 5.6 2.2 7.2 5.5-1.6 3.3-4.2 5.5-7.2 5.5-3.1 0-5.9-1.9-8.3-5.5z" />
      <path d="M6 12 2.5 8.5v7z" />
      <circle cx="16.8" cy="10.8" r="0.6" fill="currentColor" />
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

export function Calendar({ size = 20 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

/** A small treasure chest. */
export function ChestIcon({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M3.5 11h17v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M3.5 11V9a6 4 0 0 1 17 0v2" />
      <path d="M10.5 11v3.5h3V11" />
      <path d="M7 11v10M17 11v10" stroke-width="1.6" />
    </svg>
  );
}

/** Ship's logbook: a book with a falling line on the page. */
export function LogbookIcon({ size = 22 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
      <path d="M8.5 7.5l3 3 2-2 2.5 3.5" />
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

export function House({ size = 18 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M6 9v11h12V9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

/** Map pin, for "out and about". */
export function Pin({ size = 18 }: P) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24">
      <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
