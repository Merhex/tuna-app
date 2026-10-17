/**
 * School Tracker: a multiple-object-tracking task (Pylyshyn & Storm 1988). A few tuna in a moving
 * school are marked in gold, the marks go, the school keeps swimming, and when it stops she picks the
 * ones she followed. It loads visual attention and working memory, the same kind of visual-spatial
 * work as the falling-block game. The direct evidence that this task eases cravings is thinner than
 * for Tetris; the case rests on the same mechanism (a visual load competing with craving imagery),
 * so the app makes no health claim about it.
 *
 * Each trial goes show → track → pick → reveal. Difficulty adapts gently both ways, so it stays a
 * little hard whatever her skill, and lives only inside the round: nothing about it is kept (D11, D38).
 *
 * Only the rules live here; drawing and touch are in components/Track.tsx. Sizes are in CSS pixels.
 */

export const TRACK_SETTINGS = {
  roundSeconds: 150,
  /** Seconds the targets are marked, the school swims unmarked, and the answer shows. Picking waits for her. */
  showSeconds: 2,
  trackSeconds: 8,
  revealSeconds: 1.5,
  /** Level 0, the easiest. Levels never go below it. */
  startFish: 8,
  startTargets: 3,
  maxTargets: 5,
  maxFish: 12,
  /** Swimming speed in px/s at level 0, and what each speed notch adds. */
  startSpeed: 55,
  speedStep: 12,
  maxLevel: 10,
  /** A fish's size for walls and spacing, and how far from one a tap still picks it (thumb-sized). */
  fishRadius: 18,
  hitRadius: 32,
  /** Fish steer away from each other inside this distance, and are never let closer than minGap. */
  spacing: 70,
  minGap: 34,
  /** How much a heading wanders, in radians per second. */
  wander: 1.4,
  /** The longest step, in seconds: after a pause the round carries on where it was. */
  maxDt: 0.05,
};

const S = TRACK_SETTINGS;

export type Phase = 'show' | 'track' | 'pick' | 'reveal';

export interface Fish {
  x: number;
  y: number;
  heading: number;
  /** Each fish's own pace, around the level's speed. */
  pace: number;
  target: boolean;
}

export interface TrialResult {
  targets: number;
  correct: number;
}

export interface TrackScore {
  /** Trials she answered. One or more means she played. */
  trials: number;
  /** Targets found, and targets there were, over all answered trials. */
  correct: number;
  targets: number;
}

export type TrackEvent =
  | { type: 'select'; index: number; on: boolean }
  | { type: 'right'; n: number }
  | { type: 'wrong'; n: number }
  | { type: 'trial'; result: TrialResult }
  | { type: 'phase'; phase: Phase }
  | { type: 'over' };

export interface Game {
  w: number;
  h: number;
  /** The school stays below this line, clear of the top bar. */
  top: number;
  time: number;
  phase: Phase;
  /** Seconds in the current phase. */
  t: number;
  level: number;
  /** How many targets this trial has. */
  targets: number;
  fish: Fish[];
  /** Fish she has picked this trial, by index. */
  selected: number[];
  /** The trial just answered, for the reveal. */
  last: TrialResult | null;
  score: TrackScore;
  /** Speeds are multiplied by this ("Less motion" swims slower). */
  speedScale: number;
  over: boolean;
  /** Things that happened this step, for sounds. The screen empties it. */
  events: TrackEvent[];
  rng: () => number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const between = (rng: () => number, lo: number, hi: number) => lo + (hi - lo) * rng();

/** How hard a level is. Each notch alternates one more target (up to the most) and more speed. */
export function difficulty(level: number) {
  const lv = clamp(Math.round(level), 0, S.maxLevel);
  const targetSteps = Math.min(Math.ceil(lv / 2), S.maxTargets - S.startTargets);
  const speedSteps = lv - targetSteps;
  return {
    targets: S.startTargets + targetSteps,
    speed: S.startSpeed + speedSteps * S.speedStep,
    fish: Math.min(S.maxFish, S.startFish + targetSteps + Math.floor(speedSteps / 3)),
  };
}

/** Where a fish may be: inside the screen, below the top bar. */
const bounds = (g: Game) => ({
  x0: S.fishRadius + 4,
  x1: g.w - S.fishRadius - 4,
  y0: g.top + S.fishRadius + 4,
  y1: g.h - S.fishRadius - 8,
});

/** A spot well away from the other fish, if there is one. */
function freeSpot(g: Game, others: Fish[]) {
  const b = bounds(g);
  let best = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, d: -1 };
  for (let i = 0; i < 40; i++) {
    const x = between(g.rng, b.x0, b.x1);
    const y = between(g.rng, b.y0, b.y1);
    const d = Math.min(Infinity, ...others.map((f) => Math.hypot(f.x - x, f.y - y)));
    if (d > best.d) best = { x, y, d };
    if (d > S.spacing) break;
  }
  return best;
}

function newFish(g: Game, others: Fish[]): Fish {
  const { x, y } = freeSpot(g, others);
  return { x, y, heading: between(g.rng, 0, Math.PI * 2), pace: between(g.rng, 0.85, 1.15), target: false };
}

/** A new trial: the right number of fish for the level, fresh headings and new targets. */
function startTrial(g: Game) {
  const d = difficulty(g.level);
  while (g.fish.length > d.fish) g.fish.pop();
  while (g.fish.length < d.fish) g.fish.push(newFish(g, g.fish));
  for (const f of g.fish) {
    f.target = false;
    f.heading = between(g.rng, 0, Math.PI * 2);
  }
  // Targets picked at random, without repeats.
  const order = g.fish.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(g.rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i of order.slice(0, d.targets)) g.fish[i].target = true;
  g.targets = d.targets;
  g.selected = [];
  g.last = null;
  setPhase(g, 'show');
}

