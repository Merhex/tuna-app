import { useEffect, useRef, useState } from 'preact/hooks';
import { fx } from '../feedback';
import { useT } from '../i18n';
import { createMotion, feed, intensity, MOTION_SETTINGS } from '../motion';
import { counts, createGame, phaseKind, phaseLeft, ROUND_SECONDS, RUN_SETTINGS, setGuided, step, type Game, type RunScore } from '../run';
import { keepAwake, listen, requestMotion } from '../sensors';
import { makePaths } from './Dodge';
import { Back, River } from './Icons';
import { Haptic } from './Haptic';
import { RoundIntro } from './RoundIntro';

export type { RunScore };

/** No readings this long after Start means no usable sensor: the round carries on guided. */
const NO_SENSOR_MS = 2000;
/** Once the round is going, ending it takes holding the back button this long, so a pocket can't end it. */
const HOLD_MS = 1000;
/** How long the "no motion sensor here" line stays up. */
const NOTE_MS = 6000;
/** The tuna art is 200 wide; this makes it about 110 px. */
const TUNA_SCALE = 0.55;
/** Pixels per second the water flows past, and what a river length per second of swimming adds. */
const FLOW = 70;
const SWIM_PX = 240;

/**
 * One round of Current Run, full screen, in the craving flow (D58): only at home, and only while
 * movement rounds are on in Settings. Start asks for the motion sensor (iPhone only allows that during
 * the tap); without one, or if she says no, the round runs guided and trusts her. Ending it once it's
 * going takes press and hold, in case the phone is in a pocket.
 *
 * `onEnd` gets the score, or null if she left before it counted as a round (RUN_SETTINGS.minSeconds).
 * Opening the app with `?motion=1`, or holding the river icon for two seconds, shows the live readings
 * in a corner, for tuning MOTION_SETTINGS.
 */
