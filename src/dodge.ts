/**
 * Dodge the hooks (roadmap #7, prototype). The tuna follows her finger, hooks drop on lines and bubbles
 * rise. Steering between moving hooks is a visual-spatial task, the kind that crowds out craving
 * imagery (the Tetris studies). There's no game over: a hook that touches the tuna only nicks it, and
 * the game eases off for a while after.
 *
 * Only the rules live here; drawing and touch are in components/Dodge.tsx. Sizes are in CSS pixels.
 */

export const DODGE_SETTINGS = {
  roundSeconds: 180,
  /** The tuna's body, as an ellipse around its centre. The tail and fins don't count as hits. */
  tunaRx: 34,
  tunaRy: 17,
  /** How quickly the tuna catches up with her finger; higher is snappier. */
  follow: 12,
  /** Seconds the tuna can't be nicked again after a nick. */
  safeAfterNick: 1.4,
  /** A nick lowers the difficulty by this much (0–1), wearing off over easeSeconds. */
  nickEase: 0.3,
  easeSeconds: 10,
  /** Difficulty at the start of the round; it climbs to 1 by the end. */
  startLevel: 0.12,
  /** Seconds between hooks and how fast they drop (px/s), from level 0 to level 1. */
  hookEvery: [1.9, 0.55],
  dropSpeed: [230, 520],
  /** Most hooks in the water at once, from level 0 to level 1. */
  maxHooks: [2, 7],
  /** Swinging and trolling hooks join in from these levels. */
  swingFrom: 0.3,
  trollFrom: 0.5,
  bubbleEvery: 0.85,
  /** Hook art: the bend sits below and left of the eye the line is tied to. */
  bendOffset: { x: -9, y: 28 },
  bendRadius: 9,
};

const S = DODGE_SETTINGS;

export type HookKind = 'drop' | 'swing' | 'troll';

export interface Hook {
  kind: HookKind;
  /** Where the line comes down from, at the top of the screen. */
  ax: number;
  /** The eye of the hook, where the line is tied. */
  x: number;
  y: number;
  phase: 'down' | 'hold' | 'up';
  /** drop and swing: how much line is out. */
  len: number;
  depth: number;
  speed: number;
  /** Seconds in the current phase, and since the hook appeared. */
  t: number;
  age: number;
  hold: number;
  /** swing: the angle it swings through, in radians. troll: which way it's pulled. */
  swing: number;
  dir: 1 | -1;
  nicked: boolean;
}

export interface Bubble {
  x0: number;
  x: number;
  y: number;
  r: number;
  speed: number;
  seed: number;
}

export type DodgeEvent = { type: 'bubble'; streak: number } | { type: 'nick' } | { type: 'over' };

