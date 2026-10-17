import { describe, expect, it } from 'vitest';
import { counts, createGame, phaseKind, phaseLeft, phaseStart, ROUND_SECONDS, RUN_SETTINGS, setGuided, step, type Game } from './run';

const S = RUN_SETTINGS;
const play = (g: Game, seconds: number, intensity: number | ((g: Game, i: number) => number) = 0) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) step(g, 1 / 60, typeof intensity === 'number' ? intensity : intensity(g, i));
};
/** Plays to the start of phase `i`. */
const toPhase = (g: Game, i: number, intensity = 0) => {
  while (g.phase < i && !g.over) step(g, 1 / 60, intensity);
};

describe('current run: the plan', () => {
  it('goes through the phases in order, with their lengths, and ends at the total', () => {
    const g = createGame();
    const seen: { kind: string; at: number }[] = [{ kind: phaseKind(g), at: 0 }];
    while (!g.over) {
      const was = g.phase;
      step(g, 1 / 60, 0.7);
      if (g.phase !== was) seen.push({ kind: phaseKind(g), at: g.time });
    }
    expect(seen.map((p) => p.kind)).toEqual(S.plan.map((p) => p.kind));
    seen.forEach((p, i) => expect(p.at).toBeCloseTo(phaseStart(i), 1));
    expect(g.time).toBe(ROUND_SECONDS);
    expect(ROUND_SECONDS).toBeGreaterThanOrEqual(270);
    expect(ROUND_SECONDS).toBeLessThanOrEqual(330);
  });

  it('counts down each phase', () => {
    const g = createGame();
    play(g, 10);
    expect(phaseLeft(g)).toBeCloseTo(S.plan[0].seconds - 10, 1);
  });

  it('tells the screen when a swim starts and ends, and when the round is over', () => {
    const g = createGame();
    const events: string[] = [];
    while (!g.over) {
      step(g, 1 / 60, 0);
      events.push(...g.events.map((e) => e.type));
      g.events.length = 0;
    }
    const swims = S.plan.filter((p) => p.kind === 'swim').length;
    expect(events.filter((e) => e === 'swim')).toHaveLength(swims);
    expect(events.filter((e) => e === 'drift')).toHaveLength(swims);
    expect(events[events.length - 1]).toBe('over');
  });
});

describe('current run: the current', () => {
  it('carries the tuna upstream through every swim when she keeps moving', () => {
    const g = createGame();
    S.plan.forEach((p, i) => {
      if (p.kind !== 'swim') return;
      toPhase(g, i, 1);
      const start = g.distance;
      toPhase(g, i + 1, 1);
      expect(g.distance).toBeGreaterThan(start + 10);
    });
  });

  it('lets it drift back when she stops in a swim, but never past where it began', () => {
    const g = createGame();
    const swim = S.plan.findIndex((p) => p.kind === 'swim');
    toPhase(g, swim, 1);
    play(g, 20, 1);
    const ahead = g.distance;
    play(g, 5, 0);
    expect(g.distance).toBeLessThan(ahead);
    play(g, 200, 0);
    expect(g.distance).toBeGreaterThanOrEqual(0);
  });

  it('never pushes back in the easy phases', () => {
    const g = createGame();
    play(g, 10, 1);
    const d = g.distance;
    play(g, 10, 0);
    expect(g.distance).toBeGreaterThanOrEqual(d);
    expect(phaseKind(g)).toBe('warm');
  });

  it('moves smoothly when her movement flickers', () => {
    const g = createGame();
    toPhase(g, 1, 1);
    let jump = 0;
    let last = g.speed;
    play(g, 10, (_, i) => (i % 2 ? 1 : 0));
    for (let i = 0; i < 600; i++) {
      step(g, 1 / 60, i % 2 ? 1 : 0);
      jump = Math.max(jump, Math.abs(g.speed - last));
      last = g.speed;
    }
    expect(jump).toBeLessThan(0.05);
  });

  it('gives nothing extra past brisk', () => {
    const a = createGame();
    const b = createGame();
    play(a, 100, 1);
    play(b, 100, 5);
    expect(b.distance).toBeCloseTo(a.distance, 6);
  });
});

describe('current run: the score', () => {
  it("doesn't count a round left within the first minute", () => {
    const g = createGame();
    play(g, S.minSeconds - 1, 1);
    expect(counts(g)).toBe(false);
    play(g, 2, 1);
    expect(counts(g)).toBe(true);
  });

  it('counts the seconds she was moving briskly', () => {
    const g = createGame();
    play(g, 30, 1);
    play(g, 30, 0.2);
    expect(g.score.moved).toBeCloseTo(30, 0);
    expect(g.score.seconds).toBeCloseTo(60, 0);
    expect(g.score.sensed).toBe(true);
  });

  it('runs the same plan in guided mode without any movement, trusting her through the swims', () => {
    const g = createGame(true);
    while (!g.over) step(g, 1 / 60);
    const swimSeconds = S.plan.filter((p) => p.kind === 'swim').reduce((s, p) => s + p.seconds, 0);
    expect(g.score.moved).toBeCloseTo(swimSeconds, 0);
    expect(g.score.sensed).toBe(false);
    expect(g.distance).toBeGreaterThan(0);
  });

  it('can switch to guided part-way, when the sensor turns out to send nothing', () => {
    const g = createGame();
    play(g, 3, 0);
    setGuided(g);
    expect(g.score.sensed).toBe(false);
    toPhase(g, 1);
    play(g, 10);
    expect(g.speed).toBeGreaterThan(0);
  });

  it('is the same every time, and carries on where it was after a long pause', () => {
    const a = createGame();
    const b = createGame();
    play(a, 90, (_, i) => (i % 120) / 120);
    play(b, 90, (_, i) => (i % 120) / 120);
    expect(b).toEqual(a);
    const t = a.time;
    step(a, 600, 1);
    expect(a.time - t).toBeLessThanOrEqual(S.maxDt + 1e-9);
  });
});
