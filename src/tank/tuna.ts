import {
  BufferGeometry,
  CircleGeometry,
  DynamicDrawUsage,
  ExtrudeGeometry,
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
const BODY = '#4f8fbf';
const BELLY = '#d4e3ec';
const FIN = '#f2c14e';
const SIDE_FIN = '#3f78a3';
const EYE = '#ffffff';
const PUPIL = '#0b1f2e';

/**
 * One tuna, nose towards +x, 2 units long from tail tip to nose, built from simple shapes in the
 * mascot's colours: a round body with a pale belly, a forked tail, yellow fins and finlets, and big
 * eyes on both sides.
 */
export function tunaGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Body: a stretched ball, slimmer towards the tail.
  // Kept light: up to 200 of these are drawn every frame.
  const body = new SphereGeometry(1, 18, 11);
  const p = body.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const taper = 1 - 0.72 * Math.max(0, -x) ** 1.6;
    p.setXYZ(i, x * 0.92, p.getY(i) * 0.52 * taper, p.getZ(i) * 0.44 * taper);
  }
  body.computeVertexNormals();
  // The belly is pale, below a line that rises a little towards the tail, like the drawing.
  parts.push(paint(body, (x, y) => (y < -0.16 + 0.06 * x * -1 ? BELLY : BODY)));

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

  // Forked tail, the body's colour.
  const tail = new Shape();
  tail.moveTo(-0.82, 0);
  tail.quadraticCurveTo(-1.05, 0.25, -1.42, 0.6);
  tail.quadraticCurveTo(-1.3, 0.2, -1.2, 0);
  tail.quadraticCurveTo(-1.3, -0.2, -1.42, -0.6);
  tail.quadraticCurveTo(-1.05, -0.25, -0.82, 0);
  parts.push(flat(tail, 0.05, BODY));

  // Dorsal fin and anal fin, yellow.
  parts.push(flat(triangle([[0.12, 0.42], [-0.18, 0.86], [-0.36, 0.38]]), 0.05, FIN));
  parts.push(flat(triangle([[0.02, -0.38], [-0.22, -0.74], [-0.34, -0.33]]), 0.05, FIN));
  // Finlets towards the tail, two on top and two underneath.
  for (const [x, s] of [[-0.5, 1], [-0.66, 0.85]] as const) {
    const h = 0.11 * s;
    const top = 0.52 * (1 - 0.72 * (-x) ** 1.6) * Math.sqrt(1 - (x / 0.92) ** 2) - 0.03;
    parts.push(flat(triangle([[x + 0.05, top], [x - 0.04, top + h], [x - 0.08, top]]), 0.035, FIN));
    parts.push(flat(triangle([[x + 0.05, -top], [x - 0.04, -top - h], [x - 0.08, -top]]), 0.035, FIN));
  }

  // Little side fins, a darker blue, swept back.
  for (const side of [1, -1]) {
    const fin = new SphereGeometry(1, 6, 3);
    fin.scale(0.26, 0.035, 0.1);
    fin.rotateY(side * 0.5);
    fin.rotateX(side * 0.35);
    fin.translate(0.28, -0.14, side * 0.4);
    parts.push(paint(fin, SIDE_FIN));
  }

  // Big eyes, white with a dark pupil looking forward.
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

  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  parts.forEach((g) => g.dispose());
  if (!merged) throw new Error('tuna geometry');
  return merged;
}

/**
 * The school: every tuna in one draw call. Each one follows its lane (school3d.ts); the tail beat
 * is done on the graphics card, bending the tail end of the body from side to side.
 */
export class School {
  readonly mesh: InstancedMesh;
  private lanes: Lane[] = [];
  private dummy = new Object3D();
  private time = { value: 0 };

  constructor(kit: Kit) {
    const max = SCHOOL3D_SETTINGS.maxTuna;
    const geo = kit.keep(tunaGeometry());
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
    this.mesh = new InstancedMesh(geo, material, max);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    // They swim all over, so the usual check for being off screen would be wrong.
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    geo.setAttribute('aPhase', new InstancedBufferAttribute(new Float32Array(max), 1));
    geo.setAttribute('aBeat', new InstancedBufferAttribute(new Float32Array(max), 1));
    this.dummy.rotation.order = 'YZX';
  }

  /** How many tuna swim. The first ones keep their lanes as the number changes. */
  setCount(n: number) {
    const count = Math.min(n, SCHOOL3D_SETTINGS.maxTuna);
    this.lanes = makeLanes(count);
    const phase = this.mesh.geometry.getAttribute('aPhase') as InstancedBufferAttribute;
    const beat = this.mesh.geometry.getAttribute('aBeat') as InstancedBufferAttribute;
    this.lanes.forEach((l, i) => {
      phase.setX(i, l.beatPhase);
      beat.setX(i, l.beat);
    });
    phase.needsUpdate = beat.needsUpdate = true;
    this.mesh.count = count;
  }

  /** Puts every tuna where it is at time `t` (seconds). */
  update(t: number) {
    this.time.value = t;
    const d = this.dummy;
    this.lanes.forEach((l, i) => {
      const pose = swimPose(l, t);
      d.position.set(pose.x, pose.y, pose.z);
      d.rotation.set(0, pose.yaw, pose.pitch);
      d.scale.setScalar(l.size / 2);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
