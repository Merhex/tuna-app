import { useEffect, useRef, useState } from 'preact/hooks';
import { fx } from '../feedback';
import { useT } from '../i18n';
import {
  cellsOf,
  createGame,
  ghost,
  hardDrop,
  moveBy,
  PACK_SETTINGS,
  rotate,
  shapeCells,
  softDrop,
  step,
  type Cell,
  type Dir,
  type Fish,
  type Game,
  type PackScore,
  type Part,
  type Shape,
} from '../pack';
import { Back, Crate } from './Icons';
import { Haptic } from './Haptic';
import { AnotherGame } from './AnotherGame';

export type { PackScore };

/** A finger that moves less than this (px) is a tap, not a drag. */
const TAP_SLOP = 10;
/** ...and lifts within this many ms. */
const TAP_MS = 350;
/** The finger moves this many cells' width to slide the piece one column. */
const COLUMN = 0.9;
/**
 * A flick down: this far (px), within this long of touching (ms), this fast on average (px/ms), and
 * still moving when the finger lifts (px/ms), so a slow drag down that stops is a soft drop, not a flick.
 */
const FLICK_MIN = 36;
const FLICK_MS = 380;
const FLICK_SPEED = 0.25;
const FLICK_END = 0.15;
/** The speed at the end of a flick is measured over this many ms. */
const FLICK_WINDOW = 90;
/** The biggest cell, so the board doesn't sprawl on a tablet or a computer. */
const MAX_CELL = 40;
/** On a tall phone the board grows to this many rows. */
const MAX_ROWS = 22;
/** Room around the board for its frame, in px. */
const PAD = 4;
/** The next-piece preview, in CSS px. */
const PREVIEW = { w: 46, h: 30, cell: 9 };

/**
 * One round of Net Packing, full screen, in the craving flow: on "Not yet", or right away for a brutal
 * hook (D54). It waits for her first touch, so she can read how to play; that touch only starts it.
 * `onEnd` gets the score, or null if she left before placing a piece. `lead` and `another` add a line
 * above the how-to and a button for another game.
 */
