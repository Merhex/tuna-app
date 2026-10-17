import { Fog, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { between, cameraAt, fovFor, HOME_VIEW, mascotSpot, SCHOOL3D_SETTINGS, WIDE_FIT, WIDE_VIEW, type View } from '../school3d';
import { decoration, type Piece } from './decorations';
import { Kit } from './kit';
import { Mascot, type Face } from './mascot';
import { Sparkles } from './sparkle';
import { School } from './tuna';
import { World, WATER } from './world';

export type Mode = 'home' | 'wide';

/**
 * The home screen's 3D tank (D55): the world, the school, the decorations and the big tuna, the
 * camera gliding between the home view and the wide view ("Visit my school"), and dragging to look
 * round in the wide view. One is made when the app starts and kept for as long as it runs, so going
 * back to the home screen is instant; it only draws while the home screen shows.
 *
 * With `calm` (Less motion), nothing swims, nothing sparkles and the camera moves straight to the
 * new view; a frame is drawn only when something changes.
 */
export class Tank {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(50, 1, 0.1, 200);
  private kit = new Kit();
  private world: World;
  private school: School;
  private mascot: Mascot;
  private sparkles: Sparkles;
  private decos = new Group();
  private pieces: Piece[] = [];
  /** The decorations' materials and shapes, freed and made afresh when they change. */
  private decoKit = new Kit();
  private decoKey = '';
  private tuna = -1;
  /** Decorations that have had their sparkle while the app is open. */
  private sparkled = new Set<string>();

  private mode: Mode = 'home';
  /** Where the glide started, and when (seconds of real time); null once it's done. */
  private glide: { from: View; at: number } | null = null;
  /** In the wide view: how far she has turned the camera round the tank, and up or down. */
  private turn = 0;
  private tilt = 0;
  private lastDrag = -Infinity;
  private dragging = false;
  /** The wide view for this screen: far enough back for the whole tank to fit between the top bar and the panel. */
  private wide: View = WIDE_VIEW;
  private free = { top: 0, bottom: 1 };
  private size = { width: 1, height: 1 };

  private running = false;
  private t = 0;
  private last = 0;
  private frame = 0;
  private dirty = true;
  private fpsFrames = 0;
  private fpsAt = 0;
  private slowSeconds = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private calm: boolean,
    events: { lost: () => void; restored: () => void },
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene.fog = new Fog(WATER, 8, 30);
    this.world = new World(this.scene, this.kit);
    this.school = new School(this.kit);
    this.mascot = new Mascot(this.kit);
    this.sparkles = new Sparkles(this.kit);
    this.scene.add(this.school.mesh, this.decos, this.mascot.object, this.sparkles.group);
    this.applyView(HOME_VIEW);
    // A phone can take the 3D away (low memory, a long time in the background). Then the home screen
    // goes back to the drawn seabed until it's given back.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      events.lost();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.dirty = true;
      events.restored();
    });
  }

  /**
   * Gets the graphics card ready before the first frame (where the phone can, without holding up
   * the screen), then draws it, so the tank fades in whole.
   */
  async warmUp() {
    this.tick(true);
    try {
      if (this.renderer.extensions.has('KHR_parallel_shader_compile')) await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
    } catch {
      /* compiled on the first frame instead */
    }
    this.tick(true);
  }

  setCalm(calm: boolean) {
    this.calm = calm;
    if (calm) this.sparkles.clear();
    this.dirty = true;
  }

  setTuna(n: number) {
    if (n === this.tuna) return;
    this.tuna = n;
    this.school.setCount(n);
    this.dirty = true;
  }

  /** Shows these milestones' decorations (and nothing else) on the sand. */
  setDecorations(ids: string[], coral: { scale: number; hue: number }) {
    const key = `${ids.join()}|${coral.scale}|${coral.hue}`;
    if (key === this.decoKey) return;
    this.decoKey = key;
    this.sparkles.clear();
    this.decos.clear();
    this.decoKit.dispose();
    this.decoKit = new Kit();
    this.pieces = ids.map((id) => decoration(id, this.decoKit, coral)).filter((p): p is Piece => !!p);
    this.pieces.forEach((p) => this.decos.add(p.object));
    this.dirty = true;
  }

  /** New decorations sparkle once, in this order, like the drawn seabed's (D43). With calm, they just appear. */
  sparkle(ids: string[]) {
    const now = performance.now() / 1000;
    ids
      .filter((id) => !this.sparkled.has(id))
      .forEach((id, order) => {
        this.sparkled.add(id);
        const target = this.decos.getObjectByName(id);
        if (target && !this.calm) this.sparkles.add(target, 0.5 + order * 0.45, now);
      });
    this.dirty = true;
  }

  /** Puts the big tuna exactly over where the drawing would be (its box in screen pixels). */
  placeMascot(box: { x: number; y: number; width: number; height: number }) {
    if (box.width <= 0) return;
    this.mascot.place(mascotSpot(box, this.size, this.camera.fov));
    this.fitWide();
  }

  setMood(face: Face) {
    this.mascot.setFace(face);
    this.dirty = true;
  }

  /** The big tuna squishes a little, like pressing the drawing. */
  squish() {
    this.mascot.squish(performance.now() / 1000);
    this.dirty = true;
  }

  /** Glides to the home view or the wide view (or jumps there, with calm). */
  go(mode: Mode) {
    if (mode === this.mode) return;
    const from = this.currentView();
    // The camera may have drifted round several times; swim back the short way.
    from.yaw = Math.atan2(Math.sin(from.yaw), Math.cos(from.yaw));
    this.glide = this.calm ? null : { from, at: performance.now() / 1000 };
    this.mode = mode;
    if (mode === 'home') this.tilt = 0;
    this.turn = 0;
    this.dirty = true;
  }

  /** Dragging in the wide view: `dx` and `dy` are fractions of the screen's width and height. */
  drag(dx: number, dy: number) {
    if (this.mode !== 'wide') return;
    this.dragging = true;
    this.turn -= dx * SCHOOL3D_SETTINGS.dragTurn;
    this.tilt = Math.min(0.55, Math.max(-0.3, this.tilt + dy * 1.2));
    this.lastDrag = performance.now() / 1000;
    this.dirty = true;
  }

  release() {
    this.dragging = false;
  }

  /** The part of the screen (in pixels from the top) the wide view has to itself, between the top bar and the panel. */
  setFreeArea(top: number, bottom: number) {
    if (top === this.free.top && bottom === this.free.bottom) return;
    this.free = { top, bottom };
    this.fitWide();
  }

  resize(width: number, height: number) {
    if (!width || !height || (width === this.size.width && height === this.size.height)) return;
    this.size = { width, height };
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = fovFor(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this.fitWide();
  }

  /**
   * Centres the wide view in the free area and pulls it back until every point in WIDE_FIT, and
   * the big tuna, is inside it, with a margin. Done on a spare camera, so the one on screen isn't touched.
   */
  private fitWide() {
    const { width, height } = this.size;
    const { top, bottom } = this.free;
    const shift = height / 2 - (top + bottom) / 2;
    const probe = new PerspectiveCamera(this.camera.fov, this.camera.aspect, 0.1, 200);
    if (Math.abs(shift) > 0.5) probe.setViewOffset(width, height, 0, shift, width, height);
    const margin = 14;
    const p = new Vector3();
    const points = [...WIDE_FIT, this.mascot.position];
    const fits = (distance: number) => {
      const c = cameraAt({ ...WIDE_VIEW, distance });
      probe.position.set(c.x, c.y, c.z);
      probe.lookAt(0, WIDE_VIEW.targetY, 0);
      probe.updateMatrixWorld();
      return points.every(([x, y, z]) => {
        p.set(x, y, z).project(probe);
        const sx = ((p.x + 1) / 2) * width;
        const sy = ((1 - p.y) / 2) * height;
        return sx > margin && sx < width - margin && sy > top + margin && sy < bottom - margin;
      });
    };
    let distance = WIDE_VIEW.distance;
    while (distance < 40 && !fits(distance)) distance += 0.25;
    this.wide = { ...WIDE_VIEW, distance, shift };
    this.dirty = true;
  }

  /** Draws while the home screen shows; stops when it doesn't. */
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now() / 1000;
    this.dirty = true;
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.tick();
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose() {
    this.stop();
    this.decoKit.dispose();
    this.kit.dispose();
    this.renderer.dispose();
    // Phones only allow a few 3D canvases at once, so give this one back straight away.
    this.renderer.forceContextLoss();
  }

  /** The view the camera is aiming for: the home view, or the wide view turned as she dragged it. */
  private targetView(): View {
    if (this.mode === 'home') return HOME_VIEW;
    return { ...this.wide, yaw: this.wide.yaw + this.turn, elevation: this.wide.elevation + this.tilt };
  }

  private currentView(): View {
    const target = this.targetView();
    if (!this.glide) return target;
    const p = (performance.now() / 1000 - this.glide.at) / SCHOOL3D_SETTINGS.glideSeconds;
    if (p >= 1) {
      this.glide = null;
      return target;
    }
    return between(this.glide.from, target, p);
  }

  private applyView(v: View) {
    const c = cameraAt(v);
    this.camera.position.set(c.x, c.y, c.z);
    this.camera.lookAt(0, v.targetY, 0);
    const { width, height } = this.size;
    if (Math.abs(v.shift) > 0.5) this.camera.setViewOffset(width, height, 0, v.shift, width, height);
    else this.camera.clearViewOffset();
    // Further back, the water is clearer: the fog starts and ends further off, so the tank stays in view.
    const fog = this.scene.fog as Fog;
    fog.near = v.distance * 0.6;
    fog.far = v.distance + 22;
  }

  private tick(force = false) {
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, now - this.last);
    this.last = now;
    if (!force) this.countFrame(now);

    // Left alone in the wide view, the camera drifts slowly round the tank.
    const idle = this.mode === 'wide' && !this.dragging && now - this.lastDrag > SCHOOL3D_SETTINGS.driftAfter;
    if (idle && !this.calm && !this.glide) this.turn += SCHOOL3D_SETTINGS.drift * dt;

    const moving = !this.calm || !!this.glide;
    if (!force && !moving && !this.dirty) return;
    if (!this.calm && !force) this.t += dt;
    this.applyView(this.currentView());
    this.world.update(this.t, this.calm ? 0 : dt);
    this.school.update(this.t);
    this.mascot.update(this.t, now);
    this.pieces.forEach((p) => p.update?.(this.t));
    this.sparkles.update(now);
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  /** If the phone can't keep up (under 40 frames a second for two seconds), draws fewer pixels. */
  private countFrame(now: number) {
    this.fpsFrames++;
    // Starting again after a pause (another screen, or the app in the background) isn't slowness.
    if (!this.fpsAt || now - this.fpsAt > 2) {
      this.fpsAt = now;
      this.fpsFrames = 0;
      return;
    }
    if (now - this.fpsAt < 1) return;
    const fps = this.fpsFrames / (now - this.fpsAt);
    this.fpsFrames = 0;
    this.fpsAt = now;
    if (this.calm) return;
    this.slowSeconds = fps < 40 ? this.slowSeconds + 1 : 0;
    const ratio = this.renderer.getPixelRatio();
    if (this.slowSeconds >= 2 && ratio > 1) {
      this.renderer.setPixelRatio(Math.max(1, ratio - 0.5));
      this.slowSeconds = 0;
    }
  }
}
