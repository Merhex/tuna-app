import { useEffect, useRef, useState } from 'preact/hooks';
import { pickActivity, rememberPick } from '../activities';
import type { BreatheResult } from '../breathe';
import { CARDS, cardById, fitsPlace, PLACES, type Card } from '../cards';
import { drawCard, FAVOURITES_MIN } from '../draw';
import { fx } from '../feedback';
import { localeOf, pick, useT } from '../i18n';
import { makePostcard, sharePostcard } from '../postcard';
import { useApp } from '../state';
import { cravingInProgress } from '../updates';
import { schoolSize, SLIP_REASONS, type AppData, type HookEntry, type HookResult, type SlipReason } from '../storage';
import { streakOf } from '../streak';
import { CardView, Rating } from './CardView';
import { BreatheRound } from './Breathe';
import { DodgeGame, type DodgeScore } from './Dodge';
import { Close, FishHook, House, Pin } from './Icons';
import { Tuna } from './Tuna';
import { Haptic } from './Haptic';

// After a snag: 'fresh' asks about her streak, 'regroup' offers the next step (D57).
type Step = 'before' | 'drop' | 'card' | 'game' | 'breathe' | 'check' | 'won' | 'notyet' | 'snagged' | 'fresh' | 'regroup';

/** How the last round of Dodge the hooks or Bubbles went. */
type LastRound = { kind: 'dodge'; score: DodgeScore } | { kind: 'breathe'; result: BreatheResult };

