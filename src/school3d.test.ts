import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MILESTONES } from './milestones';
import {
  between,
  cameraAt,
  CHEST,
  CHEST_SLOT,
  chestMiddle,
  chestSpan,
  chestView,
  ease,
  fovFor,
  HOME_VIEW,
  makeLanes,
  MASCOT,
  mascotSpot,
  SCHOOL3D_SETTINGS,
  shownTuna,
  SPOTS_3D,
  SWIM_BAND,
  swimPose,
  WIDE_VIEW,
} from './school3d';
import { Chest } from './tank/chest';
import { isBuilt3D } from './tank/decorations';
import { Kit } from './tank/kit';
import { tunaGeometry } from './tank/tuna';

describe('how many tuna swim', () => {
  it('is one per beaten hook, up to the most the tank draws', () => {
    expect(shownTuna(0)).toBe(0);
    expect(shownTuna(30)).toBe(30);
    expect(shownTuna(SCHOOL3D_SETTINGS.maxTuna)).toBe(SCHOOL3D_SETTINGS.maxTuna);
    expect(shownTuna(5000)).toBe(SCHOOL3D_SETTINGS.maxTuna);
    expect(shownTuna(-3)).toBe(0);
  });
});

describe('lanes', () => {
  it('makes one lane per tuna', () => {
    expect(makeLanes(0)).toHaveLength(0);
    expect(makeLanes(13)).toHaveLength(13);
    expect(makeLanes(200)).toHaveLength(200);
  });

  it('keeps the same lanes every visit, and when the school grows', () => {
    expect(makeLanes(30)).toEqual(makeLanes(30));
    expect(makeLanes(200).slice(0, 13)).toEqual(makeLanes(13));
  });

  it('keeps every tuna inside the swimming band, the whole time', () => {
    const seen = { inner: Infinity, outer: 0, low: Infinity, high: -Infinity };
    for (const lane of makeLanes(200)) {
      for (let t = 0; t < 900; t += 2.3) {
        const p = swimPose(lane, t);
        const r = Math.hypot(p.x, p.z);
        seen.inner = Math.min(seen.inner, r);
        seen.outer = Math.max(seen.outer, r);
        seen.low = Math.min(seen.low, p.y);
        seen.high = Math.max(seen.high, p.y);
      }
    }
    expect(seen.inner).toBeGreaterThanOrEqual(SWIM_BAND.inner);
    expect(seen.outer).toBeLessThanOrEqual(SWIM_BAND.outer);
    expect(seen.low).toBeGreaterThanOrEqual(SWIM_BAND.low);
    expect(seen.high).toBeLessThanOrEqual(SWIM_BAND.high);
  });

  it('points each tuna the way it is swimming', () => {
    const [lane] = makeLanes(1);
    for (const t of [0, 10, 47.5]) {
      const a = swimPose(lane, t);
      const b = swimPose(lane, t + 0.2);
      // Its nose is towards +x before turning; turned by yaw, that's (cos, -sin) in x and z.
      const forward = (b.x - a.x) * Math.cos(a.yaw) + (b.z - a.z) * -Math.sin(a.yaw);
      expect(forward).toBeGreaterThan(0);
    }
  });

  it('keeps each little group together', () => {
    const lanes = makeLanes(SCHOOL3D_SETTINGS.groupSize);
    for (const t of [0, 60, 600]) {
      const poses = lanes.map((l) => swimPose(l, t));
      const spread = Math.max(...poses.map((p) => Math.hypot(p.x - poses[0].x, p.y - poses[0].y, p.z - poses[0].z)));
      expect(spread).toBeLessThan(3);
    }
  });
});

describe('decorations', () => {
  it('has a 3D decoration and a spot for every milestone', () => {
    for (const m of MILESTONES) expect(isBuilt3D(m.id), m.id).toBe(true);
  });

  it('keeps them out of the swimming band, so no tuna swims through one', () => {
    for (const [id, spot] of Object.entries(SPOTS_3D)) {
      expect(Math.hypot(spot.x, spot.z), id).toBeGreaterThan(SWIM_BAND.outer);
    }
  });
});

