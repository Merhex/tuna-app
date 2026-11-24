import {
  BufferGeometry,
  CircleGeometry,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeLanes, SCHOOL3D_SETTINGS, swimPose, type Lane } from '../school3d';
import { Kit, paint } from './kit';

// The mascot's colours (see --tuna-body, --tuna-belly and --tuna-fin in styles.css).
export const BODY = '#4f8fbf';
const BELLY = '#d4e3ec';
const FIN = '#f2c14e';
const SIDE_FIN = '#3f78a3';
/** A day tuna's fins: grey, so only the craving tuna carry gold. */
const GREY_FIN = '#8d9ba6';
const EYE = '#ffffff';
const PUPIL = '#0b1f2e';

/**
 * The tuna's shape, nose towards +x: half its body length, and the body's height and width (before
 * it narrows towards the tail). The tail tip is at x = -1.42, so a tuna is 2.34 long.
 */
export const TUNA = { half: 0.92, height: 0.52, width: 0.44, tailTip: -1.42, tailRoot: -0.82 };

/** How much the body narrows at `x` towards the tail (1 at the middle and in front). */
export const taperAt = (x: number) => 1 - 0.72 * Math.max(0, -x / TUNA.half) ** 1.6;

/** Where the gold stripe of a craving tuna runs: along the side, from behind the eye to the tail. */
const inStripe = (x: number, y: number) =>
  x > TUNA.tailRoot + 0.05 && x < 0.42 && Math.abs(y / (TUNA.height * taperAt(x)) - 0.05) < 0.2;

/**
 * The body: a stretched ball, slimmer towards the tail, with a pale belly like the drawing. A
 * craving tuna (`striped`) also has a gold stripe along each side.
 */
export function tunaBody(segments: number, rings: number, striped = false): BufferGeometry {
  const body = new SphereGeometry(1, segments, rings);
  const p = body.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * TUNA.half;
    const taper = taperAt(x);
    p.setXYZ(i, x, p.getY(i) * TUNA.height * taper, p.getZ(i) * TUNA.width * taper);
  }
  body.computeVertexNormals();
  // The belly is below a line that rises a little towards the tail.
  return paint(body, (x, y) => (striped && inStripe(x, y) ? FIN : y < -0.16 - 0.06 * x ? BELLY : BODY));
}

const flat = (shape: Shape, depth: number, color: string) => {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  return paint(g, color);
};

const triangle = (pts: [number, number][]) => {
  const s = new Shape();
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((q) => s.lineTo(...q));
  s.closePath();
  return s;
};

/**
 * The forked tail, from its root at x = -0.82 to its tips at x = -1.42: the body's colour, or gold
 * for a craving tuna.
 */
export function tunaTail(color = BODY): BufferGeometry {
  const tail = new Shape();
  tail.moveTo(TUNA.tailRoot, 0);
  tail.quadraticCurveTo(-1.05, 0.25, TUNA.tailTip, 0.6);
  tail.quadraticCurveTo(-1.3, 0.2, -1.2, 0);
  tail.quadraticCurveTo(-1.3, -0.2, TUNA.tailTip, -0.6);
  tail.quadraticCurveTo(-1.05, -0.25, TUNA.tailRoot, 0);
  return flat(tail, 0.05, color);
}

/**
 * The dorsal and anal fins, the finlets towards the tail and the little blue side fins. The fins
 * are yellow (the mascot and the craving tuna) or `fin` (grey for a plain day tuna).
 */
export function tunaFins(fin = FIN): BufferGeometry[] {
  const parts = [
    flat(triangle([[0.12, 0.42], [-0.18, 0.86], [-0.36, 0.38]]), 0.05, fin),
    flat(triangle([[0.02, -0.38], [-0.22, -0.74], [-0.34, -0.33]]), 0.05, fin),
  ];
  for (const [x, s] of [[-0.5, 1], [-0.66, 0.85]] as const) {
    const h = 0.11 * s;
    const top = TUNA.height * taperAt(x) * Math.sqrt(1 - (x / TUNA.half) ** 2) - 0.03;
    parts.push(flat(triangle([[x + 0.05, top], [x - 0.04, top + h], [x - 0.08, top]]), 0.035, fin));
    parts.push(flat(triangle([[x + 0.05, -top], [x - 0.04, -top - h], [x - 0.08, -top]]), 0.035, fin));
  }
  for (const side of [1, -1]) {
    const fin = new SphereGeometry(1, 6, 3);
    fin.scale(0.26, 0.035, 0.1);
    fin.rotateY(side * 0.5);
    fin.rotateX(side * 0.35);
    fin.translate(0.28, -0.14, side * 0.4);
    parts.push(paint(fin, SIDE_FIN));
  }
  return parts;
}