export function PackGame({
  calm,
  lead,
  another,
  onEnd,
}: {
  calm: boolean;
  lead?: string;
  another?: () => void;
  onEnd: (s: PackScore | null) => void;
}) {
  const t = useT();
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const well = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const tide = useRef<HTMLDivElement>(null);
  const crateCount = useRef<HTMLSpanElement>(null);
  const toast = useRef<HTMLParagraphElement>(null);
  const game = useRef<Game | null>(null);
  const cell = useRef(30);
  const finger = useRef<Finger | null>(null);
  const shownAt = useRef(performance.now());
  const ended = useRef(false);

  const end = () => {
    if (ended.current || !game.current) return;
    ended.current = true;
    const score = game.current.score;
    onEnd(score.pieces > 0 ? { ...score } : null);
  };

  useEffect(() => {
    // The backdrop's rising bubbles would drift behind the board and pull the eye away from it.
    document.documentElement.classList.add('packing');
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const colors: Colors = {
      sardine: v('--r-common', '#8aa4b6'),
      puffer: v('--gold', '#f2c14e'),
      tuna: v('--tuna-body', '#4f8fbf'),
      mackerel: v('--accent', '#5ec4f0'),
      salmon: v('--coral', '#ff7a59'),
      cod: v('--tuna-belly', '#d4e3ec'),
      angelfish: v('--r-rare', '#b28cff'),
      ink: v('--ink-dark', '#0b1f2e'),
      wood: v('--gold-deep', '#b98712'),
    };
    const back = document.createElement('canvas');
    const stack = document.createElement('canvas');
    let dpr = 1;
    let size = { w: 0, h: 0 };
    let stackKey = '';

    // The cell size comes from the room left under the top bar; on a taller phone the board gets
    // more rows rather than bigger cells.
    const fit = () => {
      const box = well.current!.getBoundingClientRect();
      const { cols, rows } = PACK_SETTINGS;
      const g = game.current;
      const s = Math.floor(Math.min((box.width - 2 * PAD) / cols, (box.height - 2 * PAD) / (g?.rows ?? rows), MAX_CELL));
      cell.current = Math.max(8, s);
      if (!g) {
        const fitRows = Math.floor((box.height - 2 * PAD) / cell.current);
        game.current = createGame(cols, Math.max(rows, Math.min(MAX_ROWS, fitRows)));
      }
      const gm = game.current!;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = { w: gm.cols * cell.current + 2 * PAD, h: gm.rows * cell.current + 2 * PAD };
      for (const k of [c, back, stack]) {
        k.width = Math.round(size.w * dpr);
        k.height = Math.round(size.h * dpr);
      }
      c.style.width = `${size.w}px`;
      c.style.height = `${size.h}px`;
      drawBack(back.getContext('2d')!, dpr, gm, cell.current, colors);
      stackKey = '';
      drawPreview(preview.current, gm.next, colors);
    };
    fit();
    window.addEventListener('resize', fit);

    let raf = 0;
    let last = performance.now();
    let shown = { crates: -1, next: '' };
    let toastUntil = 0;
    const frame = (now: number) => {
      const g = game.current!;
      // Nothing moves until her first touch.
      if (startedRef.current) step(g, (now - last) / 1000);
      last = now;
      for (const e of g.events) {
        if (e.type === 'lock') fx.packLock();
        else if (e.type === 'clear') fx.packClear(e.rows.length);
        else if (e.type === 'topout') {
          fx.packHaul();
          toast.current?.classList.add('show');
          toastUntil = now + 1800;
        } else fx.celebrate();
      }
      g.events.length = 0;
      if (toastUntil && now > toastUntil) {
        toast.current?.classList.remove('show');
        toastUntil = 0;
      }

      // The settled fish are drawn once and kept until the stack changes.
      const key = `${g.score.pieces}|${g.score.crates}|${g.score.hauls}|${g.clearing ? 1 : 0}|${cell.current}`;
      if (key !== stackKey) {
        drawStack(stack.getContext('2d')!, dpr, g, cell.current, colors);
        stackKey = key;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(back, 0, 0);
      ctx.drawImage(stack, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMoving(ctx, g, cell.current, colors, calm);

      if (tide.current) tide.current.style.width = `${Math.min(100, (g.time / PACK_SETTINGS.roundSeconds) * 100)}%`;
      if (shown.crates !== g.score.crates && crateCount.current) crateCount.current.textContent = String(g.score.crates);
      if (shown.next !== g.next) drawPreview(preview.current, g.next, colors);
      shown = { crates: g.score.crates, next: g.next };

      if (g.over) end();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      document.documentElement.classList.remove('packing');
    };
  }, []);

  const lift = (e: PointerEvent) => {
    const f = finger.current;
    if (!f || f.id !== e.pointerId) return;
    finger.current = null;
    const g = game.current;
    if (!g || f.starter) return;
    if (f.soft) softDrop(g, false);
    if (e.type === 'pointercancel') return;
    const now = performance.now();
    const dx = e.clientX - f.x0;
    const dy = e.clientY - f.y0;
    // The speed over the last moment, so a slow drag that ends still isn't a flick.
    const from = f.trail.find((p) => now - p.t <= FLICK_WINDOW) ?? f.trail[f.trail.length - 1];
    const speed = from && now > from.t ? (e.clientY - from.y) / (now - from.t) : 0;
    const ms = now - f.t0;
    if (ms < FLICK_MS && dy > FLICK_MIN && dy > Math.abs(dx) * 1.2 && dy / ms > FLICK_SPEED && speed > FLICK_END) {
      hardDrop(g);
    } else if (!f.moved && ms < TAP_MS) {
      if (rotate(g)) fx.packRotate();
    }
  };

  return (
    <div
      class="pack-pond"
      onPointerDown={(e) => {
        // The back button and the links under how to play are buttons, with their own taps.
        if (finger.current || (e.target as Element).closest('button')) return;
        const starter = !startedRef.current;
        // A double tap on the previous screen shouldn't start the round before she's read how to play.
        if (starter && performance.now() - shownAt.current < 300) return;
        const now = performance.now();
        finger.current = {
          id: e.pointerId,
          x0: e.clientX,
          y0: e.clientY,
          t0: now,
          ax: e.clientX,
          softY: 0,
          moved: false,
          soft: false,
          starter,
          trail: [{ y: e.clientY, t: now }],
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        // Her first touch only starts the round: it doesn't also turn the piece.
        if (starter) {
          startedRef.current = true;
          setStarted(true);
        }
      }}
      onPointerMove={(e) => {
        const f = finger.current;
        const g = game.current;
        if (!f || f.id !== e.pointerId || f.starter || !g) return;
        const now = performance.now();
        f.trail.push({ y: e.clientY, t: now });
        while (f.trail.length > 2 && now - f.trail[0].t > 200) f.trail.shift();
        const dxAll = e.clientX - f.x0;
        const dyAll = e.clientY - f.y0;
        if (Math.abs(dxAll) > TAP_SLOP || Math.abs(dyAll) > TAP_SLOP) f.moved = true;
        // Sideways: the piece follows her finger, a column at a time.
        const col = cell.current * COLUMN;
        const n = Math.trunc((e.clientX - f.ax) / col);
        if (n) {
          moveBy(g, n);
          f.ax += n * col;
        }
        // Down: soft drop while the finger stays down there.
        const s = cell.current;
        if (!f.soft && dyAll > s && dyAll > Math.abs(dxAll)) {
          f.soft = true;
          f.softY = e.clientY;
          softDrop(g, true);
        } else if (f.soft && e.clientY < f.softY - s / 2) {
          f.soft = false;
          softDrop(g, false);
        } else if (f.soft && !g.soft && e.clientY > f.softY + s) {
          // The last piece locked; moving further down drops the new one too.
          f.softY = e.clientY;
          softDrop(g, true);
        }
      }}
      onPointerUp={lift}
      onPointerCancel={lift}
    >
      <header class="dodge-hud pack-hud">
        <button class="icon-btn" onClick={end} aria-label={t.packEnd}><Back /><Haptic /></button>
        <div class="dodge-tide" aria-hidden="true"><div ref={tide} /></div>
        <span class="dodge-count"><Crate size={20} /><span ref={crateCount}>0</span></span>
        <canvas class="pack-next" ref={preview} aria-label={t.packNext} width={PREVIEW.w} height={PREVIEW.h} />
      </header>
      <div class="pack-well" ref={well}>
        <canvas ref={canvas} class="pack-canvas" />
        <p class="pack-toast" ref={toast} aria-live="polite">{t.packHauled}</p>
      </div>
      {!started && (
        <div class="dodge-hint">
          {lead && <p class="dodge-lead">{lead}</p>}
          <h2>{t.packTitle}</h2>
          <p>{t.packHowTo}</p>
          <AnotherGame onPick={another} />
        </div>
      )}
    </div>
  );
}

interface Finger {
  id: number;
  x0: number;
  y0: number;
  t0: number;
  /** Where her finger was when the piece last moved a column. */
  ax: number;
  /** Where soft drop started. */
  softY: number;
  moved: boolean;
  soft: boolean;
  /** The touch that started the round, which does nothing else. */
  starter: boolean;
  trail: { y: number; t: number }[];
}

// ---------- Drawing ----------

type Colors = Record<Fish, string> & { ink: string; wood: string };
type Drawn = { x: number; y: number; part: Part; dir: Dir };

const TAU = Math.PI * 2;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The inside of the crate: dark water behind a faint net, in a wooden frame. Drawn once per size. */
function drawBack(ctx: CanvasRenderingContext2D, dpr: number, g: Game, s: number, c: Colors) {
  const w = g.cols * s;
  const h = g.rows * s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w + 2 * PAD, h + 2 * PAD);
  rounded(ctx, 1.5, 1.5, w + 2 * PAD - 3, h + 2 * PAD - 3, 10);
  ctx.fillStyle = 'rgba(6, 23, 36, 0.6)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = c.wood;
  ctx.stroke();
  ctx.save();
  ctx.translate(PAD, PAD);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  // The net: diagonal lines a cell apart.
  ctx.strokeStyle = 'rgba(234, 244, 250, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -h; k < w + h; k += s) {
    ctx.moveTo(k, 0);
    ctx.lineTo(k + h, h);
    ctx.moveTo(k + h, 0);
    ctx.lineTo(k, h);
  }
  ctx.stroke();
  ctx.restore();
}

/** Every settled fish, except rows on their way out (those move, so they're drawn every frame). */
function drawStack(ctx: CanvasRenderingContext2D, dpr: number, g: Game, s: number, c: Colors) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, g.cols * s + 2 * PAD, g.rows * s + 2 * PAD);
  ctx.translate(PAD, PAD);
  const skip = new Set(g.clearing?.rows ?? []);
  for (const [cells, fish] of groups(g.board, (r) => !skip.has(r))) drawFish(ctx, cells, s, c[fish], c);
}

