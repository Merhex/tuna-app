import type { RefObject } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Screen } from '../app';
import { fx } from '../feedback';
import { pick, useT } from '../i18n';
import { useApp } from '../state';
import { schoolSize } from '../storage';
import { FAVOURITES_MIN } from '../draw';
import { latestMilestoneDay, MILESTONES } from '../milestones';
import { jokeDurationMs, jokeKind, makeBag, nextStreak, PET_SETTINGS, type JokeKind } from '../pet';
import { shownTuna } from '../school3d';
import { coralLook } from '../seabed';
import type { Tank } from '../tank/scene';
import { Back, Bowl, ChestIcon, Fish, FishHook, Gear, Heart, LogbookIcon } from './Icons';
import { MiniTuna, Tuna, type Mood } from './Tuna';
import { Haptic } from './Haptic';
import { Seabed, useSeabed } from './Seabed';

const MAX_SWIMMERS = 36;

/**
 * The home screen: one big button (D4) in front of her school. With 3D (D55) that's the tank: her
 * tuna swimming, her decorations on the sand and the big tuna in 3D, and "Visit my school" under the
 * button pulls the camera back to the whole tank. On a phone without 3D it's the drawn seabed and
 * school, and the drawn tuna. While the tank loads it's the drawing too, unless the tank worked here
 * before (`expectTank`): then it's just the water and the button, so it doesn't switch from 2D to 3D.
 */
