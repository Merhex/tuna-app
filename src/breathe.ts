/**
 * Bubbles: ride the wave (roadmap #1, prototype). Slow, paced breathing with the tuna: a big bubble
 * grows as she breathes in, stays still on a hold and shrinks as she breathes out. She can just watch,
 * or hold a finger down while breathing in and lift it to breathe out, and the tuna tells her when
 * she's right on the beat.
 *
 * Only the rules and timing live here; drawing, sound and touch are in components/Breathe.tsx.
 */

export type Phase = 'in' | 'hold' | 'out' | 'rest';
export type PatternId = 'box' | 'gentle';

export const BREATHE_SETTINGS = {
  /** Seconds of each step in one breath. Box has holds after breathing in (hold) and out (rest);
   *  gentle has none and a longer out-breath, for when holding feels like too much. */
  patterns: {
    box: [
      { phase: 'in', seconds: 4 },
      { phase: 'hold', seconds: 4 },
      { phase: 'out', seconds: 4 },
      { phase: 'rest', seconds: 4 },
    ],
    gentle: [
      { phase: 'in', seconds: 4 },
      { phase: 'out', seconds: 6 },
    ],
  } satisfies Record<PatternId, { phase: Phase; seconds: number }[]>,
  /** Breaths in a round: about two minutes either way. */
  breaths: { box: 8, gentle: 12 } satisfies Record<PatternId, number>,
  /** Seconds of "Ready?" before the first breath. */
  leadIn: 3,
  /** How far off the beat (seconds, either way) pressing and lifting her finger can be and still count. */
  beatTolerance: 0.9,
};

const S = BREATHE_SETTINGS;

export type BreatheEvent =
  | { type: 'phase'; phase: Phase; seconds: number }
  | { type: 'breath'; n: number }
  | { type: 'onBeat'; n: number }
  | { type: 'over' };

export interface Session {
  pattern: PatternId;
  /** Seconds since the start, lead-in included. */
  time: number;
  /** Breaths finished (the out-breath done), and how many of those her finger followed. */
  breaths: number;
  onBeat: number;
  /** Whether she has touched at all, so the summary only mentions the beat if she played along. */
  touched: boolean;
  pressed: boolean;
  /** When her finger went down and came up, for checking the beat. Old ones are dropped. */
  presses: number[];
  releases: number[];
  /** The next breath to check against her finger. */
  nextCheck: number;
  /** The step last announced, as an index into the whole round (-1: the lead-in). */
  announced: number;
  over: boolean;
  events: BreatheEvent[];
}

export function createSession(pattern: PatternId): Session {
  return {
    pattern,
    time: 0,
    breaths: 0,
    onBeat: 0,
    touched: false,
    pressed: false,
    presses: [],
    releases: [],
    nextCheck: 0,
    announced: -1,
    over: false,
    events: [],
  };
}

export const breathSeconds = (p: PatternId) => S.patterns[p].reduce((a, s) => a + s.seconds, 0);
export const roundSeconds = (p: PatternId) => S.leadIn + S.breaths[p] * breathSeconds(p);

/** When a step starts in breath `n`, in session time. */
function stepStart(p: PatternId, n: number, step: number) {
  let t = S.leadIn + n * breathSeconds(p);
  for (let i = 0; i < step; i++) t += S.patterns[p][i].seconds;
  return t;
}
const outIndex = (p: PatternId) => S.patterns[p].findIndex((s) => s.phase === 'out');

export interface Moment {
  phase: Phase | 'ready';
  /** Which breath (0-based), and which step of it. */
  breath: number;
  step: number;
  /** How far through the step, 0–1. */
  progress: number;
  /** Whole seconds left in the step, for the countdown: 4, 3, 2, 1. */
  count: number;
  /** How full the bubble is, 0 (out) to 1 (in), eased so it starts and ends each breath softly. */
  fill: number;
}

/** Where the round is at time `t`. Past the end, it stays on the last moment. */
export function momentAt(p: PatternId, t: number): Moment {
  const steps = S.patterns[p];
  if (t < S.leadIn) {
    return { phase: 'ready', breath: 0, step: 0, progress: t / S.leadIn, count: Math.ceil(S.leadIn - t), fill: 0 };
  }
  const total = S.breaths[p];
  const len = breathSeconds(p);
  let breath = Math.floor((t - S.leadIn) / len);
  let into = t - S.leadIn - breath * len;
  if (breath >= total) {
    breath = total - 1;
    into = len - 1e-9;
  }
  let step = 0;
  while (into >= steps[step].seconds && step < steps.length - 1) into -= steps[step++].seconds;
  const { phase, seconds } = steps[step];
  const progress = Math.min(1, into / seconds);
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
  const fill = phase === 'in' ? ease(progress) : phase === 'hold' ? 1 : phase === 'out' ? 1 - ease(progress) : 0;
  return { phase, breath, step, progress, count: Math.max(1, Math.ceil(seconds - into - 1e-9)), fill };
}

export function press(s: Session) {
  if (s.pressed || s.over) return;
  s.pressed = true;
  s.touched = true;
  s.presses.push(s.time);
}

export function release(s: Session) {
  if (!s.pressed) return;
  s.pressed = false;
  s.releases.push(s.time);
}

const near = (times: number[], at: number) => times.some((t) => Math.abs(t - at) <= S.beatTolerance);

export function step(s: Session, dt: number) {
  if (s.over) return;
  const p = s.pattern;
  s.time += Math.min(dt, 0.1);
  const steps = S.patterns[p];
  const total = S.breaths[p];
  const end = roundSeconds(p);

  // Announce each new step, so the sound and the words change with it.
  const m = momentAt(p, Math.min(s.time, end - 1e-6));
  const index = m.phase === 'ready' ? -1 : m.breath * steps.length + m.step;
  while (s.announced < index) {
    s.announced++;
    const at = steps[s.announced % steps.length];
    // A breath is done once its out-breath is.
    if (s.announced > 0 && steps[(s.announced - 1) % steps.length].phase === 'out') {
      s.breaths++;
      s.events.push({ type: 'breath', n: s.breaths });
    }
    s.events.push({ type: 'phase', phase: at.phase, seconds: at.seconds });
  }

  // Did her finger go down as the breath in started, and come up as the breath out started?
  // Checked once the chance to lift has passed.
  while (s.nextCheck < total && s.time > stepStart(p, s.nextCheck, outIndex(p)) + S.beatTolerance) {
    const n = s.nextCheck++;
    if (near(s.presses, stepStart(p, n, 0)) && near(s.releases, stepStart(p, n, outIndex(p)))) {
      s.onBeat++;
      s.events.push({ type: 'onBeat', n: s.onBeat });
    }
    const keepFrom = stepStart(p, n + 1, 0) - S.beatTolerance;
    s.presses = s.presses.filter((t) => t >= keepFrom);
    s.releases = s.releases.filter((t) => t >= keepFrom);
  }

  if (s.time >= end) {
    // The last out-breath (or rest) has finished.
    if (s.breaths < total) {
      s.breaths = total;
      s.events.push({ type: 'breath', n: total });
    }
    s.over = true;
    s.events.push({ type: 'over' });
  }
}
