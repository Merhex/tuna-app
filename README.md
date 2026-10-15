# Off the Hook

A tuna-themed web app that helps Tuna ride out vape cravings. Tap **There's a hook!**, draw a silly side-quest card, do it, and build an aquarium of cards along the way. Every craving beaten adds a tuna to her school.

The design decisions live in the decision record artifact. This repo is the phase 1 proof of concept.

## How it works

- **No backend.** It's a static site. All progress stays on her phone (IndexedDB), with backup/restore to a file.
- **Installable and offline.** It's a PWA: add it to the home screen from Safari and it runs full screen, offline.
- **English and Czech.** The language is picked from the phone's settings and can be changed in Settings.
- **Sunken Treasure** (optional): a live counter of the money she's not spending, from a weekly amount and a start date. It never resets; a changed weekly amount only applies from then on. Currency (Kč, €, $) is separate from the language.
- **Sounds and vibrations** are generated in code (no audio files) and can be turned off in Settings. On iPhone, vibrations need iOS 18+.

## Adding or editing cards

All cards are in [`src/data/cards.json`](src/data/cards.json). Each card has an English and Czech title and task.

1. Add the card. Give it a new, permanent `id` (never change or reuse an ID: her collection is keyed on it).
2. Set `addedIn` to the next deck version, and bump `deckVersion` at the top of the file.
3. Push to `main`. GitHub Actions tests, builds and deploys. Her phone picks up the new version, and the app shows "New catches washed ashore!".

Rarity chances, the guaranteed-rare counter and the weighting toward uncaught cards are in [`src/draw.ts`](src/draw.ts) (`DRAW_SETTINGS`).

## The petting Easter egg

Tap the tuna on the home screen and it closes its eyes. Tap it five times fast and it tells a joke, and 1 in 10 of those comes from the dark list. The jokes are `petJokes` and `petDarkJokes` in [`src/i18n.ts`](src/i18n.ts) (English and Czech). Timing and odds are `PET_SETTINGS` in [`src/pet.ts`](src/pet.ts).

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # draw algorithm and deck checks
npm run build    # production build into dist/
npm run icons    # re-render app icons from scripts/icon.svg
```

## Deploying

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

One-time setup: in the repo on GitHub, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. Not "Deploy from a branch": that publishes the unbuilt source files, and the app shows a blank page (or a "couldn't start" message).

The app is served at `https://merhex.github.io/tuna-app/`.

### How updates reach her phone

The app runs from a copy saved on the device, so it works offline. On every open (and every time it comes back into view) it checks for a new version in the background. If one arrives within 15 seconds of opening, it reloads into it right away; otherwise it switches the next time she leaves the app. It never reloads during a craving.

To see which version is running, look at the bottom of **Settings**: `Version <commit> · <build time>`. The commit matches the one on GitHub.
