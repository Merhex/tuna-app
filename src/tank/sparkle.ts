import { AdditiveBlending, Box3, CanvasTexture, Group, Sprite, SpriteMaterial, Vector3, type Object3D } from 'three';
import type { Kit } from './kit';

/** Where the stars sit round a decoration (as fractions of its size), how big, and when they start. Like the drawn seabed's. */
const SPARKS: [number, number, number, number][] = [
  [-0.5, 0.45, 1, 0],
  [0.55, 0.25, 0.8, 0.25],
  [-0.25, -0.45, 0.6, 0.5],
  [0.4, -0.45, 0.9, 0.7],
  [0.05, 0.7, 0.7, 0.95],
];

interface Burst {
  target: Object3D;
  scale: Vector3;
  start: number;
  halo: Sprite;
  stars: Sprite[];
}

/**
 * A new decoration's sparkle (D43), in 3D: it pops up from small, a soft glow comes and goes, and
 * five little stars twinkle round it three times. About 3.5 seconds, in real time.
 */
export class Sparkles {
  readonly group = new Group();
  private bursts: Burst[] = [];
  private star: SpriteMaterial;
  private glow: SpriteMaterial;

  constructor(kit: Kit) {
    this.star = kit.keep(new SpriteMaterial({ map: kit.keep(texture(drawStar)), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    this.glow = kit.keep(new SpriteMaterial({ map: kit.keep(texture(drawGlow)), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  }

  /** Sparkles round `target`, starting `delay` seconds after `now`. */
  add(target: Object3D, delay: number, now: number) {
    target.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(target);
    const centre = box.getCenter(new Vector3());
    const size = Math.max(0.25, box.getSize(new Vector3()).length() * 0.6);
    const halo = new Sprite(this.glow.clone());
    halo.position.copy(centre);
    halo.scale.setScalar(size * 2);
    const stars = SPARKS.map(([x, y, s]) => {
      const star = new Sprite(this.star.clone());
      star.position.set(centre.x + x * size, centre.y + y * size, centre.z + 0.05);
      star.userData.size = s * size * 0.4;
      return star;
    });
    this.group.add(halo, ...stars);
    const burst = { target, scale: target.scale.clone(), start: now + delay, halo, stars };
    this.bursts.push(burst);
    this.show(burst, now);
  }

  /** Stops every sparkle and puts the decorations back to their size (when they're rebuilt). */
  clear() {
    this.bursts.forEach((b) => this.end(b));
    this.bursts = [];
  }

  update(now: number) {
    this.bursts = this.bursts.filter((b) => {
      if (now - b.start < 3.6) {
        this.show(b, now);
        return true;
      }
      this.end(b);
      return false;
    });
  }

  private show(b: Burst, now: number) {
    const e = now - b.start;
    // Hidden until its turn, then pops up from a fifth of its size, overshooting a little.
    const p = Math.min(1, Math.max(0, e / 0.9));
    const pop = e < 0 ? 0.001 : 0.2 + 0.8 * (1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2);
    b.target.scale.copy(b.scale).multiplyScalar(pop);
    // The glow: in over the first quarter of 2.4 s, then out.
    const h = e / 2.4;
    (b.halo.material as SpriteMaterial).opacity = h < 0 || h > 1 ? 0 : h < 0.25 ? h / 0.25 : 1 - (h - 0.25) / 0.75;
    // Each star: three twinkles of 0.9 s, growing and turning as it brightens.
    b.stars.forEach((star, i) => {
      const s = e - SPARKS[i][3];
      const on = s >= 0 && s < 2.7;
      const k = on ? Math.sin(((s % 0.9) / 0.9) * Math.PI) : 0;
      const m = star.material as SpriteMaterial;
      m.opacity = k;
      m.rotation = k * (Math.PI / 4);
      star.scale.setScalar(star.userData.size * (0.3 + 0.9 * k));
    });
  }

  private end(b: Burst) {
    b.target.scale.copy(b.scale);
    [b.halo, ...b.stars].forEach((s) => {
      (s.material as SpriteMaterial).dispose();
      this.group.remove(s);
    });
  }
}

export function texture(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  draw(canvas.getContext('2d')!);
  return new CanvasTexture(canvas);
}

/** A four-pointed star, like the drawn sparkles. */
export function drawStar(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath();
  const pts = [[0, -30], [6, -6], [30, 0], [6, 6], [0, 30], [-6, 6], [-30, 0], [-6, -6]];
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(32 + x, 32 + y) : ctx.moveTo(32 + x, 32 + y)));
  ctx.closePath();
  ctx.fill();
}

/** A soft warm glow. */
export function drawGlow(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 240, 190, 0.85)');
  g.addColorStop(0.5, 'rgba(255, 220, 150, 0.3)');
  g.addColorStop(1, 'rgba(255, 220, 150, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
}
