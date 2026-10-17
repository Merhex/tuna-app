import { describe, expect, it } from 'vitest';
import { createGame, difficulty, marked, pick, picksLeft, step, TRACK_SETTINGS, type Game } from './track';

/** A seeded random, so the same school swims every run. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const S = TRACK_SETTINGS;
const run = (g: Game, seconds: number, each?: (g: Game) => void) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    step(g, 1 / 60);
    each?.(g);
  }
};
/** Runs until the school stops for her to pick. */
const toPick = (g: Game) => {
  for (let i = 0; i < 60 * 30 && g.phase !== 'pick'; i++) step(g, 1 / 60);
};
const targetsOf = (g: Game) => g.fish.flatMap((f, i) => (f.target ? [i] : []));
const othersOf = (g: Game) => g.fish.flatMap((f, i) => (f.target ? [] : [i]));
const tap = (g: Game, i: number) => pick(g, g.fish[i].x, g.fish[i].y);
/** Answers the trial with `right` targets and the rest wrong. */
function answer(g: Game, right: number) {
  toPick(g);
  const n = g.targets;
  for (const i of targetsOf(g).slice(0, right)) tap(g, i);
  for (const i of othersOf(g).slice(0, n - right)) tap(g, i);
}

describe('school tracker: the trial', () => {
  it('goes show → track → pick → reveal, with the set durations', () => {
    const g = createGame(390, 800, 70, seeded(1));
    const phases: [string, number][] = [];
    let last = g.phase;
    phases.push([last, 0]);
    for (let i = 0; i < 60 * 40 && phases.length < 4; i++) {
      step(g, 1 / 60);
      if (g.phase !== last) {
        last = g.phase;
        phases.push([last, g.time]);
      }
      // Picking waits for her: answer after three seconds of waiting.
      if (g.phase === 'pick' && g.t > 3) answer(g, 3);
    }
    expect(phases.map(([p]) => p)).toEqual(['show', 'track', 'pick', 'reveal']);
    expect(phases[1][1]).toBeCloseTo(S.showSeconds, 1);
    expect(phases[2][1]).toBeCloseTo(S.showSeconds + S.trackSeconds, 1);
    run(g, S.revealSeconds + 0.05);
    expect(g.phase).toBe('show');
  });

  it('marks the targets only while showing them and in the answer', () => {
    const g = createGame(390, 800, 70, seeded(2));
    const seen = new Map<string, boolean>();
    for (let i = 0; i < 60 * 30; i++) {
      seen.set(g.phase, marked(g));
      if (g.phase === 'pick') answer(g, 2);
      step(g, 1 / 60);
    }
    expect(Object.fromEntries(seen)).toEqual({ show: true, track: false, pick: false, reveal: true });
  });

  it('waits for her during picking, with no timer', () => {
    const g = createGame(390, 800, 70, seeded(3));
    toPick(g);
    const where = g.fish.map((f) => [f.x, f.y]);
    run(g, 60);
    expect(g.phase).toBe('pick');
    expect(g.fish.map((f) => [f.x, f.y])).toEqual(where);
  });

  it('ignores taps while the school swims', () => {
    const g = createGame(390, 800, 70, seeded(4));
    run(g, S.showSeconds + 1);
    expect(g.phase).toBe('track');
    tap(g, 0);
    expect(g.selected).toEqual([]);
  });

  it('picking toggles, stops at the number of targets, answers itself and scores it', () => {
    const g = createGame(390, 800, 70, seeded(5));
    toPick(g);
    const [t1, t2, t3] = targetsOf(g);
    const [o1] = othersOf(g);
    expect(picksLeft(g)).toBe(3);
    tap(g, t1);
    tap(g, t1);
    expect(g.selected).toEqual([]);
    tap(g, t1);
    tap(g, o1);
    expect(picksLeft(g)).toBe(1);
    expect(g.phase).toBe('pick');
    // A tap on empty water picks nothing.
    pick(g, -100, -100);
    expect(g.selected).toHaveLength(2);
    tap(g, t2);
    expect(g.phase).toBe('reveal');
    expect(g.last).toEqual({ targets: 3, correct: 2 });
    expect(g.score).toEqual({ trials: 1, correct: 2, targets: 3 });
    expect(g.events).toContainEqual({ type: 'right', n: 2 });
    expect(g.events).toContainEqual({ type: 'wrong', n: 1 });
    // No more picks once answered.
    tap(g, t3);
    expect(g.selected).toHaveLength(3);
  });

  it('picks with a thumb-sized reach', () => {
    const g = createGame(390, 800, 70, seeded(6));
    toPick(g);
    const f = g.fish[0];
    pick(g, f.x + 26, f.y);
    expect(g.selected).toEqual([0]);
  });
});

