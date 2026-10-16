import { describe, expect, it } from 'vitest';
import { createGame, DODGE_SETTINGS, hookBend, level, moveBy, newHook, step, type Game } from './dodge';

/** A seeded random, so the same hooks drop every run. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const run = (g: Game, seconds: number, each?: (g: Game) => void) => {
  for (let i = 0; i < seconds * 60; i++) {
    step(g, 1 / 60);
    each?.(g);
  }
};

/** Puts a hook's bend right on the tuna, held there. */
function hookOnTuna(g: Game) {
  const h = newHook(g, 'drop', g.tuna.x);
  h.phase = 'hold';
  h.hold = 99;
  h.ax = h.x = g.tuna.x - DODGE_SETTINGS.bendOffset.x;
  h.y = h.depth = g.tuna.y - DODGE_SETTINGS.bendOffset.y;
  h.len = h.y + 20;
  g.hooks.push(h);
  return h;
}

describe('dodge the hooks', () => {
  it('has no game over: the round lasts its full length however often she is nicked', () => {
    const g = createGame(390, 800, 60, seeded(3));
    run(g, DODGE_SETTINGS.roundSeconds - 1, (g) => {
      if (g.tuna.safe === 0 && g.hooks.length < 3) hookOnTuna(g);
    });
    expect(g.score.nicks).toBeGreaterThan(20);
    expect(g.over).toBe(false);
    run(g, 2);
    expect(g.over).toBe(true);
    expect(g.events.at(-1)).toEqual({ type: 'over' });
  });

  it('a nick keeps the tuna safe for a moment and eases the game off', () => {
    const g = createGame(390, 800, 60, seeded(5));
    g.time = 120;
    g.nextHook = 999;
    const before = level(g);
    const first = hookOnTuna(g);
    expect(hookBend(first).x).toBeCloseTo(g.tuna.x, 0);
    step(g, 1 / 60);
    expect(g.score.nicks).toBe(1);
    expect(level(g)).toBeLessThan(before - 0.2);
    hookOnTuna(g);
    step(g, 1 / 60);
    expect(g.score.nicks).toBe(1);
    run(g, DODGE_SETTINGS.safeAfterNick);
    expect(g.score.nicks).toBe(2);
    // The ease wears off again.
    run(g, DODGE_SETTINGS.easeSeconds * 2.5);
    expect(g.ease).toBe(0);
  });

  it('counts a hook as dodged once it leaves without touching her, and a nicked one not at all', () => {
    const g = createGame(390, 800, 60, seeded(7));
    g.nextHook = 999;
    g.hooks.push(newHook(g, 'drop', 20));
    hookOnTuna(g);
    for (let i = 0; i < 600 && g.hooks.length; i++) step(g, 1 / 60);
    expect(g.hooks).toHaveLength(0);
    expect(g.score).toMatchObject({ dodged: 1, nicks: 1 });
  });

  it('catches bubbles the tuna swims through and keeps the best streak', () => {
    const g = createGame(390, 800, 60, seeded(9));
    g.nextHook = 999;
    g.nextBubble = 999;
    g.bubbles.push({ x0: g.tuna.x, x: g.tuna.x, y: g.tuna.y, r: 12, speed: 0, seed: -g.time * 1.8 });
    step(g, 1 / 60);
    expect(g.score).toMatchObject({ bubbles: 1, streak: 1, bestStreak: 1 });
    expect(g.events).toContainEqual({ type: 'bubble', streak: 1 });
    hookOnTuna(g);
    step(g, 1 / 60);
    expect(g.score).toMatchObject({ streak: 0, bestStreak: 1 });
  });

  it('sends bubbles up faster, and more often, towards the end of the round', () => {
    const g = createGame(390, 800, 60, seeded(17));
    g.nextHook = 999;
    const rising = (from: number) => {
      g.time = from;
      g.bubbles = [];
      // Away from the bubbles, so none get caught.
      g.tuna.x = g.tuna.tx = -1000;
      run(g, 10);
      return { count: g.bubbles.length, speed: g.bubbles.reduce((a, b) => a + b.speed, 0) / g.bubbles.length };
    };
    const early = rising(0);
    const late = rising(DODGE_SETTINGS.roundSeconds - 12);
    expect(late.speed).toBeGreaterThan(early.speed * 1.5);
    expect(late.count).toBeGreaterThanOrEqual(early.count - 2);
  });

  it('keeps the tuna on screen and below the buttons, wherever her finger goes', () => {
    const g = createGame(390, 800, 100, seeded(11));
    moveBy(g, -5000, -5000);
    run(g, 2);
    expect(g.tuna.x).toBeGreaterThan(DODGE_SETTINGS.tunaRx);
    expect(g.tuna.y).toBeGreaterThan(100 + DODGE_SETTINGS.tunaRy);
    moveBy(g, 5000, 5000);
    run(g, 2);
    expect(g.tuna.x).toBeLessThan(390 - DODGE_SETTINGS.tunaRx);
    expect(g.tuna.y).toBeLessThan(800 - DODGE_SETTINGS.tunaRy);
  });

  it('gets harder through the round, with all three kinds of hook by the end', () => {
    const g = createGame(390, 800, 60, seeded(13));
    const kinds = new Set<string>();
    const seen = new Set<object>();
    let early = 0;
    let late = 0;
    // Never nicked, so the ease after a nick doesn't blur the curve.
    run(g, DODGE_SETTINGS.roundSeconds - 1, (g) => {
      g.tuna.safe = 1;
      for (const h of g.hooks) {
        if (seen.has(h)) continue;
        seen.add(h);
        kinds.add(h.kind);
        if (g.time < 30) early++;
        if (g.time > DODGE_SETTINGS.roundSeconds - 31) late++;
      }
    });
    expect(late).toBeGreaterThan(early * 2);
    expect([...kinds].sort()).toEqual(['drop', 'swing', 'troll']);
  });
});
