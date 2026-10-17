import { Fog, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import {
  between,
  cameraAt,
  CHEST_VIEW,
  chestMiddle,
  chestView,
  fovFor,
  HOME_VIEW,
  mascotSpot,
  SCHOOL3D_SETTINGS,
  WIDE_FIT,
  WIDE_VIEW,
  type View,
} from '../school3d';
import { Chest } from './chest';
import { decoration, type Piece } from './decorations';
import { Kit } from './kit';
import { Mascot, type Face } from './mascot';
import { drawGlow, drawStar, Sparkles, texture } from './sparkle';
import { School } from './tuna';
import { World, WATER } from './world';

export type Mode = 'home' | 'wide' | 'chest';

/**
 * The home screen's 3D tank (D55): the world, the school, the decorations, the big tuna and the
 * treasure chest in the middle (D56), the camera gliding between the home view, the wide view ("Visit
 * my school") and the chest (the treasure screen), and dragging to look round in the wide view. One
 * is made when the app starts and kept for as long as it runs, so going back to the home screen is
 * instant; it only draws while the home screen or the treasure screen shows.
 *
 * With `calm` (Less motion), nothing swims, nothing sparkles, the camera moves straight to the new
 * view and the chest's lid opens at once; a frame is drawn only when something changes.
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
  private chest: Chest;
  /** The treasure screen wants the lid open (she's counting, and not editing it). It opens only in the chest view. */
  private chestWanted = false;
  private decos = new Group();
  private pieces: Piece[] = [];
  /** The decorations' materials and shapes, freed and made afresh when they change. */
  private decoKit = new Kit();
  private decoKey = '';
  private tuna = -1;
  /** Decorations that have had their sparkle while the app is open. */
  private sparkled = new Set<string>();

  private mode: Mode = 'home';
  /** Where the glide started, when (seconds of real time) and for how long; null once it's done. */
  private glide: { from: View; at: number; seconds: number } | null = null;
  /** In the wide view: how far she has turned the camera round the tank, and up or down. */
  private turn = 0;
  private tilt = 0;
  private lastDrag = -Infinity;
  private dragging = false;
  /** The wide view for this screen: far enough back for the whole tank to fit between the top bar and the panel. */
  private wide: View = WIDE_VIEW;
  /** The chest view for the chest's slot on the treasure screen (see placeChest). */
  private chestSpot: View = { ...CHEST_VIEW, targetY: chestMiddle() };
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
    this.chest = new Chest(this.kit, { star: this.kit.keep(texture(drawStar)), glow: this.kit.keep(texture(drawGlow)) });
    this.scene.add(this.school.mesh, this.decos, this.mascot.object, this.sparkles.group, this.chest.object);
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

  /**
   * Glides to the home view, the wide view or the chest (or jumps there, with calm). Going to the
   * chest, its lid opens as the camera arrives; leaving it, the lid shuts straight away.
   */
  go(mode: Mode) {
    if (mode === this.mode) return;
    const from = this.currentView();
    // The camera may have drifted round several times; swim back the short way.
    from.yaw = Math.atan2(Math.sin(from.yaw), Math.cos(from.yaw));
    const seconds = mode === 'chest' || this.mode === 'chest' ? SCHOOL3D_SETTINGS.chestGlideSeconds : SCHOOL3D_SETTINGS.glideSeconds;
    this.glide = this.calm ? null : { from, at: performance.now() / 1000, seconds };
    this.mode = mode;
    if (mode === 'home') this.tilt = 0;
    this.turn = 0;
    this.lid(mode === 'chest' ? seconds * 0.5 : 0);
    this.dirty = true;
  }

  /** Whether the treasure screen wants the chest open: she's counting the money and not editing it. */
  setChestOpen(open: boolean) {
    if (open === this.chestWanted) return;
    this.chestWanted = open;
    this.lid(0);
  }

  /** How full the chest is, 0–1 (see chestFill). */
  setChestFill(fill: number) {
    this.chest.setFill(fill);
    this.dirty = true;
  }

  /**
   * Fits the chest view to the chest's slot on the treasure screen (its box in screen pixels, as it is
   * on screen now, so it follows the page as it scrolls).
   */
  placeChest(box: { y: number; width: number; height: number }) {
    if (box.width <= 0) return;
    const next = chestView(box, this.size, this.camera.fov);
    // A slot of another size (the treasure set up, or being edited): swim there rather than jump.
    if (this.mode === 'chest' && !this.glide && !this.calm && Math.abs(next.distance - this.chestSpot.distance) > 0.02) {
      this.glide = { from: this.currentView(), at: performance.now() / 1000, seconds: 0.6 };
    }
    this.chestSpot = next;
    this.dirty = true;
  }

  /** In the wide view: whether a tap at these screen pixels lands on the chest (generously: it's small from up there). */
  chestAt(x: number, y: number): boolean {
    if (this.mode !== 'wide') return false;
    const centre = this.chest.centre;
    const depth = centre.distanceTo(this.camera.position);
    const p = centre.project(this.camera);
    if (p.z > 1) return false;
    const sx = ((p.x + 1) / 2) * this.size.width;
    const sy = ((1 - p.y) / 2) * this.size.height;
    const perUnit = this.size.height / (2 * depth * Math.tan((this.camera.fov * Math.PI) / 360));
    return Math.hypot(x - sx, y - sy) < Math.max(60, 0.8 * perUnit);
  }

  /** Opens the lid if the camera is at (or on its way to) the chest and the treasure screen wants it, or shuts it. */
  private lid(delay: number) {
    const open = this.mode === 'chest' && this.chestWanted;
    this.chest.setBeckon(this.mode === 'wide');
    if (this.calm) this.chest.jump(open);
    else this.chest.setOpen(open, performance.now() / 1000, delay);
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

  /** The view the camera is aiming for: the home view, the chest, or the wide view turned as she dragged it. */
  private targetView(): View {
    if (this.mode === 'home') return HOME_VIEW;
    if (this.mode === 'chest') return this.chestSpot;
    return { ...this.wide, yaw: this.wide.yaw + this.turn, elevation: this.wide.elevation + this.tilt };
  }

  private currentView(): View {
    const target = this.targetView();
    if (!this.glide) return target;
    const p = (performance.now() / 1000 - this.glide.at) / this.glide.seconds;
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

    const moving = !this.calm || !!this.glide || this.chest.moving;
    if (!force && !moving && !this.dirty) return;
    if (!this.calm && !force) this.t += dt;
    this.applyView(this.currentView());
    this.world.update(this.t, this.calm ? 0 : dt);
    this.school.update(this.t);
    this.mascot.update(this.t, now);
    this.pieces.forEach((p) => p.update?.(this.t));
    this.chest.update(this.calm ? 0 : this.t, now);
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
