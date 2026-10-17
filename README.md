# Off the Hook

A tuna-themed web app that helps Tuna ride out vape cravings. Tap **There's a hook!**, draw a silly side-quest card, do it, and build an aquarium of cards along the way. Every craving beaten adds a tuna to her school.

The roadmap, design decisions and milestone sources live in [`docs/`](docs/). That folder isn't part of the app: only the built `dist/` is deployed.

## How it works

- **No backend.** It's a static site. All progress stays on her phone (IndexedDB), with backup/restore to a file.
- **Installable and offline.** It's a PWA: add it to the home screen from Safari and it runs full screen, offline.
- **English and Czech.** The language is picked from the phone's settings and can be changed in Settings.
- **Where are you?** At the start of a craving she can switch between *At home* and *Out and about* (remembered). Out of the house, only cards tagged `anywhere` or `outside` are drawn.
- **Sunken Treasure** (optional): a live counter of the money she's not spending, from a weekly amount and a start date. It never resets; a changed weekly amount only applies from then on. Currency (Kč, €, $) is separate from the language. Below it, what the money would already buy; one of those is always a Jungkook thing (photocards up to a concert trip to Seoul) and one is always from Japan, South Korea or China, once she can afford them. They're in [`src/comparisons.ts`](src/comparisons.ts).
- **Milestones**, below the treasure: what to expect from quit day to one year, counted from the treasure's start date. Text in [`src/data/milestones.json`](src/data/milestones.json), sources in [`docs/milestones.md`](docs/milestones.md).
- **Daydream cards** walk her through picturing something she'd love, from Kyoto tea to front row at Jungkook in Seoul. They work anywhere ([D52](docs/decisions.md)).
- **Postcards:** the win screen can send a picture of the win through the share sheet. It never mentions vaping, and nothing leaves the phone unless she picks someone ([D53](docs/decisions.md)).
- **Dodge the hooks and Bubbles:** a 2½-minute game and two minutes of slow breathing with the tuna (in 4, out 6). A brutal hook (8 to 10) starts with one of them at random, and "Not yet" offers both ([D50, D51, D54](docs/decisions.md)). Timings are in `DODGE_SETTINGS` (`src/dodge.ts`) and `BREATHE_SETTINGS` (`src/breathe.ts`).
- **A 3D tank on the home screen.** Her school swims behind the button, one tuna per hook beaten (up to 200 drawn), with her milestone decorations on the sand and the tuna she pets in front, all in 3D. “Visit my school” under the button pulls back to the whole tank; drag to look around. three.js loads just after the app opens, so the button never waits, and a phone without 3D keeps the drawn seabed ([D55](docs/decisions.md)). Tuning is in `SCHOOL3D_SETTINGS` (`src/school3d.ts`); the scene is in `src/tank/`.
- **Sounds and vibrations** are generated in code (no audio files) and can be turned off in Settings. On iPhone, vibrations need iOS 18+.

## Adding or editing cards

All cards are in [`src/data/cards.json`](src/data/cards.json). Each card has an English and Czech title and task.

1. Add the card. Give it a new, permanent `id` (never change or reuse an ID: her collection is keyed on it).
2. Set `addedIn` to the next deck version, and bump `deckVersion` at the top of the file.
3. Tag where it can be done (`where`: `anywhere`, `outside`, `home`, `quiet`). At least half the deck must work out of the house (`anywhere` or `outside`), with at least two cards per rarity; `npm test` checks this. Also update the card count in `src/draw.test.ts`.
4. Push to `main`. GitHub Actions tests, builds and deploys. Her phone picks up the new version, and the app shows "New catches washed ashore!".

Rarity chances, the guaranteed-rare counter and the weighting toward uncaught cards are in [`src/draw.ts`](src/draw.ts) (`DRAW_SETTINGS`).

## The petting Easter egg

Tap the tuna on the home screen and it closes its eyes. Tap it five times fast and it tells a joke: 1 in 10 come from the dark list, and about 3 in 10 are about Jungkook, in a purple bubble. The jokes are `petJokes`, `petDarkJokes` and `petJungkookJokes` in [`src/i18n.ts`](src/i18n.ts) (English and Czech). Timing and odds are `PET_SETTINGS` in [`src/pet.ts`](src/pet.ts). Every tap is counted, and the Logbook shows the total just above the history (`PetCount` in [`src/components/Logbook.tsx`](src/components/Logbook.tsx)).

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