/** The board's cells grouped into fish (by the piece they came from). */
function groups(board: (Cell | null)[][], keep: (row: number) => boolean) {
  const out = new Map<number, [Drawn[], Fish]>();
  board.forEach((row, y) => {
    if (!keep(y)) return;
    row.forEach((k, x) => {
      if (!k) return;
      const entry = out.get(k.id) ?? [[], k.fish];
      entry[0].push({ x, y, part: k.part, dir: k.dir });
      out.set(k.id, entry);
    });
  });
  return out.values();
}

const easeIn = (k: number) => k * k;

/** The falling piece, its ghost, and rows on their way out. */
function drawMoving(ctx: CanvasRenderingContext2D, g: Game, s: number, c: Colors, calm: boolean) {
  ctx.save();
  ctx.translate(PAD, PAD);
  ctx.beginPath();
  ctx.rect(0, 0, g.cols * s, g.rows * s);
  ctx.clip();

  const cl = g.clearing;
  if (cl) {
    const k = Math.min(1, cl.t / cl.duration);
    const rows = new Set(cl.rows);
    ctx.save();
    // Full rows ship: a crate closes round them and they slide off. The haul sinks the bottom away.
    // With less motion, both just fade.
    ctx.globalAlpha = calm ? 1 - k : 1 - easeIn(k) * 0.7;
    if (!calm) {
      if (cl.kind === 'crate') ctx.translate(easeIn(k) * (g.cols + 1) * s, 0);
      else ctx.translate(0, easeIn(k) * cl.rows.length * s);
    }
    for (const [cells, fish] of groups(g.board, (r) => rows.has(r))) drawFish(ctx, cells, s, c[fish], c);
    if (cl.kind === 'crate') {
      ctx.strokeStyle = c.wood;
      ctx.lineWidth = 3;
      for (const r of cl.rows) {
        rounded(ctx, 1.5, r * s + 1.5, g.cols * s - 3, s - 3, 6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const p = g.piece;
  if (p) {
    const color = c[PACK_SETTINGS.fish[p.shape]];
    const inset = Math.max(1, Math.round(s * 0.08));
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (const k of ghost(g)) {
      rounded(ctx, k.x * s + inset, k.y * s + inset, s - 2 * inset, s - 2 * inset, s * 0.28);
      ctx.stroke();
    }
    ctx.restore();
    drawFish(ctx, cellsOf(p), s, color, c);
  }
  ctx.restore();
}

/**
 * One fish: rounded scale tiles joined into one body, scales on the middle, an eye on the head and a
 * tail fin on the tail, so which way round it is shows at a glance.
 */
function drawFish(ctx: CanvasRenderingContext2D, cells: Drawn[], s: number, color: string, c: Colors) {
  const inset = Math.max(1, Math.round(s * 0.06));
  const at = new Set(cells.map((k) => `${k.x},${k.y}`));
  ctx.fillStyle = color;
  for (const k of cells) {
    const x = k.x * s;
    const y = k.y * s;
    if (at.has(`${k.x + 1},${k.y}`)) ctx.fillRect(x + s / 2, y + inset, s, s - 2 * inset);
    if (at.has(`${k.x},${k.y + 1}`)) ctx.fillRect(x + inset, y + s / 2, s - 2 * inset, s);
    // Where four cells of one fish meet (the puffer), fill the gap between their corners too.
    if (at.has(`${k.x + 1},${k.y}`) && at.has(`${k.x},${k.y + 1}`) && at.has(`${k.x + 1},${k.y + 1}`)) {
      ctx.fillRect(x + s / 2, y + s / 2, s, s);
    }
    rounded(ctx, x + inset, y + inset, s - 2 * inset, s - 2 * inset, s * 0.3);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const k of cells) {
    const cx = k.x * s + s / 2;
    const cy = k.y * s + s / 2;
    if (k.part === 'body') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.arc(cx - s * 0.14, cy - s * 0.1, s * 0.15, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.moveTo(cx + s * 0.29, cy + s * 0.06);
      ctx.arc(cx + s * 0.16, cy + s * 0.06, s * 0.15, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      continue;
    }
    ctx.save();
    orient(ctx, cx, cy, k.dir);
    if (k.part === 'head') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s * 0.06, -s * 0.08, s * 0.17, 0, TAU);
      ctx.fill();
      ctx.fillStyle = c.ink;
      ctx.beginPath();
      ctx.arc(s * 0.11, -s * 0.08, s * 0.08, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = Math.max(1, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(s * 0.18, s * 0.17);
      ctx.quadraticCurveTo(s * 0.27, s * 0.22, s * 0.34, s * 0.13);
      ctx.stroke();
    } else {
      // A forked tail, darker than the body, reaching to the edge of the cell.
      ctx.fillStyle = 'rgba(11, 31, 46, 0.32)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, 0);
      ctx.lineTo(s * 0.42, -s * 0.36);
      ctx.lineTo(s * 0.28, 0);
      ctx.lineTo(s * 0.42, s * 0.36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Turns the drawing so that +x points `dir` (mirrored for left, so the eye stays on top). */
function orient(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir) {
  ctx.translate(x, y);
  if (dir === 'left') ctx.scale(-1, 1);
  else if (dir === 'up') ctx.rotate(-Math.PI / 2);
  else if (dir === 'down') ctx.rotate(Math.PI / 2);
}

/** The next piece, small, in the top bar. */
function drawPreview(el: HTMLCanvasElement | null, shape: Shape, c: Colors) {
  if (!el) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.width = Math.round(PREVIEW.w * dpr);
  el.height = Math.round(PREVIEW.h * dpr);
  const ctx = el.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, PREVIEW.w, PREVIEW.h);
  const cells = shapeCells(shape, 0);
  const xs = cells.map((k) => k.x);
  const ys = cells.map((k) => k.y);
  const s = PREVIEW.cell;
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * s;
  const h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
  ctx.translate((PREVIEW.w - w) / 2 - Math.min(...xs) * s, (PREVIEW.h - h) / 2 - Math.min(...ys) * s);
  drawFish(ctx, cells, s, c[PACK_SETTINGS.fish[shape]], c);
}
