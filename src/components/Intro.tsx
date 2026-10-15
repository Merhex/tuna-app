import { useRef, useState } from 'preact/hooks';
import { RARITIES } from '../cards';
import { haptic, sound } from '../feedback';
import { useT } from '../i18n';
import { FishHook } from './Icons';
import { RarityFish } from './RarityFish';
import { MiniTuna, Tuna } from './Tuna';
import { Haptic } from './Haptic';

/** First-launch explainer: what the app is for and what the fishy words mean. */
export function Intro({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const slides = t.intro;
  const last = index === slides.length - 1;

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    if (next === index) return;
    haptic.tap();
    sound.tap();
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
          <button class="link" onClick={onDone}>
            {t.skip}
          </button>
        )}
      </header>

      <div class="intro-viewport">
        <div class="intro-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, i) => (
            <section class="intro-slide" key={i} aria-hidden={i !== index}>
              <div class="intro-art">{art(i)}</div>
              <h1>{slide.title}</h1>
              <p class="intro-body">{slide.body}</p>
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
        <button
          class="primary big"
          onClick={() => {
            if (last) {
              haptic.success();
              sound.done();
              onDone();
            } else goTo(index + 1);
          }}
        >
          {last ? t.introStart : t.next}
          <Haptic />
        </button>
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
