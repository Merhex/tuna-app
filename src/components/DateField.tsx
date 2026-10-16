import type { Lang } from '../cards';
import { localeOf } from '../i18n';
import { Calendar } from './Icons';

/**
 * A date field: our own box showing the date, with the real date picker invisibly on top. iPhone
 * Safari gives its date inputs a minimum width of its own, which pushed the field off the screen.
 */
export function DateField({
  value,
  max,
  text,
  label,
  onChange,
  compact = false,
}: {
  value: string;
  max: string;
  /** What the box shows, usually the formatted date. */
  text: string;
  label: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const pick = (e: Event) => onChange((e.target as HTMLInputElement).value);
  return (
    <div class={`date-field${compact ? ' compact' : ''}`}>
      <span class="date-text">{text}</span>
      <Calendar />
      <input
        class="date-native"
        type="date"
        max={max}
        value={value}
        aria-label={label}
        onInput={pick}
        onChange={pick}
        onClick={(e) => {
          // Desktop browsers only open the picker from their small calendar icon; open it from anywhere.
          try {
            (e.currentTarget as HTMLInputElement).showPicker?.();
          } catch {
            /* not supported or not allowed: the native behaviour still works */
          }
        }}
      />
    </div>
  );
}

/** A YYYY-MM-DD day written out, like "15 October 2026" or "15. října 2026". */
export function formatDay(key: string, lang: Lang): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric' });
}
