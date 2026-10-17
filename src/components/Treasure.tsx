import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Lang } from '../cards';
import { countOf, describeComparison, pickComparisons } from '../comparisons';
import { fx } from '../feedback';
import { localeOf, useLang, useT } from '../i18n';
import { daysSince, isQuitDate, MILESTONES, milestoneProgress, reachedOn } from '../milestones';
import { DECORATION_NAMES } from '../seabed';
import { useApp } from '../state';
import { streakOf } from '../streak';
import type { Tank } from '../tank/scene';
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
import { Chest, chestFill, treasureFill } from './Chest';
import { DateField, formatDay } from './DateField';
import { Haptic } from './Haptic';
import { Back } from './Icons';
import { DecorationIcon } from './Seabed';

const SYMBOL: Record<Currency, string> = { CZK: 'Kč', EUR: '€', USD: '$' };

/**
 * The Sunken Treasure (D38): the money she's not spending, what it would buy, and the milestones.
 * With the 3D tank (D56) the camera swims down to the chest in the middle of the tank, its lid opens,
 * and the page comes in under it; the chest sits where the drawing would, and scrolls away with the
 * page. Without 3D (or if the phone takes it away) it's the drawing, as before.
 */
export function Treasure({ onClose, tank }: { onClose: () => void; tank: Tank | null }) {
  const t = useT();
  const { data } = useApp();
  const [editing, setEditing] = useState(false);
  const treasure = data.treasure;
  const quitDate = data.quitDate;
  // In 3D only if the tank was ready when the screen opened, so the chest never switches from the drawing mid-visit.
  const [opened3d] = useState(!!tank);
  const tank3d = opened3d ? tank : null;
  const calm = data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  // While the camera swims down, the page waits, then comes in under the chest.
  const [arriving, setArriving] = useState(!!tank3d && !calm);
  const fill = treasureFill(data);

  useEffect(() => {
    if (!arriving) return;
    const id = setTimeout(() => setArriving(false), 1600);
    return () => clearTimeout(id);
  }, []);

  // The lid opens when she's counting the money, and shuts while she edits it (like the drawing).
  // Set before going to the chest, so the lid waits for the camera.
  useEffect(() => tank3d?.setChestOpen(!!treasure && !!quitDate && !editing), [tank3d, !!treasure, !!quitDate, editing]);
  useEffect(() => tank3d?.setChestFill(fill), [tank3d, Math.round(fill * 100)]);
  useEffect(() => tank3d?.go('chest'), [tank3d]);

  // The tank covers the backdrop behind it, which can stop drawing.
  useEffect(() => {
    document.documentElement.classList.toggle('ocean-off', !!tank3d);
    return () => document.documentElement.classList.remove('ocean-off');
  }, [tank3d]);

  return (
    <main class={`screen treasure${tank3d ? ' in-3d' : ''}${arriving ? ' arriving' : ''}`}>
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

      {editing ? (
        <TreasureForm onDone={() => setEditing(false)} tank={tank3d} />
      ) : (
        <>
          {treasure && quitDate ? (
            <Counter tank={tank3d} />
          ) : (
            // The money part is optional; the milestones show without it (D44).
            <section class={`panel center${quitDate ? ' money-pitch' : ''}`}>
              <TreasureChest tank={tank3d} fill={0} open={false} size={quitDate ? 170 : 240} />
              <p class="muted treasure-pitch">{t.treasureEmpty}</p>
              <button class="primary big" onClick={() => { fx.tap(); setEditing(true); }}>
                {t.startCounting}
                <Haptic />
              </button>
            </section>
          )}
          {quitDate && <Milestones />}
        </>
      )}
    </main>
  );
}

/**
 * The chest at the top: in 3D (D56), an empty space the tank fits the chest into, following it as the
 * page scrolls; without 3D, the drawing. The 3D lid and gold are set by Treasure, not here.
 */
