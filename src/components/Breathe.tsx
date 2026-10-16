import { useEffect, useRef, useState } from 'preact/hooks';
import {
  BREATHE_SETTINGS,
  createSession,
  momentAt,
  press,
  release,
  roundSeconds,
  step,
  type Moment,
  type PatternId,
  type Phase,
  type Session,
} from '../breathe';
import { fx } from '../feedback';
import { pick, useT } from '../i18n';
import { useApp } from '../state';
import { Back } from './Icons';
import { Haptic } from './Haptic';
import { Tuna } from './Tuna';

type Result = Pick<Session, 'breaths' | 'onBeat' | 'touched'>;

/**
 * Bubbles: ride the wave (roadmap #1), the prototype opened from Settings. Pick a pattern, breathe a
 * round with the tuna, see how it went. Nothing is saved.
 */
export function Breathe({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data } = useApp();
  const [pattern, setPattern] = useState<PatternId>('box');
  const [result, setResult] = useState<Result | null>(null);
  const [playing, setPlaying] = useState(false);

  const start = () => {
    // A tap, so iPhone lets the round's sounds play from here on.
    fx.tap();
    setPlaying(true);
  };

  if (playing) {
    return (
      <BreathePond
        pattern={pattern}
        calm={data.settings.reducedMotion}
        onEnd={(r) => {
          setPlaying(false);
          // Leaving before the first breath was done goes straight back to the start.
          setResult(r.breaths > 0 ? r : null);
        }}
      />
    );
  }

  return (
    <main class="screen breathe">
      <header class="topbar">
        <button class="icon-btn" onClick={onClose} aria-label={t.back}><Back /><Haptic /></button>
        <span class="proto-badge">{t.prototype}</span>
        <span class="topbar-spacer" />
      </header>
      {result ? (
        <section class="panel center">
          <Tuna mood="bliss" size={150} />
          <h1>{t.breatheOver}</h1>
          <p class="muted">{t.breatheSummary(result.breaths)}</p>
          <div class="stats breathe-stats">
            <div class={result.touched ? '' : 'stat-wide'}>
              <strong>{result.breaths}</strong>
              <span>{t.breathsTaken(result.breaths)}</span>
            </div>
            {result.touched && (
              <div>
                <strong>{result.onBeat}</strong>
                <span>{t.breathsOnBeat}</span>
              </div>
            )}
          </div>
          <div class="stack">
            <button class="primary big" onClick={start}>{t.breatheAgain}<Haptic /></button>
            <button class="secondary full" onClick={onClose}>{t.back}<Haptic /></button>
          </div>
        </section>
      ) : (
        <section class="panel center">
          <Tuna mood="happy" size={150} />
          <h1>{t.breatheTitle}</h1>
          <p class="muted">{t.breatheHowTo}</p>
          <div class="segmented" role="group" aria-label={t.breathePattern}>
            {(['box', 'gentle'] as const).map((p) => (
              <button aria-pressed={pattern === p} onClick={() => setPattern(p)}>
                {p === 'box' ? t.breatheBox : t.breatheGentle}
                <Haptic />
              </button>
            ))}
          </div>
          <p class="muted small">{pattern === 'box' ? t.breatheBoxNote : t.breatheGentleNote}</p>
          <button class="primary big" onClick={start}>{t.breatheStart}<Haptic /></button>
        </section>
      )}
    </main>
  );
}

// ---------- The round ----------

/** The stage is drawn in a 340 × 340 box: the track around the edge, the bubble and tuna in the middle. */
const C = 170;
const TRACK = 150;
/** The bubble at its emptiest still holds the tuna; at its fullest it nearly touches the track. */
const BUBBLE_MIN = 76;
const BUBBLE_MAX = 132;
/** The tuna is 120 of the 340 wide. Its mouth, where the out-breath's bubbles leave from. */
const TUNA_W = 120;
const MOUTH = { x: C - TUNA_W / 2 + 30 * (TUNA_W / 200), y: C - (TUNA_W * 0.6) / 2 + 68 * (TUNA_W / 200) };
/** How much the tuna puffs up on a full breath. */
const PUFF = 0.07;

