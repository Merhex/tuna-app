import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { captureInstallPrompt } from './components/InstallGuide';
import './styles.css';

captureInstallPrompt();
registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
