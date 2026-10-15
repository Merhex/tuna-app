import { useEffect, useState } from 'preact/hooks';
import { DECK_VERSION } from './cards';
import { configureFeedback } from './feedback';
import { LangContext } from './i18n';
import { isStandalone } from './platform';
import { AppContext } from './state';
import { loadData, requestPersistence, saveData, type AppData } from './storage';
import { Home } from './components/Home';
import { HookFlow } from './components/HookFlow';
import { Aquarium } from './components/Aquarium';
import { Settings } from './components/Settings';
import { InstallGuide } from './components/InstallGuide';

export type Screen = 'install' | 'home' | 'hook' | 'aquarium' | 'settings';

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [washedAshore, setWashedAshore] = useState(false);

  useEffect(() => {
    loadData().then((loaded) => {
      const s = { ...loaded.settings };
      if (s.lastDeckVersion === null) {
        // First launch: nothing is "new" yet.
        s.lastDeckVersion = DECK_VERSION;
        void requestPersistence();
      } else if (s.lastDeckVersion < DECK_VERSION) {
        setWashedAshore(true);
        s.lastDeckVersion = DECK_VERSION;
      }
      if (isStandalone()) s.onboardingDone = true;
      const next = { ...loaded, settings: s };
      setData(next);
      void saveData(next);
      if (!s.onboardingDone) setScreen('install');
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    configureFeedback({ sound: data.settings.sound, haptics: data.settings.haptics });
    document.documentElement.classList.toggle('calm', data.settings.reducedMotion);
    document.documentElement.lang = data.settings.lang;
  }, [data?.settings]);

  if (!data) return <div class="splash" />;

  const update = (fn: (d: AppData) => AppData) =>
    setData((prev) => {
      const next = fn(prev!);
      void saveData(next);
      return next;
    });

  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo(0, 0);
  };

  return (
    <AppContext.Provider value={{ data, update }}>
      <LangContext.Provider value={data.settings.lang}>
        <div class="ocean" aria-hidden="true">
          <div class="rays" />
        </div>
        {screen === 'install' && (
          <InstallGuide
            onContinue={() => {
              update((d) => ({ ...d, settings: { ...d.settings, onboardingDone: true } }));
              go('home');
            }}
          />
        )}
        {screen === 'home' && (
          <Home go={go} washedAshore={washedAshore} dismissWashedAshore={() => setWashedAshore(false)} />
        )}
        {screen === 'hook' && <HookFlow onExit={() => go('home')} />}
        {screen === 'aquarium' && <Aquarium onClose={() => go('home')} />}
        {screen === 'settings' && <Settings onClose={() => go('home')} showInstall={() => go('install')} />}
      </LangContext.Provider>
    </AppContext.Provider>
  );
}
