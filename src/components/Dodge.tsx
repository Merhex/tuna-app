import { useEffect, useRef, useState } from 'preact/hooks';
import { createGame, DODGE_SETTINGS, moveBy, resize, step, type Game } from '../dodge';
import { fx } from '../feedback';
import { useT } from '../i18n';
import { Back, FishHook } from './Icons';
import { Haptic } from './Haptic';
import { OtherWays, type Alternative } from './OtherWays';

export type DodgeScore = Game['score'];

/** Her finger moves the tuna this much further than it moved, so it crosses the screen without her stretching. */
const DRAG_GAIN = 1.3;
/** Hook art scale. DODGE_SETTINGS.bendOffset and bendRadius are measured at this size. */
const HOOK_SCALE = 0.73;
/** The tuna art is 200 wide; this makes it about 96 px, matching tunaRx and tunaRy. */
const TUNA_SCALE = 0.48;

/**
 * One round of Dodge the hooks, full screen, in the craving flow: on "Not yet" (D50), or right away for a
 * brutal hook (D51, D54). It waits for her first touch, so she can read how to play. `onEnd` gets the score,
 * or null if she left before starting. `lead` and `others` add a line above the how-to and ways out: to
 * Bubbles or a card.
 */
export function DodgeGame({
  calm,
  lead,
  others,
  onEnd,
}: {
  calm: boolean;
  lead?: string;
  others?: Alternative[];
  onEnd: (s: DodgeScore | null) => void;
}) {
  const t = useT();
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLElement>(null);
  const tide = useRef<HTMLDivElement>(null);
  const bubbleCount = useRef<HTMLSpanElement>(null);
  const hookCount = useRef<HTMLSpanElement>(null);
  const game = useRef<Game | null>(null);
  const finger = useRef<{ id: number; x: number; y: number } | null>(null);
  const shownAt = useRef(performance.now());
  const ended = useRef(false);

  const end = () => {
    if (ended.current || !game.current) return;
    ended.current = true;
    onEnd(startedRef.current ? { ...game.current.score } : null);
  };

  useEffect(() => {
    // The backdrop's rising bubbles look too much like the ones to catch.
    document.documentElement.classList.add('dodging');
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const paths = makePaths();
    const css = getComputedStyle(document.documentElement);
    const colors = {
      body: css.getPropertyValue('--tuna-body').trim(),
      belly: css.getPropertyValue('--tuna-belly').trim(),
      fin: css.getPropertyValue('--tuna-fin').trim(),
      ink: css.getPropertyValue('--ink-dark').trim(),
    };

    const fit = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const top = (hud.current?.getBoundingClientRect().bottom ?? 60) + 8;
      if (game.current) resize(game.current, w, h, top);
      else game.current = createGame(w, h, top);
    };
    fit();
    window.addEventListener('resize', fit);

    let raf = 0;
    let last = performance.now();
    let shown = { bubbles: -1, dodged: -1 };
    const frame = (now: number) => {
      const g = game.current!;
      // Nothing moves until her first touch.
      if (startedRef.current) step(g, (now - last) / 1000);
      last = now;
      for (const e of g.events) {
        if (e.type === 'bubble') fx.catchBubble(e.streak);
        else if (e.type === 'nick') fx.nick();
        else fx.celebrate();
      }
      g.events.length = 0;
      draw(ctx, g, paths, colors, calm);

      if (tide.current) tide.current.style.width = `${Math.min(100, (g.time / DODGE_SETTINGS.roundSeconds) * 100)}%`;
      if (shown.bubbles !== g.score.bubbles && bubbleCount.current) bubbleCount.current.textContent = String(g.score.bubbles);
      if (shown.dodged !== g.score.dodged && hookCount.current) hookCount.current.textContent = String(g.score.dodged);
      shown = { bubbles: g.score.bubbles, dodged: g.score.dodged };

      if (g.over) end();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      document.documentElement.classList.remove('dodging');
    };
  }, []);

  const release = (e: PointerEvent) => {
    if (finger.current?.id === e.pointerId) finger.current = null;
  };

  return (
    <div class="dodge-pond">
      <canvas
        ref={canvas}
        class="dodge-canvas"
        onPointerDown={(e) => {
          if (finger.current) return;
          // A double tap on the previous screen shouldn't start the round before she's read how to play.
          if (!startedRef.current && performance.now() - shownAt.current < 300) return;
          finger.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          canvas.current?.setPointerCapture(e.pointerId);
          if (!startedRef.current) {
            startedRef.current = true;
            setStarted(true);
          }
        }}
        onPointerMove={(e) => {
          const f = finger.current;
          if (!f || f.id !== e.pointerId || !game.current) return;
          moveBy(game.current, (e.clientX - f.x) * DRAG_GAIN, (e.clientY - f.y) * DRAG_GAIN);
          f.x = e.clientX;
          f.y = e.clientY;
        }}
        onPointerUp={release}
        onPointerCancel={release}
      />
      <header class="dodge-hud" ref={hud}>
        <button class="icon-btn" onClick={end} aria-label={t.dodgeEnd}><Back /><Haptic /></button>
        <div class="dodge-tide" aria-hidden="true"><div ref={tide} /></div>
        <span class="dodge-count"><i class="dodge-bubble" /><span ref={bubbleCount}>0</span></span>
        <span class="dodge-count"><FishHook size={18} stroke={6} /><span ref={hookCount}>0</span></span>
      </header>
      {!started && (
        <div class="dodge-hint">
          {lead && <p class="dodge-lead">{lead}</p>}
          <h2>{t.dodgeTitle}</h2>
          <p>{t.dodgeHowTo}</p>
          <OtherWays others={others} />
        </div>
      )}
    </div>
  );
}

