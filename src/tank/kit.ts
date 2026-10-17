import {
  BufferGeometry,
  Color,
  DataTexture,
  Float32BufferAttribute,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  type MeshToonMaterialParameters,
} from 'three';

/**
 * Shared bits for building the tank: toon materials (three flat bands of light, for the same flat
 * look as the app's drawings), painting geometry with vertex colours, and a list of everything made,
 * so leaving the screen frees it all from the graphics card.
 */
export class Kit {
  private gradient: DataTexture;
  private made: { dispose(): void }[] = [];
  private cache = new Map<string, MeshToonMaterial>();

  constructor() {
    this.gradient = new DataTexture(new Uint8Array([105, 180, 255]), 3, 1, RedFormat);
    this.gradient.minFilter = this.gradient.magFilter = NearestFilter;
    this.gradient.generateMipmaps = false;
    this.gradient.needsUpdate = true;
    this.made.push(this.gradient);
  }

  /** A toon material in one colour (shared between meshes with the same colour and options). */
  toon(color: string, extra: MeshToonMaterialParameters = {}): MeshToonMaterial {
    const key = color + JSON.stringify(extra);
    let m = this.cache.get(key);
    if (!m) {
      m = this.keep(new MeshToonMaterial({ color, gradientMap: this.gradient, ...extra }));
      this.cache.set(key, m);
    }
    return m;
  }

  /** A toon material that takes its colours from the geometry (see `paint`). Never shared. */
  painted(extra: MeshToonMaterialParameters = {}): MeshToonMaterial {
    return this.keep(new MeshToonMaterial({ vertexColors: true, gradientMap: this.gradient, ...extra }));
  }

  /** Remembers something to free later, and hands it back. */
  keep<T extends { dispose(): void }>(thing: T): T {
    this.made.push(thing);
    return thing;
  }

  dispose() {
    this.made.forEach((m) => m.dispose());
    this.made = [];
    this.cache.clear();
  }
}

/** Gives every vertex of `geo` a colour: one colour, or one picked per vertex from its position. */
export function paint(geo: BufferGeometry, color: string | ((x: number, y: number, z: number) => string)) {
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    c.set(typeof color === 'string' ? color : color(pos.getX(i), pos.getY(i), pos.getZ(i)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geo;
}
