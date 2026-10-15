import { usesTapSwitchHaptics } from '../feedback';
import { useApp } from '../state';

const ON_IOS = usesTapSwitchHaptics();

/**
 * Put inside a button to make it vibrate on iPhone. Renders an invisible native switch covering the
 * button: her tap lands on the switch (a genuine toggle, so Safari plays its haptic) and the click
 * then bubbles up to the button as usual. Renders nothing elsewhere, or when vibrations are off.
 */
export function Haptic() {
  const { data } = useApp();
  if (!ON_IOS || !data.settings.haptics) return null;
  return (
    <input
      type="checkbox"
      class="haptic-switch"
      {...({ switch: true } as object)}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
