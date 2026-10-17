import { useEffect, useState } from 'preact/hooks';
import type { School3D } from './School3D';
import { useT } from '../i18n';
import { Back } from './Icons';
import { Haptic } from './Haptic';

type Props = { onClose: () => void; onHook: () => void };

/**
 * The Visit my school prototype brings three.js with it (about three times the rest of the app), so
 * it's only loaded when opened. The home screen doesn't wait for it. It's saved for offline use
 * with everything else, so it opens quickly.
 */
export function LazySchool3D(props: Props) {
  const t = useT();
  const [View, setView] = useState<typeof School3D | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    import('./School3D').then(
      (m) => setView(() => m.School3D),
      () => setFailed(true),
    );
  }, []);

  if (View) return <View {...props} />;
  return (
    <main class="screen s3d">
      <header class="topbar">
        <button class="icon-btn" onClick={props.onClose} aria-label={t.close}><Back /><Haptic /></button>
      </header>
      {failed && <p class="s3d-failed group">{t.school3dFailed}</p>}
    </main>
  );
}
