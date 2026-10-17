import { useEffect, useRef, useState } from 'preact/hooks';
import { alternatives, notYetRounds, pickActivity, rememberPick, type Activity } from '../activities';
import type { BreatheResult } from '../breathe';
import { CARDS, cardById, fitsPlace, PLACES, type Card } from '../cards';
import { drawCard, FAVOURITES_MIN } from '../draw';
import { fx } from '../feedback';
import { localeOf, pick, useT } from '../i18n';
import { makePostcard, sharePostcard } from '../postcard';
import { useApp } from '../state';
import { cravingInProgress } from '../updates';
import { schoolSize, type AppData, type HookEntry, type HookResult } from '../storage';
import { CardView, Rating } from './CardView';
import { BreatheRound } from './Breathe';
import { DodgeGame, type DodgeScore } from './Dodge';
import { PackGame, type PackScore } from './Pack';
import { Close, FishHook, House, Pin } from './Icons';
import { Tuna } from './Tuna';
import { Haptic } from './Haptic';

type Step = 'before' | 'drop' | 'card' | 'round' | 'check' | 'won' | 'notyet' | 'snagged';

/** How the last round went: one member per activity. */
type LastRound =
  | { kind: 'dodge'; score: DodgeScore }
  | { kind: 'breathe'; result: BreatheResult }
  | { kind: 'pack'; score: PackScore };

/** What a hook's rounds add up to, as stored on it. */
type RoundCounts = Pick<HookEntry, 'rounds' | 'breaths' | 'packs'>;

type Strings = ReturnType<typeof useT>;

/** How long a new screen ignores taps (see `guard`). */
const SETTLE_MS = 300;
/** A hook rated this strong or stronger starts with a round (one of `ENABLED`) instead of a card (D51, D54). */
const GAME_FROM = 8;

