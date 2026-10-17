import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  Object3D,
  PlaneGeometry,
  PointLight,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { SPOTS_3D } from '../school3d';
import type { Kit } from './kit';

/**
 * The milestone decorations (D43) in 3D, one builder per milestone ID, in the same colours as the
 * drawings in components/Seabed.tsx. Each sits on the sand at y = 0. Small ones are about 0.5–0.9
 * tall; the shipwreck and the castle are big and stay at the back.
 */
export interface Piece {
  object: Object3D;
  /** Small movements: swaying arms, a bobbing jellyfish, a flickering lantern. */
  update?: (t: number) => void;
}

type Builder = (kit: Kit, coral: { scale: number; hue: number }) => Piece;

export const isBuilt3D = (id: string) => !!BUILDERS[id] && !!SPOTS_3D[id];

/** Builds the decoration for a milestone and puts it in its spot. */
export function decoration(id: string, kit: Kit, coral: { scale: number; hue: number }): Piece | null {
  const build = BUILDERS[id];
  const spot = SPOTS_3D[id];
  if (!build || !spot) return null;
  const piece = build(kit, coral);
  const holder = new Group();
  holder.add(piece.object);
  holder.position.set(spot.x, spot.lift ?? 0, spot.z);
  holder.rotation.y = spot.turn;
  holder.scale.setScalar(spot.scale);
  holder.name = id;
  return { object: holder, update: piece.update };
}

const mesh = (kit: Kit, geo: BufferGeometry, material: Material) => new Mesh(kit.keep(geo), material);

/** A tube along a few points, for coral branches and tentacles. */
const tube = (points: [number, number, number][], radius: number) =>
  new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), 16, radius, 7, false);