export function RunGame({
  calm,
  lead,
  another,
  onEnd,
}: {
  calm: boolean;
  lead?: string;
  another?: () => void;
  onEnd: (s: RunScore | null) => void;
}) {
  const t = useT();
  const [started, setStarted] = useState(false);
  const [note, setNote] = useState(false);
  const [holding, setHolding] = useState(false);
  const startedRef = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tide = useRef<HTMLDivElement>(null);
  const phaseLabel = useRef<HTMLParagraphElement>(null);
  const phaseHint = useRef<HTMLParagraphElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const debug = useRef<HTMLPreElement>(null);
  const game = useRef<Game>(createGame());
  const motion = useRef(createMotion());
  const stopSensors = useRef<(() => void)[]>([]);
  const holdTimer = useRef(0);
  const ended = useRef(false);
  const [debugOn, setDebugOn] = useState(() => /[?&]motion=1\b/.test(location.search));
  const showDebug = useRef(debugOn);
  const debugTimer = useRef(0);

  const cleanup = () => {
    stopSensors.current.forEach((stop) => stop());
    stopSensors.current = [];
    clearTimeout(holdTimer.current);
  };

  const end = () => {
    if (ended.current) return;
    ended.current = true;
    cleanup();
    const g = game.current;
    onEnd(startedRef.current && counts(g) ? { ...g.score } : null);
  };

  const guided = () => {
    if (ended.current || game.current.guided) return;
    setGuided(game.current);
    setNote(true);
    window.setTimeout(() => setNote(false), NOTE_MS);
  };

  const start = () => {
    // Straight from the tap: iPhone only asks about the motion sensor during one.
    const asked = requestMotion();
    startedRef.current = true;
    setStarted(true);
    stopSensors.current.push(keepAwake());
    void asked.then((state) => {
      if (ended.current) return;
      if (state !== 'granted') return guided();
      stopSensors.current.push(listen((s) => feed(motion.current, s)));
      window.setTimeout(() => {
        if (motion.current.samples === 0) guided();
      }, NO_SENSOR_MS);
    });
  };

  useEffect(() => {
    // The backdrop's rising bubbles would fight the river.
    document.documentElement.classList.add('running');
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const paths = makePaths();
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const colors: Colors = {
      body: v('--tuna-body', '#4f8fbf'),
      belly: v('--tuna-belly', '#d4e3ec'),
      fin: v('--tuna-fin', '#f2c14e'),
      ink: v('--ink-dark', '#0b1f2e'),
    };
    const view: View = { w: 0, h: 0, water: 0, bank: 0, bubbles: [], wag: 0 };

    const fit = () => {
      view.w = c.clientWidth;
      view.h = c.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(view.w * dpr);
      c.height = Math.round(view.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener('resize', fit);

    let raf = 0;
    let last = performance.now();
    let rate = { at: last, samples: 0, hz: 0 };
    let shown = '';
    const frame = (now: number) => {
      const g = game.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Nothing moves until she taps Start.
      if (startedRef.current) step(g, dt, intensity(motion.current));
      for (const e of g.events) {
        if (e.type === 'swim') fx.runSwim();
        else if (e.type === 'drift') fx.runDrift();
        else if (e.type === 'current') fx.runCurrent();
        else fx.celebrate();
      }
      g.events.length = 0;
      draw(ctx, g, view, paths, colors, calm, startedRef.current ? dt : 0);

      if (tide.current) tide.current.style.width = `${Math.min(100, (g.time / ROUND_SECONDS) * 100)}%`;
      const kind = phaseKind(g);
      const catching = g.intensity >= RUN_SETTINGS.swimThreshold;
      // The tuna talks about the current, never about how she's doing.
      const hint = kind !== 'swim' || g.guided ? '' : catching ? t.runCatching : t.runPulling;
      const key = `${kind}|${hint}|${Math.ceil(phaseLeft(g))}`;
      if (key !== shown) {
        shown = key;
        if (phaseLabel.current) {
          phaseLabel.current.textContent = t.runPhase[kind];
          phaseLabel.current.classList.toggle('swim', kind === 'swim');
        }
        if (phaseHint.current) phaseHint.current.textContent = hint;
        if (clock.current) clock.current.textContent = String(Math.ceil(phaseLeft(g)));
      }
      if (showDebug.current && debug.current) {
        const m = motion.current;
        if (now - rate.at >= 1000) rate = { at: now, samples: m.samples, hz: m.samples - rate.samples };
        debug.current.textContent =
          `intensity ${m.level.toFixed(2)}\nrms ${m.rms.toFixed(2)} m/s²\n` +
          `still ${MOTION_SETTINGS.still} · brisk ${MOTION_SETTINGS.brisk}\n${rate.hz} Hz · ${g.guided ? 'guided' : 'sensed'}`;
      }

      if (g.over) end();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      document.documentElement.classList.remove('running');
      cleanup();
    };
  }, []);

  // Before Start, a tap goes back. After, it takes press and hold.
  const press = () => {
    if (!startedRef.current) return end();
    setHolding(true);
    holdTimer.current = window.setTimeout(end, HOLD_MS);
  };
  const letGo = () => {
    clearTimeout(holdTimer.current);
    setHolding(false);
  };

  return (
    <div class={`dodge-pond run-pond${started ? ' started' : ''}`}>
      <canvas ref={canvas} class="dodge-canvas" />
      <header class="dodge-hud">
        <button
          class={`icon-btn run-hold${holding ? ' holding' : ''}`}
          onPointerDown={press}
          onPointerUp={letGo}
          onPointerLeave={letGo}
          onPointerCancel={letGo}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') end();
          }}
          aria-label={started ? t.runHoldEnd : t.runEnd}
        >
          <Back />
          <Haptic />
        </button>
        <div class="dodge-tide" aria-hidden="true"><div ref={tide} /></div>
        {/* Holding the river icon for two seconds shows the readings too: the installed app has no address bar. */}
        <span
          class="dodge-count run-debug-toggle"
          onPointerDown={() => {
            debugTimer.current = window.setTimeout(() => {
              showDebug.current = !showDebug.current;
              setDebugOn(showDebug.current);
            }, 2000);
          }}
          onPointerUp={() => clearTimeout(debugTimer.current)}
          onPointerLeave={() => clearTimeout(debugTimer.current)}
          onPointerCancel={() => clearTimeout(debugTimer.current)}
        >
          <River size={22} />
        </span>
      </header>
      {started && (
        <div class="run-phase" aria-live="polite">
          <p class="run-phase-label" ref={phaseLabel} />
          <span class="run-clock" ref={clock} aria-hidden="true" />
          <p class="run-phase-hint" ref={phaseHint} />
          {holding && <p class="run-hold-hint">{t.runHoldHint}</p>}
        </div>
      )}
      {note && <p class="run-note" role="status">{t.runGuided}</p>}
      {debugOn && <pre class="run-debug" ref={debug} />}
      {!started && <RoundIntro lead={lead} title={t.runTitle} howTo={t.runHowTo} onStart={start} another={another} />}
    </div>
  );
}

// ---------- Drawing ----------

type Paths = ReturnType<typeof makePaths>;
type Colors = { body: string; belly: string; fin: string; ink: string };
/** What the screen keeps between frames: how far the water and the banks have scrolled, and the bubbles. */
type View = { w: number; h: number; water: number; bank: number; bubbles: { x: number; y: number; t: number }[]; wag: number };

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** A steady pseudo-random 0–1 for item `i`, so reeds and streaks don't jump around. */
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const wrap = (v: number, span: number) => ((v % span) + span) % span;

