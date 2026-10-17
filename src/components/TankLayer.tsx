import { useEffect, useRef, useState } from 'preact/hooks';
import type { Tank } from '../tank/scene';

const WORKED_KEY = 'off-the-hook:tank-worked';

/**
 * Whether the tank loaded on this phone last time. If so, the home screen opens with just the water
 * and the button and lets the tank fade in, instead of showing the drawn seabed first (D55). Kept in
 * localStorage, not in her data, because it's about the phone: it isn't backed up or restored.
 */
export function tankWorkedBefore(): boolean {
  try {
    return localStorage.getItem(WORKED_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberTank(worked: boolean) {
  try {
    if (worked) localStorage.setItem(WORKED_KEY, '1');
    else localStorage.removeItem(WORKED_KEY);
  } catch {
    /* Nothing to remember it in: the drawn seabed shows first next time, as on a first launch. */
  }
}

/**
 * The canvas for the home screen's 3D tank (D55), behind every screen and shown only on the home
 * screen and the treasure screen (D56). three.js and the tank load just after the app starts, so the home screen and its button
 * never wait for them; until then the home screen shows the drawn seabed, or just the water if the
 * tank worked here before (see tankWorkedBefore). A phone without 3D keeps the drawn seabed.
 * The tank is made once and kept, so going back home is instant. `onReady` gets it once its first
 * frame is drawn, and null if it can't be made or the phone takes the 3D away.
 *
 * In the wide view ("Visit my school"), dragging on the canvas looks round the tank, and tapping the
 * chest in the middle opens the treasure (`onChest`).
 */
export function TankLayer({
  active,
  calm,
  onReady,
  onChest,
}: {
  active: boolean;
  calm: boolean;
  onReady: (tank: Tank | null) => void;
  onChest: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tank = useRef<Tank | null>(null);
  // Where the finger is, and where and when it went down, to tell a tap from a drag.
  const grab = useRef<{ id: number; x: number; y: number; startX: number; startY: number; at: number } | null>(null);
  const [shown, setShown] = useState(false);
  // It fades in the first time only; after that it's there as soon as the home screen is.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = canvas.current!;
    let alive = true;
    let made: Tank | null = null;
    const resize = () => made?.resize(el.clientWidth, el.clientHeight);
    const watcher = new ResizeObserver(resize);
    // Effects run after the first paint, so the home screen and its button still come first.
    void (async () => {
      try {
        const { Tank } = await import('../tank/scene');
        if (!alive) return;
        made = new Tank(el, calm, {
          lost: () => {
            setShown(false);
            onReady(null);
          },
          restored: () => {
            setShown(true);
            onReady(made);
          },
        });
        tank.current = made;
        resize();
        watcher.observe(el);
        await made.warmUp();
        if (!alive) return;
        setShown(true);
        rememberTank(true);
        onReady(made);
      } catch {
        // No 3D on this phone (or it failed to load): the drawn home screen stays, and shows
        // first next time.
        rememberTank(false);
        onReady(null);
      }
    })();
    return () => {
      alive = false;
      watcher.disconnect();
      made?.dispose();
    };
  }, []);

  useEffect(() => {
    if (active && shown) tank.current?.start();
    else tank.current?.stop();
  }, [active, shown]);

  useEffect(() => tank.current?.setCalm(calm), [calm]);

  useEffect(() => {
    if (!shown || settled) return;
    const id = setTimeout(() => setSettled(true), 800);
    return () => clearTimeout(id);
  }, [shown]);

  const endGrab = () => {
    grab.current = null;
    tank.current?.release();
  };

  /** A quick tap that barely moved, on the chest, opens the treasure. */
  const tapped = (e: PointerEvent) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    const still = Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < 10;
    if (still && performance.now() - g.at < 500 && tank.current?.chestAt(e.clientX, e.clientY)) onChest();
  };

  return (
    <canvas
      ref={canvas}
      class={`tank${active && shown ? ' on' : ''}${settled ? ' settled' : ''}`}
      aria-hidden="true"
      onPointerDown={(e) => {
        grab.current = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, at: performance.now() };
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const g = grab.current;
        if (!g || g.id !== e.pointerId) return;
        tank.current?.drag((e.clientX - g.x) / window.innerWidth, (e.clientY - g.y) / window.innerHeight);
        g.x = e.clientX;
        g.y = e.clientY;
      }}
      onPointerUp={(e) => {
        tapped(e);
        endGrab();
      }}
      onPointerCancel={endGrab}
    />
  );
}
