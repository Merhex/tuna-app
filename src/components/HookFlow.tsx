import { useEffect, useRef, useState } from 'preact/hooks';
import { CARDS, type Card } from '../cards';
import { drawCard, FAVOURITES_MIN } from '../draw';
import { haptic, sound } from '../feedback';
import { pick, useT } from '../i18n';
import { useApp } from '../state';
import type { AppData, HookResult } from '../storage';
import { CardView, Rating } from './CardView';
import { Close, FishHook } from './Icons';
import { Tuna } from './Tuna';
import { Haptic } from './Haptic';

type Step = 'before' | 'drop' | 'card' | 'check' | 'won' | 'notyet' | 'snagged';

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
  const [note, setNote] = useState('');
  const startedAt = useRef(new Date().toISOString());
  const wonTitle = useRef(pick(t.wonTitles));
  const timers = useRef<number[]>([]);
  // Guards against a double tap on the first screen drawing two cards.
  const leftBefore = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  function draw() {
    const favouriteIds =
      data.settings.drawFrom === 'favourites'
        ? new Set(Object.entries(data.collection).filter(([, c]) => c.favourite).map(([id]) => id))
        : undefined;
    const result = drawCard({
      cards: CARDS,
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
      sound.flip();
      later(() => {
        setFlipped(true);
        sound.reveal(result.card.rarity);
        if (result.card.rarity === 'legendary') haptic.big();
        else if (result.card.rarity === 'rare') haptic.success();
        else haptic.tap();
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
    sound.done();
    haptic.success();
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
          result,
          ...(baitNote ? { baitNote } : {}),
        },
      ],
    }));
  }

  function close() {
    // Leaving after finishing at least one card counts as "not yet"; otherwise nothing is recorded.
    if (completed.length && step !== 'won' && step !== 'snagged') finish('notyet');
    onExit();
  }

  return (
    <main class={`screen hook step-${step}`}>
      <header class="topbar">
        {step !== 'won' && (
          <button class="icon-btn" onClick={close} aria-label={t.close}>
            <Close />
          </button>
        )}
      </header>

      {step === 'before' && (
        <section class="panel center">
          <Tuna mood="cheer" size={110} />
          <h1>{t.rateBefore}</h1>
          <Rating
            value={before}
            onPick={(n) => {
              if (leftBefore.current) return;
              leftBefore.current = true;
              haptic.tap();
              sound.tap();
              setBefore(n);
              later(draw, 250);
            }}
          />
          <button
            class="link"
            onClick={() => {
              if (leftBefore.current) return;
              leftBefore.current = true;
              draw();
            }}
          >
            {t.skip}
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
              <button class="primary big" onClick={completeCard}>{t.doneIt}<Haptic /></button>
              {!thrownBack && (
                <button
                  class="secondary"
                  onClick={() => {
                    haptic.tap();
                    setThrownBack(true);
                    draw();
                  }}
                >
                  🎣 {t.throwBack}
                  <Haptic />
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {step === 'check' && (
        <section class="panel center">
          <Tuna mood="happy" size={110} />
          <h1>{t.checkTitle}</h1>
          <p class="muted">{t.rateAfter}</p>
          <Rating
            value={after}
            onPick={(n) => {
              haptic.tap();
              sound.tap();
              setAfter(n);
            }}
          />
          <div class="stack">
            <button
              class="primary big"
              onClick={() => {
                finish('passed');
                sound.celebrate();
                haptic.big();
                setStep('won');
              }}
            >
              {t.yes}
              <Haptic />
            </button>
            <button
              class="secondary big"
              onClick={() => {
                haptic.tap();
                sound.tap();
                setStep('notyet');
              }}
            >
              {t.notYet}
              <Haptic />
            </button>
          </div>
          {/* Deliberately small and quiet (decision D31). */}
          <button
            class="quiet-link"
            onClick={() => {
              sound.gentle();
              setStep('snagged');
            }}
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
          {lastCatch?.isNew && <p class="new-catch">{t.newCatch}</p>}
          <p class="muted">
            {CARDS.find((c) => c.id === completed[completed.length - 1])?.title[data.settings.lang]} ·{' '}
            {t.caughtTimes(lastCatch?.count ?? 1)}
          </p>
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
          <button class="primary big" onClick={onExit}>{t.backToTank}<Haptic /></button>
        </section>
      )}

      {step === 'notyet' && (
        <section class="panel center">
          <Tuna mood="cheer" size={110} />
          <h1>{t.notYetTitle}</h1>
          <p class="muted">{t.notYetBody}</p>
          <button class="primary big" onClick={draw}>{t.drawAnother}<Haptic /></button>
          <button class="link" onClick={() => { finish('notyet'); onExit(); }}>{t.backToTank}</button>
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
        sound.timerEnd();
        haptic.success();
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
            haptic.tap();
            sound.tap();
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
