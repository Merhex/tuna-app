import { useMemo, useState } from 'preact/hooks';
import { CARDS, cardById, type Lang } from '../cards';
import { localeOf, pick, useLang, useT } from '../i18n';
import { dailyTrend, dayKey, ratedHooks, trendChange } from '../stats';
import { useApp } from '../state';
import { averagePullDrop, schoolSize, type HookEntry } from '../storage';
import { DumbbellChart, fmt, Legend, TrendChart } from './Charts';
import { Back, BubbleIcon, FishHook, Heart } from './Icons';
import { RarityFish } from './RarityFish';
import { MiniTuna, Tuna } from './Tuna';
import { Haptic } from './Haptic';

const PAGE = 30;

export function Logbook({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const { data } = useApp();
  const [limit, setLimit] = useState(PAGE);

  const rated = ratedHooks(data);
  const trend = dailyTrend(data);
  const change = trendChange(trend);
  const drop = averagePullDrop(data);
  const history = [...data.hooks].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <main class="screen logbook">
      <header class="topbar">
        <button class="icon-btn" onClick={onClose} aria-label={t.close}><Back /><Haptic /></button>
        <h1 class="screen-title">{t.logbook}</h1>
        <span class="topbar-spacer" />
      </header>

      {!history.length ? (
        <section class="panel center">
          <Tuna mood="cheer" size={120} class="bob" />
          <p class="muted">{t.logEmpty}</p>
        </section>
      ) : (
        <>
          <div class="stat-row">
            <div class="stat"><strong>{schoolSize(data)}</strong><span>{t.hooksBeaten}</span></div>
            <div class="stat">
              <strong>{drop === null ? '–' : `−${fmt(lang, drop)}`}</strong>
              <span>{t.avgDrop}</span>
            </div>
            <div class="stat"><strong>{Object.keys(data.collection).length}<small>/{CARDS.length}</small></strong><span>{t.cardsCaught}</span></div>
          </div>

          <section class="chart-card">
            <h2>{t.dumbbellTitle}</h2>
            <p class="muted small">{t.dumbbellSub}</p>
            {rated.length ? (
              <>
                <Legend />
                <DumbbellChart hooks={rated} />
              </>
            ) : (
              <p class="chart-empty">{t.dumbbellEmpty}</p>
            )}
          </section>

          <section class="chart-card">
            <h2>{t.trendTitle}</h2>
            <p class="muted small">{t.trendSub}</p>
            {trend.length >= 2 ? (
              <>
                {change !== null && <p class="trend-note">{change <= -0.5 ? t.trendDown(fmt(lang, -change)) : t.trendFlat}</p>}
                <TrendChart points={trend} />
              </>
            ) : (
              <p class="chart-empty">{t.trendEmpty}</p>
            )}
          </section>

          <PetCount />

          <section class="history">
            <h2>{t.history}</h2>
            {groupByDay(history.slice(0, limit)).map(([key, entries]) => (
              <div class="history-day" key={key}>
                <h3>{dayLabel(key, lang, t)}</h3>
                <ul>
                  {entries.map((h) => <HistoryRow key={h.id} hook={h} />)}
                </ul>
              </div>
            ))}
            {history.length > limit && (
              <button class="secondary full" onClick={() => setLimit((l) => l + PAGE)}>{t.showMore}<Haptic /></button>
            )}
          </section>
        </>
      )}
    </main>
  );
}

/** How many times she has petted the tuna on the home screen, with a random quip (D49). */
function PetCount() {
  const t = useT();
  const lang = useLang();
  const { data } = useApp();
  const quip = useMemo(() => pick(t.petCountQuips), [t]);

  return (
    <section class="pet-count">
      <span class="pet-count-heart" aria-hidden="true"><Heart size={20} filled /></span>
      <p>
        <strong>{data.pets.toLocaleString(localeOf(lang))}</strong> {t.petCount(data.pets)}
        <span class="muted small">{data.pets ? quip : t.petCountNone}</span>
      </p>
    </section>
  );
}

function HistoryRow({ hook }: { hook: HookEntry }) {
  const t = useT();
  const lang = useLang();
  // Older entries don't record which cards were completed; fall back to the cards drawn.
  const cards = (hook.completed ?? hook.cards).map((id) => cardById(id)).filter((c) => !!c);
  const time = new Date(hook.startedAt).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' });
  const label = hook.result === 'passed' ? t.resultPassed : hook.result === 'notyet' ? t.notYet : t.resultSnagged;

  return (
    <li class={`history-row result-${hook.result}`}>
      <span class="history-icon" aria-hidden="true">
        {hook.result === 'passed' ? <MiniTuna size={30} /> : <FishHook size={22} stroke={4} />}
      </span>
      <div class="history-main">
        <div class="history-top">
          <span class="history-time">{time}</span>
          <span class="history-result">{label}</span>
        </div>
        {cards.length > 0 || hook.rounds || hook.breaths ? (
          <ul class="history-cards">
            {cards.map((c, i) => (
              <li key={`${c.id}-${i}`}>
                <RarityFish rarity={c.rarity} size={30} />
                <span>{c.title[lang]}</span>
              </li>
            ))}
            {!!hook.rounds && (
              <li class="history-game">
                <span class="history-game-icon"><FishHook size={18} stroke={5} /></span>
                <span>{t.dodgeRounds(hook.rounds)}</span>
              </li>
            )}
            {!!hook.breaths && (
              <li class="history-game">
                <span class="history-game-icon"><BubbleIcon size={20} /></span>
                <span>{t.breatheLog(hook.breaths)}</span>
              </li>
            )}
          </ul>
        ) : (
          <span class="muted small">{t.noCards}</span>
        )}
        {(!!hook.reasons?.length || hook.freshStart) && (
          <p class="muted small">
            {[...(hook.reasons ?? []).map((r) => t.reasons[r]), ...(hook.freshStart ? [t.freshStartLog] : [])].join(' · ')}
          </p>
        )}
        {hook.baitNote && <p class="bait-note">“{hook.baitNote}”</p>}
      </div>
      {hook.before !== undefined && (
        <span class="history-pull" aria-label={`${t.pullChange}: ${hook.before} → ${hook.after ?? '–'}`}>
          <span class="pull-chip" style={{ '--level': hook.before } as Record<string, number>}>{hook.before}</span>
          <span class="muted">→</span>
          {hook.after !== undefined ? (
            <span class="pull-chip" style={{ '--level': hook.after } as Record<string, number>}>{hook.after}</span>
          ) : (
            <span class="pull-chip empty">–</span>
          )}
        </span>
      )}
    </li>
  );
}

function groupByDay(hooks: HookEntry[]): [string, HookEntry[]][] {
  const groups = new Map<string, HookEntry[]>();
  for (const h of hooks) {
    const k = dayKey(h.startedAt);
    groups.set(k, [...(groups.get(k) ?? []), h]);
  }
  return [...groups.entries()];
}

function dayLabel(key: string, lang: Lang, t: { today: string; yesterday: string }) {
  const now = new Date();
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString());
  if (key === today) return t.today;
  if (key === yesterday) return t.yesterday;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' });
}
