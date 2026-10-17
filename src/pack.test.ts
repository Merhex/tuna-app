import { describe, expect, it } from 'vitest';
import {
  cellsOf,
  createGame,
  ghost,
  ghostRow,
  hardDrop,
  moveBy,
  PACK_SETTINGS,
  rotate,
  shapeCells,
  SHAPES,
  softDrop,
  spawnPiece,
  step,
  type Cell,
  type Game,
  type Shape,
} from './pack';

/** A seeded random, so the same pieces come every run. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const run = (g: Game, seconds: number, each?: (g: Game) => void) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    step(g, 1 / 60);
    each?.(g);
  }
};

const block = (id = 0): Cell => ({ shape: 'O', fish: 'puffer', id, part: 'body', dir: 'left' });

/** Fills a row, leaving the given columns empty. */
function fillRow(g: Game, r: number, gaps: number[] = []) {
  g.board[r] = g.board[r].map((_, x) => (gaps.includes(x) ? null : block()));
}

/** Puts a piece of this shape on the board, replacing the current one. */
function give(g: Game, shape: Shape, at?: { x?: number; y?: number; rot?: number }) {
  g.piece = { ...spawnPiece(g, shape), ...at, id: g.nextId++ };
  g.fall = 0;
  g.resting = 0;
  g.lockResets = 0;
  g.lowest = g.piece.y;
  return g.piece;
}

/** Every cell of the piece on the board and in an empty spot. */
function onBoardAndFree(g: Game) {
  return cellsOf(g.piece!).every((c) => c.x >= 0 && c.x < g.cols && c.y >= 0 && c.y < g.rows && !g.board[c.y][c.x]);
}

describe('net packing: the pieces', () => {
  it('has the seven standard tetrominoes, four cells each, with a head and a tail', () => {
    for (const s of SHAPES) {
      for (let r = 0; r < 4; r++) {
        const cells = shapeCells(s, r);
        expect(cells).toHaveLength(4);
        expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(4);
        expect(cells.filter((c) => c.part === 'head')).toHaveLength(1);
        expect(cells.filter((c) => c.part === 'tail')).toHaveLength(1);
      }
    }
    // The T, standing up after one turn, as in the standard game.
    const t = shapeCells('T', 1).map((c) => [c.x, c.y]).sort();
    expect(t).toEqual([[1, 0], [1, 1], [1, 2], [2, 1]]);
    // The head points the way the fish swims: the I spawns facing left.
    expect(shapeCells('I', 0)[0]).toMatchObject({ part: 'head', dir: 'left' });
    expect(shapeCells('I', 1)[0]).toMatchObject({ part: 'head', dir: 'up' });
  });

  it('deals from a 7-bag: every shape once before any repeats', () => {
    const g = createGame(10, 18, seeded(4));
    const seen: Shape[] = [g.piece!.shape];
    for (let i = 0; i < 34; i++) {
      g.board = g.board.map((row) => row.map(() => null));
      hardDrop(g);
      g.board = g.board.map((row) => row.map(() => null));
      seen.push(g.piece!.shape);
    }
    for (let i = 0; i + 7 <= seen.length; i += 7) {
      expect([...seen.slice(i, i + 7)].sort()).toEqual([...SHAPES].sort());
    }
  });

  it('shows the next piece, and it is the one that comes', () => {
    const g = createGame(10, 18, seeded(8));
    const next = g.next;
    hardDrop(g);
    expect(g.piece!.shape).toBe(next);
  });

  it('turns every piece in every orientation without leaving the board or entering the stack', () => {
    const g = createGame(10, 18, seeded(2));
    // A bumpy stack in the bottom rows, with a well on each side.
    for (let r = 12; r < 18; r++) fillRow(g, r, [0, 1, 8, 9, r % 3 + 3]);
    for (const s of SHAPES) {
      for (let r = 0; r < 4; r++) {
        for (const x of [-3, -2, -1, 0, 1, 4, 7, 8, 9]) {
          for (const y of [0, 5, 9, 10, 11, 14, 16]) {
            const p = give(g, s, { x, y, rot: r });
            if (!onBoardAndFree(g)) continue;
            const turned = rotate(g);
            expect(onBoardAndFree(g)).toBe(true);
            if (!turned) expect(g.piece).toEqual(p);
          }
        }
      }
    }
  });

  it('kicks a turn off a wall instead of failing', () => {
    const g = createGame(10, 18, seeded(3));
    // A standing I against the left wall, then the right wall.
    give(g, 'I', { rot: 1, x: -2, y: 4 });
    expect(onBoardAndFree(g)).toBe(true);
    expect(rotate(g)).toBe(true);
    expect(onBoardAndFree(g)).toBe(true);
    give(g, 'I', { rot: 1, x: 7, y: 4 });
    expect(onBoardAndFree(g)).toBe(true);
    expect(rotate(g)).toBe(true);
    expect(onBoardAndFree(g)).toBe(true);
    // A T against the floor.
    give(g, 'T', { rot: 0, x: 3, y: 16 });
    expect(rotate(g)).toBe(true);
    expect(onBoardAndFree(g)).toBe(true);
    // The I can turn right after it appears, at the top.
    give(g, 'I');
    expect(rotate(g)).toBe(true);
    expect(onBoardAndFree(g)).toBe(true);
  });
});

