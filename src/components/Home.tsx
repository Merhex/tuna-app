import { useMemo } from 'preact/hooks';
import type { Screen } from '../app';
import { haptic, sound } from '../feedback';
import { pick, useT } from '../i18n';
import { useApp } from '../state';
import { schoolSize } from '../storage';
import { FAVOURITES_MIN } from '../draw';
import { Bowl, FishHook, Gear, Heart, LogbookIcon } from './Icons';
import { MiniTuna, Tuna } from './Tuna';
import { Haptic } from './Haptic';

const MAX_SWIMMERS = 36;

export function Home({
  go,
  washedAshore,
  dismissWashedAshore,
}: {
  go: (s: Screen) => void;
  washedAshore: boolean;
  dismissWashedAshore: () => void;
}) {
  const t = useT();
  const { data, update } = useApp();
  const school = schoolSize(data);
  const tagline = useMemo(() => pick(t.taglines), [t]);
  const favCount = Object.values(data.collection).filter((c) => c.favourite).length;

  // Stable pseudo-random lanes so the school doesn't jump around between renders.
  const swimmers = useMemo(
    () =>
      Array.from({ length: Math.min(school, MAX_SWIMMERS) }, (_, i) => {
        const r = (n: number) => ((Math.sin(i * 9301 + n * 49297) + 1) / 2) % 1;
        return {
          top: 8 + r(1) * 80,
          duration: 14 + r(2) * 16,
          delay: -r(3) * 30,
          size: 20 + r(4) * 16,
          x: r(5) * 85,
        };
      }),
    [school],
  );

  return (
    <main class="screen home">
      <div class="school" aria-hidden="true">
        {swimmers.map((s, i) => (
          <div
            key={i}
            class="swimmer"
            style={{ '--x': `${s.x}%`, top: `${s.top}%`, animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }}
          >
            <MiniTuna size={s.size} />
          </div>
        ))}
      </div>

      <header class="topbar">
        <div class="topbar-group">
          <button class="icon-btn" onClick={() => { sound.tap(); go('aquarium'); }} aria-label={t.aquarium}>
            <Bowl />
            <span class="icon-label">{t.aquarium}</span>
          </button>
          <button class="icon-btn" onClick={() => { sound.tap(); go('logbook'); }} aria-label={t.logbook}>
            <LogbookIcon />
            <span class="icon-label">{t.logbook}</span>
          </button>
        </div>
        <button class="icon-btn" onClick={() => { sound.tap(); go('settings'); }} aria-label={t.settings}>
          <Gear />
        </button>
      </header>

      {washedAshore && (
        <div class="toast" role="status">
          <span>🌊 {t.washedAshore}</span>
          <button class="link" onClick={dismissWashedAshore}>{t.ok}</button>
        </div>
      )}

      <div class="home-center">
        <Tuna mood="happy" size={130} class="bob" />
        <p class="tagline">{tagline}</p>
        <button
          class="hook-button"
          onClick={() => {
            haptic.big();
            sound.hookDrop();
            go('hook');
          }}
        >
          <FishHook size={62} stroke={5.5} />
          <span>{t.hookButton}</span>
          <Haptic />
        </button>
        <p class="school-count">{t.school(school)}</p>

        {favCount >= FAVOURITES_MIN && (
          <div class="segmented" role="group" aria-label={t.drawFrom}>
            {(['all', 'favourites'] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={data.settings.drawFrom === mode}
                onClick={() => {
                  haptic.tap();
                  update((d) => ({ ...d, settings: { ...d.settings, drawFrom: mode } }));
                }}
              >
                {mode === 'all' ? t.drawAll : <><Heart size={14} filled /> {t.drawFavourites}</>}
                <Haptic />
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
