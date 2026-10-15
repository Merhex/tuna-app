import { useEffect, useState } from 'preact/hooks';
import { countOf, describeComparison, pickComparisons } from '../comparisons';
import { fx } from '../feedback';
import { useLang, useT } from '../i18n';
import { useApp } from '../state';
import {
  CURRENCIES,
  CZK_PER,
  convertTreasure,
  currentRate,
  formatMoney,
  moneyParts,
  newTreasure,
  parseAmount,
  savedAt,
  startTime,
  todayKey,
  withWeeklyAmount,
  type Currency,
} from '../treasure';
import { Chest, chestFill } from './Chest';
import { Haptic } from './Haptic';
import { Back } from './Icons';

const SYMBOL: Record<Currency, string> = { CZK: 'Kč', EUR: '€', USD: '$' };

export function Treasure({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data } = useApp();
  const [editing, setEditing] = useState(false);
  const treasure = data.treasure;

  return (
    <main class="screen treasure">
      <header class="topbar">
        <button class="icon-btn" onClick={editing ? () => setEditing(false) : onClose} aria-label={t.close}>
          <Back />
          <Haptic />
        </button>
        <h1 class="screen-title">{t.treasureTitle}</h1>
        {treasure && !editing ? (
          <button class="link" onClick={() => { fx.tap(); setEditing(true); }}>
            {t.edit}
            <Haptic />
          </button>
        ) : (
          <span class="topbar-spacer" />
        )}
      </header>

      {editing || !treasure ? (
        treasure || editing ? (
          <TreasureForm onDone={() => setEditing(false)} />
        ) : (
          <section class="panel center">
            <Chest fill={0} open={false} />
            <p class="muted treasure-pitch">{t.treasureEmpty}</p>
            <button class="primary big" onClick={() => { fx.tap(); setEditing(true); }}>
              {t.startCounting}
              <Haptic />
            </button>
          </section>
        )
      ) : (
        <Counter />
      )}
    </main>
  );
}

function Counter() {
  const t = useT();
  const lang = useLang();
  const { data } = useApp();
  const treasure = data.treasure!;
  const currency = data.settings.currency;
  const [now, setNow] = useState(Date.now());
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const amount = savedAt(treasure, now);
  const money = moneyParts(amount, currency, lang);
  const perWeek = currentRate(treasure);
  const { headline, others } = pickComparisons(amount, currency, seed);
  const since = new Date(startTime(treasure)).toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section class="panel treasure-main">
      <div class="chest-wrap">
        <Chest fill={chestFill(amount * CZK_PER[currency])} open />
      </div>
      <div class="money" aria-live="off">
        <span class="money-main">{money.before}</span>
        <span class="money-dust">{money.extra}</span>
        <span class="money-main">{money.after}</span>
      </div>
      <p class="muted center-text">{t.savedSince(since)}</p>
      <p class="rate-line">
        {t.perDayYear(formatMoney(perWeek / 7, currency, lang, perWeek / 7 >= 100 ? 0 : 2), formatMoney((perWeek * 365) / 7, currency, lang, 0))}
      </p>

      <div class="buys">
        <h2>{t.buysTitle}</h2>
        {!headline && !others.length ? (
          <p class="muted">{t.firstCoins}</p>
        ) : (
          <>
            {headline && (
              <p class="buy-headline">
                <span aria-hidden="true">{headline.travel}</span> {describeComparison(headline, countOf(headline, amount, currency), lang)}
              </p>
            )}
            <ul class="buy-list">
              {others.map((c) => (
                <li key={c.id}>{describeComparison(c, countOf(c, amount, currency), lang)}</li>
              ))}
            </ul>
            <button class="secondary small" onClick={() => { fx.tap(); setSeed((s) => s + 1); }}>
              🎲 {t.anotherOne}
              <Haptic />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function TreasureForm({ onDone }: { onDone: () => void }) {
  const t = useT();
  const lang = useLang();
  const { data, update } = useApp();
  const existing = data.treasure;
  const [currency, setCurrency] = useState<Currency>(data.settings.currency);
  const startAmount = existing ? currentRate(existing) : null;
  const [amountText, setAmountText] = useState(startAmount ? formatNumber(startAmount, lang) : '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayKey());
  const [error, setError] = useState('');
  const today = todayKey();

  // Editing an existing treasure: the amount shown is re-expressed in the new currency, so it still means
  // the same money. (When setting up, the number is simply in whichever currency she picks.)
  function switchCurrency(to: Currency) {
    const n = parseAmount(amountText);
    if (existing && n !== null && to !== currency) {
      const converted = Math.round(((n * CZK_PER[currency]) / CZK_PER[to]) * 100) / 100;
      setAmountText(formatNumber(converted, lang));
    }
    setCurrency(to);
  }

  function save() {
    const perWeek = parseAmount(amountText);
    if (perWeek === null) {
      setError(t.invalidAmount);
      return;
    }
    const date = startDate && startDate <= today ? startDate : today;
    update((d) => {
      // A currency switch re-expresses the existing amounts first (see Settings for the same rule).
      let tr = d.treasure && d.settings.currency !== currency ? convertTreasure(d.treasure, d.settings.currency, currency) : d.treasure;
      if (!tr) tr = newTreasure(perWeek, date);
      else {
        tr = { ...tr, startDate: date };
        if (perWeek !== currentRate(tr)) tr = withWeeklyAmount(tr, perWeek);
      }
      return { ...d, treasure: tr, settings: { ...d.settings, currency } };
    });
    fx.coins();
    onDone();
  }

  return (
    <section class="panel treasure-form">
      {!existing && <Chest fill={0} open={false} size={170} />}
      <label class="field">
        <span>{t.weeklyQuestion}</span>
        <div class="amount-row">
          <input
            class="amount-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={currency === 'CZK' ? '300' : '15'}
            value={amountText}
            onInput={(e) => {
              setAmountText((e.target as HTMLInputElement).value);
              setError('');
            }}
          />
          <span class="amount-unit">
            {SYMBOL[currency]} {t.perWeek}
          </span>
        </div>
        {error && <span class="form-error">{error}</span>}
        {existing && <span class="hint">{t.rateChangeNote}</span>}
      </label>

      <div class="field">
        <span>{t.currency}</span>
        <div class="segmented" role="group" aria-label={t.currency}>
          {CURRENCIES.map((c) => (
            <button key={c} aria-pressed={currency === c} onClick={() => { fx.tap(); switchCurrency(c); }}>
              {SYMBOL[c]}
              <Haptic />
            </button>
          ))}
        </div>
        {existing && currency !== data.settings.currency && <span class="hint">{t.currencyNote}</span>}
      </div>

      <label class="field">
        <span>{t.countingFrom}</span>
        <input class="date-input" type="date" max={today} value={startDate} onInput={(e) => setStartDate((e.target as HTMLInputElement).value)} />
        <span class="hint">{t.countingFromHint}</span>
      </label>

      <button class="primary big" onClick={save}>
        {existing ? t.save : t.startCounting}
        <Haptic />
      </button>
      {existing && (
        <button class="link" onClick={onDone}>
          {t.cancel}
          <Haptic />
        </button>
      )}
    </section>
  );
}

const formatNumber = (n: number, lang: string) =>
  new Intl.NumberFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB', { maximumFractionDigits: 2, useGrouping: false }).format(n);
