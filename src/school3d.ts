/**
 * The home screen's 3D tank (D55): one swimming tuna for every hook she has beaten, her milestone
 * decorations (D43) on the sand, the tuna she pets in front, and the treasure chest in the middle
 * (D56). "Visit my school" pulls the camera back to show the whole place; the treasure screen swims
 * it down to the chest.
 *
 * Only the rules live here: how many tuna, where they swim, where the camera sits, where each
 * decoration goes, where the big tuna is and how the chest fits the treasure screen. Drawing is in src/tank/ (three.js, loaded after the
 * home screen shows), the canvas in components/TankLayer.tsx and the screen in components/Home.tsx.
 * Distances are in scene units: a tuna of the school is about 0.7 long, and the sand is the plane
 * y = 0 with the middle of the tank at x = z = 0.
 */

export const SCHOOL3D_SETTINGS = {
  /** Most tuna drawn at once. Past this the counter still shows her real number. */
  maxTuna: 200,
  /** Tuna per little group swimming together. */
  groupSize: 8,
  /** Seconds the camera takes to pull back, or to swim back in. */
  glideSeconds: 1.8,
  /** Seconds the camera takes to swim down to the treasure chest (D56), or back up from it. */
  chestGlideSeconds: 1.6,
  /** How wide the view is across the screen, in degrees. A tall phone gets a taller view to match. */
  sideways: 46,
  /** The view is never shorter or taller than this, in degrees. */
  fovMin: 48,
  fovMax: 82,
  /** In the wide view, the camera drifts round the tank this fast (radians a second) when left alone. */
  drift: 0.035,
  /** Seconds after the last drag before the drift starts again. */
  driftAfter: 4,
  /** Radians the camera turns per screen width dragged. */
  dragTurn: 2.4,
};

/** How many tuna to draw for a school of this size. */
export const shownTuna = (school: number) => Math.max(0, Math.min(Math.floor(school), SCHOOL3D_SETTINGS.maxTuna));

/**
 * Where the tuna swim: round the middle, between these distances from it and these heights. These
 * are the furthest makeLanes can reach; decorations stay outside it (or below it) so no tuna swims
 * through one.
 */
export const SWIM_BAND = { inner: 0.65, outer: 4.95, low: 0.58, high: 5.32 };

/** One tuna's path: a slow lap round the tank, rising and falling a little, with its group. */
export interface Lane {
  /** Distance from the middle and height of the lap, before the wobble. */
  radius: number;
  height: number;
  /** Radians a second round the tank (always the same way, so the school doesn't crash into itself). */
  speed: number;
  /** Where on the lap it starts, in radians. */
  start: number;
  /** The group's slow drift in and out and up and down, shared by the group. */
  groupWobble: Wobble;
  /** Its own little wobble inside the group. */
  ownWobble: Wobble;
  /** Body length, in scene units. */
  size: number;
  /** Tail beats a second, and where in the beat it starts. */
  beat: number;
  beatPhase: number;
}

export interface Wobble {
  /** How far in and out, and up and down. */
  r: number;
  y: number;
  /** How fast, in radians a second, and where it starts. */
  rSpeed: number;
  ySpeed: number;
  rPhase: number;
  yPhase: number;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  /** Which way it faces, round the vertical axis, in radians (0 faces +x). */
  yaw: number;
  /** Nose up (positive) or down, in radians. */
  pitch: number;
}

/** A small seeded random (mulberry32), so the same school swims the same way every visit. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The lanes for `n` tuna, in groups of about eight. The first lanes never change as the school
 * grows, so a new tuna joins without the others jumping to new places.
 */
export function makeLanes(n: number, seed = 7): Lane[] {
  const { groupSize } = SCHOOL3D_SETTINGS;
  const lanes: Lane[] = [];
  for (let g = 0; lanes.length < n; g++) {
    // One random stream per group, so a group's lanes don't depend on how many groups there are.
    const rand = seeded(seed * 1000 + g);
    const between = (a: number, b: number) => a + (b - a) * rand();
    const radius = between(1.9, 3.7);
    const height = between(1.6, 4.3);
    // About 0.6 units a second along the lap, a little faster or slower per group.
    const speed = between(0.5, 0.75) / radius;
    const start = between(0, Math.PI * 2);
    const groupWobble: Wobble = {
      r: between(0.25, 0.6),
      y: between(0.2, 0.5),
      rSpeed: between(0.08, 0.16),
      ySpeed: between(0.1, 0.22),
      rPhase: between(0, Math.PI * 2),
      yPhase: between(0, Math.PI * 2),
    };
    for (let i = 0; i < groupSize && lanes.length < n; i++) {
      lanes.push({
        radius: radius + between(-0.5, 0.5),
        height: height + between(-0.4, 0.4),
        speed: speed * between(0.99, 1.01),
        start: start + between(-0.9, 0.9) / radius,
        groupWobble,
        ownWobble: {
          r: between(0.05, 0.15),
          y: between(0.04, 0.12),
          rSpeed: between(0.3, 0.6),
          ySpeed: between(0.3, 0.7),
          rPhase: between(0, Math.PI * 2),
          yPhase: between(0, Math.PI * 2),
        },
        size: between(0.55, 0.85),
        beat: between(1.6, 2.4),
        beatPhase: between(0, Math.PI * 2),
      });
    }
  }
  return lanes;
}

