import { useEffect, useRef, useState } from 'preact/hooks';
import { fx } from '../feedback';
import { useT } from '../i18n';
import {
  createGame,
  pick,
  picksLeft,
  resize,
  step,
  TRACK_SETTINGS,
  type Fish,
  type Game,
  type TrackScore,
} from '../track';
import { makePaths } from './Dodge';
import { Back, SchoolIcon } from './Icons';
import { Haptic } from './Haptic';
import { RoundIntro } from './RoundIntro';

export type { TrackScore };

/** The tuna art is 200 wide; this makes each fish about 46 px, matching TRACK_SETTINGS.fishRadius. */
const FISH_SCALE = 0.23;
/** Room under the top bar for the row of picks left. */
const PICKS_ROW = 30;
/** With "Less motion", the school swims this much slower. */
const CALM_SPEED = 0.75;

/**
 * One round of School Tracker, full screen, in the craving flow: on "Not yet", or right away for a
 * brutal hook (D54). It waits for her to tap Start. Then trial after trial: the golden tunas are
 * marked, the marks go, the school swims, and when it stops she taps the ones she followed. No timer
 * on picking, no red and no "wrong": missed ones just glow where they were.
 *
 * `onEnd` gets the score, or null if she left before answering a trial.
 */
export function TrackGame({
  calm,
  lead,
  another,
  onEnd,
}: {
  calm: boolean;
  lead?: string;
  another?: () => void;
  onEnd: (s: TrackScore | null) => void;
}) {
  const t = useT();
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLElement>(null);
  const tide = useRef<HTMLDivElement>(null);
  const trialCount = useRef<HTMLSpanElement>(null);
  const picks = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const ended = useRef(false);

  const start = () => {
    startedRef.current = true;
    setStarted(true);
  };

  const end = () => {
    if (ended.current || !game.current) return;
    ended.current = true;
    const score = game.current.score;
    onEnd(score.trials > 0 ? { ...score } : null);
  };

  useEffect(() => {
    // The backdrop's rising bubbles would be one more thing moving among the fish she's following.
    document.documentElement.classList.add('tracking');
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
      gold: v('--gold', '#f2c14e'),
    };

    const fit = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const top = (hud.current?.getBoundingClientRect().bottom ?? 60) + PICKS_ROW;
      if (picks.current) picks.current.style.top = `${top - PICKS_ROW + 4}px`;
      if (game.current) resize(game.current, w, h, top);
      else game.current = createGame(w, h, top, Math.random, calm ? CALM_SPEED : 1);
    };
    fit();
    window.addEventListener('resize', fit);

    let raf = 0;
    let last = performance.now();
    let shown = { trials: -1, left: -1 };
    const frame = (now: number) => {
      const g = game.current!;
      // Nothing moves until she taps Start.
      if (startedRef.current) step(g, (now - last) / 1000);
      last = now;
      for (const e of g.events) {
        if (e.type === 'select') fx.trackSelect();
        else if (e.type === 'trial') {
          if (e.result.correct === e.result.targets) fx.trackRight();
          else fx.trackMiss();
        } else if (e.type === 'over') fx.celebrate();
      }
      g.events.length = 0;
      draw(ctx, g, paths, colors, calm, now / 1000);

      if (tide.current) tide.current.style.width = `${Math.min(100, (g.time / TRACK_SETTINGS.roundSeconds) * 100)}%`;
      if (shown.trials !== g.score.trials && trialCount.current) trialCount.current.textContent = String(g.score.trials);
      // While the school is stopped, a dot for every pick, filled in as she picks.
      const left = picksLeft(g);
      if (shown.left !== left && picks.current) {
        picks.current.innerHTML =
          g.phase === 'pick'
            ? Array.from({ length: g.targets }, (_, i) => `<i class="${i < g.selected.length ? 'on' : ''}"></i>`).join('')
            : '';
      }
      shown = { trials: g.score.trials, left };

      if (g.over) end();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      document.documentElement.classList.remove('tracking');
    };
  }, []);

  return (
    <div class="dodge-pond track-pond">
      <canvas
        ref={canvas}
        class="dodge-canvas"
        onPointerDown={(e) => {
          // Taps only count while the school is stopped (the engine ignores the rest).
          if (!startedRef.current || !game.current) return;
          const box = canvas.current!.getBoundingClientRect();
          pick(game.current, e.clientX - box.left, e.clientY - box.top);
        }}
      />
      <header class="dodge-hud" ref={hud}>
        <button class="icon-btn" onClick={end} aria-label={t.trackEnd}><Back /><Haptic /></button>
        <div class="dodge-tide" aria-hidden="true"><div ref={tide} /></div>
        <span class="dodge-count"><SchoolIcon size={22} /><span ref={trialCount}>0</span></span>
      </header>
      <div class="track-picks" ref={picks} aria-hidden="true" />
      {!started && <RoundIntro lead={lead} title={t.trackTitle} howTo={t.trackHowTo} onStart={start} another={another} />}
    </div>
  );
}

