import {
  CatmullRomCurve3,
  CurvePath,
  Group,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Curve,
  type Material,
} from 'three';
import { MASCOT } from '../school3d';
import { Kit } from './kit';
import { merge, TUNA, taperAt, tunaBody, tunaFins, tunaTail } from './tuna';

/** The faces the home screen uses (see Mood in components/Tuna.tsx); any other mood shows as happy. */
export type Face = 'happy' | 'bliss' | 'unhinged';

/**
 * Where a point of the drawing (components/Tuna.tsx, a 200 × 120 box facing left, nose at x = 20,
 * tail tip at x = 192, middle at y = 60) is on the 3D tuna, which faces +x.
 */
const fromDrawing = (x: number, y: number): [number, number] => {
  const k = (TUNA.half - TUNA.tailTip) / (192 - 20);
  return [TUNA.half - (x - 20) * k, (60 - y) * k];
};

/** A point on the skin at (x, y) on one side (+1 or -1), lifted off it a little, and which way is out. */
function skin(x: number, y: number, side: number, lift = 0) {
  const round = Math.sqrt(Math.max(0.0001, 1 - (x / TUNA.half) ** 2)) * taperAt(x);
  const ry = TUNA.height * round;
  const rz = TUNA.width * round;
  const k = Math.min(0.98, Math.abs(y) / ry);
  const z = side * rz * Math.sqrt(1 - k * k);
  const out = new Vector3(x / TUNA.half ** 2, y / (ry * ry), z / (rz * rz)).normalize();
  return { at: new Vector3(x, y, z).addScaledVector(out, lift), out };
}

/**
 * The big tuna on the home screen, in 3D: the drawing's shape and colours, with its three home-screen
 * faces (happy, eyes closed and blushing while she pets it, and the wide-eyed stare for a dark joke).
 * It bobs like the drawing did, wags its tail, and squishes a little when tapped. It faces left,
 * turned a little towards her.
 */
export class Mascot {
  readonly object = new Group();
  private inner = new Group();
  private tail = new Group();
  private faces: Record<Face, Group>;
  private squishAt = -Infinity;
  /** Scene units per screen pixel where it swims, for a bob the same size as the drawing's. */
  private perPixel = 0.01;
  private base = new Vector3();

  constructor(kit: Kit) {
    const painted = kit.painted();
    this.inner.add(new Mesh(kit.keep(merge([tunaBody(32, 20), ...tunaFins()])), painted));
    // The tail swings from its root.
    const tailGeo = kit.keep(tunaTail());
    tailGeo.translate(-TUNA.tailRoot, 0, 0);
    this.tail.add(new Mesh(tailGeo, painted));
    this.tail.position.x = TUNA.tailRoot;
    this.inner.add(this.tail);

    const white = kit.toon('#ffffff');
    const ink = kit.keep(new MeshBasicMaterial({ color: '#0b1f2e' }));
    const blush = kit.toon('#ff7a59', { transparent: true, opacity: 0.55 });
    this.faces = {
      happy: this.face((g, side) => {
        this.eye(kit, g, side, fromDrawing(48, 52), 0.15, white, 0.072, 0.55, ink);
        g.add(this.line(kit, side, bend([24, 66], [32, 74], [42, 68]), 0.022, ink));
      }),
      bliss: this.face((g, side) => {
        g.add(this.line(kit, side, bend([39, 55], [47, 45], [56, 55]), 0.026, ink));
        g.add(this.line(kit, side, bend([22, 65], [33, 78], [45, 66]), 0.024, ink));
        const cheek = skin(...fromDrawing(54, 67), side, 0.004);
        const blob = new Mesh(kit.keep(new SphereGeometry(1, 16, 8)), blush);
        blob.position.copy(cheek.at);
        blob.lookAt(cheek.at.clone().add(cheek.out));
        blob.scale.set(0.11, 0.062, 0.01);
        g.add(blob);
      }),
      unhinged: this.face((g, side) => {
        this.eye(kit, g, side, fromDrawing(48, 51), 0.18, white, 0.032, 0, ink);
        const zigzag: [number, number][] = [[22, 68], [28, 65], [33, 69], [38, 65], [44, 68]];
        g.add(this.line(kit, side, zigzag.map((p) => fromDrawing(...p)), 0.02, ink, true));
      }),
    };
    Object.values(this.faces).forEach((f) => this.inner.add(f));
    this.setFace('happy');

    // Centred on its middle, facing left (-x) and turned a little towards the camera (+z).
    this.inner.position.x = -(TUNA.half + TUNA.tailTip) / 2;
    this.object.add(this.inner);
    this.object.rotation.order = 'ZYX';
    this.object.rotation.y = Math.PI + MASCOT.turn;
    // Hidden until the home screen says where the drawing is.
    this.object.visible = false;
  }

