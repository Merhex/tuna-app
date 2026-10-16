/**
 * Bubbles (D54): slow breathing with the tuna, in for 4 and out for 6. A big bubble grows
 * as she breathes in and shrinks as she breathes out, while a dot goes up one half of a circle and down
 * the other. She can just watch, or hold a finger down while breathing in and lift it to breathe out,
 * and the tuna tells her when she's right on the beat.
 *
 * Only the rules and timing live here; drawing, sound and touch are in components/Breathe.tsx.
 */

export type Phase = 'in' | 'out';

export const BREATHE_SETTINGS = {
  /** Seconds of each half of a breath. No holds: the box pattern's holds were confusing in testing. */
  steps: [
    { phase: 'in', seconds: 4 },
    { phase: 'out', seconds: 6 },
  ] satisfies { phase: Phase; seconds: number }[],
  /** Breaths in a round: about two minutes. */
  breaths: 12,
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

export type BreatheResult = Pick<Session, 'breaths' | 'onBeat' | 'touched'>;

export function createSession(): Session {
  return {
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

export const BREATH_SECONDS = S.steps.reduce((a, s) => a + s.seconds, 0);
export const ROUND_SECONDS = S.leadIn + S.breaths * BREATH_SECONDS;

/** When breath `n` starts breathing in, and breathing out, in session time. */
const inStart = (n: number) => S.leadIn + n * BREATH_SECONDS;
const outStart = (n: number) => inStart(n) + S.steps[0].seconds;

export interface Moment {
  phase: Phase | 'ready';
  /** Which breath (0-based), and which step of it (0: in, 1: out). */
  breath: number;
  step: number;
  /** How far through the step, 0–1. */
  progress: number;
  /** Whole seconds left in the step, for the countdown: 6, 5, 4, 3, 2, 1. */
  count: number;
  /** How full the bubble is, 0 (out) to 1 (in), eased so it starts and ends each breath softly. */
  fill: number;
}

/** Where the round is at time `t`. Past the end, it stays on the last moment. */
export function momentAt(t: number): Moment {
  if (t < S.leadIn) {
    return { phase: 'ready', breath: 0, step: 0, progress: t / S.leadIn, count: Math.ceil(S.leadIn - t), fill: 0 };
  }
  let breath = Math.floor((t - S.leadIn) / BREATH_SECONDS);
  let into = t - S.leadIn - breath * BREATH_SECONDS;
  if (breath >= S.breaths) {
    breath = S.breaths - 1;
    into = BREATH_SECONDS - 1e-9;
  }
  const step = into < S.steps[0].seconds ? 0 : 1;
  if (step === 1) into -= S.steps[0].seconds;
  const { phase, seconds } = S.steps[step];
  const progress = Math.min(1, into / seconds);
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
  const fill = phase === 'in' ? ease(progress) : 1 - ease(progress);
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
  s.time += Math.min(dt, 0.1);

  // Announce each new step, so the sound and the words change with it. A breath is done once its
  // out-breath is, which is when the next one starts breathing in.
  const m = momentAt(Math.min(s.time, ROUND_SECONDS - 1e-6));
  const index = m.phase === 'ready' ? -1 : m.breath * S.steps.length + m.step;
  while (s.announced < index) {
    s.announced++;
    const at = S.steps[s.announced % S.steps.length];
    if (s.announced > 0 && at.phase === 'in') {
      s.breaths++;
      s.events.push({ type: 'breath', n: s.breaths });
    }
    s.events.push({ type: 'phase', phase: at.phase, seconds: at.seconds });
  }

  // Did her finger go down as the breath in started, and come up as the breath out started?
  // Checked once the chance to lift has passed.
  while (s.nextCheck < S.breaths && s.time > outStart(s.nextCheck) + S.beatTolerance) {
    const n = s.nextCheck++;
    if (near(s.presses, inStart(n)) && near(s.releases, outStart(n))) {
      s.onBeat++;
      s.events.push({ type: 'onBeat', n: s.onBeat });
    }
    const keepFrom = inStart(n + 1) - S.beatTolerance;
    s.presses = s.presses.filter((t) => t >= keepFrom);
    s.releases = s.releases.filter((t) => t >= keepFrom);
  }

  if (s.time >= ROUND_SECONDS) {
    // The last out-breath has finished.
    s.breaths = S.breaths;
    s.events.push({ type: 'breath', n: S.breaths });
    s.over = true;
    s.events.push({ type: 'over' });
  }
}
