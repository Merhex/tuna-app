import { options, render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { captureInstallPrompt } from './components/InstallGuide';
import './fonts';
import './styles.css';

captureInstallPrompt();

// Re-render in the next task instead of a microtask. On iPhone, a button's haptic comes from the
// invisible switch inside it (components/Haptic.tsx), and Safari plays it when it finishes handling
// the tap. Rendering right away would remove the button (and its switch) mid-tap when the screen
// changes, and the vibration would be lost. The delay is around a millisecond.
options.debounceRendering = (cb) => setTimeout(cb);

// New versions (e.g. new cards) install in the background. To never reload in the middle of a craving,
// the update is applied the next time she leaves the app.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void updateSW(true);
    });
  },
});

render(<App />, document.getElementById('app')!);
document.getElementById('boot-fallback')?.remove();