function draw(ctx: CanvasRenderingContext2D, g: Game, v: View, p: Paths, c: Colors, calm: boolean, dt: number) {
  const { w, h } = v;
  ctx.clearRect(0, 0, w, h);
  // The banks scroll with the tuna; the water also flows downstream (to the left).
  const flow = calm ? FLOW * 0.6 : FLOW;
  v.bank += g.speed * SWIM_PX * dt;
  v.water += (flow + g.speed * SWIM_PX) * dt;

  // Below the phase and its countdown, which sit at the top.
  const top = Math.max(h * 0.36, 230);
  const bottom = Math.max(top + 160, h * 0.84);
  const mid = (top + bottom) / 2;

  // The river: a band of lighter water between two banks.
  const river = ctx.createLinearGradient(0, top, 0, bottom);
  river.addColorStop(0, 'rgba(94, 196, 240, 0.14)');
  river.addColorStop(0.5, 'rgba(94, 196, 240, 0.22)');
  river.addColorStop(1, 'rgba(94, 196, 240, 0.12)');
  ctx.fillStyle = river;
  ctx.fillRect(0, top, w, bottom - top);
  bank(ctx, v, top, -1);
  bank(ctx, v, bottom, 1);

  // Streaks of current, faster the harder she swims.
  ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const span = w + 160;
    const x = wrap(hash(i) * span - v.water * (0.7 + hash(i + 50) * 0.6), span) - 80;
    const y = top + 14 + hash(i + 100) * (bottom - top - 28);
    const len = 30 + hash(i + 200) * 50;
    ctx.strokeStyle = `rgba(234, 244, 250, ${0.12 + hash(i + 300) * 0.18})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }

  // The tuna: a little ahead when it's swimming hard, a little back when the current has it.
  const x = w * 0.45 + clamp(g.speed, -0.3, 1) * w * 0.12;
  const y = mid + Math.sin(g.time * 2) * 4;
  const effort = g.intensity;
  v.wag += dt * (calm ? 4 + effort * 4 : 4 + effort * 10);

  if (!calm && effort >= RUN_SETTINGS.swimThreshold && Math.floor(g.time * 6) !== Math.floor((g.time - dt) * 6)) {
    v.bubbles.push({ x: x - 50, y: y + (Math.random() - 0.5) * 16, t: 0 });
  }
  for (const b of v.bubbles) {
    b.t += dt;
    b.x -= (flow + 40) * dt;
    b.y -= 14 * dt;
  }
  v.bubbles = v.bubbles.filter((b) => b.t < 1.4);
  for (const b of v.bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3 + b.t * 3, 0, TAU);
    ctx.strokeStyle = `rgba(234, 244, 250, ${0.7 * (1 - b.t / 1.4)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawTuna(ctx, x, y, p, c, Math.sin(v.wag) * (calm ? 0.08 : 0.08 + effort * 0.14));
}

/** A sandy bank with reeds along its water edge. `side` is -1 for the top bank, 1 for the bottom one. */
function bank(ctx: CanvasRenderingContext2D, v: View, edge: number, side: -1 | 1) {
  const { w, h } = v;
  ctx.fillStyle = 'rgba(216, 190, 140, 0.16)';
  if (side === -1) ctx.fillRect(0, edge - 26, w, 26);
  else ctx.fillRect(0, edge, w, Math.min(26, h - edge));
  const gap = 34;
  const span = w + gap * 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < Math.ceil(span / gap) + 1; i++) {
    const n = i;
    const x = wrap(i * gap - v.bank, span) - gap;
    const tall = 18 + hash(n + (side === 1 ? 500 : 0)) * 26;
    ctx.strokeStyle = hash(n + 900) > 0.5 ? 'rgba(122, 178, 120, 0.55)' : 'rgba(96, 150, 104, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const base = side === -1 ? edge - 18 : edge + 18;
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + 4, base - side * tall * 0.5, x + 2 + hash(n + 700) * 6, base - side * tall);
    ctx.stroke();
  }
}

/** The tuna from Dodge the hooks, facing upstream (right), its tail beating as hard as she moves. */
function drawTuna(ctx: CanvasRenderingContext2D, x: number, y: number, p: Paths, c: Colors, wag: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-TUNA_SCALE, TUNA_SCALE);
  ctx.translate(-92, -60);
  ctx.save();
  ctx.translate(150, 60);
  ctx.rotate(wag);
  ctx.translate(-150, -60);
  ctx.fillStyle = c.body;
  ctx.fill(p.tail);
  ctx.restore();
  ctx.fillStyle = c.fin;
  ctx.fill(p.fins);
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(92, 60, 72, 36, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c.belly;
  ctx.fill(p.belly);
  ctx.fillStyle = c.fin;
  ctx.fill(p.finlets);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(48, 52, 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c.ink;
  ctx.beginPath();
  ctx.arc(45, 52, 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke(p.smile);
  ctx.restore();
}