function place(l: Lane, t: number) {
  const g = l.groupWobble;
  const o = l.ownWobble;
  const a = l.start + l.speed * t;
  const r = l.radius + g.r * Math.sin(g.rSpeed * t + g.rPhase) + o.r * Math.sin(o.rSpeed * t + o.rPhase);
  const y = l.height + g.y * Math.sin(g.ySpeed * t + g.yPhase) + o.y * Math.sin(o.ySpeed * t + o.yPhase);
  return { x: r * Math.cos(a), y, z: -r * Math.sin(a) };
}

/** Where a tuna is at time `t` (seconds), and which way it faces: along its path. */
export function swimPose(l: Lane, t: number): Pose {
  const p = place(l, t);
  const q = place(l, t + 0.05);
  const dx = q.x - p.x;
  const dz = q.z - p.z;
  return { ...p, yaw: Math.atan2(-dz, dx), pitch: Math.atan2(q.y - p.y, Math.hypot(dx, dz)) };
}

/**
 * Where the camera is: round the target at a distance, raised by `elevation` and turned by `yaw`
 * (radians). `shift` moves the picture up (in screen pixels), to centre the tank in the space the
 * buttons leave free.
 */
export interface View {
  targetY: number;
  distance: number;
  elevation: number;
  yaw: number;
  shift: number;
}

/** Close up, like the home screen: the sand along the bottom, the school behind the button. */
export const HOME_VIEW: View = { targetY: 2.2, distance: 9.5, elevation: 0.05, yaw: 0, shift: 0 };
/** Pulled back and up, to see the whole tank. How far back and its shift depend on the screen (see Tank.fitWide). */
export const WIDE_VIEW: View = { targetY: 1, distance: 11, elevation: 0.68, yaw: 0, shift: 0 };

/**
 * Points the wide view keeps on screen: the front row of decorations, the ones at the sides, the
 * school's band (left, right and top), and the shipwreck and the castle at the back.
 */
export const WIDE_FIT: [number, number, number][] = [
  [0, 0, 6.5],
  [-2.4, 0, 4.6],
  [2.4, 0, 4.6],
  [-4.6, 2.5, 0],
  [4.6, 2.5, 0],
  [0, 5.3, -1],
  [2.3, 2.7, -5],
  [-2.9, 1.6, -4.7],
];

/**
 * The big tuna she pets: how far in front of the home view's camera it swims (close enough that the
 * school always passes behind it), how much of the drawing's box the fish fills and where its middle
 * is (the drawing's tail reaches further than its nose), and how far it turns its face towards her.
 */
export const MASCOT = { depth: 3.2, fill: 0.86, middle: 0.53, turn: 0.4, length: 2.34 };

/**
 * Where to put the big tuna so that, from the home view, it sits exactly on the drawing's box (in
 * screen pixels from the top left). Also how long it is, and how big a screen pixel is at that depth.
 */
export function mascotSpot(
  box: { x: number; y: number; width: number; height: number },
  screen: { width: number; height: number },
  fov: number,
) {
  const c = cameraAt(HOME_VIEW);
  const norm = (v: [number, number, number]) => {
    const l = Math.hypot(...v);
    return v.map((n) => n / l) as [number, number, number];
  };
  const f = norm([-c.x, HOME_VIEW.targetY - c.y, -c.z]);
  // Right is forward × up; up is right × forward.
  const r = norm([-f[2], 0, f[0]]);
  const u: [number, number, number] = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const tanV = Math.tan((fov * Math.PI) / 360);
  const tanH = tanV * (screen.width / screen.height);
  const nx = ((box.x + box.width * MASCOT.middle) / screen.width) * 2 - 1;
  const ny = 1 - ((box.y + box.height / 2) / screen.height) * 2;
  const d = MASCOT.depth;
  const at = (i: number) => c[(['x', 'y', 'z'] as const)[i]] + d * (f[i] + r[i] * nx * tanH + u[i] * ny * tanV);
  const perPixel = (2 * d * tanV) / screen.height;
  return { x: at(0), y: at(1), z: at(2), length: box.width * MASCOT.fill * perPixel, perPixel };
}

