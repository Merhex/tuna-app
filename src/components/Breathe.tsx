import { useEffect, useRef, useState } from 'preact/hooks';
import {
  BREATHE_SETTINGS,
  createSession,
  momentAt,
  press,
  release,
  ROUND_SECONDS,
  step,
  type BreatheResult,
  type Moment,
  type Phase,
  type Session,
} from '../breathe';
import { fx } from '../feedback';
import { pick, useT } from '../i18n';
import { Back } from './Icons';
import { Haptic } from './Haptic';
import { RoundIntro } from './RoundIntro';
import { Tuna } from './Tuna';

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
 * One round of Bubbles (D54), full screen, in the craving flow: on "Not yet", or right away for a
 * brutal hook. A card with how it works (and `lead` and `another`, when it came straight from the
 * rating) waits for her to tap Start. Then a short "Ready?", and breath after breath until the round
 * is over or she leaves. A finger anywhere on the screen counts as breathing in.
 *
 * `onEnd` gets how it went, or null if she left before finishing a breath.
 */
export function BreatheRound({
  calm,
  lead,
  another,
  onEnd,
}: {
  calm: boolean;
  lead?: string;
  another?: () => void;
  onEnd: (r: BreatheResult | null) => void;
}) {
  const t = useT();
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
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
  const session = useRef<Session>(createSession());
  const finger = useRef<number | null>(null);
  const ended = useRef(false);

  const start = () => {
    startedRef.current = true;
    setStarted(true);
  };

  const end = () => {
    if (ended.current) return;
    ended.current = true;
    const { breaths, onBeat, touched } = session.current;
    onEnd(breaths > 0 ? { breaths, onBeat, touched } : null);
  };

  useEffect(() => {
    // The backdrop's rising bubbles would compete with the ones she's breathing with.
    document.documentElement.classList.add('breathing');
    const s = session.current;
    const words: Record<Phase | 'ready', string> = { ready: t.breatheReady, in: t.breatheIn, out: t.breatheOut };
    let raf = 0;
    let last = performance.now();
    let shown = { phase: '', count: -1 };
    let cheerUntil = 0;
    let nextExhale = 0;

    const frame = (now: number) => {
      // Nothing moves until she taps Start.
      if (startedRef.current) step(s, (now - last) / 1000);
      last = now;
      for (const e of s.events) {
        if (e.type === 'phase') {
          if (e.phase === 'in') fx.breatheIn(e.seconds);
          else fx.breatheOut(e.seconds);
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

      const m = momentAt(s.time);
      if (m.phase !== shown.phase && word.current) word.current.textContent = words[m.phase];
      if (m.count !== shown.count && count.current) count.current.textContent = String(m.count);
      shown = { phase: m.phase, count: m.count };
      // Once she's played along, or a couple of breaths in, she knows what to do.
      if (hint.current && (s.touched || m.breath >= 2)) hint.current.classList.add('gone');

      const r = BUBBLE_MIN + m.fill * (BUBBLE_MAX - BUBBLE_MIN);
      bubble.current?.setAttribute('r', r.toFixed(2));
      shine.current?.setAttribute('cx', (C - r * 0.45).toFixed(2));
      shine.current?.setAttribute('cy', (C - r * 0.5).toFixed(2));
      const d = dotAt(m);
      dot.current?.setAttribute('cx', d.x.toFixed(2));
      dot.current?.setAttribute('cy', d.y.toFixed(2));
      if (tuna.current) tuna.current.style.transform = `translate(-50%, -50%) scale(${(1 + m.fill * PUFF).toFixed(4)})`;
      if (tide.current) tide.current.style.width = `${Math.min(100, (s.time / ROUND_SECONDS) * 100)}%`;

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

  const dot0 = dotAt(momentAt(0));
  return (
    <div
      class="breathe-pond"
      ref={pond}
      onPointerDown={(e) => {
        if (!startedRef.current || finger.current !== null || (e.target as Element).closest('button')) return;
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
      <div class={`breathe-center${started ? '' : ' waiting'}`}>
        <p class="breathe-word" ref={word} aria-live="polite">{t.breatheReady}</p>
        <div class="breathe-stage">
          <svg viewBox="0 0 340 340" aria-hidden="true">
            <circle class="breathe-track" cx={C} cy={C} r={TRACK} />
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
      {!started && (
        <RoundIntro lead={lead} title={t.breatheTitle} howTo={t.breatheHowTo} onStart={start} another={another} />
      )}
    </div>
  );
}

/** Where the dot is on the circle: up the left half breathing in, down the right half breathing out. */
function dotAt(m: Moment) {
  const k = m.phase === 'ready' ? 0 : m.progress;
  const a = Math.PI / 2 + (m.step + k) * Math.PI;
  return { x: C + TRACK * Math.cos(a), y: C + TRACK * Math.sin(a) };
}

/** One small bubble from the tuna's mouth, rising and fading inside the big one. */
function exhale(layer: SVGGElement, r: number) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el.setAttribute('cx', (MOUTH.x - 6 + Math.random() * 6).toFixed(1));
  el.setAttribute('cy', MOUTH.y.toFixed(1));
  el.setAttribute('r', (3 + Math.random() * 3).toFixed(1));
  el.setAttribute('class', 'breathe-little');
  layer.appendChild(el);
  if (typeof el.animate !== 'function') return void el.remove();
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
