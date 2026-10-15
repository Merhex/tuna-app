import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cardById } from '../cards';
import { useLang, useT } from '../i18n';
import type { DayPoint, Rated } from '../stats';

// Validated together (dataviz palette check, dark mode, against CHART_SURFACE): lightness band,
// colour-blind separation and contrast all pass.
export const START = '#e8603c';
export const END = '#3a9fd3';
export const CHART_SURFACE = '#0d2c44';
const GRID = 'rgba(234, 244, 250, 0.12)';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setWidth(ref.current.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export const fmt = (lang: string, v: number, digits = 1) =>
  new Intl.NumberFormat(lang, { maximumFractionDigits: digits, minimumFractionDigits: Number.isInteger(v) ? 0 : digits }).format(v);

const H = 190;
const M = { l: 26, r: 22, t: 14, b: 26 };
const yScale = (v: number) => M.t + ((10 - v) / 9) * (H - M.t - M.b);

function YAxis({ width }: { width: number }) {
  return (
    <g>
      {[1, 5, 10].map((v) => (
        <g key={v}>
          <line x1={M.l} x2={width - M.r} y1={yScale(v)} y2={yScale(v)} stroke={GRID} stroke-width="1" />
          <text x={M.l - 8} y={yScale(v) + 4} text-anchor="end" class="axis-text">{v}</text>
        </g>
      ))}
    </g>
  );
}

export function Legend() {
  const t = useT();
  return (
    <div class="legend">
      <span><i class="key-dot" style={{ background: START }} /> {t.legendStart}</span>
      <span><i class="key-dot" style={{ background: END }} /> {t.legendEnd}</span>
    </div>
  );
}

/** One vertical dumbbell per hook: where the craving started (coral) and where it ended (blue). */
export function DumbbellChart({ hooks }: { hooks: Rated[] }) {
  const t = useT();
  const lang = useLang();
  const [ref, width] = useWidth<HTMLDivElement>();
  const shown = hooks.slice(-14);
  const [sel, setSel] = useState(shown.length - 1);
  useEffect(() => setSel(shown.length - 1), [shown.length]);

  const plotW = Math.max(0, width - M.l - M.r);
  const slot = Math.min(plotW / Math.max(shown.length, 1), 44);
  const x = (i: number) => M.l + slot * (i + 0.5);
  const current = shown[sel];
  const when = (iso: string) =>
    new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });

  return (
    <div ref={ref} class="chart">
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={t.dumbbellTitle}>
          <YAxis width={width} />
          {shown.map((h, i) => (
            <g key={h.id}>
              {i === sel && <rect x={x(i) - slot / 2 + 1} y={M.t - 6} width={slot - 2} height={H - M.t - M.b + 12} rx="8" fill="rgba(234,244,250,0.07)" />}
              <line x1={x(i)} x2={x(i)} y1={yScale(h.before)} y2={yScale(h.after)} stroke="rgba(234,244,250,0.4)" stroke-width="2" stroke-linecap="round" />
              <circle cx={x(i)} cy={yScale(h.before)} r="5" fill={START} stroke={CHART_SURFACE} stroke-width="2" />
              <circle cx={x(i)} cy={yScale(h.after)} r="5" fill={END} stroke={CHART_SURFACE} stroke-width="2" />
              {/* Direct labels only when the column is wide enough not to collide; the readout always has them. */}
              {i === sel && slot >= 34 && (
                <>
                  <text x={x(i) + 10} y={yScale(h.before) + 4} class="value-text">{h.before}</text>
                  {h.after !== h.before && <text x={x(i) + 10} y={yScale(h.after) + 4} class="value-text">{h.after}</text>}
                </>
              )}
              {/* Hit target: the whole column, not just the dots. */}
              <rect
                x={x(i) - slot / 2}
                y={0}
                width={slot}
                height={H - M.b}
                fill="transparent"
                tabIndex={0}
                aria-label={`${when(h.startedAt)}: ${h.before} → ${h.after}`}
                onPointerEnter={() => setSel(i)}
                onClick={() => setSel(i)}
                onFocus={() => setSel(i)}
              />
            </g>
          ))}
          <text x={M.l} y={H - 6} class="axis-text">{shortDate(shown[0].startedAt)}</text>
          {shown.length > 1 && (
            <text x={x(shown.length - 1) + slot / 2} y={H - 6} text-anchor="end" class="axis-text">{shortDate(shown[shown.length - 1].startedAt)}</text>
          )}
        </svg>
      )}
      {current && (
        <div class="readout" aria-live="polite">
          <strong>
            {current.before} → {current.after}
            {current.after < current.before && <span class="drop"> (−{current.before - current.after})</span>}
          </strong>
          <span>
            {when(current.startedAt)}
            {current.completed?.length ? ` · ${current.completed.map((id) => cardById(id)?.title[lang]).filter(Boolean).join(', ')}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

/** Daily average of how strong cravings were when they hit. */
export function TrendChart({ points }: { points: DayPoint[] }) {
  const t = useT();
  const lang = useLang();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [sel, setSel] = useState(points.length - 1);
  useEffect(() => setSel(points.length - 1), [points.length]);

  const t0 = points[0].date.getTime();
  const t1 = points[points.length - 1].date.getTime();
  const x = (p: DayPoint) => M.l + 6 + ((p.date.getTime() - t0) / Math.max(t1 - t0, 1)) * (width - M.l - M.r - 12);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p)},${yScale(p.avgBefore)}`).join(' ');
  const area = `${line} L${x(points[points.length - 1])},${yScale(1)} L${x(points[0])},${yScale(1)} Z`;
  const nearest = (px: number) =>
    points.reduce((best, p, i) => (Math.abs(x(p) - px) < Math.abs(x(points[best]) - px) ? i : best), 0);
  const day = (p: DayPoint) => p.date.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const current = points[sel];
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div ref={ref} class="chart">
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={t.trendTitle}
          tabIndex={0}
          onPointerMove={(e) => setSel(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left))}
          onPointerDown={(e) => setSel(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left))}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSel((s) => Math.max(0, s - 1));
            if (e.key === 'ArrowRight') setSel((s) => Math.min(points.length - 1, s + 1));
          }}
        >
          <YAxis width={width} />
          <path d={area} fill={START} opacity="0.1" />
          <path d={line} fill="none" stroke={START} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          {current && <line x1={x(current)} x2={x(current)} y1={M.t - 4} y2={H - M.b} stroke="rgba(234,244,250,0.35)" stroke-width="1" />}
          {points.map((p) => (
            <circle key={p.day} cx={x(p)} cy={yScale(p.avgBefore)} r="4" fill={START} stroke={CHART_SURFACE} stroke-width="2" />
          ))}
          <text x={x(first)} y={yScale(first.avgBefore) - 10} text-anchor="start" class="value-text">{fmt(lang, first.avgBefore)}</text>
          <text x={x(last)} y={yScale(last.avgBefore) - 10} text-anchor="end" class="value-text">{fmt(lang, last.avgBefore)}</text>
          <text x={M.l} y={H - 6} class="axis-text">{first.date.toLocaleDateString(lang, { day: 'numeric', month: 'short' })}</text>
          <text x={width - M.r} y={H - 6} text-anchor="end" class="axis-text">{last.date.toLocaleDateString(lang, { day: 'numeric', month: 'short' })}</text>
        </svg>
      )}
      {current && (
        <div class="readout" aria-live="polite">
          <strong>{fmt(lang, current.avgBefore)}</strong>
          <span>{day(current)} · {t.hookCount(current.count)}</span>
        </div>
      )}
    </div>
  );
}