/** Slow at both ends, quick in the middle. */
export const ease = (p: number) => {
  const x = Math.min(1, Math.max(0, p));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** The view `p` of the way (0–1, eased) from `a` to `b`. */
export function between(a: View, b: View, p: number): View {
  const k = ease(p);
  const mix = (x: number, y: number) => x + (y - x) * k;
  return {
    targetY: mix(a.targetY, b.targetY),
    distance: mix(a.distance, b.distance),
    elevation: mix(a.elevation, b.elevation),
    yaw: mix(a.yaw, b.yaw),
    shift: mix(a.shift, b.shift),
  };
}

/** The camera's position for a view. */
export function cameraAt(v: View) {
  const flat = v.distance * Math.cos(v.elevation);
  return { x: flat * Math.sin(v.yaw), y: v.targetY + v.distance * Math.sin(v.elevation), z: flat * Math.cos(v.yaw) };
}

/**
 * The camera's vertical field of view (degrees) for a screen this wide for its height, so a tall
 * phone sees as much across as a wide one.
 */
export function fovFor(aspect: number) {
  const { sideways, fovMin, fovMax } = SCHOOL3D_SETTINGS;
  const half = (sideways / 2) * (Math.PI / 180);
  const v = (2 * Math.atan(Math.tan(half) / Math.max(aspect, 0.1)) * 180) / Math.PI;
  return Math.min(fovMax, Math.max(fovMin, v));
}

/** How high the sand is at (x, z), near the middle: low dunes (the world raises it further out, past the rocks). */
export const sandAt = (x: number, z: number) =>
  0.12 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.45) + 0.06 * Math.sin(x * 1.7 + z * 1.1);

/**
 * The sunken treasure chest (D56), in the middle of the tank, inside the ring the school swims round.
 * Its body's size (across, front to back, and up to the lid), how far the lid tips back when it opens
 * (radians) and how long that takes (seconds), how far it's sunk into the sand, and the height of its
 * middle when open, where the chest view looks.
 */
export const CHEST = {
  width: 0.8,
  depth: 0.48,
  height: 0.38,
  open: 1.75,
  openSeconds: 0.9,
  closeSeconds: 0.45,
  sunk: 0.05,
  middle: 0.44,
};

/**
 * How the chest sits in its slot on the treasure screen, like the drawing (components/Chest.tsx): how
 * much of the slot's width it spans, and where its middle is, from the top, as a fraction of the slot's height.
 */
export const CHEST_SLOT = { fill: 0.62, middle: 0.55 };

/**
 * The treasure screen's view of the chest: low, just over the sand and under the school (so no tuna
 * swims through the picture), a little from the side, so it looks solid. How far back it is and its
 * shift depend on the chest's slot on the screen (see chestView).
 */
export const CHEST_VIEW: View = { targetY: 0, distance: 2.8, elevation: 0.12, yaw: 0.3, shift: 0 };

/** The chest's width as the chest view sees it, turned a little. */
export const chestSpan = () => CHEST.width * Math.cos(CHEST_VIEW.yaw) + CHEST.depth * Math.sin(CHEST_VIEW.yaw);

/** Where the chest's middle is, open: what the chest view looks at. */
export const chestMiddle = () => sandAt(0, 0) - CHEST.sunk + CHEST.middle;

/**
 * The chest view that puts the chest in its slot on the treasure screen (its box in screen pixels):
 * close enough that the chest spans the slot like the drawing does, and shifted so the chest sits
 * where the drawing would. It follows the slot as the page scrolls, until the slot is off the top.
 */
export function chestView(box: { y: number; width: number; height: number }, screen: { width: number; height: number }, fov: number): View {
  const tanV = Math.tan((fov * Math.PI) / 360);
  const distance = (chestSpan() * screen.height) / (2 * tanV * CHEST_SLOT.fill * Math.max(1, box.width));
  const middle = Math.max(box.y + box.height * CHEST_SLOT.middle, -box.height);
  return { ...CHEST_VIEW, targetY: chestMiddle(), distance, shift: screen.height / 2 - middle };
}

/**
 * Where each milestone's decoration sits on the sand: x and z, how it's turned (radians round the
 * vertical) and how big. The small ones are in a row at the front, low on the home screen like the
 * drawn seabed, with the anemone, the lantern and the jellyfish just behind at the sides. The
 * shipwreck and the castle are at the back. All of them are outside the swimming band (or below it),
 * so the school never swims through them. `lift` raises it off the sand (the jellyfish floats).
 */
export const SPOTS_3D: Record<string, { x: number; z: number; turn: number; scale: number; lift?: number }> = {
  'quit-day': { x: -1.3, z: 5.75, turn: 0.5, scale: 0.62 },
  'day-1': { x: -0.62, z: 6.2, turn: -0.15, scale: 0.62 },
  'day-3': { x: 0.05, z: 5.85, turn: 0.4, scale: 0.62 },
  'month-1': { x: 0.72, z: 6.15, turn: -0.35, scale: 0.62 },
  'week-1': { x: 1.35, z: 5.45, turn: -0.2, scale: 0.62 },
  'week-2': { x: 2.3, z: 4.4, turn: 0.3, scale: 0.9 },
  'month-3': { x: -2.25, z: 4.45, turn: 0.6, scale: 0.9 },
  'month-2': { x: -1.95, z: 4.95, turn: 0, scale: 0.9, lift: 1.5 },
  'month-6': { x: -2.9, z: -4.7, turn: 0.56, scale: 1 },
  'year-1': { x: 2.3, z: -5, turn: -0.3, scale: 1 },
};