/** How long a new screen ignores taps (see `guard`). */
const SETTLE_MS = 300;
/** A hook rated this strong or stronger starts with Dodge the hooks or Bubbles instead of a card (D51, D54). */
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
  // Rounds of Dodge the hooks (D50) and breaths in Bubbles (D54) this hook, and how the last round went
  // if she did one after her last card, for the check and win screens.
  const [rounds, setRounds] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const [lastRound, setLastRound] = useState<LastRound | null>(null);
  const [note, setNote] = useState('');
  const [reasons, setReasons] = useState<SlipReason[]>([]);
  // Breathing straight after a snag (D57): a new hook, with its own line above the round.
  const [regroup, setRegroup] = useState(false);
  // The postcard (D53), drawn as soon as the win screen shows, so a tap opens the share sheet
  // straight away: iPhone only allows sharing right after a tap, not after waiting for a drawing.
  const [postcard, setPostcard] = useState<File | 'failed' | null>(null);
  const startedAt = useRef(new Date().toISOString());
  const wonTitle = useRef(pick(t.wonTitles));
  const timers = useRef<number[]>([]);
  // Guards against a double tap on the first screen drawing two cards.
  const leftBefore = useRef(false);
  // Whether this hook is in the log yet, so leaving never records it twice.
  const recorded = useRef(false);
  const slipId = useRef('');
  const streak = data.quitDate ? streakOf(data.hooks, data.quitDate) : null;

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
  }, [step]);
  const guard =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      if (performance.now() - stepAt.current >= SETTLE_MS) fn(...args);
    };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // Straight from a brutal rating (D51): no card or round yet. Then a round says why it came up, and
  // offers the other one or a card instead (D54).
  const fromRating = !drawn.length && !rounds && !breaths;
  const roundLine = (r: LastRound) =>
    r.kind === 'dodge'
      ? `${t.dodgeTitle} · ${r.score.dodged} ${t.hooksDodged(r.score.dodged)}`
      : `${t.breatheTitle} · ${r.result.breaths} ${t.breathsTaken(r.result.breaths)}`;
  // The tap also lets iPhone play the round's sounds.
  const toRound = (next: 'game' | 'breathe') => () => {
    fx.tap();
    setStep(next);
  };

  /** A brutal hook starts with one of the two, at random, but never the same three times in a row (D54). */
  function startBrutal() {
    const a = pickActivity(data.settings.brutalPicks);
    update((d) => ({ ...d, settings: { ...d.settings, brutalPicks: rememberPick(d.settings.brutalPicks, a) } }));
    setStep(a === 'dodge' ? 'game' : 'breathe');
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

  function finish(result: HookResult, extra: Pick<HookEntry, 'baitNote' | 'reasons'> = {}): string {
    const id = `${Date.now()}`;
    recorded.current = true;
    update((d: AppData) => ({
      ...d,
      hooks: [
        ...d.hooks,
        {
          id,
          startedAt: startedAt.current,
          endedAt: new Date().toISOString(),
          before,
          after,
          cards: drawn,
          completed,
          ...(rounds ? { rounds } : {}),
          ...(breaths ? { breaths } : {}),
          result,
          ...extra,
        },
      ],
    }));
    return id;
  }

  function close() {
    // Leaving after finishing at least one card or round counts as "not yet"; otherwise nothing is recorded.
    if ((completed.length || rounds || breaths) && !recorded.current && step !== 'snagged') finish('notyet');
    onExit();
  }

  /** Breathing right after a snag starts a new hook, so a win afterwards counts like any other (D57). */
  function breatheAgain() {
    fx.tap();
    startedAt.current = new Date().toISOString();
    recorded.current = false;
    leftBefore.current = true;
    setBefore(undefined);
    setAfter(undefined);
    setCard(null);
    setThrownBack(false);
    setDrawn([]);
    setCompleted([]);
    setLastCatch(null);
    setRounds(0);
    setBreaths(0);
    setLastRound(null);
    setNote('');
    setReasons([]);
    setRegroup(true);
    setStep('breathe');
  }

  return (
    <main class={`screen hook step-${step}`}>
      <header class="topbar">
        {/* The rounds have their own button for ending them. */}
        {step !== 'won' && step !== 'game' && step !== 'breathe' && (
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

      {step === 'game' && (
        <DodgeGame
          calm={data.settings.reducedMotion}
          lead={fromRating && !regroup ? t.dodgeBrutal(before ?? GAME_FROM) : undefined}
          others={
            fromRating
              ? [
                  { label: t.breatheInstead, onPick: guard(toRound('breathe')) },
                  { label: t.drawCard, onPick: guard(draw) },
                ]
              : undefined
          }
          onEnd={(score) => {
            // Leaving before her first touch goes back without counting a round: to the rating if
            // she came straight from it, so she can change it, otherwise to "Not yet". Straight after a
            // snag, back to its last screen.
            if (!score && fromRating) {
              if (regroup) return setStep('regroup');
              leftBefore.current = false;
              return setStep('before');
            }
            if (!score) return setStep('notyet');
            setRounds((n) => n + 1);
            setLastRound({ kind: 'dodge', score });
            setStep('check');
          }}
        />
      )}

      {step === 'breathe' && (
        <BreatheRound
          calm={data.settings.reducedMotion}
          lead={fromRating ? (regroup ? t.breatheAfterSnag : t.breatheBrutal(before ?? GAME_FROM)) : undefined}
          others={
            fromRating
              ? [
                  { label: t.dodgeInstead, onPick: guard(toRound('game')) },
                  { label: t.drawCard, onPick: guard(draw) },
                ]
              : undefined
          }
          onEnd={(result) => {
            // Leaving before a whole breath works like leaving the game before touching it.
            if (!result && fromRating) {
              if (regroup) return setStep('regroup');
              leftBefore.current = false;
              return setStep('before');
            }
            if (!result) return setStep('notyet');
            setBreaths((n) => n + result.breaths);
            setLastRound({ kind: 'breathe', result });
            setStep('check');
          }}
        />
      )}

      {step === 'check' && (
        <section class="panel center">
          <Tuna mood="happy" size={110} />
          {lastRound?.kind === 'dodge' && (
            <p class="dodge-summary">
              {t.dodgeEulogy(lastRound.score.dodged)}
              <span class="muted small">{lastRound.score.bubbles} {t.bubblesCaught(lastRound.score.bubbles)}</span>
            </p>
          )}
          {lastRound?.kind === 'breathe' && (
            <p class="dodge-summary">
              {t.breatheSummary(lastRound.result.breaths)}
              {/* Only if she played along with her finger. */}
              {lastRound.result.touched && <span class="muted small">{t.breathsOnBeat(lastRound.result.onBeat)}</span>}
            </p>
          )}
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
            {/* For a craving that outlasts a card (D50): both rounds, the one she didn't just do first (D54). */}
            {(lastRound?.kind === 'dodge' ? (['breathe', 'game'] as const) : (['game', 'breathe'] as const)).map((r) => (
              <button key={r} class="secondary big" onClick={guard(toRound(r))}>
                {r === 'game' ? t.dodgeOffer : t.breatheOffer}
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
          <div class="field">
            <span>{t.reasonsPrompt}</span>
            <div class="reason-chips" role="group" aria-label={t.reasonsPrompt}>
              {SLIP_REASONS.map((r) => (
                <button
                  key={r}
                  class="reason-chip"
                  aria-pressed={reasons.includes(r)}
                  onClick={guard(() => {
                    fx.tap();
                    setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
                  })}
                >
                  {t.reasons[r]}
                  <Haptic />
                </button>
              ))}
            </div>
          </div>
          <label class="field">
            <span>{t.baitPrompt}</span>
            <textarea rows={2} value={note} onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)} />
          </label>
          <button
            class="primary big"
            onClick={guard(() => {
              const picked = SLIP_REASONS.filter((r) => reasons.includes(r));
              slipId.current = finish('slipped', {
                ...(note.trim() ? { baitNote: note.trim() } : {}),
                ...(picked.length ? { reasons: picked } : {}),
              });
              fx.tap();
              // A streak of 0 (quit or started fresh today) has nothing to keep or reset.
              setStep(streak && streak.current > 0 ? 'fresh' : 'regroup');
            })}
          >
            {t.saveAndSwim}
            <Haptic />
          </button>
        </section>
      )}

      {/* Her call, every time (D57). Leaving here just logs the snag. */}
      {step === 'fresh' && streak && (
        <section class="panel center">
          <Tuna mood="soft" size={110} />
          <h1>{t.freshTitle}</h1>
          <p>{t.freshBody(streak.current)}</p>
          <div class="stack">
            <button
              class="primary big"
              onClick={guard(() => {
                fx.tap();
                update((d) => ({ ...d, hooks: d.hooks.map((h) => (h.id === slipId.current ? { ...h, freshStart: true } : h)) }));
                setStep('regroup');
              })}
            >
              {t.freshStart}
              <Haptic />
            </button>
            <button
              class="secondary big"
              onClick={guard(() => {
                fx.tap();
                setStep('regroup');
              })}
            >
              {t.freshKeep}
              <Haptic />
            </button>
          </div>
          <p class="muted small">{t.freshNote}</p>
        </section>
      )}

      {step === 'regroup' && (
        <section class="panel center">
          <Tuna mood="cheer" size={110} />
          <h1>{t.regroupTitle}</h1>
          <p class="muted">{streak && streak.best > 0 ? t.regroupBest(streak.best) : t.regroupNoBest}</p>
          <div class="stack">
            <button class="primary big" onClick={guard(breatheAgain)}>{t.breatheOffer}<Haptic /></button>
            <button class="secondary big" onClick={guard(onExit)}>{t.backToTank}<Haptic /></button>
          </div>
        </section>
      )}
    </main>
  );
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
