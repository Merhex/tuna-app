import { useEffect, useRef, useState } from 'preact/hooks';
import { CARDS, fitsPlace, PLACES, type Card } from '../cards';
import { drawCard, FAVOURITES_MIN } from '../draw';
import { fx } from '../feedback';
import { pick, useT } from '../i18n';
import { useApp } from '../state';
import { cravingInProgress } from '../updates';
import type { AppData, HookResult } from '../storage';
import { CardView, Rating } from './CardView';
import { DodgeGame, type DodgeScore } from './Dodge';
import { Close, FishHook, House, Pin } from './Icons';
import { Tuna } from './Tuna';
import { Haptic } from './Haptic';

type Step = 'before' | 'drop' | 'card' | 'game' | 'check' | 'won' | 'notyet' | 'snagged';

/** How long a new screen ignores taps (see `guard`). */
const SETTLE_MS = 300;

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
  // Dodge the hooks (D50): rounds played this hook, and the score of the last one if she played it
  // after her last card, for the check and win screens.
  const [rounds, setRounds] = useState(0);
  const [lastRound, setLastRound] = useState<DodgeScore | null>(null);
  const [note, setNote] = useState('');
  const startedAt = useRef(new Date().toISOString());
  const wonTitle = useRef(pick(t.wonTitles));
  const timers = useRef<number[]>([]);
  // Guards against a double tap on the first screen drawing two cards.
  const leftBefore = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
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
          ...(rounds ? { rounds } : {}),
          result,
          ...(baitNote ? { baitNote } : {}),
        },
      ],
    }));
  }

  function close() {
    // Leaving after finishing at least one card or round counts as "not yet"; otherwise nothing is recorded.
    if ((completed.length || rounds) && step !== 'won' && step !== 'snagged') finish('notyet');
    onExit();
  }

  return (
    <main class={`screen hook step-${step}`}>
      <header class="topbar">
        {/* The game has its own button for ending the round. */}
        {step !== 'won' && step !== 'game' && (
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
              later(draw, 250);
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
          onEnd={(score) => {
            // Leaving before her first touch goes back without counting a round.
            if (!score) return setStep('notyet');
            setRounds((n) => n + 1);
            setLastRound(score);
            setStep('check');
          }}
        />
      )}

      {step === 'check' && (
        <section class="panel center">
          <Tuna mood="happy" size={110} />
          {lastRound && (
            <p class="dodge-summary">
              {t.dodgeEulogy(lastRound.dodged)}
              <span class="muted small">{lastRound.bubbles} {t.bubblesCaught(lastRound.bubbles)}</span>
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

      {step === 'won' && card && (
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
            <p class="muted">
              {t.dodgeTitle} · {lastRound.dodged} {t.hooksDodged(lastRound.dodged)}
            </p>
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
          <button class="primary big" onClick={guard(onExit)}>{t.backToTank}<Haptic /></button>
        </section>
      )}

      {step === 'notyet' && (
        <section class="panel center">
          <Tuna mood="cheer" size={110} />
          <h1>{t.notYetTitle}</h1>
          <p class="muted">{t.notYetBody}</p>
          <div class="stack">
            <button class="primary big" onClick={guard(draw)}>{t.drawAnother}<Haptic /></button>
            {/* For a craving that outlasts a card (D50). The tap also lets iPhone play the game's sounds. */}
            <button
              class="secondary big"
              onClick={guard(() => {
                fx.tap();
                setStep('game');
              })}
            >
              {t.dodgeOffer}
              <Haptic />
            </button>
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
