/**
 * Net Packing: a falling-block puzzle, themed as packing fish into crates. It's the closest thing in
 * the app to the Tetris studies (Holmes et al. 2009; Skorka-Brown, Andrade & May 2014, 2015), where a
 * few minutes of play made cravings weaker. The effect comes from the visual-spatial work of turning
 * and fitting shapes, so the rules stay faithful to the standard game: the seven tetrominoes and their
 * rotations, a 7-bag, gravity, a short lock delay, and full rows that clear.
 *
 * There's no game over (D50): when a new piece has no room, the net is hauled in, the bottom half of
 * the stack goes, and play carries on. The round is a fixed length, like Dodge the hooks.
 *
 * Only the rules live here; drawing and touch are in components/Pack.tsx. Positions are in cells,
 * x to the right and y down from the top row.
 */

export type Shape = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Fish = 'sardine' | 'puffer' | 'tuna' | 'mackerel' | 'salmon' | 'cod' | 'angelfish';

export const PACK_SETTINGS = {
  roundSeconds: 150,
  /** The board's size. The screen keeps the width and may add rows on a taller phone. */
  cols: 10,
  rows: 18,
  /** How fast pieces fall, in cells per second, at the start and the end of the round. */
  startFall: 0.9,
  endFall: 2.6,
  /** Soft drop falls this many times faster than gravity at the time. */
  softDrop: 15,
  /** Seconds a piece rests on the stack before it locks, so it can still slide at the last moment. */
  lockDelay: 0.5,
  /** Moving or turning a resting piece restarts the lock delay, this many times per piece at most. */
  maxLockResets: 15,
  /** Seconds full rows stay before they go (they slide off as a crate), and the haul takes. */
  clearDelay: 0.35,
  haulDelay: 0.8,
  /** Rotation tries the turned shape here first, then shifted by each of these (columns, rows). */
  kicks: [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-2, 0],
    [2, 0],
    [0, 1],
  ] as [number, number][],
  /** Which fish each shape is, for its colour and art. */
  fish: { I: 'sardine', O: 'puffer', T: 'tuna', S: 'mackerel', Z: 'salmon', J: 'cod', L: 'angelfish' } as Record<Shape, Fish>,
  /** The longest step, in seconds: after a pause the round carries on where it was. */
  maxDt: 0.05,
};

const S = PACK_SETTINGS;

