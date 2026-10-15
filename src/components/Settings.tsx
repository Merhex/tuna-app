import { useRef, useState } from 'preact/hooks';
import type { Lang } from '../cards';
import { haptic, sound } from '../feedback';
import { useT } from '../i18n';
import { isIOS } from '../platform';
import { useApp } from '../state';
import { Back, Download, FishHook, Phone, Upload } from './Icons';
import { averagePullDrop, makeBackup, parseBackup, schoolSize, type Settings as S } from '../storage';

export function Settings({
  onClose,
  showInstall,
  showIntro,
}: {
  onClose: () => void;
  showInstall: () => void;
  showIntro: () => void;
}) {
  const t = useT();
  const { data, update } = useApp();
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof S>(key: K, value: S[K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));

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
      sound.done();
    } catch {
      setMessage(t.restoreFailed);
    }
  }

  return (
    <main class="screen settings">
      <header class="topbar">
        <button class="icon-btn" onClick={onClose} aria-label={t.close}><Back /></button>
        <h1 class="screen-title">{t.settings}</h1>
        <span class="topbar-spacer" />
      </header>

      <div class="stats">
        <div><strong>{schoolSize(data)}</strong><span>{t.hooksBeaten}</span></div>
        <div><strong>{Object.keys(data.collection).length}</strong><span>{t.cardsCaught}</span></div>
        {averagePullDrop(data) !== null && (
          <div class="stat-wide">
            <strong>−{averagePullDrop(data)!.toFixed(1)}</strong>
            <span>{t.avgPullDrop}</span>
          </div>
        )}
      </div>

      <section class="group">
        <Toggle
          label={t.sound}
          checked={data.settings.sound}
          onChange={(v) => {
            set('sound', v);
            if (v) setTimeout(() => sound.done(), 50);
          }}
        />
        <Toggle
          label={t.haptics}
          note={isIOS() ? t.hapticsIOSNote : undefined}
          checked={data.settings.haptics}
          onChange={(v) => {
            set('haptics', v);
            if (v) setTimeout(() => haptic.success(), 50);
          }}
        />
        <Toggle label={t.reducedMotion} checked={data.settings.reducedMotion} onChange={(v) => set('reducedMotion', v)} />
        <div class="row">
          <span>{t.language}</span>
          <div class="segmented compact">
            {(['en', 'cs'] as Lang[]).map((l) => (
              <button key={l} aria-pressed={data.settings.lang === l} onClick={() => { haptic.tap(); set('lang', l); }}>
                {l === 'en' ? 'English' : 'Čeština'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section class="group">
        <button class="secondary full" onClick={backup}><Download /> {t.backup}</button>
        <p class="muted small">{t.backupNote}</p>
        <button class="secondary full" onClick={() => fileInput.current?.click()}><Upload /> {t.restore}</button>
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
        <button class="secondary full" onClick={showIntro}><FishHook size={20} stroke={4} /> {t.howItWorks}</button>
        <button class="secondary full" onClick={showInstall}><Phone /> {t.showInstall}</button>
      </section>

      <section class="group about">
        <h2>{t.about}</h2>
        <p class="muted small">{t.aboutBody}</p>
        <p class="muted small">Off the Hook · v{__APP_VERSION__}</p>
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