export interface Game {
  w: number;
  h: number;
  /** The tuna stays below this line, clear of the buttons at the top. */
  top: number;
  time: number;
  tuna: { x: number; y: number; tx: number; ty: number; vx: number; vy: number; facing: 'left' | 'right'; safe: number };
  hooks: Hook[];
  bubbles: Bubble[];
  pops: { x: number; y: number; r: number; t: number }[];
  nextHook: number;
  nextBubble: number;
  ease: number;
  score: { dodged: number; bubbles: number; nicks: number; streak: number; bestStreak: number };
  over: boolean;
  /** Things that happened this step, for sounds. The screen empties it. */
  events: DodgeEvent[];
  rng: () => number;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const between = (rng: () => number, lo: number, hi: number) => lerp(lo, hi, rng());

export function createGame(w: number, h: number, top: number, rng: () => number = Math.random): Game {
  const x = w / 2;
  const y = lerp(top, h, 0.6);
  return {
    w,
    h,
    top,
    time: 0,
    tuna: { x, y, tx: x, ty: y, vx: 0, vy: 0, facing: 'left', safe: 0 },
    hooks: [],
    bubbles: [],
    pops: [],
    nextHook: 1.2,
    nextBubble: 0.3,
    ease: 0,
    score: { dodged: 0, bubbles: 0, nicks: 0, streak: 0, bestStreak: 0 },
    over: false,
    events: [],
    rng,
  };
}

export function resize(g: Game, w: number, h: number, top: number) {
  g.w = w;
  g.h = h;
  g.top = top;
  moveBy(g, 0, 0);
}

/** Her finger moved by (dx, dy): the tuna swims after it. She can touch anywhere, so it's never hidden. */
export function moveBy(g: Game, dx: number, dy: number) {
  const t = g.tuna;
  t.tx = clamp(t.tx + dx, S.tunaRx + 8, g.w - S.tunaRx - 8);
  t.ty = clamp(t.ty + dy, g.top + S.tunaRy + 12, g.h - S.tunaRy - 16);
}

/** How hard the game is right now, 0–1: climbs through the round, and drops for a while after a nick. */
export function level(g: Game) {
  const base = lerp(S.startLevel, 1, clamp(g.time / S.roundSeconds, 0, 1));
  return clamp(base - g.ease, 0, 1);
}

/** The centre of the hook's bend, the part that nicks. It hangs along the line. */
export function hookBend(h: Hook) {
  const dx = h.x - h.ax;
  const dy = h.y + 20;
  const len = Math.hypot(dx, dy) || 1;
  const down = { x: dx / len, y: dy / len };
  const right = { x: down.y, y: -down.x };
  return {
    x: h.x + S.bendOffset.x * right.x + S.bendOffset.y * down.x,
    y: h.y + S.bendOffset.x * right.y + S.bendOffset.y * down.y,
  };
}

export function newHook(g: Game, kind: HookKind, ax?: number): Hook {
  const lv = level(g);
  const r = g.rng;
  const speed = lerp(S.dropSpeed[0], S.dropSpeed[1], lv) * between(r, 0.85, 1.15);
  const x = ax ?? between(r, 30, g.w - 20);
  const hook: Hook = {
    kind,
    ax: x,
    x,
    y: -60,
    phase: 'down',
    len: -40,
    depth: between(r, g.top + 40, g.h - 30),
    speed,
    t: 0,
    age: 0,
    hold: between(r, 0.5, 1.3),
    swing: between(r, 0.35, 0.6),
    dir: r() < 0.5 ? 1 : -1,
    nicked: false,
  };
  if (kind === 'swing') {
    hook.hold = between(r, 2.5, 4);
    hook.speed *= 0.7;
  }
  if (kind === 'troll') {
    hook.ax = hook.dir === 1 ? -90 : g.w + 90;
    hook.x = hook.ax - hook.dir * 40;
    hook.y = hook.depth;
    hook.speed = between(r, 70, 110) + lv * 80;
  }
  return hook;
}

function spawnHook(g: Game) {
  const lv = level(g);
  const r = g.rng;
  const kinds: HookKind[] = ['drop', 'drop'];
  if (lv >= S.swingFrom) kinds.push('swing');
  if (lv >= S.trollFrom) kinds.push('troll');
  const kind = kinds[Math.floor(r() * kinds.length)];
  // Some drops aim near her, so standing still doesn't work for long.
  const aimed = kind === 'drop' && r() < 0.25 + 0.35 * lv;
  const ax = aimed ? clamp(g.tuna.x + between(r, -50, 50), 30, g.w - 20) : undefined;
  g.hooks.push(newHook(g, kind, ax));
}

function moveHook(h: Hook, dt: number, g: Game) {
  h.t += dt;
  h.age += dt;
  if (h.kind === 'troll') {
    h.ax += h.dir * h.speed * dt;
    h.x = h.ax - h.dir * 40;
    h.y = h.depth + Math.sin(h.age * 2) * 8;
    if (h.nicked) h.depth -= 260 * dt;
    return;
  }
  // drop and swing: the line pays out, holds, then reels in.
  if (h.phase === 'down') {
    h.len += h.speed * dt;
    if (h.len >= h.depth + 20) {
      h.len = h.depth + 20;
      h.phase = 'hold';
      h.t = 0;
    }
  } else if (h.phase === 'hold') {
    if (h.t >= h.hold) {
      h.phase = 'up';
      h.t = 0;
    }
  } else {
    h.len -= h.speed * (h.nicked ? 2.4 : 1.25) * dt;
  }
  const len = h.len;
  if (h.kind === 'swing') {
    const angle = h.swing * Math.sin(h.age * 1.9 + h.dir);
    h.x = clamp(h.ax + len * Math.sin(angle), -30, g.w + 30);
    h.y = len * Math.cos(angle) - 20;
  } else {
    // A little jiggle while it waits, like someone tugging the line.
    const jiggle = h.phase === 'hold' ? Math.sin(h.t * 14) * 3 : 0;
    h.x = h.ax;
    h.y = len - 20 + jiggle;
  }
}

const gone = (h: Hook, g: Game) =>
  h.kind === 'troll'
    ? (h.dir === 1 ? h.x > g.w + 80 : h.x < -80) || h.y < -60
    : h.phase === 'up' && h.y < -70;

/** Inside the tuna's body, grown by `pad` so things touching its edge count. */
function touchesTuna(g: Game, x: number, y: number, pad: number) {
  const dx = (x - g.tuna.x) / (S.tunaRx + pad);
  const dy = (y - g.tuna.y) / (S.tunaRy + pad);
  return dx * dx + dy * dy < 1;
}

export function step(g: Game, dt: number) {
  if (g.over || dt <= 0) return;
  // After a pause (the app in the background), carry on where it was rather than jumping ahead.
  dt = Math.min(dt, 0.05);
  g.time += dt;
  g.ease = Math.max(0, g.ease - (S.nickEase / S.easeSeconds) * dt);
  const lv = level(g);
  const r = g.rng;

  // The tuna
  const t = g.tuna;
  const k = 1 - Math.exp(-S.follow * dt);
  const nx = t.x + (t.tx - t.x) * k;
  const ny = t.y + (t.ty - t.y) * k;
  t.vx = (nx - t.x) / dt;
  t.vy = (ny - t.y) / dt;
  t.x = nx;
  t.y = ny;
  if (t.vx < -25) t.facing = 'left';
  else if (t.vx > 25) t.facing = 'right';
  t.safe = Math.max(0, t.safe - dt);

  // Hooks
  g.nextHook -= dt;
  const max = Math.round(lerp(S.maxHooks[0], S.maxHooks[1], lv));
  if (g.nextHook <= 0) {
    if (g.hooks.length < max) spawnHook(g);
    g.nextHook = lerp(S.hookEvery[0], S.hookEvery[1], lv) * between(r, 0.8, 1.2);
  }
  for (const h of g.hooks) {
    moveHook(h, dt, g);
    if (h.nicked || t.safe > 0) continue;
    const b = hookBend(h);
    if (touchesTuna(g, b.x, b.y, S.bendRadius * 0.6)) {
      h.nicked = true;
      if (h.kind !== 'troll') {
        h.phase = 'up';
        h.t = 0;
      }
      t.safe = S.safeAfterNick;
      g.ease = Math.min(0.6, g.ease + S.nickEase);
      g.score.nicks++;
      g.score.streak = 0;
      g.events.push({ type: 'nick' });
    }
  }
  g.hooks = g.hooks.filter((h) => {
    if (!gone(h, g)) return true;
    if (!h.nicked) g.score.dodged++;
    return false;
  });

  // Bubbles
  g.nextBubble -= dt;
  if (g.nextBubble <= 0 && g.bubbles.length < 9) {
    const x0 = between(r, 30, g.w - 30);
    g.bubbles.push({ x0, x: x0, y: g.h + 20, r: between(r, 10, 14), speed: between(r, 45, 80), seed: r() * 6 });
    g.nextBubble = S.bubbleEvery * between(r, 0.7, 1.3);
  }
  for (const b of g.bubbles) {
    b.y -= b.speed * dt;
    b.x = b.x0 + Math.sin(g.time * 1.8 + b.seed) * 14;
  }
  g.bubbles = g.bubbles.filter((b) => {
    if (touchesTuna(g, b.x, b.y, b.r)) {
      const s = g.score;
      s.bubbles++;
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      g.pops.push({ x: b.x, y: b.y, r: b.r, t: 0 });
      g.events.push({ type: 'bubble', streak: s.streak });
      return false;
    }
    return b.y > g.top - 30;
  });
  for (const p of g.pops) p.t += dt;
  g.pops = g.pops.filter((p) => p.t < 0.4);

  if (g.time >= S.roundSeconds) {
    g.over = true;
    g.events.push({ type: 'over' });
  }
}