const BUILDERS: Record<string, Builder> = {
  // Day 0, Cast Off: a small anchor, leaning and half sunk in the sand.
  'quit-day': (kit) => {
    const m = kit.toon('#9fb6c4');
    const g = new Group();
    const ring = mesh(kit, new TorusGeometry(0.09, 0.03, 8, 20), m);
    ring.position.y = 0.86;
    const shank = mesh(kit, new CylinderGeometry(0.035, 0.035, 0.74, 10), m);
    shank.position.y = 0.42;
    const stock = mesh(kit, new CylinderGeometry(0.03, 0.03, 0.36, 10), m);
    stock.rotation.z = Math.PI / 2;
    stock.position.y = 0.66;
    const arms = mesh(kit, new TorusGeometry(0.27, 0.038, 8, 24, Math.PI), m);
    arms.rotation.z = Math.PI;
    arms.position.y = 0.34;
    g.add(ring, shank, stock, arms);
    for (const side of [1, -1]) {
      const fluke = mesh(kit, new ConeGeometry(0.075, 0.16, 4), m);
      fluke.position.set(side * 0.27, 0.38, 0);
      fluke.rotation.z = side * -0.35;
      g.add(fluke);
    }
    g.rotation.z = -0.32;
    g.position.y = -0.09;
    return { object: g };
  },

  // Day 1, First Tide: a scallop shell, propped up on the sand.
  'day-1': (kit) => {
    const g = new Group();
    const fan = new Shape();
    const R = 0.3;
    const from = Math.PI * 0.12;
    const to = Math.PI * 0.88;
    fan.moveTo(0, 0);
    for (let k = 0; k <= 60; k++) {
      const a = from + ((to - from) * k) / 60;
      const bump = Math.sin(Math.PI * ((k / 10) % 1));
      const r = R * (0.92 + 0.08 * bump);
      fan.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    fan.closePath();
    const body = mesh(kit, new ExtrudeGeometry(fan, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3 }), kit.toon('#f4cdb9'));
    const ribs = kit.toon('#d49a84');
    for (let k = 0; k <= 6; k++) {
      const a = from + ((to - from) * k) / 6;
      const rib = mesh(kit, new CylinderGeometry(0.012, 0.012, R * 0.86, 6), ribs);
      rib.position.set(Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45, 0.09);
      rib.rotation.z = a - Math.PI / 2;
      g.add(rib);
    }
    const hinge = new Shape();
    hinge.moveTo(-0.09, 0.02);
    hinge.lineTo(0.09, 0.02);
    hinge.lineTo(0.07, -0.06);
    hinge.lineTo(-0.07, -0.06);
    hinge.closePath();
    const ear = mesh(kit, new ExtrudeGeometry(hinge, { depth: 0.06, bevelEnabled: false }), kit.toon('#d9a28c'));
    g.add(body, ear);
    g.rotation.x = -0.75;
    g.position.y = 0.05;
    return { object: g };
  },

  // Day 3, Top of the Wave: a bright, puffy starfish with a soft glow (the hardest day gets the brightest).
  'day-3': (kit) => {
    const star = new Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.13 : 0.32;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) star.moveTo(r * Math.cos(a), r * Math.sin(a));
      else star.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    star.closePath();
    const g = new Group();
    const body = mesh(
      kit,
      new ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 3 }),
      kit.toon('#ff8a5c', { emissive: new Color('#ff6a3a'), emissiveIntensity: 0.35 }),
    );
    g.add(body);
    const dots = kit.toon('#ffd3bf');
    const centre = mesh(kit, new SphereGeometry(0.035, 8, 6), dots);
    centre.position.z = 0.1;
    g.add(centre);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const dot = mesh(kit, new SphereGeometry(0.028, 8, 6), dots);
      dot.position.set(0.17 * Math.cos(a), 0.17 * Math.sin(a), 0.095);
      g.add(dot);
    }
    g.rotation.x = -Math.PI / 2 + 0.18;
    g.position.y = 0.07;
    return { object: g };
  },

  // Week 1, Open Water: a coral branch. After a year it grows and changes colour monthly (coralLook).
  'week-1': (kit, coral) => {
    const branch = new Color('#f27a93').offsetHSL(coral.hue / 360, 0, 0);
    const tip = new Color('#ffb4c4').offsetHSL(coral.hue / 360, 0, 0);
    const m = kit.toon(`#${branch.getHexString()}`);
    const tm = kit.toon(`#${tip.getHexString()}`);
    const g = new Group();
    const branches: [number, number, number][][] = [
      [[0, -0.05, 0], [0, 0.33, 0], [-0.08, 0.5, 0.02], [-0.1, 0.76, 0.03]],
      [[0, 0.26, 0], [0.12, 0.34, 0.06], [0.15, 0.52, 0.08], [0.15, 0.7, 0.08]],
      [[-0.07, 0.46, 0.01], [-0.19, 0.52, -0.04], [-0.23, 0.65, -0.06]],
      [[0.15, 0.46, 0.08], [0.24, 0.52, 0.12], [0.27, 0.62, 0.14]],
      [[0, 0.14, 0], [-0.13, 0.18, -0.08], [-0.2, 0.32, -0.12]],
      [[0, 0.2, 0], [0.04, 0.3, -0.14], [0.05, 0.5, -0.18]],
    ];
    for (const pts of branches) {
      g.add(mesh(kit, tube(pts, 0.045), m));
      const end = mesh(kit, new SphereGeometry(0.06, 10, 8), tm);
      end.position.set(...pts[pts.length - 1]);
      g.add(end);
    }
    g.scale.setScalar(coral.scale);
    return { object: g };
  },

  // Week 2, Finding the Current: an anemone, its arms swaying like the seaweed.
  'week-2': (kit) => {
    const g = new Group();
    const base = mesh(kit, new CylinderGeometry(0.15, 0.19, 0.24, 16), kit.toon('#8a5cc4'));
    base.position.y = 0.1;
    const top = mesh(kit, new CylinderGeometry(0.155, 0.155, 0.02, 16), kit.toon('#b98ae8'));
    top.position.y = 0.23;
    g.add(base, top);
    const am = kit.toon('#c9a0f2');
    const arms: Object3D[] = [];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const r = i % 2 ? 0.08 : 0.13;
      const arm = new Group();
      arm.position.set(Math.cos(a) * r, 0.23, Math.sin(a) * r);
      arm.rotation.y = -a;
      const len = 0.3 + (i % 3) * 0.06;
      arm.add(mesh(kit, tube([[0, 0, 0], [0.06, len * 0.5, 0], [0.14, len, 0]], 0.022), am));
      g.add(arm);
      arms.push(arm);
    }
    return {
      object: g,
      update: (t) => arms.forEach((arm, i) => (arm.rotation.z = 0.18 * Math.sin(t * 0.9 + i * 0.6))),
    };
  },

  // Month 1, Deep Water: a pearl in an open clam.
  'month-1': (kit) => {
    const g = new Group();
    const lower = mesh(kit, new SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), kit.toon('#a3b5cc', { side: DoubleSide }));
    lower.scale.set(0.34, 0.13, 0.28);
    lower.position.y = 0.12;
    const inside = mesh(kit, new CylinderGeometry(1, 1, 0.01, 20), kit.toon('#33465c'));
    inside.scale.set(0.32, 1, 0.26);
    inside.position.y = 0.115;
    const lid = new Group();
    lid.position.set(0, 0.12, -0.27);
    const upper = mesh(kit, new SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.toon('#8ea3bd', { side: DoubleSide }));
    upper.scale.set(0.34, 0.16, 0.28);
    upper.position.z = 0.27;
    lid.add(upper);
    lid.rotation.x = -0.85;
    const shine = kit.toon('#f6f3ff', { emissive: new Color('#bcb6ff'), emissiveIntensity: 0.3 });
    const pearl = mesh(kit, new SphereGeometry(0.075, 16, 12), shine);
    pearl.position.set(0, 0.19, 0.02);
    g.add(lower, inside, lid, pearl);
    return { object: g, update: (t) => (shine.emissiveIntensity = 0.25 + 0.2 * Math.sin(t * 1.3)) };
  },

  // Month 2, Calmer Waters: a glowing jellyfish, drifting just above the sand.
  'month-2': (kit) => {
    const g = new Group();
    const bell = mesh(
      kit,
      new SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      kit.toon('#7fe0f0', { emissive: new Color('#3fc6e0'), emissiveIntensity: 0.7, transparent: true, opacity: 0.85, side: DoubleSide }),
    );
    bell.scale.y = 0.85;
    const tm = kit.toon('#a8f0fa', { emissive: new Color('#7fe0f0'), emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
    const arms: Object3D[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const arm = new Group();
      arm.position.set(Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11);
      const len = 0.38 + (i % 2) * 0.12;
      arm.add(mesh(kit, tube([[0, 0, 0], [0.03, -len * 0.33, 0], [-0.03, -len * 0.66, 0], [0.02, -len, 0]], 0.012), tm));
      g.add(arm);
      arms.push(arm);
    }
    g.add(bell);
    const glow = new PointLight('#7fe0f0', 1.6, 3.2, 1.5);
    glow.position.y = -0.05;
    g.add(glow);
    return {
      object: g,
      update: (t) => {
        g.position.y = 0.12 * Math.sin(t * 0.7);
        const pulse = 1 + 0.06 * Math.sin(t * 2.2);
        bell.scale.set(pulse, 0.85 / pulse, pulse);
        arms.forEach((arm, i) => (arm.rotation.z = 0.2 * Math.sin(t * 1.4 + i)));
      },
    };
  },

  // Month 3, Rewired: a lantern with a warm, flickering light.
  'month-3': (kit) => {
    const g = new Group();
    const frame = kit.toon('#5a6b79');
    const base = mesh(kit, new BoxGeometry(0.3, 0.07, 0.3), frame);
    base.position.y = 0.035;
    const glass = mesh(
      kit,
      new CylinderGeometry(0.11, 0.11, 0.32, 14),
      kit.toon('#ffd36b', { emissive: new Color('#ffb33a'), emissiveIntensity: 0.85, transparent: true, opacity: 0.92 }),
    );
    glass.position.y = 0.23;
    const flame = mesh(kit, new ConeGeometry(0.04, 0.12, 10), kit.toon('#fff5d1', { emissive: new Color('#fff5d1'), emissiveIntensity: 1 }));
    flame.position.y = 0.22;
    const cap = mesh(kit, new BoxGeometry(0.27, 0.06, 0.27), frame);
    cap.position.y = 0.42;
    const roof = mesh(kit, new ConeGeometry(0.16, 0.1, 4), frame);
    roof.position.y = 0.5;
    roof.rotation.y = Math.PI / 4;
    const handle = mesh(kit, new TorusGeometry(0.07, 0.015, 6, 16, Math.PI), frame);
    handle.position.y = 0.55;
    g.add(base, glass, flame, cap, roof, handle);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const bar = mesh(kit, new BoxGeometry(0.025, 0.32, 0.025), frame);
      bar.position.set(x * 0.1, 0.23, z * 0.1);
      g.add(bar);
    }
    const light = new PointLight('#ffc46b', 2.2, 3.5, 1.5);
    light.position.y = 0.3;
    g.add(light);
    g.rotation.z = 0.08;
    return {
      object: g,
      update: (t) => {
        const f = 0.85 + 0.1 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1);
        light.intensity = 2.2 * f;
        flame.scale.set(1, f, 1);
      },
    };
  },

  // Month 6, Ocean Crosser: a small shipwreck, far back, sunk to one side.
  'month-6': (kit) => {
    const g = new Group();
    const side = new Shape();
    // The hull's side, from the drawing's outline (viewBox 120 × 64), in scene units.
    const P = (x: number, y: number) => [(x - 56) / 34, (60 - y) / 34] as [number, number];
    side.moveTo(...P(4, 34));
    side.lineTo(...P(108, 26));
    side.quadraticCurveTo(...P(104, 44), ...P(92, 54));
    side.quadraticCurveTo(...P(56, 62), ...P(20, 56));
    side.quadraticCurveTo(...P(10, 48), ...P(4, 34));
    const hullGeo = new ExtrudeGeometry(side, { depth: 1, bevelEnabled: false, curveSegments: 10, steps: 1 });
    hullGeo.translate(0, 0, -0.5);
    // Narrow it to a point at the bow and stern, and towards the keel.
    const p = hullGeo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const ends = Math.sqrt(Math.max(0.05, 1 - (x / 1.65) ** 2));
      const keel = 0.45 + 0.55 * Math.min(1, Math.max(0, (y - 0.1) / 0.75));
      p.setZ(i, p.getZ(i) * ends * keel * 0.9);
    }
    hullGeo.computeVertexNormals();
    const hull = mesh(kit, hullGeo, kit.toon('#234a62'));
    const dark = kit.toon('#10283a');
    for (const x of [-0.75, -0.35, 0.9]) {
      const hole = mesh(kit, new CylinderGeometry(0.075, 0.075, 0.9, 12), dark);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(x, 0.55, 0);
      hole.scale.z = 0.95;
      g.add(hole);
    }
    const breach = mesh(kit, new BoxGeometry(0.26, 0.24, 0.92), dark);
    breach.position.set(0.25, 0.48, 0);
    breach.rotation.z = 0.3;
    const wood = kit.toon('#2f607d');
    const mast = mesh(kit, new CylinderGeometry(0.06, 0.07, 1.25, 10), wood);
    mast.position.set(-0.1, 1.35, 0);
    mast.rotation.z = 0.14;
    const yard = mesh(kit, new CylinderGeometry(0.04, 0.04, 0.6, 8), wood);
    yard.position.set(-0.23, 1.72, 0);
    yard.rotation.z = Math.PI / 2 - 0.1;
    const sail = mesh(kit, new PlaneGeometry(0.5, 0.42), kit.toon('#3a6c88', { side: DoubleSide, transparent: true, opacity: 0.75 }));
    sail.position.set(-0.22, 1.48, 0.04);
    sail.rotation.set(0.15, 0.25, 0.05);
    const stump = mesh(kit, new CylinderGeometry(0.05, 0.06, 0.45, 8), wood);
    stump.position.set(0.95, 1.0, 0);
    stump.rotation.z = -0.4;
    g.add(hull, breach, mast, yard, sail, stump);
    g.rotation.set(0.18, 0, 0.1);
    g.position.y = -0.38;
    g.scale.setScalar(1.05);
    return { object: g, update: (t) => (sail.rotation.y = 0.25 + 0.08 * Math.sin(t * 0.6)) };
  },

  // Year 1, Legend of the Deep: a sunken castle, far back, with a flag waving on top.
  'year-1': (kit) => {
    const g = new Group();
    const towerM = kit.toon('#285571');
    const wallM = kit.toon('#224b64');
    const keepM = kit.toon('#2c5d7b');
    const dark = kit.toon('#10283a');
    for (const side of [1, -1]) {
      const tower = mesh(kit, new CylinderGeometry(0.3, 0.33, 1.5, 16), towerM);
      tower.position.set(side * 0.95, 0.75, 0);
      g.add(tower);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const b = mesh(kit, new BoxGeometry(0.12, 0.14, 0.12), towerM);
        b.position.set(side * 0.95 + Math.cos(a) * 0.26, 1.56, Math.sin(a) * 0.26);
        b.rotation.y = -a;
        g.add(b);
      }
      const towerSlit = mesh(kit, new BoxGeometry(0.08, 0.16, 0.05), dark);
      towerSlit.position.set(side * 0.95, 1.05, 0.3);
      g.add(towerSlit);
    }
    const wall = mesh(kit, new BoxGeometry(1.3, 0.85, 0.42), wallM);
    wall.position.y = 0.42;
    const keep = mesh(kit, new BoxGeometry(0.62, 2.0, 0.62), keepM);
    keep.position.y = 1.0;
    g.add(wall, keep);
    for (const [x, z] of [[-0.24, 0.24], [0, 0.24], [0.24, 0.24], [-0.24, -0.24], [0, -0.24], [0.24, -0.24], [-0.24, 0], [0.24, 0]]) {
      const b = mesh(kit, new BoxGeometry(0.13, 0.15, 0.13), keepM);
      b.position.set(x, 2.07, z);
      g.add(b);
    }
    const door = mesh(kit, new CylinderGeometry(0.16, 0.16, 0.05, 16, 1, false, 0, Math.PI), dark);
    door.rotation.x = Math.PI / 2;
    door.rotation.z = Math.PI / 2;
    door.position.set(0, 0.24, 0.32);
    const doorLow = mesh(kit, new BoxGeometry(0.32, 0.24, 0.05), dark);
    doorLow.position.set(0, 0.12, 0.32);
    const slit = mesh(kit, new BoxGeometry(0.08, 0.2, 0.05), dark);
    slit.position.set(0, 1.55, 0.31);
    g.add(door, doorLow, slit);
    const pole = mesh(kit, new CylinderGeometry(0.015, 0.015, 0.5, 6), keepM);
    pole.position.set(0, 2.4, 0);
    const flagGeo = new PlaneGeometry(0.34, 0.2, 8, 1);
    flagGeo.translate(0.17, 0, 0);
    const flag = mesh(kit, flagGeo, kit.toon('#e8775a', { side: DoubleSide }));
    flag.position.set(0.015, 2.54, 0);
    g.add(pole, flag);
    const fp = flagGeo.getAttribute('position');
    const rest = Float32Array.from(fp.array as Float32Array);
    g.position.y = -0.05;
    return {
      object: g,
      update: (t) => {
        for (let i = 0; i < fp.count; i++) {
          const x = rest[i * 3];
          fp.setZ(i, Math.sin(t * 2.4 - x * 14) * 0.05 * (x / 0.34));
        }
        fp.needsUpdate = true;
      },
    };
  },
};