/**
 * One round, full screen. It starts with a short "Ready?", then breath after breath until the round is
 * over or she taps "That's enough". A finger anywhere on the screen counts as breathing in.
 */
function BreathePond({ pattern, calm, onEnd }: { pattern: PatternId; calm: boolean; onEnd: (r: Result) => void }) {
  const t = useT();
  const pond = useRef<HTMLDivElement>(null);
  const tide = useRef<HTMLDivElement>(null);
  const breathCount = useRef<HTMLSpanElement>(null);
  const word = useRef<HTMLParagraphElement>(null);
  const count = useRef<HTMLParagraphElement>(null);
  const cheer = useRef<HTMLParagraphElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const bubble = useRef<SVGCircleElement>(null);
  const shine = useRef<SVGCircleElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const exhaled = useRef<SVGGElement>(null);
  const tuna = useRef<HTMLDivElement>(null);
  const session = useRef<Session>(createSession(pattern));
  const finger = useRef<number | null>(null);
  const ended = useRef(false);

  const end = () => {
    if (ended.current) return;
    ended.current = true;
    const { breaths, onBeat, touched } = session.current;
    onEnd({ breaths, onBeat, touched });
  };

  useEffect(() => {
    // The backdrop's rising bubbles would compete with the ones she's breathing with.
    document.documentElement.classList.add('breathing');
    const s = session.current;
    const words: Record<Phase | 'ready', string> = {
      ready: t.breatheReady,
      in: t.breatheIn,
      hold: t.breatheHold,
      out: t.breatheOut,
      rest: t.breatheHold,
    };
    let raf = 0;
    let last = performance.now();
    let shown = { phase: '', count: -1 };
    let cheerUntil = 0;
    let nextExhale = 0;

    const frame = (now: number) => {
      step(s, (now - last) / 1000);
      last = now;
      for (const e of s.events) {
        if (e.type === 'phase') {
          if (e.phase === 'in') fx.breatheIn(e.seconds);
          else if (e.phase === 'out') fx.breatheOut(e.seconds);
          else fx.breatheHold();
        } else if (e.type === 'breath') {
          if (breathCount.current) breathCount.current.textContent = String(e.n);
        } else if (e.type === 'onBeat') {
          fx.onBeat();
          if (cheer.current) {
            cheer.current.textContent = pick(t.breatheCheers);
            cheer.current.classList.add('show');
          }
          cheerUntil = now + 3000;
        }
      }
      s.events.length = 0;
      if (cheerUntil && now > cheerUntil) {
        cheer.current?.classList.remove('show');
        cheerUntil = 0;
      }

      const m = momentAt(pattern, s.time);
      if (m.phase !== shown.phase && word.current) word.current.textContent = words[m.phase];
      if (m.count !== shown.count && count.current) count.current.textContent = String(m.count);
      shown = { phase: m.phase, count: m.count };
      // Once she's played along, or a couple of breaths in, she knows what to do.
      if (hint.current && (s.touched || m.breath >= 2)) hint.current.classList.add('gone');

      const r = BUBBLE_MIN + m.fill * (BUBBLE_MAX - BUBBLE_MIN);
      bubble.current?.setAttribute('r', r.toFixed(2));
      shine.current?.setAttribute('cx', (C - r * 0.45).toFixed(2));
      shine.current?.setAttribute('cy', (C - r * 0.5).toFixed(2));
      const d = dotAt(pattern, m);
      dot.current?.setAttribute('cx', d.x.toFixed(2));
      dot.current?.setAttribute('cy', d.y.toFixed(2));
      if (tuna.current) tuna.current.style.transform = `translate(-50%, -50%) scale(${(1 + m.fill * PUFF).toFixed(4)})`;
      if (tide.current) tide.current.style.width = `${Math.min(100, (s.time / roundSeconds(pattern)) * 100)}%`;

      // Breathing out, little bubbles leave the tuna's mouth and drift up.
      if (!calm && m.phase === 'out' && now > nextExhale && exhaled.current) {
        exhale(exhaled.current, r);
        nextExhale = now + 420;
      }

      if (s.over) end();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('breathing');
    };
  }, []);

  const lift = (e: PointerEvent) => {
    if (finger.current !== e.pointerId) return;
    finger.current = null;
    release(session.current);
    pond.current?.classList.remove('pressing');
  };

  const dot0 = dotAt(pattern, momentAt(pattern, 0));
  return (
    <div
      class="breathe-pond"
      ref={pond}
      onPointerDown={(e) => {
        if (finger.current !== null || (e.target as Element).closest('button')) return;
        finger.current = e.pointerId;
        pond.current?.setPointerCapture(e.pointerId);
        press(session.current);
        pond.current?.classList.add('pressing');
      }}
      onPointerUp={lift}
      onPointerCancel={lift}
    >
      {/* The same top bar as Dodge the hooks: way out, how far through, and the count. */}
      <header class="dodge-hud">
        <button class="icon-btn" onClick={end} aria-label={t.breatheEnd}><Back /><Haptic /></button>
        <div class="dodge-tide" aria-hidden="true"><div ref={tide} /></div>
        <span class="dodge-count"><i class="dodge-bubble" /><span ref={breathCount}>0</span></span>
      </header>
      <div class="breathe-center">
        <p class="breathe-word" ref={word} aria-live="polite">{t.breatheReady}</p>
        <div class="breathe-stage">
          <svg viewBox="0 0 340 340" aria-hidden="true">
            {pattern === 'box' ? (
              <rect class="breathe-track" x={C - TRACK} y={C - TRACK} width={TRACK * 2} height={TRACK * 2} rx="6" />
            ) : (
              <circle class="breathe-track" cx={C} cy={C} r={TRACK} />
            )}
            <circle class="breathe-bubble" ref={bubble} cx={C} cy={C} r={BUBBLE_MIN} />
            <circle class="breathe-shine" ref={shine} cx={C - BUBBLE_MIN * 0.45} cy={C - BUBBLE_MIN * 0.5} r="7" />
            <g ref={exhaled} />
            <circle class={`breathe-dot${calm ? '' : ' glow'}`} ref={dot} cx={dot0.x} cy={dot0.y} r="9" />
          </svg>
          <div class="breathe-tuna" ref={tuna}><Tuna mood="happy" size={TUNA_W} /></div>
        </div>
        <p class="breathe-count" ref={count}>{BREATHE_SETTINGS.leadIn}</p>
        <p class="breathe-cheer" ref={cheer} aria-live="polite" />
        <p class="breathe-hint muted small" ref={hint}>{t.breatheTouchHint}</p>
      </div>
    </div>
  );
}

