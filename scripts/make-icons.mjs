// Renders the app icons from scripts/icon.svg. Run with `npm run icons` after changing the SVG.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync(new URL('./icon.svg', import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
// Maskable: shrink the artwork into the safe zone on a full-bleed background.
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b2a40' } })
  .composite([{ input: inner, top: 56, left: 56 }])
  .png()
  .toFile(out('icon-512-maskable.png'));
writeFileSync(out('favicon.svg'), svg);
console.log('icons written');
