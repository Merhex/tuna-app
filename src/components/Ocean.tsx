import { Seabed } from './Seabed';

/** Fixed underwater backdrop: light rays, slow rising bubbles, and the seabed on the home screen. */
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
      {seabed && <Seabed />}
    </div>
  );
}