function TreasureChest({ tank, fill, open, size = 240 }: { tank: Tank | null; fill: number; open: boolean; size?: number }) {
  const slot = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!tank) return;
    const measure = () => slot.current && tank.placeChest(screenBox(slot.current));
    measure();
    const watcher = new ResizeObserver(measure);
    if (slot.current) watcher.observe(slot.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      watcher.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [tank]);

  if (!tank) return <Chest fill={fill} open={open} size={size} />;
  return <div ref={slot} class="chest-slot" style={{ width: `${size}px`, height: `${size * 0.75}px` }} aria-hidden="true" />;
}

/** Where an element is on screen, in pixels, from the layout (so the page's arrival animation doesn't move it). */
function screenBox(el: HTMLElement) {
  let x = -window.scrollX;
  let y = -window.scrollY;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

/** What to expect, counted from the quit date (D41). Kept out of Counter, which re-renders 10 times a second. */
function Milestones() {
  const t = useT();
  const lang = useLang();
  const { data, update } = useApp();
  const startDate = data.quitDate!;
  const [now, setNow] = useState(() => new Date());
  // Milestones reached since she last looked get a NEW pill for this visit.
  const [seenBefore] = useState(data.settings.milestoneSeen);

  // The day only changes at midnight; checking once a minute is plenty.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = daysSince(startDate, now);
  const { current, next } = milestoneProgress(days);
  const streak = streakOf(data.hooks, startDate, now);

  useEffect(() => {
    if (data.settings.milestoneSeen !== current.day) {
      update((d) => ({ ...d, settings: { ...d.settings, milestoneSeen: current.day } }));
    }
  }, [current.day]);

  const locale = localeOf(lang);
  const today = todayKey(now);

  return (
    <section class="milestones">
      <h2>{t.milestonesTitle}</h2>
      <p class="days-count">
        <strong>{days}</strong> <span>{t.daysSinceQuit(days)}</span>
      </p>
      {/* Her streak (D57), once she has been snagged; until then it's the same number as above. */}
      {streak.hasSlips && (
        <div class="stat-row streak-row">
          {[
            { n: streak.current, label: t.streakNow },
            { n: streak.best, label: t.streakBest },
            { n: streak.swamFree, label: t.daysOffHook },
          ].map(({ n, label }) => (
            <div class="stat" key={label}>
              <strong>{n}<small> {t.daysUnit(n)}</small></strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
      {/* The one quit date (D44). Decorations are only earned on the home screen, so scrolling
          through dates here never earns anything by accident. */}
      <DateField
        compact
        value={startDate}
        max={today}
        text={t.quitSince(formatDay(startDate, lang))}
        label={t.quitDateLabel}
        onChange={(value) => {
          if (isQuitDate(value, today)) update((d) => ({ ...d, quitDate: value }));
        }}
      />
      <ol class="milestone-list">
        {MILESTONES.map((m) => {
          const state = m === current ? 'current' : m.day < days ? 'done' : m === next ? 'next' : 'future';
          const isNew = m.day > seenBefore && m.day <= days && m.day > 0;
          return (
            <li key={m.id} class={`milestone ${state}`}>
              <details open={state === 'current' || state === 'next'}>
                <summary>
                  <span class="milestone-dot" aria-hidden="true" />
                  <span class="milestone-head">
                    <span class="milestone-when">{m.when[lang]}</span>
                    <span class="milestone-title">{m.title[lang]}</span>
                  </span>
                  <span class="milestone-tag">
                    {isNew && <span class="new-pill">{t.milestoneNew}</span>}
                    {state === 'current' && !isNew && t.youAreHere}
                    {state === 'next' && t.inDays(m.day - days)}
                    {state === 'done' &&
                      !isNew &&
                      reachedOn(startDate, m).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                  </span>
                </summary>
                <p>{m.body[lang]}</p>
                <SeabedReward id={m.id} has={!!data.seabed.earned[m.id] || m.day <= days} />
              </details>
            </li>
          );
        })}
      </ol>
      <p class="muted small">{t.milestonesNote}</p>
    </section>
  );
}

/** The decoration a milestone leaves on the seabed (D43): in colour once it's there, a pale shape before. */
function SeabedReward({ id, has }: { id: string; has: boolean }) {
  const t = useT();
  const lang = useLang();
  const name = DECORATION_NAMES[id]?.[lang];
  if (!name) return null;
  return (
    <p class={`milestone-deco${has ? ' has' : ''}`}>
      <span class="milestone-deco-art">
        <DecorationIcon id={id} box={30} silhouette={!has} />
      </span>
      <span>{has ? t.onYourSeabed(name) : t.comingToSeabed(name)}</span>
    </p>
  );
}

function Counter({ tank }: { tank: Tank | null }) {
  const t = useT();
  const lang = useLang();
  const { data } = useApp();
  const treasure = data.treasure!;
  const quitDate = data.quitDate!;
  const currency = data.settings.currency;
  const [now, setNow] = useState(Date.now());
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const amount = savedAt(treasure, quitDate, now);
  const money = moneyParts(amount, currency, lang);
  const perWeek = currentRate(treasure);
  const buys = pickComparisons(amount, currency, seed);
  const since = new Date(startTime(quitDate)).toLocaleDateString(localeOf(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section class="panel treasure-main">
      <div class="chest-wrap">
        <TreasureChest tank={tank} fill={chestFill(amount * CZK_PER[currency])} open />
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
        {!buys.length ? (
          <p class="muted">{t.firstCoins}</p>
        ) : (
          <>
            <ul class="buy-list">
              {buys.map((c) => (
                <li key={c.id} class={c.jungkook ? 'jungkook' : undefined}>
                  {describeComparison(c, countOf(c, amount, currency), lang)}
                </li>
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

function TreasureForm({ onDone, tank }: { onDone: () => void; tank: Tank | null }) {
  const t = useT();
  const lang = useLang();
  const { data, update } = useApp();
  const existing = data.treasure;
  const [currency, setCurrency] = useState<Currency>(data.settings.currency);
  const startAmount = existing ? currentRate(existing) : null;
  const [amountText, setAmountText] = useState(startAmount ? formatNumber(startAmount, lang) : '');
  // The quit date is asked in the intro and changed in the milestones panel (D44). Asked here only if
  // there isn't one yet (an old backup restored without it).
  const askDate = !data.quitDate;
  const [startDate, setStartDate] = useState(data.quitDate ?? todayKey());
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
    const date = isQuitDate(startDate, today) ? startDate : today;
    update((d) => {
      // A currency switch re-expresses the existing amounts first (see Settings for the same rule).
      let tr = d.treasure && d.settings.currency !== currency ? convertTreasure(d.treasure, d.settings.currency, currency) : d.treasure;
      if (!tr) tr = newTreasure(perWeek);
      else if (perWeek !== currentRate(tr)) tr = withWeeklyAmount(tr, perWeek);
      return { ...d, quitDate: d.quitDate ?? date, treasure: tr, settings: { ...d.settings, currency } };
    });
    fx.coins();
    onDone();
  }

  return (
    <section class="panel treasure-form">
      {/* In 3D the chest stays, shut while she edits (D56). */}
      {(!existing || tank) && <TreasureChest tank={tank} fill={0} open={false} size={170} />}
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

      {askDate && (
        <div class="field">
          <span>{t.countingFrom}</span>
          <DateField
            value={startDate}
            max={today}
            text={formatDay(startDate || today, lang)}
            label={t.countingFrom}
            onChange={setStartDate}
          />
          <span class="hint">{t.countingFromHint}</span>
        </div>
      )}

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

const formatNumber = (n: number, lang: Lang) =>
  new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 2, useGrouping: false }).format(n);
