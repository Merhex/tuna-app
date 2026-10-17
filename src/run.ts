/**
 * Current Run (D58): the tuna swims up a river against the current, as fast as she moves. Short bouts
 * of brisk exercise are among the best-supported ways to ease a craving, during and for a little
 * while after (Taylor, Katomeri & Ussher 2007; Ussher et al., Cochrane 2019).
 *
 * About five minutes: an easy warm-up, four brisk swims with an easy drift between them, and an easy
 * cool-down. During a swim, moving pushes the tuna upstream and stopping lets the current carry it back,
 * slowly, and never past where the round began. Easy phases never push back. The round is timed, not a
 * race: there's no finish line to reach or miss (D38), and no fail.
 *
 * The same rules run whether the phone senses her (intensity from motion.ts) or not ("guided": no
 * sensor, or she said no, and the tuna just trusts her).
 *
 * Only the rules live here; drawing and touch are in components/Run.tsx.
 */

export type PhaseKind = 'warm' | 'swim' | 'drift' | 'cool';

export const RUN_SETTINGS = {
  /** The round, in order. Swims are brisk, the rest easy. */
  plan: [
    { kind: 'warm', seconds: 30 },
    { kind: 'swim', seconds: 45 },
    { kind: 'drift', seconds: 15 },
    { kind: 'swim', seconds: 45 },
    { kind: 'drift', seconds: 15 },
    { kind: 'swim', seconds: 45 },
    { kind: 'drift', seconds: 15 },
    { kind: 'swim', seconds: 45 },
    { kind: 'cool', seconds: 30 },
  ] as { kind: PhaseKind; seconds: number }[],
  /** Intensity (0–1) that counts as swimming: as moving, for the score, and as "catching the current". */
  swimThreshold: 0.5,
  /** Speeds in river lengths per second. A swim's top speed, and how fast the current pulls back. */
  swimSpeed: 1,
  currentSpeed: 0.3,
  /** Easy phases: a gentle swim if she moves, holding still if not. */
  easySpeed: 0.35,
  /** Seconds the tuna's speed takes to follow her, so the pauses between steps don't make it jerk. */
  inertiaSeconds: 0.8,
  /** In guided mode the tuna assumes this intensity in easy phases (swims are 1). */
  guidedEasy: 0.4,
  /** Fewer seconds than this in the round and it doesn't count as one: leaving is like never starting. */
  minSeconds: 60,
  /** While she's catching the current in a swim, a soft sound every this many seconds. */
  currentEvery: 5,
  /** The longest step, in seconds: after a pause the round carries on where it was. */
  maxDt: 0.05,
};

const S = RUN_SETTINGS;

export const ROUND_SECONDS = S.plan.reduce((sum, p) => sum + p.seconds, 0);

export type RunEvent = { type: 'swim' } | { type: 'drift' } | { type: 'current' } | { type: 'over' };

export interface RunScore {
  /** Seconds she stayed in the round. */
  seconds: number;
  /** Seconds she was moving at least briskly (sensed), or swim seconds she stayed for (guided). */
  moved: number;
  /** Whether the phone sensed her. A guided summary claims nothing about her effort. */
  sensed: boolean;
}

export interface Game {
  time: number;
  /** Index into the plan. */
  phase: number;
  /** How far upstream, in river lengths since the round began; never below 0. */
  distance: number;
  /** Current speed, river lengths per second; negative while the current carries it back. */
  speed: number;
  /** The intensity used on the last step. */
  intensity: number;
  guided: boolean;
  /** Seconds of catching the current since the last soft sound. */
  catching: number;
  score: RunScore;
  over: boolean;
  /** Things that happened this step, for sounds. The screen empties it. */
  events: RunEvent[];
}

export function createGame(guided = false): Game {
  return {
    time: 0,
    phase: 0,
    distance: 0,
    speed: 0,
    intensity: 0,
    guided,
    catching: 0,
    score: { seconds: 0, moved: 0, sensed: !guided },
    over: false,
    events: [],
  };
}

/** No usable sensor after all: carry on, trusting her. */
export function setGuided(g: Game) {
  g.guided = true;
  g.score.sensed = false;
}

export const phaseKind = (g: Game): PhaseKind => S.plan[g.phase].kind;

/** When phase `i` begins, in seconds from the start. */
export const phaseStart = (i: number) => S.plan.slice(0, i).reduce((sum, p) => sum + p.seconds, 0);

/** Seconds left in the current phase. */
export const phaseLeft = (g: Game) => Math.max(0, phaseStart(g.phase) + S.plan[g.phase].seconds - g.time);

/** Whether the round has been long enough to count. */
export const counts = (g: Game) => g.score.seconds >= S.minSeconds;

/** How hard the tuna swims at `intensity`: up against the current in a swim, never back in an easy phase. */
export function targetSpeed(kind: PhaseKind, intensity: number) {
  if (kind === 'swim') return intensity * S.swimSpeed - (1 - intensity) * S.currentSpeed;
  return intensity * S.easySpeed;
}

/** One step of `dt` seconds. `intensity` (0–1) is how hard she's moving; ignored in guided mode. */
export function step(g: Game, dt: number, intensity = 0) {
  if (g.over || dt <= 0) return;
  dt = Math.min(dt, S.maxDt);
  const kind = phaseKind(g);
  const i = g.guided ? (kind === 'swim' ? 1 : S.guidedEasy) : Math.min(1, Math.max(0, intensity));
  g.intensity = i;

  g.speed += (targetSpeed(kind, i) - g.speed) * (1 - Math.exp(-dt / S.inertiaSeconds));
  g.distance = Math.max(0, g.distance + g.speed * dt);

  g.time += dt;
  g.score.seconds = g.time;
  const brisk = g.guided ? kind === 'swim' : i >= S.swimThreshold;
  if (brisk) g.score.moved += dt;

  if (kind === 'swim' && i >= S.swimThreshold) {
    g.catching += dt;
    if (g.catching >= S.currentEvery) {
      g.catching = 0;
      g.events.push({ type: 'current' });
    }
  } else g.catching = 0;

  // Into the next phase.
  while (g.phase < S.plan.length - 1 && g.time >= phaseStart(g.phase + 1)) {
    const was = phaseKind(g);
    g.phase++;
    const now = phaseKind(g);
    if (now === 'swim') g.events.push({ type: 'swim' });
    else if (was === 'swim') g.events.push({ type: 'drift' });
  }

  if (g.time >= ROUND_SECONDS) {
    g.time = ROUND_SECONDS;
    g.score.seconds = ROUND_SECONDS;
    g.over = true;
    g.events.push({ type: 'over' });
  }
}
