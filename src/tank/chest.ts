import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { CHEST, sandAt } from '../school3d';
import { paint, type Kit } from './kit';

// The drawing's colours (components/Chest.tsx).
const WOOD_TOP = '#9a6531';
const WOOD_BOTTOM = '#6e4420';
const PLANK = '#5a3717';
const BAND = '#c99a2e';
const LOCK = '#e3b23c';
const KEYHOLE = '#4a3110';
const INSIDE = '#3e2510';
const LID_INSIDE = '#5c3818';
const GOLD_TOP = '#ffe9a3';
const GOLD_BOTTOM = '#e0a419';
const COIN = '#ffd96b';
const COIN_EDGE = '#c98e12';
const SHADOW = '#0a2233';

/** Where the coins lie on the gold, as fractions of the heap's half-width and half-depth, like the drawing's. */
const ON_TOP: [number, number][] = [
  [-0.5, 0.3], [-0.12, 0.55], [0.22, 0.5], [0.52, 0.18], [0, 0], [-0.3, -0.3], [0.3, -0.32],
  [-0.62, -0.05], [0.66, -0.12], [-0.2, 0.22], [0.12, -0.6], [0.38, 0.62],
];

/** Two gems in the gold, a ruby and a sapphire (where, as for the coins, and their colour). */
const GEMS: [number, number, string][] = [
  [-0.36, 0.48, '#ff5a6e'],
  [0.44, 0.36, '#5ec4f0'],
];

/**
 * Coins spilled on the sand round the chest (x, z, and whether it's propped up on its edge): one more
 * for every sixth of the way to a full chest, like the drawing.
 */
const SPILL: [number, number, boolean][] = [
  [-0.62, 0.32, false],
  [0.62, 0.38, false],
  [-0.5, 0.55, true],
  [0.72, 0.08, true],
  [-0.28, 0.62, false],
  [0.4, 0.6, true],
];

/** The twinkles over the gold (x, height above the heap, z, and when each starts, in seconds), like the drawing's. */
const TWINKLES: [number, number, number, number][] = [
  [-0.17, 0.06, 0.1, 0],
  [0.2, -0.01, 0.12, 0.8],
  [0.04, 0.13, 0.04, 1.6],
];

/**
 * The sunken treasure chest in the middle of the tank (D56), in 3D: the drawing's wooden chest with
 * gold bands and a lock, half sunk in the sand. Its lid opens on the treasure screen, showing a heap
 * of gold that's higher the more she has saved, with coins spilling onto the sand round it, a soft
 * glow and a few twinkles. `shine` (the glow and star pictures) is left out where there's no screen
 * to draw them on (the tests).
 */
export class Chest {
  readonly object = new Group();
  private box = new Group();
  private lid = new Group();
  private heap: Mesh;
  private onTop: Mesh[] = [];
  private gems: Mesh[] = [];
  private spilled: Mesh[] = [];
  private glow: Sprite | null = null;
  private twinkles: Sprite[] = [];
  private fill = 0;
  /** How open the lid is: 0 shut, 1 open (a little more while it overshoots). */
  private amount = 0;
  /** A soft glow while shut, in the wide view, so she sees it can be tapped: 0–1, fading in and out. */
  private beckon = 0;
  private beckonWanted = false;
  private lastUpdate = 0;
  private motion: { from: number; to: number; at: number; seconds: number } | null = null;

