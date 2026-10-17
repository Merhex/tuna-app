/**
 * The phone's motion sensor and screen, for Current Run (D58). Thin on purpose: what the readings
 * mean is worked out in motion.ts, which is tested. Nothing here throws.
 */
import type { Sample } from './motion';

type PermissionState = 'granted' | 'denied' | 'unavailable';

type MotionEventWithPermission = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export function motionAvailable(): boolean {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
}

/**
 * Ask to read the motion sensor. iPhone asks her, and only allows the question during a tap, so call
 * this straight from the Start button's click, before anything else is awaited. Elsewhere there's no
 * question.
 */
export function requestMotion(): Promise<PermissionState> {
  if (!motionAvailable()) return Promise.resolve('unavailable');
  const ask = (DeviceMotionEvent as MotionEventWithPermission).requestPermission;
  if (typeof ask !== 'function') return Promise.resolve('granted');
  try {
    return ask.call(DeviceMotionEvent).then(
      (r) => (r === 'granted' ? 'granted' : 'denied'),
      () => 'denied',
    );
  } catch {
    return Promise.resolve('denied');
  }
}

/** Every reading, in m/s². Returns a function that stops listening. */
export function listen(onSample: (s: Sample) => void): () => void {
  if (!motionAvailable()) return () => {};
  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity ?? e.acceleration;
    if (!a) return;
    onSample({ t: (e.timeStamp || performance.now()) / 1000, x: a.x, y: a.y, z: a.z });
  };
  window.addEventListener('devicemotion', handler);
  return () => window.removeEventListener('devicemotion', handler);
}

/**
 * Keep the screen on: the motion sensor stops when it goes off. Asked again whenever the app comes
 * back, because the browser lets go of it in the background. Returns a function that lets go.
 */
export function keepAwake(): () => void {
  type Lock = { release: () => Promise<void> };
  const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Lock> } }).wakeLock;
  if (!wl) return () => {};
  let lock: Lock | null = null;
  let done = false;
  const take = () => {
    if (done || document.visibilityState !== 'visible') return;
    wl.request('screen').then(
      (l) => {
        if (done) void l.release().catch(() => {});
        else lock = l;
      },
      () => {},
    );
  };
  take();
  document.addEventListener('visibilitychange', take);
  return () => {
    done = true;
    document.removeEventListener('visibilitychange', take);
    void lock?.release().catch(() => {});
    lock = null;
  };
}