  setFace(face: Face) {
    (Object.keys(this.faces) as Face[]).forEach((f) => (this.faces[f].visible = f === face));
  }

  /** A quick squish, like pressing the drawing. */
  squish(now: number) {
    this.squishAt = now;
  }

  /** Puts it at `spot` (see mascotSpot), sized to match the drawing it replaces. */
  place(spot: { x: number; y: number; z: number; length: number; perPixel: number }) {
    this.base.set(spot.x, spot.y, spot.z);
    this.perPixel = spot.perPixel;
    this.object.visible = true;
    // Turned towards the camera, it looks a little shorter than it is.
    this.object.scale.setScalar(spot.length / (MASCOT.length * Math.cos(MASCOT.turn)));
  }

  /** Where it is, for the wide view to keep it in sight. */
  get position(): [number, number, number] {
    return [this.base.x, this.base.y, this.base.z];
  }

  /** `t` is the scene's time (frozen with Less motion); `now` is real time, for the squish. */
  update(t: number, now: number) {
    // The drawing's bob: 8 px up and down and a 2° rock, every 4 seconds.
    const phase = (t / 4) * Math.PI * 2;
    this.object.position.copy(this.base);
    this.object.position.y += 8 * this.perPixel * (0.5 - 0.5 * Math.cos(phase));
    this.object.rotation.z = (2 * Math.PI) / 180 * -Math.cos(phase);
    this.tail.rotation.y = 0.2 * Math.sin(t * 2.6);
    const press = Math.max(0, 1 - (now - this.squishAt) / 0.22);
    this.inner.scale.set(1 - 0.06 * press, 1 + 0.04 * press, 1);
  }

  /** One face, drawn on both sides. */
  private face(build: (g: Group, side: number) => void) {
    const g = new Group();
    for (const side of [1, -1]) build(g, side);
    return g;
  }

  /** A white eye bulging from the skin, with a round pupil `forward` of the way towards the nose. */
  private eye(kit: Kit, g: Group, side: number, [x, y]: [number, number], r: number, white: Material, pr: number, forward: number, ink: Material) {
    const s = skin(x, y, side);
    const centre = s.at.clone().addScaledVector(s.out, -r * 0.5);
    const ball = new Mesh(kit.keep(new SphereGeometry(r, 18, 12)), white);
    ball.position.copy(centre);
    g.add(ball);
    const look = s.out.clone().add(new Vector3(forward, 0, 0)).normalize();
    const pupil = new Mesh(kit.keep(new SphereGeometry(pr, 12, 8)), ink);
    pupil.position.copy(centre).addScaledVector(look, r - pr * 0.45);
    g.add(pupil);
  }

  /** A dark line drawn on the skin through these points: a smooth curve, or straight segments. */
  private line(kit: Kit, side: number, points: [number, number][], radius: number, ink: Material, straight = false) {
    const on = points.map(([x, y]) => skin(x, y, side, radius * 0.6).at);
    let curve: Curve<Vector3>;
    if (straight) {
      const path = new CurvePath<Vector3>();
      for (let i = 1; i < on.length; i++) path.add(new LineCurve3(on[i - 1], on[i]));
      curve = path;
    } else {
      curve = new CatmullRomCurve3(on);
    }
    return new Mesh(kit.keep(new TubeGeometry(curve, straight ? 24 : 16, radius, 6, false)), ink);
  }
}

/** Points along one of the drawing's quadratic curves (M a Q b c), on the 3D tuna. */
function bend(a: [number, number], b: [number, number], c: [number, number]): [number, number][] {
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const q = (k: 0 | 1) => (1 - t) ** 2 * a[k] + 2 * (1 - t) * t * b[k] + t * t * c[k];
    return fromDrawing(q(0), q(1));
  });
}
