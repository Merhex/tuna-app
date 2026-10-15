import { useRef, useState } from 'preact/hooks';
import { RARITIES } from '../cards';
import { fx } from '../feedback';
import { useLang, useT } from '../i18n';
import { isQuitDate } from '../milestones';
import { todayKey } from '../treasure';
import { DateField, formatDay } from './DateField';
import { FishHook } from './Icons';
import { RarityFish } from './RarityFish';
import { Decoration } from './Seabed';
import { MiniTuna, Tuna } from './Tuna';
import { Haptic } from './Haptic';

/**
 * First-launch explainer: what the app is for and what the fishy words mean. It ends by asking when
 * she quit (D44), unless that's known. Phones that saw the intro before D44 get just the question.
 * `onDone` gets the date she picked, or null if she skipped (which counts as today).
 */
export function Intro({
  askQuitDate,
  questionOnly,
  onDone,
}: {
  askQuitDate: boolean;
  questionOnly: boolean;
  onDone: (quitDate: string | null) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [index, setIndex] = useState(0);
  const [earlier, setEarlier] = useState(false);
  const [picked, setPicked] = useState(yesterday);
  const touchX = useRef<number | null>(null);
  const explainer = questionOnly ? [] : t.intro;
  const slides = askQuitDate ? [...explainer, t.quitQuestion] : explainer;
  const last = index === slides.length - 1;
  const onQuestion = askQuitDate && last;
  const today = todayKey();

  const finish = (date: string | null) => {
    fx.done();
    onDone(date);
  };

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    if (next === index) return;
    fx.tap();
    setIndex(next);
  };

  return (
    <main
      class="screen intro"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
      }}
    >
      <header class="topbar">
        <span class="topbar-spacer" />
        {!last && (
          <button class="link" onClick={() => onDone(null)}>
            {t.skip}
            <Haptic />
          </button>
        )}
      </header>

      <div class="intro-viewport">
        <div class="intro-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, i) => (
            <section class="intro-slide" key={i} aria-hidden={i !== index}>
              <div class="intro-art">{slide === t.quitQuestion ? <SeabedPreview /> : art(i)}</div>
              <h1>{slide.title}</h1>
              <p class="intro-body">{slide.body}</p>
              {slide === t.quitQuestion && earlier && (
                <DateField
                  value={picked}
                  max={today}
                  text={formatDay(picked, lang)}
                  label={t.quitDateLabel}
                  onChange={(value) => isQuitDate(value, today) && setPicked(value)}
                />
              )}
              {slide.terms && (
                <dl class="glossary">
                  {slide.terms.map((term, j) => (
                    <div class="term" key={j}>
                      <span class="term-icon" aria-hidden="true">{termIcon(j)}</span>
                      <dt>{term.word}</dt>
                      <dd>{term.meaning}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>
      </div>

      <footer class="intro-footer">
        {slides.length > 1 && (
          <div class="dots" role="tablist">
            {slides.map((_, i) => (
              <button
                key={i}
                class={`dot ${i === index ? 'on' : ''}`}
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1} / ${slides.length}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}
        {onQuestion && !earlier ? (
          // "Today" is the one-tap answer; "Earlier" shows a date picker on the slide.
          <>
            <button class="primary big" onClick={() => finish(today)}>
              {t.quitToday}
              <Haptic />
            </button>
            <button class="link" onClick={() => { fx.tap(); setEarlier(true); }}>
              {t.quitEarlier}
              <Haptic />
            </button>
          </>
        ) : (
          <button
            class="primary big"
            onClick={() => {
              if (onQuestion) finish(picked);
              else if (last) finish(null);
              else goTo(index + 1);
            }}
          >
            {last ? t.introStart : t.next}
            <Haptic />
          </button>
        )}
      </footer>
    </main>
  );
}

function art(i: number) {
  switch (i) {
    case 0:
      return <Tuna mood="cheer" size={150} class="bob" />;
    case 1:
      return (
        <div class="intro-hook">
          <div class="intro-line" />
          <FishHook size={60} stroke={4.5} />
        </div>
      );
    case 2:
      return (
        <div class="fish-ladder">
          {RARITIES.map((r) => (
            <RarityFish key={r} rarity={r} size={r === 'legendary' ? 96 : 76} />
          ))}
        </div>
      );
    default:
      return (
        <div class="intro-school">
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} style={{ animationDelay: `${n * -0.6}s` }}>
              <MiniTuna size={34 + (n % 2) * 8} />
            </span>
          ))}
        </div>
      );
  }
}

/** A strip of seabed with the first few decorations, for the quit-date question. */
function SeabedPreview() {
  return (
    <div class="intro-seabed" aria-hidden="true">
      <span style={{ rotate: '-18deg' }}><Decoration id="quit-day" width={44} /></span>
      <span><Decoration id="day-1" width={36} /></span>
      <span style={{ rotate: '14deg' }}><Decoration id="day-3" width={48} /></span>
    </div>
  );
}

/** The day before today, as YYYY-MM-DD: where the date picker starts after "Earlier". */
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function termIcon(j: number) {
  if (j === 0) return <FishHook size={26} stroke={3.5} />;
  if (j === 1) return <span class="mini-scale"><i /><i /><i /><i /><i /></span>;
  // A fishing line with a break in it.
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
      <path d="M13 1v8M13 17v8" />
      <path d="M8 11l-3-2M18 11l3-2M8 15l-3 2M18 15l3 2" stroke-width="2" />
    </svg>
  );
}
