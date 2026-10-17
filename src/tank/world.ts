import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  type Scene,
} from 'three';
import { seeded } from '../school3d';
import { Kit, paint } from './kit';

/** True for an angle (round the tank, 0 along +x) within `spread` radians of straight towards the camera's home spot (+z). */
const inFront = (a: number, spread: number) => Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < spread;

/** The water's colour where it fades out in the distance; the fog and the horizon use it too. */
export const WATER = '#0d3a58';

/**
 * Everything that's always there: the water (a gradient from the light surface to the dark deep),
 * the light, the sand with ripples of light moving across it, a ring of rocks, swaying kelp, soft
 * rays from the surface and rising bubbles.
 */
export class World {
  readonly group = new Group();
  private time = { value: 0 };
  private rays: Mesh[] = [];
  private bubbles: Points;
  private bubbleSpeed: Float32Array;

  constructor(scene: Scene, kit: Kit) {
    const rand = seeded(42);
    scene.add(this.group);

    // Water: a big ball round everything, light above and dark below.
    const sky = new Mesh(
      kit.keep(new SphereGeometry(80, 24, 16)),
      kit.keep(
        new ShaderMaterial({
          side: BackSide,
          depthWrite: false,
          uniforms: { top: { value: new Color('#2f8cc0') }, mid: { value: new Color(WATER) }, deep: { value: new Color('#04121d') } },
          vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 deep; varying vec3 vDir;
            void main() {
              float h = vDir.y;
              vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h * 1.4, 0.0, 1.0), 0.8)) : mix(mid, deep, clamp(-h * 2.5, 0.0, 1.0));
              gl_FragColor = vec4(c, 1.0);
              #include <colorspace_fragment>
            }`,
        }),
      ),
    );
    sky.renderOrder = -1;
    this.group.add(sky);

    // Light from the surface, a little cool, and a sun from above for the toon bands.
    this.group.add(new HemisphereLight('#bfe8ff', '#1d4256', 1.7));
    const sun = new DirectionalLight('#ffffff', 1.5);
    sun.position.set(3, 10, 5);
    this.group.add(sun);

    // Sand, with low dunes and ripples of light (caustics) drifting over it.
    const sandGeo = new PlaneGeometry(70, 70, 100, 100);
    sandGeo.rotateX(-Math.PI / 2);
    const sp = sandGeo.getAttribute('position');
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i);
      const z = sp.getZ(i);
      const dunes = 0.12 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.45) + 0.06 * Math.sin(x * 1.7 + z * 1.1);
      // Rises gently far away, so the edge of the world is never seen.
      const rim = Math.max(0, Math.hypot(x, z) - 9) * 0.08;
      sp.setY(i, dunes + rim * rim);
    }
    sandGeo.computeVertexNormals();
    const sandMat = kit.toon('#3d6f86');
    const time = this.time;
    sandMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWorld;')
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          vec2 q = vWorld.xz * 0.9;
          float c = sin(q.x * 1.3 + uTime * 0.6 + sin(q.y * 1.1 + uTime * 0.4) * 1.6)
                  * sin(q.y * 1.5 - uTime * 0.5 + sin(q.x * 0.9 - uTime * 0.3) * 1.6);
          float near = 1.0 - smoothstep(6.0, 14.0, length(vWorld.xz));
          gl_FragColor.rgb += vec3(0.55, 0.85, 1.0) * smoothstep(0.55, 0.95, c) * 0.13 * near;`,
        );
    };
    this.group.add(new Mesh(kit.keep(sandGeo), sandMat));

