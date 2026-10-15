import type { Card } from '../cards';
import { useLang, useT } from '../i18n';

/** A side-quest card. `flipped` shows the face; otherwise the back. */
export function CardView({ card, flipped, isNew }: { card: Card; flipped: boolean; isNew?: boolean }) {
  const t = useT();
  const lang = useLang();
  return (
    <div class={`card-3d ${flipped ? 'flipped' : ''}`}>
      <div class="card-inner">
        <div class="card-back" aria-hidden="true">
          <div class="card-back-pattern">?</div>
        </div>
        <div class={`card-face rarity-${card.rarity}`}>
          {card.rarity === 'legendary' && flipped && <div class="burst" aria-hidden="true" />}
          <div class="card-top">
            <span class="rarity-label">{t.rarity[card.rarity]}</span>
            {isNew && <span class="new-pill">NEW</span>}
          </div>
          <h2 class="card-title">{card.title[lang]}</h2>
          <p class="card-task">{card.task[lang]}</p>
          <span class="chip">{t.category[card.category]}</span>
        </div>
      </div>
    </div>
  );
}

export function Rating({ value, onPick }: { value?: number; onPick: (n: number) => void }) {
  const t = useT();
  return (
    <div class="rating">
      <div class="rating-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            class={`rate-btn ${value === n ? 'on' : ''}`}
            style={{ '--level': n } as Record<string, number>}
            onClick={() => onPick(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div class="rating-ends">
        <span>{t.rateLow}</span>
        <span>{t.rateHigh}</span>
      </div>
    </div>
  );
}
