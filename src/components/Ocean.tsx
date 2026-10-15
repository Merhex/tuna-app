/** Fixed underwater backdrop: light rays, slow rising bubbles, and a seabed on the home screen. */
const BUBBLES = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 53) % 100,
  size: 4 + ((i * 7) % 10),
  duration: 9 + ((i * 5) % 9),
  delay: -((i * 3.7) % 14),
}));

export function Ocean({ seabed }: { seabed: boolean }) {
  return (
    <div class="ocean" aria-hidden="true">
      <div class="rays" />
      <div class="bg-bubbles">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>
      {seabed && (
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
      )}
    </div>
  );
}