// ---------- Drawing ----------

type Paths = ReturnType<typeof makePaths>;
type Colors = { body: string; belly: string; fin: string; ink: string; gold: string };

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const RING = 30;

function draw(ctx: CanvasRenderingContext2D, g: Game, p: Paths, c: Colors, calm: boolean, now: number) {
  ctx.clearRect(0, 0, g.w, g.h);
  const k = g.phase === 'reveal' ? Math.min(1, g.t / TRACK_SETTINGS.revealSeconds) : 0;
  const pulse = calm ? 0 : Math.sin(now * 6) * 3;

  // Rings under the fish, so the fish stay easy to see.
  g.fish.forEach((f, i) => {
    const picked = g.selected.includes(i);
    if (g.phase === 'show' && f.target) goldRing(ctx, f, RING + pulse, c, calm, 1);
    else if (g.phase === 'pick' && picked) ring(ctx, f, RING - 2, 'rgba(234, 244, 250, 0.95)', 3);
    else if (g.phase === 'reveal') {
      // Found ones glow gold, missed ones pulse gold where they were; wrong picks just fade.
      if (f.target && picked) goldRing(ctx, f, RING, c, calm, 1);
      else if (f.target) goldRing(ctx, f, RING + pulse * 1.5, c, calm, 0.85);
      else if (picked) ring(ctx, f, RING - 2, `rgba(234, 244, 250, ${0.9 * (1 - k)})`, 3);
    }
  });

  const swimming = g.phase === 'track';
  g.fish.forEach((f, i) => drawFish(ctx, f, p, c, swimming ? g.time + i : 0, swimming));

  if (g.phase === 'reveal' && !calm) {
    g.fish.forEach((f, i) => {
      if (f.target && g.selected.includes(i)) sparkle(ctx, f, k, c, i);
    });
  }
}

function ring(ctx: CanvasRenderingContext2D, f: Fish, r: number, color: string, width: number) {
  ctx.beginPath();
  ctx.arc(f.x, f.y, r, 0, TAU);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function goldRing(ctx: CanvasRenderingContext2D, f: Fish, r: number, c: Colors, calm: boolean, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(f.x, f.y, r, 0, TAU);
  ctx.fillStyle = 'rgba(242, 193, 78, 0.18)';
  ctx.fill();
  if (!calm) {
    ctx.shadowColor = c.gold;
    ctx.shadowBlur = 14;
  }
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
}

/** A few little stars drifting out from a fish she found. */
function sparkle(ctx: CanvasRenderingContext2D, f: Fish, k: number, c: Colors, seed: number) {
  ctx.save();
  ctx.fillStyle = c.gold;
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + seed;
    const d = RING + 4 + k * 18;
    const x = f.x + Math.cos(a) * d;
    const y = f.y + Math.sin(a) * d;
    const s = 4 * (1 - k * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.3, y - s * 0.3);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.3, y + s * 0.3);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.3, y + s * 0.3);
    ctx.lineTo(x - s, y);
    ctx.lineTo(x - s * 0.3, y - s * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Every fish is the same little tuna, so once the gold goes there's nothing to tell targets apart. */
function drawFish(ctx: CanvasRenderingContext2D, f: Fish, p: Paths, c: Colors, time: number, swimming: boolean) {
  const right = Math.cos(f.heading) > 0;
  // Nose up or down a little with its heading, whichever way it faces.
  const tilt = clamp(right ? Math.sin(f.heading) : -Math.sin(f.heading), -0.45, 0.45);
  const wag = swimming ? Math.sin(time * 9) * 0.14 : 0;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(tilt);
  ctx.scale(right ? -FISH_SCALE : FISH_SCALE, FISH_SCALE);
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
  ctx.arc(48, 52, 12, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c.ink;
  ctx.beginPath();
  ctx.arc(45, 52, 6, 0, TAU);
  ctx.fill();
  ctx.restore();
}
