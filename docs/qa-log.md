# QA log

Each pass walks through every screen and state at iPhone size (iPhone 13 and iPhone SE): install guide, home, the full craving flow (rating, hook drop, card back, common/rare/legendary reveals, running timer, check, win, not yet, snagged), aquarium, card detail, favourites, settings, Czech, the "new catches" message, and the in-app-browser install screen.

Scores are out of 10.

## Pass 1: 6/10

Main loop worked with no errors, but:

- **Bug:** the 1–10 rating row overflowed on a 390px-wide iPhone (the "10" was cut off).
- **Bug:** Czech filter labels used the wrong grammatical case ("Všech karet", "Oblíbených").
- **Bug:** draw-from-favourites stayed on after she dropped below 3 favourites, when the toggle is hidden.
- **Bug:** a fast double tap on the first rating could draw two cards.
- **Theme:** big empty area on every card. The aquarium's uncaught cards were all the same emoji blob. The drop screen used a crane-hook emoji. The main button's hook looked like a "J". No "line snaps" moment.
- **Feel:** the before/after hook strength was collected but never shown back to her (D10). The rare-card shimmer washed out the text. Settings used plain checkboxes.
- **Fonts:** system default, no personality.
- **Polish:** emoji icons rendered inconsistently. The "new catches" message was see-through.

**Fixed:** bundled Baloo 2 and Nunito fonts (Latin Extended, so Czech renders properly). A fish illustration for each rarity (sardine, mackerel, swordfish, golden bluefin) on cards and in the aquarium, with silhouettes for uncaught ones. A proper fishhook drawing everywhere. SVG icons. A card back with the hook and the app name. Win screen shows "Hook strength 8 → 3" and the hook flies away. Custom toggle switches. Fixed rating row, Czech grammar, favourites threshold, double draw, shimmer and message background.

## Pass 2: 7/10

Much better, but:

- **Bug:** the underwater background (rays, bubbles, seaweed, sand) was invisible because the page background painted over it. This is why everything looked flat.
- **Bug:** win-screen bubbles floated over the "Back to the tank" button.
- **Bug:** a deployed update reloaded the app a few seconds after opening, which could interrupt a craving mid-card.
- **Visual:** low ratings were a muddy brown. Uncaught silhouettes were nearly invisible. Emoji icons were still in Settings.
- **Feel:** no overall "proof" that cravings fade.

**Fixed:** the background stacking, the bubble layering, and updates now apply only when she leaves the app. Ratings go from calm blue (1) to angry coral (10). Silhouettes are visible as ghostly shapes. SVG icons in Settings. Settings shows the average drop in hook strength.

## Pass 3: 7.5/10

The underwater world shows, and it changes the whole feel. Remaining:

- **The win moment:** the flying-away hook started on top of the tuna's head, so it briefly looked like the tuna was hooked. That's the opposite message, on the most important screen.
- **Polish:** background bubbles crossed text inside see-through panels.

**Fixed:** the hook now starts above the tuna and flies off. Panels have a frosted-glass blur.

## Pass 4: 8.5/10

No console errors. Every screen fits on an iPhone SE without scrolling, data survives reloads, and tests pass.

Not verifiable in a desktop browser, so these need a real iPhone:

- Sounds (they follow the silent switch) and vibrations (iOS 18+, only on taps).
- Safari's add-to-home-screen flow.

Known, deliberate or minor:

- A few emoji remain where they fit the theme (🎣 Throw it back, 🥫 in a joke, 🌊 in the new-cards message).
- No custom iOS launch screen, so there's a brief blank moment on open.
- The Czech text should get a once-over from a native speaker.