describe('camera', () => {
  it('glides from one view to the other, slowly at both ends', () => {
    expect(between(HOME_VIEW, WIDE_VIEW, 0)).toEqual(HOME_VIEW);
    expect(between(HOME_VIEW, WIDE_VIEW, 1)).toEqual(WIDE_VIEW);
    expect(between(HOME_VIEW, WIDE_VIEW, 2)).toEqual(WIDE_VIEW);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(0.9)).toBeGreaterThan(0.9);
  });

  it('starts in front of the tank, and pulls back and up for the wide view', () => {
    const home = cameraAt(HOME_VIEW);
    const wide = cameraAt(WIDE_VIEW);
    expect(home.z).toBeGreaterThan(0);
    expect(Math.abs(home.x)).toBeLessThan(1e-9);
    expect(wide.y).toBeGreaterThan(home.y);
    expect(cameraAt({ ...WIDE_VIEW, yaw: Math.PI / 2 }).x).toBeGreaterThan(0);
  });

  it('gives tall phones a taller view, within limits', () => {
    const { fovMin, fovMax } = SCHOOL3D_SETTINGS;
    expect(fovFor(16 / 9)).toBe(fovMin);
    expect(fovFor(390 / 844)).toBeGreaterThan(fovFor(375 / 667));
    expect(fovFor(0.2)).toBe(fovMax);
  });
});

describe('the tuna', () => {
  it('stays light, since up to 200 are drawn every frame', () => {
    const geo = tunaGeometry();
    expect(geo.getAttribute('position').count / 3).toBeLessThan(1000);
    expect(geo.getAttribute('color')).toBeTruthy();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    // About 2 long, nose towards +x, so a lane's size is its length.
    expect(box.max.x - box.min.x).toBeGreaterThan(1.9);
    expect(box.max.x - box.min.x).toBeLessThan(2.6);
  });
});

describe('the big tuna', () => {
  const screen = { width: 390, height: 844 };
  const fov = fovFor(screen.width / screen.height);
  const homeCamera = () => {
    const cam = new PerspectiveCamera(fov, screen.width / screen.height, 0.1, 200);
    const c = cameraAt(HOME_VIEW);
    cam.position.set(c.x, c.y, c.z);
    cam.lookAt(0, HOME_VIEW.targetY, 0);
    cam.updateMatrixWorld();
    return cam;
  };
  const toScreen = (p: Vector3, cam: PerspectiveCamera) => {
    const q = p.clone().project(cam);
    return { x: ((q.x + 1) / 2) * screen.width, y: ((1 - q.y) / 2) * screen.height };
  };

  it('swims exactly where the drawing is on the home screen, at its size', () => {
    const cam = homeCamera();
    for (const box of [{ x: 118, y: 160, width: 130, height: 78 }, { x: 20, y: 600, width: 96, height: 58 }]) {
      const spot = mascotSpot(box, screen, fov);
      const middle = toScreen(new Vector3(spot.x, spot.y, spot.z), cam);
      expect(middle.x).toBeCloseTo(box.x + box.width * MASCOT.middle, 3);
      expect(middle.y).toBeCloseTo(box.y + box.height / 2, 3);
      // Its length, laid across the screen at that depth, is the drawn fish's length.
      const end = toScreen(new Vector3(spot.x + spot.length, spot.y, spot.z), cam);
      expect(Math.abs(end.x - middle.x)).toBeCloseTo(box.width * MASCOT.fill, 0);
    }
  });

  it('stays in front of the school, so no tuna swims through it', () => {
    const spot = mascotSpot({ x: 118, y: 160, width: 130, height: 78 }, screen, fov);
    expect(Math.hypot(spot.x, spot.z) - spot.length / 2).toBeGreaterThan(SWIM_BAND.outer);
  });
});

