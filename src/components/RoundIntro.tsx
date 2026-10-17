import { useRef } from 'preact/hooks';
import { fx } from '../feedback';
import { useT } from '../i18n';
import { Haptic } from './Haptic';

/**
 * The card over a round before it begins, the same for every game: the brutal hook's line (`lead`),
 * the title, how to play, and Start. Nothing moves until she taps Start, so she can read first.
 *
 * When the round was picked for her straight from the rating, "Give me another game" (`another`)
 * swaps it; tapping again keeps cycling. The back button at the top is the way out altogether, so
 * nothing else sits here: a list of choices is a decision at the worst moment (D51, D54).
 */
export function RoundIntro({
  lead,
  title,
  howTo,
  onStart,
  another,
}: {
  lead?: string;
  title: string;
  howTo: string;
  onStart: () => void;
  another?: () => void;
}) {
  const t = useT();
  const shownAt = useRef(performance.now());
  return (
    <div class="dodge-hint round-intro">
      {lead && <p class="dodge-lead">{lead}</p>}
      <h2>{title}</h2>
      <p>{howTo}</p>
      <button
        class="primary"
        onClick={() => {
          // A double tap on the previous screen shouldn't start the round before she's read this.
          if (performance.now() - shownAt.current < 300) return;
          // The tap also lets iPhone play the round's sounds.
          fx.tap();
          onStart();
        }}
      >
        {t.roundStart}
        <Haptic />
      </button>
      {another && (
        <button class="secondary another-game" onClick={another}>
          {t.anotherGame}
          <Haptic />
        </button>
      )}
    </div>
  );
}
