import { useState } from 'preact/hooks';
import { CARDS, RARITIES, type Card } from '../cards';
import { haptic, sound } from '../feedback';
import { useLang, useT } from '../i18n';
import { useApp } from '../state';
import { Back, Heart } from './Icons';
import { RarityFish } from './RarityFish';
import { Haptic } from './Haptic';

const SORTED = [...CARDS].sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity));
const BADGE_AT = 5;

export function Aquarium({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const { data, update } = useApp();
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [open, setOpen] = useState<Card | null>(null);
  const caught = Object.keys(data.collection).length;

  const shown = onlyFavs ? SORTED.filter((c) => data.collection[c.id]?.favourite) : SORTED;

  const toggleFav = (id: string) => {
    haptic.tap();
    sound.tap();
    update((d) => ({
      ...d,
      collection: { ...d.collection, [id]: { ...d.collection[id], favourite: !d.collection[id].favourite } },
    }));
  };

  return (
    <main class="screen aquarium">
      <header class="topbar">
        <button class="icon-btn" onClick={onClose} aria-label={t.close}><Back /></button>
        <h1 class="screen-title">{t.aquarium}</h1>
        <span class="topbar-spacer" />
      </header>

      <p class="progress-text">{t.caughtProgress(caught, CARDS.length)}</p>
      <div class="progress-bar" aria-hidden="true">
        <div style={{ width: `${(caught / CARDS.length) * 100}%` }} />
      </div>

      <div class="segmented">
        <button aria-pressed={!onlyFavs} onClick={() => setOnlyFavs(false)}>{t.drawAll}<Haptic /></button>
        <button aria-pressed={onlyFavs} onClick={() => setOnlyFavs(true)}><Heart size={14} filled /> {t.drawFavourites}<Haptic /></button>
      </div>

      <div class="tank-grid">
        {shown.map((card) => {
          const entry = data.collection[card.id];
          return (
            <button
              key={card.id}
              class={`tank-card rarity-${card.rarity} ${entry ? 'caught' : 'unknown'}`}
              onClick={() => {
                sound.tap();
                setOpen(card);
              }}
            >
              {entry ? (
                <>
                  <RarityFish rarity={card.rarity} size={64} />
                  <span class="tank-title">{card.title[lang]}</span>
                  <span class="tank-meta">
                    ×{entry.count}
                    {entry.count >= BADGE_AT && <span class="star" title="5+">★</span>}
                    {entry.favourite && <Heart size={12} filled />}
                  </span>
                </>
              ) : (
                <>
                  <span class="tank-silhouette"><RarityFish rarity={card.rarity} size={64} silhouette /></span>
                  <span class="tank-title">{t.unknownCard}</span>
                </>
              )}
              <span class="tank-rarity">{t.rarity[card.rarity]}</span>
            </button>
          );
        })}
      </div>

      {open && (
        <div class="modal-backdrop" onClick={() => setOpen(null)}>
          <div class={`modal card-face rarity-${open.rarity}`} onClick={(e) => e.stopPropagation()}>
            <div class="card-top">
              <span class="rarity-label">{t.rarity[open.rarity]}</span>
            </div>
            <div class="modal-fish">
              <RarityFish rarity={open.rarity} size={150} silhouette={!data.collection[open.id]} />
            </div>
            {data.collection[open.id] ? (
              <>
                <h2 class="card-title">{open.title[lang]}</h2>
                <p class="card-task">{open.task[lang]}</p>
                <p class="muted small">
                  {t.caughtTimes(data.collection[open.id].count)} ·{' '}
                  {new Date(data.collection[open.id].firstCaught).toLocaleDateString(lang)}
                </p>
                <button
                  class={`fav-btn ${data.collection[open.id].favourite ? 'on' : ''}`}
                  aria-pressed={data.collection[open.id].favourite}
                  onClick={() => toggleFav(open.id)}
                >
                  <Heart size={16} filled={data.collection[open.id].favourite} /> {t.favourite}
                  <Haptic />
                </button>
              </>
            ) : (
              <>
                <h2 class="card-title">{t.unknownCard}</h2>
                <p class="card-task">{t.notCaughtYet}</p>
              </>
            )}
            <button class="link" onClick={() => setOpen(null)}>{t.close}</button>
          </div>
        </div>
      )}
    </main>
  );
}
