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

---

# QA round 2 (branch `qa-pass-2`)

Same method as round 1, plus cases round 1 didn't cover: the installed (home-screen) app, the iPhone 15 Pro Max size, reduced motion, the Android install guide, a full aquarium in Czech, the "new catches" message, fast double taps, and a read through the code for logic bugs.

## Pass 1: 7/10

Looks polished and works without errors. Found by using it critically:

- **Bug: a fast double tap could choose a rating she never picked.** "There's a hook!" sits right where the 1–10 row appears next, so a second tap landed on a number. The same thing could happen with Done it → Yes, and Yes → Back to the tank.
- **Bug: an app update could reload mid-craving.** Updates apply when she leaves the app, but several cards send her to another app ("text someone…", "send a voice memo"). Coming back would land her on the home screen and lose the craving.
- **Bug: "Show the home-screen guide" in Settings** still appeared once the app was installed, where it makes no sense. In the browser, its only way out was "Continue in browser", which went to the home screen instead of back to Settings.
- **Detail: the "New catches washed ashore!" message** pushed the screen down and covered the tuna, and stayed until dismissed.
- **Detail: the home-screen tagline and "Your school: 9 tuna"** were hard to read when a small swimming tuna passed behind them.
- **Detail: straight quotes and apostrophes** ("don't", "Your elbows…") instead of typographic ones (don’t, “Your elbows…”), in the cards and the app text.
- **Detail: the 📉 emoji** after "Your cravings hit 4.2 points weaker" is a red "going down" chart, the opposite of a celebration.
- **Detail: the trend chart's first value label** (7.8) sat on top of the line.
- **Robustness:** after a phone call, iPhone can leave web audio "interrupted", and the app only recovered from "suspended", so sounds could stay silent. The "couldn't start" message appeared after 6 seconds, which a slow first load on mobile data can exceed.
- **Performance:** each row in the Logbook history had its own background blur, which is heavy to scroll on a phone with hundreds of entries.

**Fixed:** a new screen ignores taps for its first 0.3 seconds (the tick still plays, only the action is skipped); updates never apply during a craving; the guide is hidden once installed and returns to Settings with a "Back" button; the message floats over the screen and hides itself after 8 seconds; a soft shadow behind the tagline and school text; typographic quotes and apostrophes throughout; 📉 removed; the chart label moves to the side away from the line; audio recovers from any non-running state; the fallback waits 12 seconds; history rows use a solid background.

## Pass 2: 8/10

All pass 1 fixes verified: double taps no longer choose anything, the guide returns to Settings, the label sits clear of the line. One more find:

- **Detail:** the "NEW" badge on cards stayed in English in Czech.

**Fixed:** “NOVÁ” in Czech.

## Pass 3 (verification): 8.5/10

Everything above re-checked on iPhone 13, iPhone SE and iPhone 15 Pro Max, in English and Czech. No console errors, no horizontal scrolling, card actions fit on the iPhone SE, a real craving records correctly, and all unit tests pass.

Still open, needs a real iPhone or a person:

- Sounds, vibrations and the real Safari install flow can't be verified in a desktop browser.
- The Czech text still needs a native speaker's read.
