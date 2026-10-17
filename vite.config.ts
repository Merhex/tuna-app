import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// GitHub Pages serves the app from https://<user>.github.io/tuna-app/
const base = process.env.BASE_PATH ?? '/tuna-app/';

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base,
  define: {
    // Shown in Settings so it's easy to see which version is running: the commit it was built from, and when.
    __APP_VERSION__: JSON.stringify(process.env.BUILD_ID || process.env.GITHUB_SHA?.slice(0, 7) || gitCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    // The Visit my school prototype's chunk carries three.js (about 575 kB, 150 kB gzipped). It's only
    // loaded when the prototype opens, so the usual 500 kB warning doesn't apply.
    chunkSizeWarningLimit: 650,
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Off the Hook',
        short_name: 'Off the Hook',
        description: 'Get through cravings, one silly side quest at a time.',
        theme_color: '#0b2a40',
        background_color: '#0b2a40',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}', '**/*-latin-*.woff2'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