export function Home({
  go,
  washedAshore,
  dismissWashedAshore,
  tank,
  expectTank,
}: {
  go: (s: Screen) => void;
  washedAshore: boolean;
  dismissWashedAshore: () => void;
  tank: Tank | null;
  expectTank: boolean;
}) {
  const t = useT();
  const { data, update } = useApp();
  const school = schoolSize(data);
  const tagline = useMemo(() => pick(t.taglines), [t]);
  const favCount = Object.values(data.collection).filter((c) => c.favourite).length;
  // A milestone reached since she last opened the treasure (D41).
  const newMilestone = !!data.quitDate && latestMilestoneDay(data.quitDate) > data.settings.milestoneSeen;
  const sparkling = useSeabed();
  const calm = data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [view, setView] = useState<'home' | 'wide'>('home');
  // Once the tank has faded in over the drawn seabed, the drawing (and the backdrop behind it) stops.
  const [covered, setCovered] = useState(!!tank);
  // The tank is on its way and worked here before: no drawn seabed, school or tuna in the meantime.
  const waiting = !tank && expectTank;
  // Whether the drawn seabed showed before the tank came. If it didn't (she was waiting), it doesn't
  // appear behind the tank while it fades in either.
  const drew = useRef(false);
  if (!tank && !waiting) drew.current = true;
  const drawing = tank ? !covered && drew.current : !waiting;
  const bar = useRef<HTMLElement>(null);
  const card = useRef<HTMLElement>(null);
  const center = useRef<HTMLDivElement>(null);
  const spot = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!washedAshore) return;
    const id = setTimeout(dismissWashedAshore, 8000);
    return () => clearTimeout(id);
  }, [washedAshore]);

  useEffect(() => {
    if (!tank) {
      setCovered(false);
      setView('home');
      return;
    }
    const id = setTimeout(() => setCovered(true), 900);
    return () => clearTimeout(id);
  }, [tank]);

  useEffect(() => {
    document.documentElement.classList.toggle('ocean-off', covered);
    return () => document.documentElement.classList.remove('ocean-off');
  }, [covered]);

  // In the wide view the tank comes in front of the page, so a finger anywhere drags the camera
  // round it; only the top bar and the card stay above it.
  useEffect(() => {
    document.documentElement.classList.toggle('tank-front', view === 'wide');
    return () => document.documentElement.classList.remove('tank-front');
  }, [view]);

  // What the tank shows: her school, her decorations (each one sparkling the first time), and the view.
  const earned = MILESTONES.filter((m) => data.seabed.earned[m.id]).map((m) => m.id);
  useEffect(() => tank?.setTuna(shownTuna(school)), [tank, school]);
  useEffect(() => tank?.setDecorations(earned, coralLook(data.seabed.coralMonths)), [tank, earned.join(), data.seabed.coralMonths]);
  useEffect(() => tank?.sparkle(sparkling), [tank, sparkling.join()]);
  useEffect(() => tank?.go(view), [tank, view]);

  // Where things are on screen: the big tuna goes exactly where the drawing is, and the wide view
  // fits between the top bar and the card at the bottom. Measured again whenever the layout moves.
  useLayoutEffect(() => {
    if (!tank) return;
    const measure = () => {
      const top = (bar.current?.offsetTop ?? 0) + (bar.current?.offsetHeight ?? 0);
      tank.setFreeArea(top, card.current?.offsetTop ?? window.innerHeight);
      // The home view's layout only (the wide view shrinks it away).
      if (view === 'home' && spot.current) tank.placeMascot(drawingBox(spot.current));
    };
    measure();
    const watcher = new ResizeObserver(measure);
    if (center.current) watcher.observe(center.current);
    if (card.current) watcher.observe(card.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      watcher.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [tank, view]);

  // Stable pseudo-random lanes so the drawn school doesn't jump around between renders.
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

  const visit = (v: 'home' | 'wide') => {
    fx.tap();
    setView(v);
  };

  return (
    <main class={`screen home${view === 'wide' ? ' wide' : ''}`}>
      {drawing && (
        <>
          <div class="floor" aria-hidden="true">
            <Seabed sparkling={sparkling} />
          </div>
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
        </>
      )}

      <header class="topbar" ref={bar}>
        {view === 'wide' ? (
          <button class="icon-btn swim-back" onClick={() => visit('home')}>
            <Back />
            <span class="icon-label">{t.swimBack}</span>
            <Haptic />
          </button>
        ) : (
          <>
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
          </>
        )}
      </header>

      {washedAshore && (
        <div class="toast" role="status">
          <span>🌊 {t.washedAshore}</span>
          <button class="link" onClick={dismissWashedAshore}>{t.ok}</button>
        </div>
      )}

      <div class="home-center" ref={center} inert={view !== 'home'}>
        <PettableTuna tank={tank} waiting={waiting} spot={spot} />
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
        {/* Hidden but keeping its place while the tank loads, so nothing moves when it comes. */}
        {(tank || waiting) && (
          <button class={`secondary small visit-btn${tank ? '' : ' waiting'}`} onClick={() => visit('wide')}>
            <Fish size={20} /> {t.visitSchool}
            <Haptic />
          </button>
        )}

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

      {tank && (
        <section class="group school-card" ref={card} inert={view !== 'wide'}>
          <p class="school-card-count">
            {t.school(school)}
            {school > shownTuna(school) && <small class="muted">{t.school3dShown(shownTuna(school))}</small>}
          </p>
          <p class="muted small">{calm ? t.school3dCalm : t.school3dDrag}</p>
        </section>
      )}
    </main>
  );
}

/**
 * Where the drawn tuna is, in screen pixels: inside the button, without its padding. From the
 * layout, not the screen, so the bob and the wide view's shrinking don't move it.
 */
function drawingBox(button: HTMLElement) {
  let x = -window.scrollX;
  let y = -window.scrollY;
  for (let n: HTMLElement | null = button; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  const pad = getComputedStyle(button);
  const px = parseFloat(pad.paddingLeft) || 0;
  const py = parseFloat(pad.paddingTop) || 0;
  return { x: x + px, y: y + py, width: button.offsetWidth - 2 * px, height: button.offsetHeight - 2 * py };
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
 * it tells a joke: one in ten is a dark one, delivered with a wide-eyed stare, and about one in
 * three is about Jungkook, in a purple bubble with a purple heart (D45). Every tap is counted (D49).
 *
 * With the 3D tank (D55) the tuna is drawn in 3D right where the drawing would be: the drawing fades
 * out but its button stays, so tapping, the hearts and the jokes all work the same. While the tank
 * loads on a phone where it worked before (`waiting`), the drawing is hidden from the start.
 */
function PettableTuna({ tank, waiting, spot }: { tank: Tank | null; waiting: boolean; spot: RefObject<HTMLButtonElement> }) {
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
  useEffect(() => tank?.setMood(mood === 'unhinged' || mood === 'bliss' ? mood : 'happy'), [tank, mood]);

  return (
    <div class="pet-zone">
      {joke && (
        <p key={joke.id} class={`speech${joke.kind === 'normal' ? '' : ` ${joke.kind}`}`} role="status">
          {joke.text}
        </p>
      )}
      <button ref={spot} class={`tuna-pet${tank ? ' in-3d' : waiting ? ' waiting' : ' bob'}`} onPointerDown={() => tank?.squish()} onClick={pet} aria-label={t.petTuna}>
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