describe('the treasure chest', () => {
  const screen = { width: 390, height: 844 };
  const fov = fovFor(screen.width / screen.height);
  const slot = { y: 64, width: 240, height: 180 };
  const cameraFor = (v: ReturnType<typeof chestView>) => {
    const cam = new PerspectiveCamera(fov, screen.width / screen.height, 0.1, 200);
    const c = cameraAt(v);
    cam.position.set(c.x, c.y, c.z);
    cam.lookAt(0, v.targetY, 0);
    cam.setViewOffset(screen.width, screen.height, 0, v.shift, screen.width, screen.height);
    cam.updateMatrixWorld();
    return cam;
  };
  const toScreen = (p: Vector3, cam: PerspectiveCamera) => {
    const q = p.clone().project(cam);
    return { x: ((q.x + 1) / 2) * screen.width, y: ((1 - q.y) / 2) * screen.height };
  };

  it('sits in the middle, where no tuna swims, even open and full', () => {
    const chest = new Chest(new Kit());
    chest.setFill(1);
    chest.jump(true);
    chest.object.updateMatrixWorld(true);
    const p = new Vector3();
    let inTheWay = 0;
    chest.object.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const pos = o.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (Math.hypot(p.x, p.z) >= SWIM_BAND.inner && p.y >= SWIM_BAND.low) inTheWay++;
      }
    });
    expect(inTheWay).toBe(0);
  });

  it('sits in its slot on the treasure screen, as big as the drawing', () => {
    const v = chestView(slot, screen, fov);
    const cam = cameraFor(v);
    const middle = toScreen(new Vector3(0, chestMiddle(), 0), cam);
    expect(middle.x).toBeCloseTo(screen.width / 2, 3);
    expect(middle.y).toBeCloseTo(slot.y + slot.height * CHEST_SLOT.middle, 3);
    // Its width as the camera sees it spans the same part of the slot as the drawn chest.
    const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(chestSpan() / 2);
    const edge = toScreen(new Vector3(0, chestMiddle(), 0).add(right), cam);
    expect(2 * (edge.x - middle.x)).toBeCloseTo(slot.width * CHEST_SLOT.fill, 0);
  });

  it('scrolls with the page, until it is off the top', () => {
    const top = chestView(slot, screen, fov);
    expect(chestView({ ...slot, y: slot.y - 100 }, screen, fov).shift - top.shift).toBeCloseTo(100);
    expect(chestView({ ...slot, y: -5000 }, screen, fov)).toEqual(chestView({ ...slot, y: -2000 }, screen, fov));
  });

  it('looks from under the school, so no tuna swims in front of it', () => {
    const v = chestView(slot, screen, fov);
    const cam = cameraFor(v);
    // The open chest on screen: as wide as it fills the slot, from the sand to the top of the lid.
    const middle = chestMiddle();
    const top = toScreen(new Vector3(0, middle + CHEST.middle, 0), cam).y;
    const bottom = toScreen(new Vector3(0, middle - CHEST.middle, 0), cam).y;
    const half = (slot.width * CHEST_SLOT.fill) / 2;
    const lanes = makeLanes(SCHOOL3D_SETTINGS.maxTuna);
    const p = new Vector3();
    let blocked = 0;
    for (let t = 0; t < 900; t += 1.5) {
      for (const lane of lanes) {
        const pose = swimPose(lane, t);
        p.set(pose.x, pose.y, pose.z);
        // Only tuna between the camera and the chest.
        const ahead = -p.clone().applyMatrix4(cam.matrixWorldInverse).z;
        if (ahead < cam.near || p.distanceTo(cam.position) > v.distance) continue;
        const s = toScreen(p, cam);
        if (Math.abs(s.x - screen.width / 2) < half && s.y > top && s.y < bottom) blocked++;
      }
    }
    expect(blocked).toBe(0);
  });
});