    // A loose ring of low, chunky rocks round the edge, and a few pebbles nearer in.
    // A plain icosahedron already has flat faces, for a chunky low-poly look.
    const rockMat = kit.toon('#2b4c61');
    const pebbleMat = kit.toon('#3a6178');
    const rockGeo = kit.keep(new IcosahedronGeometry(1, 0));
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rand() * 0.2;
      const r = 6.2 + rand() * 1.4;
      // None right in front of the home view, where they'd fill the bottom of the screen.
      if (inFront(a, 0.8)) continue;
      const rock = new Mesh(rockGeo, rockMat);
      const s = 0.35 + rand() * 0.6;
      rock.scale.set(s * (1 + rand() * 0.6), s * (0.5 + rand() * 0.4), s * (1 + rand() * 0.4));
      rock.position.set(Math.cos(a) * r, s * 0.15, -Math.sin(a) * r);
      rock.rotation.set(rand(), rand() * 6, rand());
      this.group.add(rock);
    }
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const r = 1.2 + rand() * 4;
      const pebble = new Mesh(rockGeo, pebbleMat);
      const s = 0.07 + rand() * 0.1;
      pebble.scale.set(s * 1.4, s * 0.7, s);
      pebble.position.set(Math.cos(a) * r, 0.03, -Math.sin(a) * r);
      pebble.rotation.set(rand(), rand() * 6, rand());
      this.group.add(pebble);
    }

    this.group.add(this.kelp(kit, rand));
    this.addRays(kit, rand);
    const { points, speed } = this.makeBubbles(kit, rand);
    this.bubbles = points;
    this.bubbleSpeed = speed;
    this.group.add(points);
  }

  /** Kelp in clumps, mostly round the edge, swaying (on the graphics card) more towards the top. */
  private kelp(kit: Kit, rand: () => number) {
    const blade = new PlaneGeometry(0.16, 1, 1, 10);
    blade.translate(0, 0.5, 0);
    // Pointed at the top, a little wider in the middle.
    const p = blade.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) * (0.6 + Math.sin(Math.PI * Math.min(1, y * 1.05)) * 0.8) * (1 - y * 0.55));
    }
    paint(blade, (_x, y) => (y > 0.7 ? '#2f8a6a' : y > 0.35 ? '#237a5e' : '#1a644e'));
    const spots: { x: number; z: number; n: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      const r = 5.2 + rand() * 1.2;
      if (inFront(a, 0.6)) continue;
      spots.push({ x: Math.cos(a) * r, z: -Math.sin(a) * r, n: 4 + Math.floor(rand() * 4) });
    }
    // Two small clumps in front, where the home view sees them, like the seaweed in the drawing.
    spots.push({ x: -3.3, z: 3.6, n: 4 }, { x: 3.4, z: 3.3, n: 3 });
    const total = spots.reduce((s, c) => s + c.n, 0);
    const mat = kit.painted({ side: DoubleSide });
    const time = this.time;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aPhase;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float k = position.y * position.y;
          transformed.x += sin(uTime * 0.8 + aPhase + position.y * 1.8) * 0.28 * k;
          transformed.z += cos(uTime * 0.6 + aPhase * 1.3) * 0.12 * k;`,
        );
    };
    const mesh = new InstancedMesh(kit.keep(blade), mat, total);
    const phase = new Float32Array(total);
    const d = new Object3D();
    let i = 0;
    for (const c of spots) {
      for (let j = 0; j < c.n; j++, i++) {
        d.position.set(c.x + (rand() - 0.5) * 0.7, -0.05, c.z + (rand() - 0.5) * 0.7);
        d.rotation.set(0, rand() * Math.PI, 0);
        const h = 1.2 + rand() * 2.4;
        d.scale.set(1 + rand() * 0.5, h, 1);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
        phase[i] = rand() * Math.PI * 2;
      }
    }
    blade.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1));
    mesh.frustumCulled = false;
    return mesh;
  }

  /**
   * Soft shafts of light from the surface, slowly brightening and fading. Each is an open cone,
   * brightest near the top and gone well above the sand, and faint where it's seen edge-on, so it
   * reads as light rather than a tube.
   */
  private addRays(kit: Kit, rand: () => number) {
    for (let i = 0; i < 6; i++) {
      const geo = kit.keep(new CylinderGeometry(0.3 + rand() * 0.4, 1.2 + rand() * 1, 14, 20, 1, true));
      geo.translate(0, -7, 0);
      const material = kit.keep(
        new ShaderMaterial({
          uniforms: { opacity: { value: 0.06 }, color: { value: new Color('#bfe9ff') } },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          side: DoubleSide,
          vertexShader: `varying vec2 vUv; varying float vFacing;
            void main() {
              vUv = uv;
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vec3 n = normalize(normalMatrix * normal);
              vFacing = abs(dot(n, normalize(-mv.xyz)));
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `uniform float opacity; uniform vec3 color; varying vec2 vUv; varying float vFacing;
            void main() {
              // uv.y is 1 at the top of the shaft and 0 at the bottom.
              float along = smoothstep(1.0, 0.85, vUv.y) * smoothstep(0.1, 0.6, vUv.y);
              gl_FragColor = vec4(color, opacity * along * vFacing * vFacing);
            }`,
        }),
      );
      const ray = new Mesh(geo, material);
      const a = rand() * Math.PI * 2;
      const r = rand() * 5;
      ray.position.set(Math.cos(a) * r, 15, -Math.sin(a) * r);
      ray.rotation.set((rand() - 0.5) * 0.3, 0, 0.18 + rand() * 0.12);
      ray.userData.phase = rand() * Math.PI * 2;
      this.rays.push(ray);
      this.group.add(ray);
    }
  }

  private makeBubbles(kit: Kit, rand: () => number) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(11, 11, 3, 0, Math.PI * 2);
    ctx.fill();
    const n = 70;
    const pos = new Float32Array(n * 3);
    const speed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 6.5;
      pos.set([Math.cos(a) * r, rand() * 9, -Math.sin(a) * r], i * 3);
      speed[i] = 0.3 + rand() * 0.5;
    }
    const geo = kit.keep(new BufferGeometry());
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    const points = new Points(
      geo,
      kit.keep(new PointsMaterial({ map: kit.keep(new CanvasTexture(canvas)), size: 0.13, transparent: true, opacity: 0.7, depthWrite: false })),
    );
    points.frustumCulled = false;
    return { points, speed };
  }

  update(t: number, dt: number) {
    this.time.value = t;
    this.rays.forEach((ray) => {
      (ray.material as ShaderMaterial).uniforms.opacity.value = 0.17 + 0.09 * Math.sin(t * 0.25 + ray.userData.phase);
    });
    const pos = this.bubbles.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + this.bubbleSpeed[i] * dt;
      if (y > 9) y = 0;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 1.5 + i) * 0.002);
    }
    pos.needsUpdate = true;
  }
}