describe('school tracker: the school', () => {
  it('keeps every fish in the play area and apart, over a long run', () => {
    const g = createGame(375, 667, 70, seeded(7));
    let closest = Infinity;
    for (let trial = 0; trial < 8; trial++) {
      toPick(g);
      answer(g, g.targets);
      g.level = S.maxLevel;
      run(g, S.revealSeconds + 0.05);
      run(g, S.showSeconds + S.trackSeconds - 0.1, (g) => {
        for (const f of g.fish) {
          expect(f.x).toBeGreaterThanOrEqual(S.fishRadius);
          expect(f.x).toBeLessThanOrEqual(375 - S.fishRadius);
          expect(f.y).toBeGreaterThanOrEqual(70 + S.fishRadius);
          expect(f.y).toBeLessThanOrEqual(667 - S.fishRadius);
        }
        for (let i = 0; i < g.fish.length; i++)
          for (let j = i + 1; j < g.fish.length; j++)
            closest = Math.min(closest, Math.hypot(g.fish[i].x - g.fish[j].x, g.fish[i].y - g.fish[j].y));
      });
    }
    expect(g.fish).toHaveLength(S.maxFish);
    expect(closest).toBeGreaterThan(S.minGap * 0.9);
  });

  it('is the same trial for the same seed', () => {
    const play = () => {
      const g = createGame(390, 800, 70, seeded(8));
      toPick(g);
      return { fish: g.fish.map((f) => [f.x.toFixed(3), f.y.toFixed(3), f.target]) };
    };
    expect(play()).toEqual(play());
  });

  it('treats a huge step like a short one', () => {
    const g = createGame(390, 800, 70, seeded(9));
    step(g, 30);
    expect(g.time).toBeCloseTo(S.maxDt);
    expect(g.phase).toBe('show');
  });
});

describe('school tracker: difficulty', () => {
  it('starts easy and alternates more targets and more speed, clamped at both ends', () => {
    expect(difficulty(0)).toEqual({ targets: 3, speed: S.startSpeed, fish: 8 });
    expect(difficulty(1).targets).toBe(4);
    expect(difficulty(2)).toMatchObject({ targets: 4, speed: S.startSpeed + S.speedStep });
    expect(difficulty(3).targets).toBe(5);
    expect(difficulty(9).targets).toBe(5);
    expect(difficulty(-3)).toEqual(difficulty(0));
    expect(difficulty(99)).toEqual(difficulty(S.maxLevel));
    expect(difficulty(S.maxLevel).fish).toBeLessThanOrEqual(S.maxFish);
  });

  it('goes up after a perfect trial, down after two misses, and stays after one', () => {
    const g = createGame(390, 800, 70, seeded(10));
    answer(g, 3);
    expect(g.level).toBe(1);
    run(g, S.revealSeconds + 0.05);
    answer(g, 4);
    expect(g.level).toBe(2);
    run(g, S.revealSeconds + 0.05);
    answer(g, 3);
    expect(g.level).toBe(2);
    run(g, S.revealSeconds + 0.05);
    answer(g, 2);
    expect(g.level).toBe(1);
    run(g, S.revealSeconds + 0.05);
    answer(g, 0);
    expect(g.level).toBe(0);
    run(g, S.revealSeconds + 0.05);
    answer(g, 0);
    expect(g.level).toBe(0);
    // The next trial has the level's number of fish and targets.
    run(g, S.revealSeconds + 0.05);
    expect(targetsOf(g)).toHaveLength(3);
    expect(g.fish).toHaveLength(8);
  });

  it('ends after the trial that crosses the round\'s length, and counts only answered trials', () => {
    const g = createGame(390, 800, 70, seeded(11));
    let trials = 0;
    for (let i = 0; i < 60 * 400 && !g.over; i++) {
      step(g, 1 / 60);
      if (g.phase === 'pick' && g.t > 2) {
        answer(g, 2);
        trials++;
      }
    }
    expect(g.over).toBe(true);
    expect(g.time).toBeGreaterThanOrEqual(S.roundSeconds);
    expect(g.time).toBeLessThan(S.roundSeconds + S.showSeconds + S.trackSeconds + S.revealSeconds + 3);
    expect(g.score.trials).toBe(trials);
    expect(trials).toBeGreaterThanOrEqual(8);
    // About ten: quick answers fit a couple more.
    expect(trials).toBeLessThanOrEqual(12);
    // Leaving mid-trial counts only what she answered.
    const h = createGame(390, 800, 70, seeded(12));
    answer(h, 3);
    run(h, S.revealSeconds + S.showSeconds + 1);
    expect(h.score).toEqual({ trials: 1, correct: 3, targets: 3 });
  });
});
