import { options, render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { captureInstallPrompt } from './components/InstallGuide';
import { cravingInProgress } from './updates';
import './fonts';
import './styles.css';

captureInstallPrompt();

// No pinch zoom: the layout already fits every screen, and a stray pinch could leave the app stuck
// zoomed in. The CSS (touch-action) and the viewport tag stop it in most browsers; iPhone Safari can
// still zoom past them, so cancel its pinch gestures and any two-finger move here too.
const noZoom = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', noZoom);
document.addEventListener('gesturechange', noZoom);
document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });

// Re-render in the next task instead of a microtask. On iPhone, a button's haptic comes from the
// invisible switch inside it (components/Haptic.tsx), and Safari plays it when it finishes handling
// the tap. Rendering right away would remove the button (and its switch) mid-tap when the screen
// changes, and the vibration would be lost. The delay is around a millisecond.
options.debounceRendering = (cb) => setTimeout(cb);

// Updates. The app starts from the copy saved on the device (so it works offline) and checks for a newer
// version in the background. A new version is loaded:
//  - right away if it arrives within FRESH_MS of opening or returning to the app, before she has started
//    anything, so opening the app gives her the latest version;
//  - otherwise the next time she leaves the app.
// Never during a craving: a reload then would lose it.
const FRESH_MS = 15_000;
let wokeAt = performance.now();
let updateReady = false;

const applyUpdateIfSafe = () => {
  if (updateReady && !cravingInProgress.current) void updateSW(true);
};

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
    if (performance.now() - wokeAt < FRESH_MS) applyUpdateIfSafe();
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => void registration.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        wokeAt = performance.now();
        check();
      }
    });
    setInterval(check, 60 * 60 * 1000);
  },
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') applyUpdateIfSafe();
});

render(<App />, document.getElementById('app')!);
document.getElementById('boot-fallback')?.remove();