// ---------- Drawing ----------

/** The same shapes as the Tuna and FishHook SVGs, for the canvas. */
function makePaths() {
  return {
    tail: new Path2D('M150 60 L192 22 L182 60 L192 98 Z'),
    fins: new Path2D('M78 26 L98 6 L112 30 Z M86 94 L100 112 L110 92 Z'),
    belly: new Path2D('M26 66 Q92 104 160 66 Q92 86 26 66 Z'),
    finlets: new Path2D('M126 30 l6 -6 l4 8 z M138 34 l6 -6 l4 8 z M126 90 l6 6 l4 -8 z M138 86 l6 6 l4 -8 z'),
    smile: new Path2D('M24 66 Q32 74 42 68'),
    zigzag: new Path2D('M22 68 L28 65 L33 69 L38 65 L44 68'),
    hook: new Path2D('M34.5 7 A4.5 4.5 0 1 1 25.5 7 A4.5 4.5 0 1 1 34.5 7 M30 11.5 V46 A12.5 12.5 0 0 1 5 46 V35 M5 35 L12.5 42.5'),
  };
}

type Paths = ReturnType<typeof makePaths>;
type Colors = { body: string; belly: string; fin: string; ink: string };

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function draw(ctx: CanvasRenderingContext2D, g: Game, p: Paths, c: Colors, calm: boolean) {
  ctx.clearRect(0, 0, g.w, g.h);

  for (const pop of g.pops) {
    const k = pop.t / 0.4;
    ctx.beginPath();
    ctx.arc(pop.x, pop.y, pop.r + k * 22, 0, TAU);
    ctx.strokeStyle = `rgba(234, 244, 250, ${0.8 * (1 - k)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const b of g.bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = 'rgba(94, 196, 240, 0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 244, 250, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, 0, TAU);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }

  for (const h of g.hooks) {
    // Hangs along its line, which comes down from above the screen.
    const phi = Math.atan2(h.x - h.ax, h.y + 20);
    const eye = 4.5 * HOOK_SCALE;
    ctx.globalAlpha = h.nicked ? 0.35 : 1;
    ctx.beginPath();
    ctx.moveTo(h.ax, -20);
    ctx.lineTo(h.x - Math.sin(phi) * eye, h.y - Math.cos(phi) * eye);
    ctx.strokeStyle = 'rgba(234, 244, 250, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(-phi);
    ctx.scale(HOOK_SCALE, HOOK_SCALE);
    ctx.translate(-30, -7);
    ctx.strokeStyle = '#d7e3ea';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p.hook);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawTuna(ctx, g, p, c, calm);
}

function drawTuna(ctx: CanvasRenderingContext2D, g: Game, p: Paths, c: Colors, calm: boolean) {
  const tu = g.tuna;
  const left = tu.facing === 'left';
  const nicked = tu.safe > 0;
  // Nose up when swimming up, whichever way it faces.
  const tilt = clamp(-tu.vy * 0.0012, -0.35, 0.35) * (left ? 1 : -1);
  const shake = nicked && !calm ? Math.sin(tu.safe * 50) * 4 * (tu.safe / DODGE_SETTINGS.safeAfterNick) : 0;
  const bob = Math.sin(g.time * 3) * 1.5;
  const speed = Math.hypot(tu.vx, tu.vy);
  const wag = Math.sin(g.time * (7 + speed * 0.015)) * clamp(0.06 + speed / 2500, 0.06, 0.25);

  ctx.save();
  ctx.translate(tu.x + shake, tu.y + bob);
  ctx.rotate(tilt);
  ctx.scale(left ? TUNA_SCALE : -TUNA_SCALE, TUNA_SCALE);
  ctx.translate(-92, -60);
  if (nicked) ctx.globalAlpha = Math.floor(tu.safe * 8) % 2 ? 0.45 : 1;

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

  // The face: happy, or the wide-eyed stare from Tuna.tsx while it shakes off a nick.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(48, nicked ? 51 : 52, nicked ? 12.5 : 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c.ink;
  ctx.beginPath();
  ctx.arc(nicked ? 49 : 45, nicked ? 51 : 52, nicked ? 2.2 : 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = nicked ? 3 : 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(nicked ? p.zigzag : p.smile);
  ctx.restore();
}