describe('net packing: moving and dropping', () => {
  it('slides a column at a time and stops at the walls', () => {
    const g = createGame(10, 18, seeded(5));
    give(g, 'O');
    expect(moveBy(g, -1)).toBe(-1);
    expect(moveBy(g, -20)).toBe(-3);
    expect(Math.min(...cellsOf(g.piece!).map((c) => c.x))).toBe(0);
    expect(moveBy(g, 20)).toBe(8);
    expect(Math.max(...cellsOf(g.piece!).map((c) => c.x))).toBe(9);
  });

  it('hard drop lands on the ghost row and locks there', () => {
    const g = createGame(10, 18, seeded(6));
    fillRow(g, 17, [4, 5]);
    give(g, 'T');
    const landing = ghost(g);
    const row = ghostRow(g);
    const id = g.piece!.id;
    expect(row).toBeGreaterThan(g.piece!.y);
    hardDrop(g);
    for (const c of landing) expect(g.board[c.y][c.x]).toMatchObject({ id, shape: 'T', fish: PACK_SETTINGS.fish.T });
    expect(g.score.pieces).toBe(1);
    expect(g.events).toContainEqual({ type: 'lock' });
  });

  it('soft drop falls faster than gravity', () => {
    const a = createGame(10, 18, seeded(7));
    const b = createGame(10, 18, seeded(7));
    softDrop(b, true);
    run(a, 0.5);
    run(b, 0.5);
    expect(b.piece!.y - spawnPiece(b, b.piece!.shape).y).toBeGreaterThan(3);
    expect(b.piece!.y).toBeGreaterThan(a.piece!.y + 3);
  });

  it('gets faster through the round, gently', () => {
    const fallen = (from: number) => {
      const g = createGame(10, 40, seeded(9));
      g.time = from;
      const y0 = g.piece!.y;
      run(g, 4);
      return g.piece!.y - y0;
    };
    const early = fallen(0);
    const late = fallen(PACK_SETTINGS.roundSeconds - 6);
    expect(early).toBeGreaterThanOrEqual(3);
    expect(late).toBeGreaterThan(early * 2);
  });

  it('waits a moment before locking, so a resting piece can still slide', () => {
    const g = createGame(10, 18, seeded(10));
    give(g, 'O', { y: 16 });
    const id = g.piece!.id;
    run(g, PACK_SETTINGS.lockDelay * 0.8);
    expect(g.piece!.id).toBe(id);
    // Slides at the last moment, which restarts the delay.
    expect(moveBy(g, 1)).toBe(1);
    run(g, PACK_SETTINGS.lockDelay * 0.8);
    expect(g.piece!.id).toBe(id);
    run(g, PACK_SETTINGS.lockDelay * 0.4);
    expect(g.piece!.id).not.toBe(id);
    expect(g.board[17][5]).toMatchObject({ id });
  });

  it('can\'t be held up forever by sliding back and forth', () => {
    const g = createGame(10, 18, seeded(11));
    give(g, 'O', { y: 16 });
    const id = g.piece!.id;
    for (let i = 0; i < 100 && g.piece?.id === id; i++) {
      moveBy(g, i % 2 ? 1 : -1);
      run(g, PACK_SETTINGS.lockDelay * 0.5);
    }
    expect(g.piece?.id).not.toBe(id);
  });
});

