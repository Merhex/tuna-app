import { useRef, useState } from 'preact/hooks';
import type { Lang } from '../cards';
import { fx } from '../feedback';
import { localeOf, useT } from '../i18n';
import { isIOS } from '../platform';
import { useApp } from '../state';
import { Back, Download, Fish, FishHook, Phone, Upload } from './Icons';
import { Haptic } from './Haptic';
import { isStandalone } from '../platform';
import { makeBackup, parseBackup, type Settings as S } from '../storage';
import { convertTreasure, CURRENCIES, type Currency } from '../treasure';

export function Settings({
  onClose,
  showInstall,
  showIntro,
  showSchool3d,
}: {
  onClose: () => void;
  showInstall: () => void;
  showIntro: () => void;
  showSchool3d: () => void;
}) {
  const t = useT();
  const { data, update } = useApp();
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof S>(key: K, value: S[K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));

  // Switching currency re-expresses the treasure's amounts, so it keeps meaning the same money.
  const setCurrency = (c: Currency) =>
    update((d) => ({
      ...d,
      treasure: d.treasure && d.settings.currency !== c ? convertTreasure(d.treasure, d.settings.currency, c) : d.treasure,
      settings: { ...d.settings, currency: c },
    }));

  async function backup() {
    const name = `off-the-hook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([makeBackup(data)], name, { type: 'application/json' });
    // iPhone: the share sheet lets her "Save to Files". Elsewhere, fall back to a download.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function restore(file: File) {
    try {
      const restored = parseBackup(await file.text());
      if (!confirm(t.restoreConfirm)) return;
      update(() => ({ ...restored, settings: { ...restored.settings, onboardingDone: true } }));
      setMessage(t.restored);
      fx.done();
    } catch {
      setMessage(t.restoreFailed);
    }
  }

  return (
    <main class="screen settings">
      <header class="topbar">
        <button class="icon-btn" onClick={onClose} aria-label={t.close}><Back /><Haptic /></button>
        <h1 class="screen-title">{t.settings}</h1>
        <span class="topbar-spacer" />
      </header>

      <section class="group">
        <Toggle
          label={t.sound}
          checked={data.settings.sound}
          onChange={(v) => {
            set('sound', v);
            if (v) setTimeout(() => fx.done(), 50);
          }}
        />
        <Toggle
          label={t.haptics}
          note={isIOS() ? t.hapticsIOSNote : undefined}
          checked={data.settings.haptics}
          onChange={(v) => {
            set('haptics', v);
            if (v) setTimeout(() => fx.tap(), 50);
          }}
        />
        <Toggle label={t.reducedMotion} checked={data.settings.reducedMotion} onChange={(v) => set('reducedMotion', v)} />
        <div class="row">
          <span>{t.language}</span>
          <div class="segmented compact">
            {(['en', 'cs'] as Lang[]).map((l) => (
              <button key={l} aria-pressed={data.settings.lang === l} onClick={() => { fx.tap(); set('lang', l); }}>
                {l === 'en' ? 'English' : 'Čeština'}
              <Haptic /></button>
            ))}
          </div>
        </div>
        <div class="row">
          <span>{t.currency}</span>
          <div class="segmented compact">
            {CURRENCIES.map((c) => (
              <button key={c} aria-pressed={data.settings.currency === c} onClick={() => { fx.tap(); setCurrency(c); }}>
                {CURRENCY_SYMBOL[c]}
                <Haptic />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section class="group">
        <button class="secondary full" onClick={backup}><Download /> {t.backup}<Haptic /></button>
        <p class="muted small">{t.backupNote}</p>
        <button class="secondary full" onClick={() => fileInput.current?.click()}><Upload /> {t.restore}<Haptic /></button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) void restore(f);
            (e.target as HTMLInputElement).value = '';
          }}
        />
        {message && <p class="status" role="status">{message}</p>}
      </section>

      <section class="group">
        <button class="secondary full" onClick={showIntro}><FishHook size={20} stroke={4} /> {t.howItWorks}<Haptic /></button>
        {/* Already on the home screen: nothing to install. */}
        {!isStandalone() && (
          <button class="secondary full" onClick={showInstall}><Phone /> {t.showInstall}<Haptic /></button>
        )}
      </section>

      <section class="group about">
        <h2>{t.about}</h2>
        <p class="muted small">{t.aboutBody(<a class="tel" href="tel:+420800350000">800 350 000</a>)}</p>
        <p class="muted small version">
          {t.version} {__APP_VERSION__} ·{' '}
          {new Date(__BUILD_TIME__).toLocaleString(localeOf(data.settings.lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {/* Visit my school (3D prototype): small and quiet on purpose, so it's only found by whoever is testing it. */}
          <button class="lab-btn" onClick={() => { fx.tap(); showSchool3d(); }} aria-label={t.school3dOpen}><Fish size={16} /><Haptic /></button>
        </p>
      </section>
    </main>
  );
}

function Toggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label class="row toggle">
      <span>
        {label}
        {note && <small class="muted">{note}</small>}
      </span>
      <input type="checkbox" {...({ switch: true } as object)} checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
    </label>
  );
}

const CURRENCY_SYMBOL: Record<Currency, string> = { CZK: 'Kč', EUR: '€', USD: '$' };