export const SHAPES: readonly Shape[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/**
 * Each shape in its spawn orientation inside its box, cells in order from the fish's head to its
 * tail. The standard rotations are these turned clockwise inside the box.
 */
const SPAWN: Record<Shape, { box: number; cells: [number, number][] }> = {
  I: { box: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { box: 2, cells: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  T: { box: 3, cells: [[0, 1], [1, 1], [1, 0], [2, 1]] },
  S: { box: 3, cells: [[0, 1], [1, 1], [1, 0], [2, 0]] },
  Z: { box: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { box: 3, cells: [[2, 1], [1, 1], [0, 1], [0, 0]] },
  L: { box: 3, cells: [[0, 1], [1, 1], [2, 1], [2, 0]] },
};

export type Dir = 'left' | 'right' | 'up' | 'down';
export type Part = 'head' | 'body' | 'tail';

/** One cell of a piece: where it is, which part of the fish, and which way the head or tail points. */
export interface PieceCell {
  x: number;
  y: number;
  part: Part;
  dir: Dir;
}

/** A cell of the stack. `id` is the piece it came from, so the screen can draw each fish as one. */
export interface Cell {
  shape: Shape;
  fish: Fish;
  id: number;
  part: Part;
  dir: Dir;
}

export interface Piece {
  shape: Shape;
  /** 0–3, clockwise turns from the spawn orientation. */
  rot: number;
  /** The top-left of its box. */
  x: number;
  y: number;
  id: number;
}

export type PackEvent =
  | { type: 'lock' }
  | { type: 'clear'; rows: number[]; cells: (Cell | null)[][] }
  | { type: 'topout'; rows: number[]; cells: (Cell | null)[][] }
  | { type: 'over' };

export interface PackScore {
  /** Full rows cleared: each one is a crate shipped. */
  crates: number;
  /** Pieces placed. More than none means she played. */
  pieces: number;
  /** Times the net was hauled in because the stack reached the top. */
  hauls: number;
}

export interface Game {
  cols: number;
  rows: number;
  time: number;
  /** rows × cols, top row first. */
  board: (Cell | null)[][];
  /** The falling piece; null while rows clear or the net is hauled. */
  piece: Piece | null;
  /** The piece after this one, for the preview. */
  next: Shape;
  bag: Shape[];
  /** Part of a row fallen since the piece last moved down. */
  fall: number;
  soft: boolean;
  /** Seconds the piece has rested on the stack, and how often that was restarted. */
  resting: number;
  lockResets: number;
  /** The lowest the piece has been: getting lower allows more restarts. */
  lowest: number;
  /** Rows on their way out: full ones as a crate, or the bottom half when the net is hauled. */
  clearing: { kind: 'crate' | 'haul'; rows: number[]; t: number; duration: number } | null;
  score: PackScore;
  over: boolean;
  /** Things that happened this step, for sounds and animation. The screen empties it. */
  events: PackEvent[];
  rng: () => number;
  nextId: number;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const turn = (box: number, [x, y]: [number, number]): [number, number] => [box - 1 - y, x];

/** Every shape's four orientations, worked out once. */
const ROTATIONS: Record<Shape, [number, number][][]> = Object.fromEntries(
  SHAPES.map((s) => {
    const { box, cells } = SPAWN[s];
    const all = [cells];
    for (let r = 1; r < 4; r++) all.push(all[r - 1].map((c) => turn(box, c)));
    return [s, all];
  }),
) as Record<Shape, [number, number][][]>;

const away = (from: [number, number], to: [number, number]): Dir =>
  to[0] < from[0] ? 'left' : to[0] > from[0] ? 'right' : to[1] < from[1] ? 'up' : 'down';
const touching = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

/** A shape's cells in an orientation, relative to its box, with which part of the fish each one is. */
export function shapeCells(shape: Shape, rot: number): PieceCell[] {
  const cells = ROTATIONS[shape][((rot % 4) + 4) % 4];
  const last = cells.length - 1;
  // The head and tail point away from the next cell along the fish that touches them.
  const neighbour = (i: number, order: number[]) => cells[order.find((j) => touching(cells[i], cells[j]))!];
  const head = away(neighbour(0, [1, 2, 3]), cells[0]);
  const tail = away(neighbour(last, [last - 1, last - 2, last - 3]), cells[last]);
  return cells.map(([x, y], i) => ({
    x,
    y,
    part: i === 0 ? 'head' : i === last ? 'tail' : 'body',
    dir: i === 0 ? head : i === last ? tail : 'left',
  }));
}

/** The falling piece's cells on the board. */
export function cellsOf(p: Piece): PieceCell[] {
  return shapeCells(p.shape, p.rot).map((c) => ({ ...c, x: c.x + p.x, y: c.y + p.y }));
}

function fits(g: Game, p: Piece) {
  return ROTATIONS[p.shape][p.rot].every(([cx, cy]) => {
    const x = p.x + cx;
    const y = p.y + cy;
    return x >= 0 && x < g.cols && y >= 0 && y < g.rows && !g.board[y][x];
  });
}

/** A 7-bag: every shape once, shuffled, before any repeats. */
function fromBag(g: Game): Shape {
  if (!g.bag.length) {
    const bag = [...SHAPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    g.bag = bag;
  }
  return g.bag.shift()!;
}

const emptyRow = (cols: number): (Cell | null)[] => Array.from({ length: cols }, () => null);

export function createGame(
  cols: number = S.cols,
  rows: number = S.rows,
  rng: () => number = Math.random,
): Game {
  const g: Game = {
    cols,
    rows,
    time: 0,
    board: Array.from({ length: rows }, () => emptyRow(cols)),
    piece: null,
    next: 'I',
    bag: [],
    fall: 0,
    soft: false,
    resting: 0,
    lockResets: 0,
    lowest: 0,
    clearing: null,
    score: { crates: 0, pieces: 0, hauls: 0 },
    over: false,
    events: [],
    rng,
    nextId: 1,
  };
  g.next = fromBag(g);
  spawn(g);
  return g;
}

/** Where a new piece of this shape starts: centred, its top row on the board's top row. */
export function spawnPiece(g: Game, shape: Shape): Piece {
  const { box } = SPAWN[shape];
  const top = Math.min(...ROTATIONS[shape][0].map(([, y]) => y));
  return { shape, rot: 0, x: Math.floor((g.cols - box) / 2), y: -top, id: g.nextId };
}

/** The next piece comes in, or the net is hauled in if there's no room for it. */
function spawn(g: Game) {
  const p = spawnPiece(g, g.next);
  if (!fits(g, p)) return haul(g);
  g.nextId++;
  g.piece = p;
  g.next = fromBag(g);
  g.fall = 0;
  g.resting = 0;
  g.lockResets = 0;
  g.lowest = p.y;
}

/** The stack reached the top: the bottom half of it goes, and play carries on (D50). */
function haul(g: Game) {
  const top = g.board.findIndex((row) => row.some(Boolean));
  const height = top < 0 ? 0 : g.rows - top;
  const n = clamp(Math.ceil(height / 2), 2, g.rows);
  const rows = Array.from({ length: n }, (_, i) => g.rows - n + i);
  g.score.hauls++;
  g.piece = null;
  g.events.push({ type: 'topout', rows, cells: rows.map((r) => [...g.board[r]]) });
  g.clearing = { kind: 'haul', rows, t: 0, duration: S.haulDelay };
}

function removeRows(g: Game, rows: number[]) {
  const gone = new Set(rows);
  const kept = g.board.filter((_, r) => !gone.has(r));
  g.board = [...Array.from({ length: g.rows - kept.length }, () => emptyRow(g.cols)), ...kept];
}

function lock(g: Game) {
  const p = g.piece;
  if (!p) return;
  for (const c of cellsOf(p)) {
    g.board[c.y][c.x] = { shape: p.shape, fish: S.fish[p.shape], id: p.id, part: c.part, dir: c.dir };
  }
  g.piece = null;
  g.soft = false;
  g.score.pieces++;
  g.events.push({ type: 'lock' });
  const full = g.board.flatMap((row, r) => (row.every(Boolean) ? [r] : []));
  if (!full.length) return spawn(g);
  g.score.crates += full.length;
  g.events.push({ type: 'clear', rows: full, cells: full.map((r) => [...g.board[r]]) });
  g.clearing = { kind: 'crate', rows: full, t: 0, duration: S.clearDelay };
}

/** Resting on the stack or the floor: it can't move down. */
const resting = (g: Game) => !!g.piece && !fits(g, { ...g.piece, y: g.piece.y + 1 });

/** Moves or turns the piece if it fits; a resting piece then gets its lock delay back. */
function tryPlace(g: Game, next: Piece) {
  if (!fits(g, next)) return false;
  const wasResting = resting(g);
  g.piece = next;
  if (next.y > g.lowest) {
    g.lowest = next.y;
    g.lockResets = 0;
    g.resting = 0;
  } else if (wasResting && g.lockResets < S.maxLockResets) {
    g.lockResets++;
    g.resting = 0;
  }
  return true;
}

const playing = (g: Game) => !g.over && !!g.piece;

/** Slide the piece `dx` columns, a column at a time, as far as it fits. Returns how far it went. */
export function moveBy(g: Game, dx: number) {
  let moved = 0;
  const dir = Math.sign(dx);
  while (playing(g) && moved < Math.abs(dx) && tryPlace(g, { ...g.piece!, x: g.piece!.x + dir })) moved++;
  return moved * dir;
}

/** Turn the piece clockwise, nudged off a wall or the stack if needed (the kicks). False if it can't. */
export function rotate(g: Game) {
  if (!playing(g)) return false;
  const p = g.piece!;
  const rot = (p.rot + 1) % 4;
  return S.kicks.some(([dx, dy]) => tryPlace(g, { ...p, rot, x: p.x + dx, y: p.y + dy }));
}

export function softDrop(g: Game, on: boolean) {
  g.soft = on;
}

/** Drop the piece straight onto the stack and lock it. Returns how many rows it fell. */
export function hardDrop(g: Game) {
  if (!playing(g)) return 0;
  const y = ghostRow(g)!;
  const fell = y - g.piece!.y;
  g.piece = { ...g.piece!, y };
  lock(g);
  return fell;
}

/** The row the piece's box would land on, for the ghost. */
export function ghostRow(g: Game): number | null {
  if (!g.piece) return null;
  let y = g.piece.y;
  while (fits(g, { ...g.piece, y: y + 1 })) y++;
  return y;
}

/** Where the piece would land. */
export function ghost(g: Game): PieceCell[] {
  if (!g.piece) return [];
  return cellsOf({ ...g.piece, y: ghostRow(g)! });
}

/** How far through the round, 0–1. */
export const progress = (g: Game) => clamp(g.time / S.roundSeconds, 0, 1);

/** Gravity right now, in cells per second: it rises gently through the round. */
export const fallSpeed = (g: Game) => lerp(S.startFall, S.endFall, progress(g));

export function step(g: Game, dt: number) {
  if (g.over || dt <= 0) return;
  // After a pause (the app in the background), carry on where it was rather than jumping ahead.
  dt = Math.min(dt, S.maxDt);
  g.time += dt;

  if (g.clearing) {
    g.clearing.t += dt;
    if (g.clearing.t >= g.clearing.duration) {
      removeRows(g, g.clearing.rows);
      g.clearing = null;
      spawn(g);
    }
  } else if (g.piece) {
    g.fall += fallSpeed(g) * (g.soft ? S.softDrop : 1) * dt;
    while (g.fall >= 1) {
      if (!tryPlace(g, { ...g.piece, y: g.piece.y + 1 })) {
        g.fall = 0;
        break;
      }
      g.fall -= 1;
    }
    if (resting(g)) {
      g.fall = 0;
      g.resting += dt;
      if (g.resting >= S.lockDelay) lock(g);
    } else g.resting = 0;
  }

  if (g.time >= S.roundSeconds) {
    g.over = true;
    g.events.push({ type: 'over' });
  }
}
