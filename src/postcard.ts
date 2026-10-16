import { h, render } from 'preact';
import { Tuna } from './components/Tuna';

/** What goes on a postcard (D53). Nothing about vaping (D30): only the hook, the card and the tuna. */
export interface PostcardInfo {
  headline: string;
  /** What she did: a card's title and rarity, or the game's hooks dodged. */
  feat: string;
  /** Hook strength before and after, when she rated both. */
  pull?: { label: string; before: number; after: number };
  /** "Tuna no. 12 in my school". */
  school: string;
  date: string;
}

const W = 1080;
const H = 1350;
const DISPLAY = '"Baloo 2", ui-rounded, system-ui, sans-serif';
const SANS = 'Nunito, ui-rounded, -apple-system, system-ui, sans-serif';

/** The app's colours, read from the stylesheet so the postcard matches the app. */
function colours() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    seaTop: v('--sea-top', '#155a85'),
    seaMid: v('--sea-mid', '#0c3350'),
    seaDeep: v('--sea-deep', '#061724'),
    ink: v('--ink', '#eaf4fa'),
    muted: v('--muted', '#a9c3d4'),
    inkDark: v('--ink-dark', '#0b1f2e'),
    coral: v('--coral', '#ff7a59'),
    gold: v('--gold', '#f2c14e'),
    tunaBody: v('--tuna-body', '#4f8fbf'),
    tunaBelly: v('--tuna-belly', '#d4e3ec'),
    tunaFin: v('--tuna-fin', '#f2c14e'),
  };
}

/** The mascot as an image. An SVG drawn into a canvas can't see the page's CSS, so the colours are filled in. */
function tunaImage(c: ReturnType<typeof colours>): Promise<HTMLImageElement> {
  const box = document.createElement('div');
  render(h(Tuna, { mood: 'smug', size: 200 }), box);
  const vars: Record<string, string> = {
    '--tuna-body': c.tunaBody,
    '--tuna-belly': c.tunaBelly,
    '--tuna-fin': c.tunaFin,
    '--ink-dark': c.inkDark,
    '--coral': c.coral,
  };
  const svg = box.innerHTML
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    .replace(/var\((--[\w-]+)\)/g, (m, name: string) => vars[name] ?? m);
  render(null, box);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Breaks text into lines that fit `width`. A one-letter word (Czech "s", "v", "k") stays with the next one. */
export function wrap(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  const words = text.replace(/(^|\s)(\p{L}) /gu, '$1$2\u00a0').split(' ');
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The same colour as a hook-strength box in the app (`.pull-num`): bluer when weak, coral when brutal. */
function pullColour(level: number, coral: string): string {
  const t = (level - 1) / 9;
  const from = [0x2c, 0x6d, 0x92];
  const to = [1, 3, 5].map((i) => parseInt(coral.slice(i, i + 2), 16));
  if (to.some(Number.isNaN)) return coral;
  return `rgb(${from.map((f, i) => Math.round(f + (to[i] - f) * t)).join(',')})`;
}

/** Draws the postcard and returns it as a PNG file, ready for the share sheet. */
export async function makePostcard(info: PostcardInfo): Promise<File> {
  const c = colours();
  // Canvas text only uses a web font once it has loaded.
  const sample = `${info.headline} ${info.feat} ${info.school} ${info.date}`;
  await Promise.all([
    document.fonts?.load(`800 80px ${DISPLAY}`, sample),
    document.fonts?.load(`700 40px ${SANS}`, sample),
  ]).catch(() => undefined);
  const tuna = await tunaImage(c);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // The sea.
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, c.seaTop);
  sea.addColorStop(0.55, c.seaMid);
  sea.addColorStop(1, c.seaDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, W, H);

  // Bubbles, always in the same places.
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 16; i++) {
    const x = (i * 263 + 90) % W;
    const y = H - ((i * 397 + 140) % (H - 120));
    const r = 8 + ((i * 7) % 22);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // A postcard border.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  ctx.setLineDash([22, 14]);
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.stroke();
  ctx.setLineDash([]);

  // The stamp, top right: a tilted gold square with a tiny tuna.
  ctx.save();
  ctx.translate(W - 190, 190);
  ctx.rotate(0.12);
  ctx.fillStyle = c.gold;
  roundRect(ctx, -80, -95, 160, 190, 10);
  ctx.fill();
  ctx.strokeStyle = c.inkDark;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  roundRect(ctx, -66, -81, 132, 162, 6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.drawImage(tuna, -58, -40, 116, 70);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // The app's name, small, like a postcard's printed heading.
  ctx.fillStyle = c.muted;
  ctx.font = `800 34px ${DISPLAY}`;
  ctx.fillText('OFF THE HOOK', 110, 160);

  // The headline.
  ctx.fillStyle = c.ink;
  ctx.font = `800 84px ${DISPLAY}`;
  let y = 290;
  for (const line of wrap(ctx, info.headline, W - 380).slice(0, 3)) {
    ctx.fillText(line, 110, y);
    y += 92;
  }

  // The tuna, big, in the middle.
  const tunaW = 560;
  const tunaY = Math.max(y + 10, 470);
  ctx.drawImage(tuna, (W - tunaW) / 2, tunaY, tunaW, tunaW * 0.6);

  // Hook strength, like the win screen.
  let bottom = tunaY + tunaW * 0.6 + 70;
  ctx.textAlign = 'center';
  if (info.pull) {
    ctx.fillStyle = c.muted;
    ctx.font = `700 36px ${SANS}`;
    ctx.fillText(info.pull.label, W / 2, bottom);
    const size = 110;
    const gap = 150;
    const top = bottom + 30;
    for (const [i, n] of [info.pull.before, info.pull.after].entries()) {
      const x = W / 2 + (i === 0 ? -gap : gap) - size / 2;
      ctx.fillStyle = pullColour(n, c.coral);
      roundRect(ctx, x, top, size, size, 26);
      ctx.fill();
      ctx.fillStyle = c.ink;
      ctx.font = `800 64px ${DISPLAY}`;
      ctx.fillText(String(n), x + size / 2, top + 78);
    }
    ctx.fillStyle = c.muted;
    ctx.font = `800 60px ${DISPLAY}`;
    ctx.fillText('→', W / 2, top + 76);
    bottom = top + size + 80;
  }

  // What she did.
  ctx.fillStyle = c.ink;
  ctx.font = `700 42px ${SANS}`;
  for (const line of wrap(ctx, info.feat, W - 240).slice(0, 2)) {
    ctx.fillText(line, W / 2, bottom);
    bottom += 54;
  }

  // The footer: her school and the date.
  ctx.fillStyle = c.gold;
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.fillText(info.school, W / 2, H - 150);
  ctx.fillStyle = c.muted;
  ctx.font = `700 34px ${SANS}`;
  ctx.fillText(info.date, W / 2, H - 98);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Postcard could not be drawn');
  return new File([blob], 'off-the-hook-postcard.png', { type: 'image/png' });
}

/** Opens the share sheet with the postcard. Where files can't be shared (most computers), it downloads instead. */
export async function sharePostcard(file: File): Promise<void> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // She closed the share sheet: nothing more to do.
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