function setPhase(g: Game, phase: Phase) {
  g.phase = phase;
  g.t = 0;
  g.events.push({ type: 'phase', phase });
}

export function createGame(
  w: number,
  h: number,
  top: number,
  rng: () => number = Math.random,
  speedScale = 1,
): Game {
  const g: Game = {
    w,
    h,
    top,
    time: 0,
    phase: 'show',
    t: 0,
    level: 0,
    targets: 0,
    fish: [],
    selected: [],
    last: null,
    score: { trials: 0, correct: 0, targets: 0 },
    speedScale,
    over: false,
    events: [],
    rng,
  };
  startTrial(g);
  g.events.length = 0;
  return g;
}

export function resize(g: Game, w: number, h: number, top: number) {
  g.w = w;
  g.h = h;
  g.top = top;
  const b = bounds(g);
  for (const f of g.fish) {
    f.x = clamp(f.x, b.x0, b.x1);
    f.y = clamp(f.y, b.y0, b.y1);
  }
}

/** The fish marked in gold right now: the targets while they're shown, and again in the answer. */
export const marked = (g: Game) => g.phase === 'show' || g.phase === 'reveal';

/** How many more she can pick this trial. */
export const picksLeft = (g: Game) => (g.phase === 'pick' ? g.targets - g.selected.length : 0);

/**
 * A tap at (x, y) while the school is stopped: picks the nearest fish within reach, or unpicks it.
 * Once she has picked as many as there are targets, the trial is answered.
 */
export function pick(g: Game, x: number, y: number) {
  if (g.over || g.phase !== 'pick') return;
  let best = -1;
  let bestD = S.hitRadius;
  g.fish.forEach((f, i) => {
    const d = Math.hypot(f.x - x, f.y - y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  if (best < 0) return;
  const at = g.selected.indexOf(best);
  if (at >= 0) {
    g.selected.splice(at, 1);
    g.events.push({ type: 'select', index: best, on: false });
    return;
  }
  g.selected.push(best);
  g.events.push({ type: 'select', index: best, on: true });
  if (g.selected.length >= g.targets) answer(g, g.targets);
}

function answer(g: Game, targets: number) {
  const correct = g.selected.filter((i) => g.fish[i].target).length;
  const result = { targets, correct };
  g.last = result;
  g.score.trials++;
  g.score.correct += correct;
  g.score.targets += targets;
  if (correct) g.events.push({ type: 'right', n: correct });
  if (correct < targets) g.events.push({ type: 'wrong', n: targets - correct });
  g.events.push({ type: 'trial', result });
  // All found: a notch harder. Two or more missed: a notch easier. One missed: the same again.
  if (correct === targets) g.level = Math.min(S.maxLevel, g.level + 1);
  else if (targets - correct >= 2) g.level = Math.max(0, g.level - 1);
  setPhase(g, 'reveal');
}

/** The school swims: each fish wanders a little, steers clear of the others and bounces off walls. */
function swim(g: Game, dt: number) {
  const speed = difficulty(g.level).speed * g.speedScale;
  const b = bounds(g);
  const fish = g.fish;
  for (const f of fish) {
    f.heading += (g.rng() - 0.5) * 2 * S.wander * dt;
    // Steer away from close neighbours, so targets don't hide on top of others for long.
    let px = 0;
    let py = 0;
    for (const o of fish) {
      if (o === f) continue;
      const dx = f.x - o.x;
      const dy = f.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < S.spacing) {
        const k = (S.spacing - d) / S.spacing;
        px += (dx / d) * k;
        py += (dy / d) * k;
      }
    }
    if (px || py) {
      const want = Math.atan2(py, px);
      let diff = want - f.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      f.heading += diff * Math.min(1, 3 * Math.hypot(px, py) * dt);
    }
    f.x += Math.cos(f.heading) * speed * f.pace * dt;
    f.y += Math.sin(f.heading) * speed * f.pace * dt;
    if (f.x < b.x0 || f.x > b.x1) {
      f.x = clamp(f.x, b.x0, b.x1);
      f.heading = Math.PI - f.heading;
    }
    if (f.y < b.y0 || f.y > b.y1) {
      f.y = clamp(f.y, b.y0, b.y1);
      f.heading = -f.heading;
    }
  }
  separate(g);
}

/** Never let two fish sit closer than minGap: push each pair apart, then keep them on screen. */
function separate(g: Game) {
  const b = bounds(g);
  const fish = g.fish;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < fish.length; i++) {
      for (let j = i + 1; j < fish.length; j++) {
        const a = fish[i];
        const c = fish[j];
        let dx = c.x - a.x;
        let dy = c.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= S.minGap) continue;
        if (d === 0) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (S.minGap - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        c.x += (dx / d) * push;
        c.y += (dy / d) * push;
      }
    }
    for (const f of fish) {
      f.x = clamp(f.x, b.x0, b.x1);
      f.y = clamp(f.y, b.y0, b.y1);
    }
  }
}

export function step(g: Game, dt: number) {
  if (g.over || dt <= 0) return;
  dt = Math.min(dt, S.maxDt);
  g.time += dt;
  g.t += dt;
  if (g.phase === 'show') {
    if (g.t >= S.showSeconds) setPhase(g, 'track');
  } else if (g.phase === 'track') {
    swim(g, dt);
    if (g.t >= S.trackSeconds) setPhase(g, 'pick');
  } else if (g.phase === 'reveal' && g.t >= S.revealSeconds) {
    // The round ends after the trial that crosses its length.
    if (g.time >= S.roundSeconds) {
      g.over = true;
      g.events.push({ type: 'over' });
    } else startTrial(g);
  }
}
