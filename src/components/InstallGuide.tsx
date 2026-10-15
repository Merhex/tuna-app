import { useEffect, useState } from 'preact/hooks';
import { fx } from '../feedback';
import { useT } from '../i18n';
import { isInAppBrowser, isIOS, isIOSNonSafari } from '../platform';
import { PlusSquare, ShareIOS } from './Icons';
import { MiniTuna, Tuna } from './Tuna';
import { Haptic } from './Haptic';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Android/Chrome fire this once, early. Catch it so the guide can show a real install button. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
}

const isAndroid = () => /Android/i.test(navigator.userAgent);

export function InstallGuide({ onContinue }: { onContinue: () => void }) {
  const t = useT();
  const [, force] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  const ios = isIOS();
  const inApp = isInAppBrowser();

  return (
    <main class="screen install">
      <section class="panel center">
        <Tuna mood="cheer" size={120} class="bob" />
        <h1>{t.installTitle}</h1>
        <p class="muted">{t.installWhy}</p>

        {inApp ? (
          <div class="install-box">
            <h2>{t.inAppTitle}</h2>
            <p>{t.inAppBody}</p>
            <button
              class="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href);
                  setCopied(true);
                  fx.tap();
                } catch {
                  /* clipboard blocked; the URL is still visible below */
                }
              }}
            >
              {copied ? t.copied : t.copyLink}
              <Haptic />
            </button>
            <code class="url">{location.href}</code>
          </div>
        ) : ios ? (
          <div class="install-box">
            <ol class="ios-steps">
              {t.iosSteps.map((s, i) => (
                <li key={i}>
                  <span class="step-icon" aria-hidden="true">{[<ShareIOS />, <PlusSquare />, <MiniTuna size={30} />][i]}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            {isIOSNonSafari() && <p class="muted small">{t.iosOtherBrowser}</p>}
          </div>
        ) : deferredPrompt ? (
          <div class="install-box">
            <button
              class="primary big"
              onClick={async () => {
                fx.tap();
                await deferredPrompt?.prompt();
                const choice = await deferredPrompt?.userChoice;
                deferredPrompt = null;
                if (choice?.outcome === 'accepted') onContinue();
              }}
            >
              📲 {t.androidInstall}
            </button>
          </div>
        ) : isAndroid() ? (
          <div class="install-box">
            <p>{t.androidManual}</p>
          </div>
        ) : (
          <div class="install-box">
            <p>{t.desktopNote}</p>
          </div>
        )}

        <button class="quiet-link" onClick={onContinue}>
          {t.continueBrowser}
        </button>
        <p class="muted small">{t.continueWarn}</p>
      </section>
    </main>
  );
}

