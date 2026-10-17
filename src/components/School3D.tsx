import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { fx } from '../feedback';
import { pick, useT } from '../i18n';
import { MILESTONES } from '../milestones';
import { PREVIEW_COUNTS, shownTuna } from '../school3d';
import { coralLook } from '../seabed';
import { useApp } from '../state';
import { schoolSize } from '../storage';
import { Tank, type Mode } from '../tank/scene';
import { Back, Fish, FishHook } from './Icons';
import { Haptic } from './Haptic';
import { PettableTuna } from './Home';

/**
 * Visit my school (prototype, opened from the small fish next to the version in Settings). It opens
 * like the home screen, but on a 3D seabed: the petting tuna, the button and the school count, with
 * "Visit my school" under it. That fades the buttons away and pulls the camera back to the whole
 * tank: one tuna for every hook she has beaten (up to 200) and her milestone decorations.
 *
 * To judge it on a phone, the wide view can preview a bigger school and every decoration, and shows
 * the frame rate. Nothing is saved, except pets of the tuna, which count as usual.
 */
export function School3D({ onClose, onHook }: { onClose: () => void; onHook: () => void }) {
  const t = useT();
  const { data } = useApp();
  const school = schoolSize(data);
  const tagline = useMemo(() => pick(t.taglines), [t]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const panel = useRef<HTMLElement>(null);
  const tank = useRef<Tank | null>(null);
  const grab = useRef<{ id: number; x: number; y: number } | null>(null);
  const [mode, setMode] = useState<Mode>('home');
  const [preview, setPreview] = useState<number | null>(null);
  const [everything, setEverything] = useState(false);
  const [fps, setFps] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const calm = data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const count = preview ?? school;
  const shown = shownTuna(count);
  const decorations = MILESTONES.filter((m) => everything || data.seabed.earned[m.id]).map((m) => m.id);

  useEffect(() => {
    const el = canvas.current!;
    let made: Tank;
    try {
      made = new Tank(el, calm, setFps);
    } catch {
      setFailed(true);
      return;
    }
    tank.current = made;
    const resize = () => {
      made.resize(el.clientWidth, el.clientHeight);
      // The wide view fits between the top bar and the panel. Offsets, not boxes: the panel slides in with a transform.
      const top = (bar.current?.offsetTop ?? 0) + (bar.current?.offsetHeight ?? 0);
      made.setFreeArea(top, panel.current?.offsetTop ?? el.clientHeight);
    };
    resize();
    const watcher = new ResizeObserver(resize);
    watcher.observe(el);
    if (panel.current) watcher.observe(panel.current);
    made.start();
    return () => {
      watcher.disconnect();
      made.dispose();
      tank.current = null;
    };
  }, []);

  useEffect(() => tank.current?.setTuna(shown), [shown]);
  useEffect(() => tank.current?.setDecorations(decorations, coralLook(data.seabed.coralMonths)), [decorations.join(), data.seabed.coralMonths]);
  useEffect(() => tank.current?.go(mode), [mode]);

  const go = (m: Mode) => {
    fx.tap();
    setMode(m);
  };

  const endGrab = () => {
    grab.current = null;
    tank.current?.release();
  };

  return (
    <>
      <canvas
        ref={canvas}
        class="s3d-canvas"
        aria-hidden="true"
        onPointerDown={(e) => {
          if (mode !== 'wide') return;
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
      <main class={`screen s3d ${mode}`}>
        <header class="topbar" ref={bar}>
          {mode === 'home' ? (
            <button class="icon-btn" onClick={onClose} aria-label={t.close}><Back /><Haptic /></button>
          ) : (
            <button class="icon-btn" onClick={() => go('home')}><Back /><span class="icon-label">{t.swimBack}</span><Haptic /></button>
          )}
          <span class="proto-badge">{t.prototype}</span>
        </header>

        {failed && <p class="s3d-failed group">{t.school3dFailed}</p>}

        <div class="home-center s3d-home" inert={mode !== 'home'}>
          <PettableTuna />
          <p class="tagline">{tagline}</p>
          <button
            class="hook-button"
            onClick={() => {
              fx.hookDrop();
              onHook();
            }}
          >
            <FishHook size={62} stroke={5.5} />
            <span>{t.hookButton}</span>
            <Haptic />
          </button>
          <p class="school-count">{t.school(school)}</p>
          {!failed && (
            <button class="secondary small visit-btn" onClick={() => go('wide')}>
              <Fish size={20} /> {t.visitSchool}
              <Haptic />
            </button>
          )}
        </div>

        <section class="group s3d-wide" ref={panel} inert={mode !== 'wide'}>
          <p class="s3d-count">
            {t.school(count)}
            {count > shown && <small class="muted">{t.school3dShown(shown)}</small>}
          </p>
          <div class="row">
            <span>{t.school3dTuna}</span>
            <div class="segmented compact">
              {[null, ...PREVIEW_COUNTS].map((n) => (
                <button key={n ?? 'mine'} aria-pressed={preview === n} onClick={() => { fx.tap(); setPreview(n); }}>
                  {n === null ? t.school3dMine(school) : n}
                  <Haptic />
                </button>
              ))}
            </div>
          </div>
          <div class="row">
            <span>{t.school3dSeabed}</span>
            <div class="segmented compact">
              {[false, true].map((all) => (
                <button key={String(all)} aria-pressed={everything === all} onClick={() => { fx.tap(); setEverything(all); }}>
                  {all ? t.school3dSeabedAll : t.school3dSeabedMine}
                  <Haptic />
                </button>
              ))}
            </div>
          </div>
          <p class="muted small">
            {calm ? t.school3dCalm : t.school3dDrag}
            {fps !== null && ` · ${fps} fps`}
          </p>
        </section>
      </main>
    </>
  );
}
