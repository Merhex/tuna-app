import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Screen } from '../app';
import { fx } from '../feedback';
import { pick, useT } from '../i18n';
import { useApp } from '../state';
import { schoolSize } from '../storage';
import { FAVOURITES_MIN } from '../draw';
import { latestMilestoneDay } from '../milestones';
import { jokeDurationMs, jokeKind, makeBag, nextStreak, PET_SETTINGS, type JokeKind } from '../pet';
import { Bowl, ChestIcon, FishHook, Gear, Heart, LogbookIcon } from './Icons';
import { MiniTuna, Tuna, type Mood } from './Tuna';
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
  // A milestone reached since she last opened the treasure (D41).
  const newMilestone = !!data.quitDate && latestMilestoneDay(data.quitDate) > data.settings.milestoneSeen;

  useEffect(() => {
    if (!washedAshore) return;
    const id = setTimeout(dismissWashedAshore, 8000);
    return () => clearTimeout(id);
  }, [washedAshore]);

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
          <button class="icon-btn nav-btn" onClick={() => { fx.tap(); go('aquarium'); }} aria-label={t.aquarium}>
            <Bowl />
            <span class="icon-label">{t.aquarium}</span>
            <Haptic />
          </button>
          <button class="icon-btn nav-btn" onClick={() => { fx.tap(); go('logbook'); }} aria-label={t.logbook}>
            <LogbookIcon />
            <span class="icon-label">{t.logbook}</span>
            <Haptic />
          </button>
          <button
            class="icon-btn nav-btn"
            onClick={() => { fx.coins(); go('treasure'); }}
            aria-label={newMilestone ? `${t.treasure}, ${t.newMilestone}` : t.treasure}
          >
            <ChestIcon />
            <span class="icon-label">{t.treasure}</span>
            {newMilestone && <span class="nav-dot" aria-hidden="true" />}
            <Haptic />
          </button>
        </div>
        <button class="icon-btn" onClick={() => { fx.tap(); go('settings'); }} aria-label={t.settings}>
          <Gear />
          <Haptic />
        </button>
      </header>

      {washedAshore && (
        <div class="toast" role="status">
          <span>🌊 {t.washedAshore}</span>
          <button class="link" onClick={dismissWashedAshore}>{t.ok}</button>
        </div>
      )}

      <div class="home-center">
        <PettableTuna />
        <p class="tagline">{tagline}</p>
        <button
          class="hook-button"
          onClick={() => {
            fx.hookDrop();
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
                  fx.tap();
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

// One shuffled bag per joke list, kept across visits to the home screen so jokes don't repeat soon.
const bags = new Map<string[], () => string>();
function tell(list: string[]) {
  let bag = bags.get(list);
  if (!bag) bags.set(list, (bag = makeBag(list)));
  return bag();
}

/**
 * Easter egg: tapping the tuna pets it (eyes close, hearts float up). Five fast taps in a row and
 * it tells a joke; one in ten is a dark one, delivered with a wide-eyed stare, and about one in
 * three is about Jungkook, in a purple bubble with a purple heart (D45). Every tap is counted (D49).
 */
export function PettableTuna() {
  const t = useT();
  const { update } = useApp();
  const [petting, setPetting] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; dx: number; rot: number; purple: boolean }[]>([]);
  const [joke, setJoke] = useState<{ id: number; text: string; kind: JokeKind } | null>(null);
  const lastPet = useRef<{ at: number; streak: number } | null>(null);
  const nextId = useRef(0);
  const pettingTimer = useRef<number>();
  const jokeTimer = useRef<number>();
  const heartTimers = useRef<number[]>([]);

  useEffect(
    () => () => {
      clearTimeout(pettingTimer.current);
      clearTimeout(jokeTimer.current);
      heartTimers.current.forEach(clearTimeout);
    },
    [],
  );

  function pet() {
    const now = performance.now();
    const streak = nextStreak(lastPet.current, now);
    lastPet.current = { at: now, streak };
    const id = ++nextId.current;
    // Every tap is a pet; the total shows in the Logbook (D49).
    update((d) => ({ ...d, pets: d.pets + 1 }));

    setPetting(true);
    clearTimeout(pettingTimer.current);
    pettingTimer.current = window.setTimeout(() => setPetting(false), 1200);

    const kind = streak < PET_SETTINGS.tapsForJoke ? null : jokeKind(Math.random());
    setHearts((h) => [...h.slice(-5), { id, dx: Math.random() * 70 - 35, rot: Math.random() * 40 - 20, purple: kind === 'jungkook' }]);
    heartTimers.current.push(window.setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1000));

    if (!kind) {
      fx.pet(streak);
      return;
    }
    lastPet.current = null;
    const text = tell(kind === 'dark' ? t.petDarkJokes : kind === 'jungkook' ? t.petJungkookJokes : t.petJokes);
    if (kind === 'dark') fx.ominous();
    else fx.giggle();
    setJoke({ id, text, kind });
    clearTimeout(jokeTimer.current);
    jokeTimer.current = window.setTimeout(() => setJoke(null), jokeDurationMs(text));
  }

  const mood: Mood = joke?.kind === 'dark' ? 'unhinged' : petting || joke ? 'bliss' : 'happy';

  return (
    <div class="pet-zone">
      {joke && (
        <p key={joke.id} class={`speech${joke.kind === 'normal' ? '' : ` ${joke.kind}`}`} role="status">
          {joke.text}
        </p>
      )}
      <button class="tuna-pet bob" onClick={pet} aria-label={t.petTuna}>
        <Tuna mood={mood} size={130} />
        {hearts.map((h) => (
          <span key={h.id} class={`pet-heart${h.purple ? ' purple' : ''}`} style={{ '--dx': `${h.dx}px`, '--rot': `${h.rot}deg` }}>
            <Heart size={18} filled />
          </span>
        ))}
        <Haptic />
      </button>
    </div>
  );
}
