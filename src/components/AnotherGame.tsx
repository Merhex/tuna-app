import { useT } from '../i18n';
import { Haptic } from './Haptic';

/**
 * The one way out of a round before it starts, when it was picked for her straight from the rating:
 * another game (D54). Tapping it again keeps cycling. The back button at the top is the way out
 * altogether, so nothing else sits here: a list of choices is a decision at the worst moment (D51).
 */
export function AnotherGame({ onPick }: { onPick?: () => void }) {
  const t = useT();
  if (!onPick) return null;
  return (
    <button class="secondary another-game" onClick={onPick}>
      {t.anotherGame}
      <Haptic />
    </button>
  );
}