export function HookFlow({ onExit }: { onExit: () => void }) {
  const t = useT();
  const { data, update } = useApp();
  const [step, setStep] = useState<Step>('before');
  const [before, setBefore] = useState<number>();
  const [after, setAfter] = useState<number>();
  const [card, setCard] = useState<Card | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [thrownBack, setThrownBack] = useState(false);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [lastCatch, setLastCatch] = useState<{ isNew: boolean; count: number } | null>(null);
  // The round on screen, the rounds she played this hook (oldest first) and what they add up to
  // (rounds of Dodge the hooks, D50; breaths in Bubbles, D54; rounds of Net Packing), and how the last
  // round went if she did one after her last card, for the check and win screens.
  const [activity, setActivity] = useState<Activity>('dodge');
  const [played, setPlayed] = useState<Activity[]>([]);
  const [counts, setCounts] = useState<RoundCounts>({});
  const [lastRound, setLastRound] = useState<LastRound | null>(null);
  const [note, setNote] = useState('');
  // The postcard (D53), drawn as soon as the win screen shows, so a tap opens the share sheet
  // straight away: iPhone only allows sharing right after a tap, not after waiting for a drawing.
  const [postcard, setPostcard] = useState<File | 'failed' | null>(null);
  const startedAt = useRef(new Date().toISOString());
  const wonTitle = useRef(pick(t.wonTitles));
  const timers = useRef<number[]>([]);
  // Guards against a double tap on the first screen drawing two cards.
  const leftBefore = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (step !== 'won') return;
    const lang = data.settings.lang;
    const last = cardById(completed[completed.length - 1] ?? '');
    makePostcard({
      headline: pick(t.postcardHeadlines),
      feat: lastRound
        ? roundLine(lastRound)
        : last
          ? `${last.title[lang]} · ${t.rarity[last.rarity]}`
          : '',
      pull: before !== undefined && after !== undefined ? { label: t.pullChange, before, after } : undefined,
      school: t.postcardSchool(schoolSize(data)),
      date: new Intl.DateTimeFormat(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    }).then(setPostcard, () => setPostcard('failed'));
  }, [step]);
  useEffect(() => {
    cravingInProgress.current = true;
    return () => {
      cravingInProgress.current = false;
    };
  }, []);

  // Taps in the first moments of a new screen are ignored. Otherwise a quick double tap on the
  // previous screen's button lands on whatever is now under the finger, such as a rating she
  // never chose. (The haptic tick still plays; only the action is skipped.)
  const stepAt = useRef(performance.now());
  useEffect(() => {
    stepAt.current = performance.now();
  }, [step, activity]);
  const guard =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      if (performance.now() - stepAt.current >= SETTLE_MS) fn(...args);
    };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // Straight from a brutal rating (D51): no card or round yet. Then a round says why it came up, and
  // offers another one or a card instead (D54).
  const fromRating = !drawn.length && !played.length;
  const roundLine = (r: LastRound) => {
    switch (r.kind) {
      case 'dodge':
        return `${t.dodgeTitle} · ${r.score.dodged} ${t.hooksDodged(r.score.dodged)}`;
      case 'breathe':
        return `${t.breatheTitle} · ${r.result.breaths} ${t.breathsTaken(r.result.breaths)}`;
      case 'pack':
        return `${t.packTitle} · ${r.score.crates} ${t.crates(r.score.crates)}`;
    }
  };
  // The tap also lets iPhone play the round's sounds.
  const toRound = (next: Activity) => () => {
    fx.tap();
    setActivity(next);
    setStep('round');
  };

  /** A brutal hook starts with a round, at random, but never the same one three times in a row (D54). */
  function startBrutal() {
    const a = pickActivity(data.settings.brutalPicks);
    update((d) => ({ ...d, settings: { ...d.settings, brutalPicks: rememberPick(d.settings.brutalPicks, a) } }));
    setActivity(a);
    setStep('round');
  }

  function endRound(r: LastRound | null) {
    // Leaving before her first touch goes back without counting a round: to the rating if she came
    // straight from it, so she can change it, otherwise to "Not yet".
    if (!r && fromRating) {
      leftBefore.current = false;
      return setStep('before');
    }
    if (!r) return setStep('notyet');
    setCounts((c) => addRound(c, r));
    setPlayed((p) => [...p, r.kind]);
    setLastRound(r);
    setStep('check');
  }

  /** The round on screen, with its line and ways out when it was picked straight from the rating. */
  function round() {
    const text = roundText(t, activity);
    // One other round, the one picked least lately, and a card: never a long list at the worst moment (D51).
    const other = alternatives(activity, data.settings.brutalPicks)[0];
    const props = {
      calm: data.settings.reducedMotion,
      lead: fromRating ? text.brutal(before ?? GAME_FROM) : undefined,
      others: fromRating
        ? [
            ...(other ? [{ label: roundText(t, other).instead, onPick: guard(toRound(other)) }] : []),
            { label: t.drawCard, onPick: guard(draw) },
          ]
        : undefined,
    };
    switch (activity) {
      case 'dodge':
        return <DodgeGame key="dodge" {...props} onEnd={(s) => endRound(s && { kind: 'dodge', score: s })} />;
      case 'breathe':
        // Leaving before a whole breath works like leaving the game before touching it.
        return <BreatheRound key="breathe" {...props} onEnd={(r) => endRound(r && { kind: 'breathe', result: r })} />;
      case 'pack':
        return <PackGame key="pack" {...props} onEnd={(s) => endRound(s && { kind: 'pack', score: s })} />;
      default:
        return null;
    }
  }

  function draw() {
    // Only cards she can do where she is (D39). Favourites mode needs enough hearted cards that fit here,
    // otherwise it would keep dealing the same one or two.
    const pool = CARDS.filter((c) => fitsPlace(c, data.settings.place));
    const favouriteIds =
      data.settings.drawFrom === 'favourites'
        ? new Set(pool.filter((c) => data.collection[c.id]?.favourite).map((c) => c.id))
        : undefined;
    const result = drawCard({
      cards: pool,
      caughtIds: new Set(Object.keys(data.collection)),
      state: data.drawState,
      favouriteIds: favouriteIds && favouriteIds.size >= FAVOURITES_MIN ? favouriteIds : undefined,
    });
    update((d) => ({ ...d, drawState: result.state }));
    setCard(result.card);
    setDrawn((ids) => [...ids, result.card.id]);
    setFlipped(false);
    setStep('drop');
    later(() => {
      setStep('card');
      later(() => {
        setFlipped(true);
        fx.reveal(result.card.rarity);
      }, 350);
    }, 1100);
  }

  function completeCard() {
    if (!card) return;
    const prev = data.collection[card.id];
    const count = (prev?.count ?? 0) + 1;
    update((d) => ({
      ...d,
      collection: {
        ...d.collection,
        [card.id]: {
          count,
          firstCaught: prev?.firstCaught ?? new Date().toISOString(),
          favourite: prev?.favourite ?? false,
        },
      },
    }));
    setCompleted((ids) => [...ids, card.id]);
    setLastCatch({ isNew: !prev, count });
    setLastRound(null);
    fx.done();
    setStep('check');
  }

  function finish(result: HookResult, baitNote?: string) {
    update((d: AppData) => ({
      ...d,
      hooks: [
        ...d.hooks,
        {
          id: `${Date.now()}`,
          startedAt: startedAt.current,
          endedAt: new Date().toISOString(),
          before,
          after,
          cards: drawn,
          completed,
          ...counts,
          result,
          ...(baitNote ? { baitNote } : {}),
        },
      ],
    }));
  }

  function close() {
    // Leaving after finishing at least one card or round counts as "not yet"; otherwise nothing is recorded.
    if ((completed.length || played.length) && step !== 'won' && step !== 'snagged') finish('notyet');
    onExit();
  }

  return (
    <main class={`screen hook step-${step}`}>
      <header class="topbar">
        {/* The rounds have their own button for ending them. */}
        {step !== 'won' && step !== 'round' && (
          <button class="icon-btn" onClick={close} aria-label={t.close}>
            <Close />
            <Haptic />
          </button>
        )}
      </header>

      {step === 'before' && (
        <section class="panel center">
          <Tuna mood="cheer" size={110} />
          <div class="segmented place-toggle" role="group" aria-label={t.placeLabel}>
            {PLACES.map((p) => (
              <button
                key={p}
                aria-pressed={data.settings.place === p}
                onClick={guard(() => {
                  fx.tap();
                  update((d) => ({ ...d, settings: { ...d.settings, place: p } }));
                })}
              >
                {p === 'home' ? <House size={17} /> : <Pin size={17} />}
                {p === 'home' ? t.placeHome : t.placeOut}
                <Haptic />
              </button>
            ))}
          </div>
          <h1>{t.rateBefore}</h1>
          <Rating
            value={before}
            onPick={guard((n: number) => {
              if (leftBefore.current) return;
              leftBefore.current = true;
              fx.tap();
              setBefore(n);
              // The tap also lets iPhone play the game's sounds.
              later(n >= GAME_FROM ? startBrutal : draw, 250);
            })}
          />
          <button
            class="link"
            onClick={guard(() => {
              if (leftBefore.current) return;
              leftBefore.current = true;
              draw();
            })}
          >
            {t.skip}
            <Haptic />
          </button>
        </section>
      )}

      {step === 'drop' && (
        <section class="panel center">
          <div class="line-drop" aria-hidden="true">
            <div class="line" />
            <div class="hook-swing">
              <FishHook size={56} stroke={4.5} />
            </div>
          </div>
          <p class="biting">{t.biting}</p>
        </section>
      )}

      {step === 'card' && card && (
        <section class="panel center">
          <CardView card={card} flipped={flipped} isNew={!data.collection[card.id]} />
          {flipped && (
            <div class="card-actions fade-in">
              {card.timerSeconds && <Countdown key={card.id + drawn.length} seconds={card.timerSeconds} />}
              <button class="primary big" onClick={guard(completeCard)}>{t.doneIt}<Haptic /></button>
              {!thrownBack && (
                <button
                  class="secondary"
                  onClick={guard(() => {
                    fx.tap();
                    setThrownBack(true);
                    draw();
                  })}
                >
                  🎣 {t.throwBack}
                  <Haptic />
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {step === 'round' && round()}

      {step === 'check' && (
        <section class="panel center">
          <Tuna mood="happy" size={110} />
          {lastRound && <RoundSummary round={lastRound} />}
          <h1>{t.checkTitle}</h1>
          <p class="muted">{t.rateAfter}</p>
          <Rating
            value={after}
            onPick={guard((n: number) => {
              fx.tap();
              setAfter(n);
            })}
          />
          <div class="stack">
            <button
              class="primary big"
              onClick={guard(() => {
                finish('passed');
                fx.celebrate();
                setStep('won');
              })}
            >
              {t.yes}
              <Haptic />
            </button>
            <button
              class="secondary big"
              onClick={guard(() => {
                fx.tap();
                setStep('notyet');
              })}
            >
              {t.notYet}
              <Haptic />
            </button>
          </div>
          {/* Deliberately small and quiet (decision D31). */}
          <button
            class="quiet-link"
            onClick={guard(() => {
              fx.gentle();
              setStep('snagged');
            })}
          >
            {t.snagged}
          </button>
        </section>
      )}

      {step === 'won' && (
        <section class="panel center celebrate">
          <div class="bubbles" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.18}s` }} />
            ))}
          </div>
          <div class="snap" aria-hidden="true">
            <div class="snap-line" />
            <div class="snap-hook">
              <FishHook size={44} stroke={4.5} />
            </div>
          </div>
          <Tuna mood="smug" size={150} class="bob" />
          <h1 class="won-title">{wonTitle.current}</h1>
          {lastRound ? (
            <p class="muted">{roundLine(lastRound)}</p>
          ) : (
            <>
              {lastCatch?.isNew && <p class="new-catch">{t.newCatch}</p>}
              <p class="muted">
                {CARDS.find((c) => c.id === completed[completed.length - 1])?.title[data.settings.lang]} ·{' '}
                {t.caughtTimes(lastCatch?.count ?? 1)}
              </p>
            </>
          )}
          {before !== undefined && after !== undefined && (
            <div class="pull-change">
              <span class="muted small">{t.pullChange}</span>
              <div class="pull-values">
                <span class="pull-num" style={{ '--level': before } as Record<string, number>}>{before}</span>
                <span class="pull-arrow">→</span>
                <span class="pull-num" style={{ '--level': after } as Record<string, number>}>{after}</span>
              </div>
              {after < before && <span class="small">{t.pullLesson}</span>}
            </div>
          )}
          <p>{t.joinedSchool}</p>
          <div class="stack">
            <button class="primary big" onClick={guard(onExit)}>{t.backToTank}<Haptic /></button>
            {/* Hidden if the drawing failed: there's nothing to send. */}
            {postcard !== 'failed' && (
              <button
                class="secondary"
                disabled={!postcard}
                onClick={guard(() => {
                  if (!postcard) return;
                  fx.tap();
                  void sharePostcard(postcard);
                })}
              >
                {t.postcardSend}
                <Haptic />
              </button>
            )}
          </div>
        </section>
      )}

      {step === 'notyet' && (
        <section class="panel center">
          <Tuna mood="cheer" size={110} />
          <h1>{t.notYetTitle}</h1>
          {/* After a brutal hook that started with a round (D51), there's no card yet. */}
          <p class="muted">{drawn.length ? t.notYetBody : t.notYetBodyNoCard}</p>
          <div class="stack">
            <button class="primary big" onClick={guard(draw)}>{drawn.length ? t.drawAnother : t.drawCard}<Haptic /></button>
            {/* For a craving that outlasts a card (D50): two rounds, not the one she just did, the one
                picked least lately first (D54). */}
            {notYetRounds(lastRound?.kind, [...data.settings.brutalPicks, ...played]).map((a) => (
              <button key={a} class="secondary big" onClick={guard(toRound(a))}>
                {roundText(t, a).offer}
                <Haptic />
              </button>
            ))}
          </div>
          <button class="link" onClick={guard(() => { finish('notyet'); onExit(); })}>{t.backToTank}<Haptic /></button>
        </section>
      )}

      {step === 'snagged' && (
        <section class="panel center">
          <Tuna mood="soft" size={110} />
          <h1>{t.snaggedTitle}</h1>
          <p>{t.snaggedBody}</p>
          <label class="field">
            <span>{t.baitPrompt}</span>
            <textarea rows={3} value={note} onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)} />
          </label>
          <button
            class="primary big"
            onClick={() => {
              finish('slipped', note.trim() || undefined);
              onExit();
            }}
          >
            {t.saveAndSwim}
            <Haptic />
          </button>
        </section>
      )}
    </main>
  );
}

/** Each activity's lines: its "· N min" offer, its "X instead" link, and a brutal hook's lead. */
function roundText(t: Strings, a: Activity) {
  switch (a) {
    case 'dodge':
      return { offer: t.dodgeOffer, instead: t.dodgeInstead, brutal: t.dodgeBrutal };
    case 'breathe':
      return { offer: t.breatheOffer, instead: t.breatheInstead, brutal: t.breatheBrutal };
    case 'pack':
      return { offer: t.packOffer, instead: t.packInstead, brutal: t.packBrutal };
    case 'track':
      throw new Error('School Tracker is not built yet');
  }
}

/** What a round adds to the hook's log. */
function addRound(c: RoundCounts, r: LastRound): RoundCounts {
  switch (r.kind) {
    case 'dodge':
      return { ...c, rounds: (c.rounds ?? 0) + 1 };
    case 'breathe':
      return { ...c, breaths: (c.breaths ?? 0) + r.result.breaths };
    case 'pack':
      return { ...c, packs: (c.packs ?? 0) + 1 };
  }
}

/** How the round went, above "Did the hook let go?". Shown once, then forgotten: no bests. */
function RoundSummary({ round: r }: { round: LastRound }) {
  const t = useT();
  switch (r.kind) {
    case 'dodge':
      return (
        <p class="dodge-summary">
          {t.dodgeEulogy(r.score.dodged)}
          <span class="muted small">{r.score.bubbles} {t.bubblesCaught(r.score.bubbles)}</span>
        </p>
      );
    case 'breathe':
      return (
        <p class="dodge-summary">
          {t.breatheSummary(r.result.breaths)}
          {/* Only if she played along with her finger. */}
          {r.result.touched && <span class="muted small">{t.breathsOnBeat(r.result.onBeat)}</span>}
        </p>
      );
    case 'pack':
      return (
        <p class="dodge-summary">
          {t.packSummary(r.score.crates)}
          <span class="muted small">{r.score.pieces} {t.fishPacked(r.score.pieces)}</span>
        </p>
      );
  }
}

function Countdown({ seconds }: { seconds: number }) {
  const t = useT();
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const end = Date.now() + left * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        setRunning(false);
        fx.timerEnd();
      }
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  const progress = 1 - left / seconds;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div class="countdown">
      <svg viewBox="0 0 100 100" class="ring" aria-hidden="true">
        <circle cx="50" cy="50" r="44" class="ring-bg" />
        <circle cx="50" cy="50" r="44" class="ring-fg" style={{ strokeDashoffset: `${276.5 * (1 - progress)}` }} />
      </svg>
      <div class="countdown-text">{left === 0 ? t.timeUp : `${mm}:${ss}`}</div>
      {!running && left === seconds && (
        <button
          class="secondary small"
          onClick={() => {
            fx.tap();
            setRunning(true);
          }}
        >
          ⏱ {t.startTimer}
          <Haptic />
        </button>
      )}
    </div>
  );
}