  constructor(kit: Kit, shine?: { star: Texture; glow: Texture }) {
    const { width: W, depth: D, height: H } = CHEST;
    const wood = kit.painted();
    const band = kit.toon(BAND);
    const dark = kit.toon(INSIDE);
    const gleam = { emissive: new Color('#b07a10'), emissiveIntensity: 0.3 };
    const coinFace = kit.toon(COIN, gleam);
    const coinEdge = kit.toon(COIN_EDGE, gleam);
    const coinGeo = kit.keep(new CylinderGeometry(0.042, 0.042, 0.012, 14));
    const coin = () => new Mesh(coinGeo, [coinEdge, coinFace, coinFace]);
    const add = (parent: Group, geo: BufferGeometry, material: Material | Material[], x: number, y: number, z: number) => {
      const m = new Mesh(kit.keep(geo), material);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };

    // The box: wood, lighter at the top, with two plank lines round it, two gold straps and a gold rim.
    const body = paint(new BoxGeometry(W, H, D), (_x, y) => (y > 0 ? WOOD_TOP : WOOD_BOTTOM));
    add(this.box, body, wood, 0, H / 2, 0);
    for (const k of [0.33, 0.66]) add(this.box, new BoxGeometry(W + 0.006, 0.012, D + 0.006), kit.toon(PLANK), 0, H * k, 0);
    for (const side of [1, -1]) add(this.box, new BoxGeometry(0.06, H + 0.004, D + 0.014), band, side * W * 0.37, H / 2, 0);
    add(this.box, new BoxGeometry(W + 0.024, 0.045, D + 0.024), band, 0, H - 0.012, 0);
    // Dark inside the rim, under the gold.
    add(this.box, new BoxGeometry(W - 0.06, 0.002, D - 0.06), dark, 0, H + 0.0115, 0);

    // The lock on the front, under the rim.
    add(this.box, new BoxGeometry(0.11, 0.12, 0.035), kit.toon(LOCK), 0, H - 0.1, D / 2 + 0.0175);
    const keyhole = kit.toon(KEYHOLE);
    add(this.box, new CylinderGeometry(0.016, 0.016, 0.01, 10).rotateX(Math.PI / 2), keyhole, 0, H - 0.085, D / 2 + 0.036);
    add(this.box, new BoxGeometry(0.012, 0.035, 0.01), keyhole, 0, H - 0.108, D / 2 + 0.036);

    // The gold: a low dome filling the rim, lighter on top. Its height follows the fill (see pose).
    const gold = paint(new SphereGeometry(1, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2), (_x, y) => (y > 0.55 ? GOLD_TOP : GOLD_BOTTOM));
    this.heap = add(this.box, gold, kit.painted(gleam), 0, H + 0.012, 0);
    this.heap.scale.set(W * 0.45, 0.05, D * 0.42);
    for (const _ of ON_TOP) {
      const c = coin();
      this.box.add(c);
      this.onTop.push(c);
    }
    const gemGeo = kit.keep(new OctahedronGeometry(0.04, 0));
    gemGeo.scale(1, 1.3, 1);
    for (const [, , color] of GEMS) {
      const gem = new Mesh(gemGeo, kit.toon(color, { emissive: new Color(color), emissiveIntensity: 0.35 }));
      this.box.add(gem);
      this.gems.push(gem);
    }

    // The lid: a half-round dome hinged at the back, with gold straps over it and dark wood underneath.
    const R = D / 2 + 0.012;
    const dome = (radius: number, length: number) => {
      const g = new CylinderGeometry(radius, radius, length, 18, 1, false, 0, Math.PI);
      g.rotateZ(Math.PI / 2);
      g.scale(1, 0.72, 1);
      g.translate(0, 0, D / 2);
      return g;
    };
    add(this.lid, paint(dome(R, W + 0.01), (_x, y) => (y > R * 0.4 ? WOOD_TOP : WOOD_BOTTOM)), wood, 0, 0, 0);
    for (const side of [1, -1]) add(this.lid, dome(R + 0.008, 0.06), band, side * W * 0.37, 0, 0);
    add(this.lid, new PlaneGeometry(W + 0.01, 2 * R).rotateX(Math.PI / 2), kit.toon(LID_INSIDE, { side: DoubleSide }), 0, -0.001, D / 2);
    add(this.lid, new PlaneGeometry(W - 0.07, 2 * R - 0.07).rotateX(Math.PI / 2), kit.toon(INSIDE, { side: DoubleSide }), 0, -0.003, D / 2);
    // The straps show on the inside too, like the drawing's open lid.
    for (const side of [1, -1]) add(this.lid, new BoxGeometry(0.05, 0.004, 2 * R - 0.03), band, side * W * 0.37, -0.006, D / 2);
    this.lid.position.set(0, H + 0.012, -D / 2);
    this.box.add(this.lid);

    if (shine) {
      const glowMat = kit.keep(new SpriteMaterial({ map: shine.glow, blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 }));
      this.glow = new Sprite(glowMat);
      this.glow.scale.setScalar(1.5);
      this.glow.position.set(0, H + 0.12, 0);
      this.box.add(this.glow);
      for (const _ of TWINKLES) {
        const star = new Sprite(kit.keep(new SpriteMaterial({ map: shine.star, blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 })));
        this.box.add(star);
        this.twinkles.push(star);
      }
    }

    // Half sunk in the dune in the middle, leaning a little.
    this.box.position.y = sandAt(0, 0) - CHEST.sunk;
    this.box.rotation.z = 0.03;
    this.object.add(this.box);

    // A soft shadow on the sand, following the dunes, fading out at the edge.
    const shadowGeo = new RingGeometry(0.001, 0.72, 24, 4);
    shadowGeo.rotateX(-Math.PI / 2);
    shadowGeo.scale(1, 1, 0.75);
    const sp = shadowGeo.getAttribute('position');
    const tint = new Color(SHADOW);
    const rgba = new Float32Array(sp.count * 4);
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i);
      const z = sp.getZ(i);
      sp.setY(i, sandAt(x, z) + 0.008);
      const r = Math.min(1, Math.hypot(x, z / 0.75) / 0.72);
      rgba.set([tint.r, tint.g, tint.b, 0.5 * (1 - r * r)], i * 4);
    }
    shadowGeo.setAttribute('color', new BufferAttribute(rgba, 4));
    const shadow = new Mesh(kit.keep(shadowGeo), kit.keep(new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })));
    shadow.renderOrder = 1;
    this.object.add(shadow);

    for (const [x, z, propped] of SPILL) {
      const c = coin();
      c.position.set(x, sandAt(x, z) + (propped ? 0.03 : 0.006), z);
      c.rotation.set(propped ? 1.1 : 0.05, x * 2, propped ? 0.3 : 0);
      c.visible = false;
      this.object.add(c);
      this.spilled.push(c);
    }
    this.pose(0);
  }

  /** How full it is, 0–1 (see chestFill): the gold piles higher and more coins spill out. */
  setFill(fill: number) {
    this.fill = Math.max(0, Math.min(1, fill));
    const spilled = Math.round(this.fill * SPILL.length);
    this.spilled.forEach((c, i) => (c.visible = i < spilled));
    this.pose(0);
  }

  /** Opens or shuts the lid, starting `delay` seconds after `now` (real time). */
  setOpen(open: boolean, now: number, delay = 0) {
    const to = open ? 1 : 0;
    if (this.motion ? this.motion.to === to : this.amount === to) return;
    this.motion = { from: this.amount, to, at: now + delay, seconds: open ? CHEST.openSeconds : CHEST.closeSeconds };
  }

  /** Straight open or shut, with no movement (Less motion). */
  jump(open: boolean) {
    this.motion = null;
    this.amount = open ? 1 : 0;
    this.pose(0);
  }

  /** Glows softly (in the wide view) to show it can be tapped. */
  setBeckon(on: boolean) {
    this.beckonWanted = on;
  }

  /** Whether the lid is on its way open or shut, or the glow is fading. */
  get moving() {
    return !!this.motion || this.beckon !== (this.beckonWanted ? 1 : 0);
  }

  /** Where to aim a tap at: the middle of the closed chest. */
  get centre(): Vector3 {
    return new Vector3(0, this.box.position.y + CHEST.height * 0.6, 0);
  }

  /** `t` is the scene's time (frozen with Less motion), for the twinkles; `now` is real time, for the lid. */
  update(t: number, now: number) {
    const dt = Math.min(0.1, Math.max(0, now - this.lastUpdate));
    this.lastUpdate = now;
    const goal = this.beckonWanted ? 1 : 0;
    this.beckon = goal > this.beckon ? Math.min(goal, this.beckon + dt * 1.5) : Math.max(goal, this.beckon - dt * 3);
    const m = this.motion;
    if (m) {
      const p = (now - m.at) / m.seconds;
      if (p >= 1) {
        this.amount = m.to;
        this.motion = null;
      } else if (p > 0) {
        // It swings open with a little overshoot, and drops shut.
        const k = m.to ? 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2 : p * p;
        this.amount = m.from + (m.to - m.from) * k;
      }
    }
    this.pose(t);
  }

  private pose(t: number) {
    const open = Math.max(0, Math.min(1, this.amount));
    this.lid.rotation.x = -CHEST.open * this.amount;
    // The gold rises above the rim as the treasure grows; shut, it stays under the lid.
    const { width: W, depth: D, height: H } = CHEST;
    const full = H * (0.125 + 0.66 * this.fill);
    const h = Math.min(full, 0.13) + (full - Math.min(full, 0.13)) * open;
    this.heap.scale.y = h;
    const a = W * 0.45;
    const c = D * 0.42;
    const onGold = (thing: Mesh, fx: number, fz: number, lift: number) => {
      const x = fx * a * 0.85;
      const z = fz * c * 0.85;
      const up = Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (z / c) ** 2));
      thing.position.set(x, H + 0.012 + h * up + lift, z);
      // Tipped along the slope of the gold.
      thing.rotation.set((z / c) * 0.9 * (h / 0.2), fx, (-x / a) * 0.9 * (h / 0.2));
    };
    this.onTop.forEach((coin, i) => onGold(coin, ON_TOP[i][0], ON_TOP[i][1], 0.004));
    this.gems.forEach((gem, i) => onGold(gem, GEMS[i][0], GEMS[i][1], 0.03));
    if (this.glow) {
      const pulse = Math.sin(t * 1.3);
      (this.glow.material as SpriteMaterial).opacity = Math.max(open * (0.7 + 0.1 * pulse), this.beckon * (0.5 + 0.15 * pulse));
      this.glow.position.y = H + 0.02 + h * 0.6;
      this.glow.scale.setScalar(1.5 + 0.6 * this.beckon * (1 - open));
    }
    this.twinkles.forEach((star, i) => {
      const [x, y, z, start] = TWINKLES[i];
      // Like the drawing's sparkles: each fades in and out over 2.4 seconds. Held still with Less motion (t is 0).
      const k = t ? Math.sin(Math.PI * (((t + 2.4 - start) % 2.4) / 2.4)) : 0.8;
      (star.material as SpriteMaterial).opacity = open * k;
      star.scale.setScalar(0.09 * (0.4 + 0.6 * k));
      star.position.set(x, H + 0.012 + h + y, z);
    });
  }
}
