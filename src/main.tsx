import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { captureInstallPrompt } from './components/InstallGuide';
import './fonts';
import './styles.css';

captureInstallPrompt();

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