/** Merges painted parts into one geometry (all of them flattened to plain triangles). */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  parts.forEach((g) => g.dispose());
  if (!merged) throw new Error('tuna geometry');
  return merged;
}

/**
 * One tuna of the school, all in one geometry: the body, tail and fins, and big eyes on both sides
 * with a dark pupil looking forward. Kept light: up to 200 of these are drawn every frame. A day
 * tuna is plain blue and grey, with no gold at all; a craving tuna (`striped`) has a gold stripe down each side and a gold tail.
 */
export function tunaGeometry(striped = false): BufferGeometry {
  const parts = [striped ? tunaBody(18, 15, true) : tunaBody(18, 11), tunaTail(striped ? FIN : BODY), ...tunaFins(striped ? FIN : GREY_FIN)];
  for (const side of [1, -1]) {
    const eye = new SphereGeometry(0.15, 9, 6);
    eye.translate(0.56, 0.1, side * 0.29);
    parts.push(paint(eye, EYE));
    // The pupil is a flat disc just on the eye's surface, looking forward and out.
    const pupil = new CircleGeometry(0.075, 10);
    pupil.lookAt(new Vector3(0.45, 0.05, side));
    pupil.translate(0.56 + 0.15 * 0.41, 0.1 + 0.15 * 0.05, side * (0.29 + 0.15 * 0.91));
    parts.push(paint(pupil, PUPIL));
  }
  return merge(parts);
}

/**
 * The school: a plain tuna for every day she has stayed off it and a gold-striped one for every
 * craving she has beaten, each kind in one draw call. Each one follows its lane (school3d.ts); the
 * tail beat is done on the graphics card, bending the tail end of the body from side to side.
 */
export class School {
  /** Both kinds of tuna. */
  readonly object = new Group();
  private plain: InstancedMesh;
  private striped: InstancedMesh;
  private lanes: { mesh: InstancedMesh; lanes: Lane[] }[] = [];
  private dummy = new Object3D();
  private time = { value: 0 };

  constructor(kit: Kit) {
    const material = kit.painted();
    const time = this.time;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          attribute float aPhase;
          attribute float aBeat;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          // 0 at the gills, 1 at the tip of the tail.
          float tailK = clamp((0.35 - position.x) / 1.75, 0.0, 1.0);
          float beat = uTime * aBeat * 6.2831853 + aPhase;
          transformed.z += sin(beat - position.x * 2.4) * 0.26 * tailK * tailK;
          transformed.z += sin(beat) * 0.035;`,
        );
    };
    const make = (striped: boolean) => {
      const max = SCHOOL3D_SETTINGS.maxTuna;
      const geo = kit.keep(tunaGeometry(striped));
      geo.setAttribute('aPhase', new InstancedBufferAttribute(new Float32Array(max), 1));
      geo.setAttribute('aBeat', new InstancedBufferAttribute(new Float32Array(max), 1));
      const mesh = new InstancedMesh(geo, material, max);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      // They swim all over, so the usual check for being off screen would be wrong.
      mesh.frustumCulled = false;
      mesh.count = 0;
      return mesh;
    };
    this.plain = make(false);
    this.striped = make(true);
    this.object.add(this.plain, this.striped);
    this.dummy.rotation.order = 'YZX';
  }

  /**
   * How many of each kind swim. The craving tuna take the first lanes, so they keep theirs as the
   * days go by.
   */
  setCount(plain: number, striped: number) {
    const max = SCHOOL3D_SETTINGS.maxTuna;
    striped = Math.min(striped, max);
    plain = Math.min(plain, max - striped);
    const lanes = makeLanes(plain + striped);
    this.lanes = [
      { mesh: this.striped, lanes: lanes.slice(0, striped) },
      { mesh: this.plain, lanes: lanes.slice(striped) },
    ];
    for (const { mesh, lanes } of this.lanes) {
      const phase = mesh.geometry.getAttribute('aPhase') as InstancedBufferAttribute;
      const beat = mesh.geometry.getAttribute('aBeat') as InstancedBufferAttribute;
      lanes.forEach((l, i) => {
        phase.setX(i, l.beatPhase);
        beat.setX(i, l.beat);
      });
      phase.needsUpdate = beat.needsUpdate = true;
      mesh.count = lanes.length;
    }
  }

  /** Puts every tuna where it is at time `t` (seconds). */
  update(t: number) {
    this.time.value = t;
    const d = this.dummy;
    for (const { mesh, lanes } of this.lanes) {
      lanes.forEach((l, i) => {
        const pose = swimPose(l, t);
        d.position.set(pose.x, pose.y, pose.z);
        d.rotation.set(0, pose.yaw, pose.pitch);
        d.scale.setScalar(l.size / 2);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