describe('net packing: crates', () => {
  it.each([
    [1, [17]],
    [2, [16, 17]],
    [4, [14, 15, 16, 17]],
  ])('clears %i full rows at once and drops the rest', (n, rows) => {
    const g = createGame(10, 18, seeded(12));
    // Rows full but for column 0, where a standing I (four tall) drops in. Above them, up to the
    // I's top, rows with a second gap, so they stay. A marker above the full rows should drop.
    for (const r of rows) fillRow(g, r, [0]);
    for (let r = 14; r < 18 - n; r++) fillRow(g, r, [0, 7]);
    g.board[rows[0] - 1][5] = block(99);
    give(g, 'I', { rot: 1, x: -2, y: 0 });
    hardDrop(g);
    const cleared = g.events.find((e) => e.type === 'clear');
    expect(cleared).toMatchObject({ type: 'clear', rows });
    expect(g.score.crates).toBe(n);
    expect(g.piece).toBeNull();
    // The rows wait a moment, then go, and the marker drops by n.
    run(g, PACK_SETTINGS.clearDelay + 0.05);
    expect(g.board[rows[0] - 1 + n][5]).toMatchObject({ id: 99 });
    expect(g.board.slice(18 - n).every((row) => !row.every(Boolean))).toBe(true);
    expect(g.piece).not.toBeNull();
  });
});

describe('net packing: no game over', () => {
  it('hauls in the net when there\'s no room, clears the bottom half and carries on', () => {
    const g = createGame(10, 18, seeded(13));
    // A stack all the way to the top, with a gap in every row so none clear. The top two rows leave
    // room for an O in the corner, but none where new pieces come in.
    for (let r = 2; r < 18; r++) fillRow(g, r, [r % 10]);
    fillRow(g, 1, [0, 1, 9]);
    g.board[0] = g.board[0].map((_, x) => (x === 4 || x === 5 ? block() : null));
    give(g, 'O', { x: 0, y: 0 });
    hardDrop(g);
    expect(g.events.some((e) => e.type === 'topout')).toBe(true);
    expect(g.score.hauls).toBe(1);
    expect(g.over).toBe(false);
    run(g, PACK_SETTINGS.haulDelay + 0.05);
    expect(g.piece).not.toBeNull();
    const filled = g.board.filter((row) => row.some(Boolean)).length;
    expect(filled).toBeLessThanOrEqual(9);
    expect(g.board.slice(0, 8).every((row) => row.every((c) => !c))).toBe(true);
  });

  it('never ends the round early, however badly it goes', () => {
    const g = createGame(10, 18, seeded(14));
    run(g, PACK_SETTINGS.roundSeconds - 1, (g) => {
      hardDrop(g);
    });
    expect(g.score.hauls).toBeGreaterThan(3);
    expect(g.over).toBe(false);
    run(g, 2);
    expect(g.over).toBe(true);
    expect(g.events.at(-1)).toEqual({ type: 'over' });
    expect(g.score.pieces).toBeGreaterThan(50);
  });

  it('treats a huge step like a short one: nothing falls through the floor', () => {
    const g = createGame(10, 18, seeded(15));
    const y0 = g.piece!.y;
    step(g, 10);
    expect(g.time).toBeCloseTo(PACK_SETTINGS.maxDt);
    expect(g.piece!.y).toBe(y0);
    expect(onBoardAndFree(g)).toBe(true);
    softDrop(g, true);
    for (let i = 0; i < 400; i++) step(g, 10);
    for (const row of g.board) expect(row).toHaveLength(10);
    expect(g.board).toHaveLength(18);
    if (g.piece) expect(onBoardAndFree(g)).toBe(true);
  });

  it('is the same game for the same seed', () => {
    const play = () => {
      const g = createGame(10, 18, seeded(21));
      const shapes: Shape[] = [];
      run(g, 30, (g) => {
        if (g.piece && !shapes.length) shapes.push(g.piece.shape);
        if (g.piece && Math.round(g.time * 60) % 20 === 0) {
          moveBy(g, g.time % 2 > 1 ? 2 : -2);
          rotate(g);
          shapes.push(g.piece?.shape ?? 'O');
          hardDrop(g);
        }
      });
      return { shapes, score: g.score, board: JSON.stringify(g.board) };
    };
    expect(play()).toEqual(play());
  });
});
