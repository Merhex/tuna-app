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
import { Ocean } from './components/Ocean';
import { Intro } from './components/Intro';

export type Screen = 'install' | 'intro' | 'home' | 'hook' | 'aquarium' | 'settings';

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [washedAshore, setWashedAshore] = useState(false);
  // Where to go after the intro: home on first launch, back to Settings when reopened from there.
  const [introReturn, setIntroReturn] = useState<Screen>('home');

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
      // Install guide first (in Safari), then the intro. On iPhone the home-screen app has its own
      // storage, so the intro shows the first time she opens the installed app.
      if (!s.onboardingDone) setScreen('install');
      else if (!s.introSeen) setScreen('intro');
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
        <Ocean seabed={screen === 'home'} />
        {screen === 'install' && (
          <InstallGuide
            onContinue={() => {
              update((d) => ({ ...d, settings: { ...d.settings, onboardingDone: true } }));
              go(data.settings.introSeen ? 'home' : 'intro');
            }}
          />
        )}
        {screen === 'intro' && (
          <Intro
            onDone={() => {
              update((d) => ({ ...d, settings: { ...d.settings, introSeen: true } }));
              go(introReturn);
              setIntroReturn('home');
            }}
          />
        )}
        {screen === 'home' && (
          <Home go={go} washedAshore={washedAshore} dismissWashedAshore={() => setWashedAshore(false)} />
        )}
        {screen === 'hook' && <HookFlow onExit={() => go('home')} />}
        {screen === 'aquarium' && <Aquarium onClose={() => go('home')} />}
        {screen === 'settings' && (
          <Settings
            onClose={() => go('home')}
            showInstall={() => go('install')}
            showIntro={() => {
              setIntroReturn('settings');
              go('intro');
            }}
          />
        )}
      </LangContext.Provider>
    </AppContext.Provider>
  );
}