/**
 * Where the dot is on the track. Box: one side per step, up the left side breathing in, along the top
 * holding, down the right breathing out, back along the bottom holding. Gentle: up the left half of
 * the circle breathing in, down the right half breathing out.
 */
function dotAt(p: PatternId, m: Moment) {
  const k = m.phase === 'ready' ? 0 : m.progress;
  if (p === 'box') {
    const lo = C - TRACK;
    const hi = C + TRACK;
    const corners = [[lo, hi], [lo, lo], [hi, lo], [hi, hi], [lo, hi]];
    const [x0, y0] = corners[m.step];
    const [x1, y1] = corners[m.step + 1];
    return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
  }
  const a = Math.PI / 2 + (m.step + k) * Math.PI;
  return { x: C + TRACK * Math.cos(a), y: C + TRACK * Math.sin(a) };
}

/** One small bubble from the tuna's mouth, rising and fading inside the big one. */
function exhale(layer: SVGGElement, r: number) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  const x = MOUTH.x - 6 + Math.random() * 6;
  el.setAttribute('cx', x.toFixed(1));
  el.setAttribute('cy', MOUTH.y.toFixed(1));
  el.setAttribute('r', (3 + Math.random() * 3).toFixed(1));
  el.setAttribute('class', 'breathe-little');
  layer.appendChild(el);
  const rise = Math.max(40, MOUTH.y - (C - r) - 10);
  const drift = (Math.random() - 0.5) * 24;
  el.animate(
    [
      { transform: 'translate(0, 0)', opacity: 0.9 },
      { transform: `translate(${drift}px, ${-rise}px)`, opacity: 0 },
    ],
    { duration: 2200, easing: 'ease-out' },
  ).onfinish = () => el.remove();
}
