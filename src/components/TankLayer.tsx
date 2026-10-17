import { useEffect, useRef, useState } from 'preact/hooks';
import type { Tank } from '../tank/scene';

/**
 * The canvas for the home screen's 3D tank (D55), behind every screen and shown only on the home
 * screen. three.js and the tank load just after the app starts, so the home screen and its button
 * never wait for them; until then (or on a phone without 3D) the home screen keeps the drawn seabed.
 * The tank is made once and kept, so going back home is instant. `onReady` gets it once its first
 * frame is drawn, and null if the phone takes the 3D away.
 *
 * In the wide view ("Visit my school"), dragging on the canvas looks round the tank.
 */
export function TankLayer({ active, calm, onReady }: { active: boolean; calm: boolean; onReady: (tank: Tank | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tank = useRef<Tank | null>(null);
  const grab = useRef<{ id: number; x: number; y: number } | null>(null);
  const [shown, setShown] = useState(false);
  // It fades in the first time only; after that it's there as soon as the home screen is.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = canvas.current!;
    let alive = true;
    let made: Tank | null = null;
    const resize = () => made?.resize(el.clientWidth, el.clientHeight);
    const watcher = new ResizeObserver(resize);
    // After the first paint, so the home screen and its button come first.
    const timer = setTimeout(async () => {
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
        onReady(made);
      } catch {
        // No 3D on this phone (or it failed to load): the drawn home screen stays.
        onReady(null);
      }
    }, 150);
    return () => {
      alive = false;
      clearTimeout(timer);
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

  return (
    <canvas
      ref={canvas}
      class={`tank${active && shown ? ' on' : ''}${settled ? ' settled' : ''}`}
      aria-hidden="true"
      onPointerDown={(e) => {
        grab.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const g = grab.current;
        if (!g || g.id !== e.pointerId) return;
        tank.current?.drag((e.clientX - g.x) / window.innerWidth, (e.clientY - g.y) / window.innerHeight);
        g.x = e.clientX;
        g.y = e.clientY;
      }}
      onPointerUp={endGrab}
      onPointerCancel={endGrab}
    />
  );
}
