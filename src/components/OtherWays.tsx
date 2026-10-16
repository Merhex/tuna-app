import { Haptic } from './Haptic';

/** A way out of a round before it starts: the other activity, or a card (D54). */
export type Alternative = { label: string; onPick: () => void };

/** "Breathe instead", "Draw a card": small links under how to play, for a round she didn't pick. */
export function OtherWays({ others }: { others?: Alternative[] }) {
  if (!others?.length) return null;
  return (
    <p class="other-ways">
      {others.map((o) => (
        <button key={o.label} class="link" onClick={o.onPick}>
          {o.label}
          <Haptic />
        </button>
      ))}
    </p>
  );
}
