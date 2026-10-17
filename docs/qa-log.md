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

---

# Seabed decorations and the quit date (D43, D44)

Checked in a headless browser at iPhone 13, iPhone SE and iPhone 15 Pro Max sizes, in English and Czech, with data seeded for each case.

## Pass 1: 8/10

- **Data from before D44:** a treasure started 20 days ago loads with that date as the quit date, the money unchanged, and five decorations (quit day to two weeks) that sparkle one after another. After a reload they don't sparkle again.
- **Intro, brand new:** the question is the last step. "Today" saves today, skipping the whole intro saves today, and "Earlier" shows a date picker that saves the picked day.
- **Intro seen before D44, no treasure:** only the question shows, once, with no dots.
- **Moving the date later** in the Treasure keeps all six earned decorations.
- **Two years in:** all ten decorations, with the coral grown and recoloured (13 months past a year).
- **Reduced motion:** decorations are just there, no sparkle.
- **Treasure without money:** the money pitch sits above the milestones, and each milestone shows its decoration (in colour once earned, a pale shape before).
- No console errors. All unit tests and the production build pass.

Found and fixed: the decorations were a little small on an iPhone 13, and on an iPhone SE the shipwreck, castle and jellyfish reached up into the school text. Small ones are now a bit bigger, and the background pieces smaller and lower. The lantern's glow was a hard-edged disc; it's now a soft glow.

Still open:

- On an iPhone SE the grown coral (after two years) still touches the school text, like the seaweed already does.
- The sparkle, the date picker and the intro question need a look on a real iPhone.
- The Czech decoration names and question need a native speaker's read.


---

# QA round 3 (branch `qa-round-3`)

Used as a user in a headless browser, with data seeded for a new user, a month in and two years in. Six screen sizes: iPhone SE (1st gen) and SE 3 in Safari, SE 3 installed, iPhone 13 in Safari and installed, and Pro Max in Safari. Covered every screen and path in English and Czech, plus reduced motion, sounds off, backup and restore (including onto a fresh install), and double taps.

## Pass 1: 7.5/10

Everything works and records correctly, with no console errors. Found:

- **Bug: the win screen didn't fit small phones.** Its content was about 700px tall on every phone, so on an iPhone SE "Back to the tank" was off-screen, and on an iPhone 13 in Safari it was clipped.
- **Feel: the aquarium opened on what she hasn't caught.** It was sorted rarest first, so a month in, the first screen was almost all "???" tiles and her own catches were below the fold.
- **Detail: the quitline number in Settings couldn't be tapped.**
- **Detail: English mixed US and British formats** (“Wed, Oct 14, 02:05 PM” and “9/23/2026” in some places, “31 August 2026” in others).
- **Detail:** the intro's glossary slide cut off its last term on an iPhone 13 in Safari. The snag screen scrolled a little on an iPhone SE. The fishing line ran through the hook while it dropped. One straight apostrophe in the install guide.

**Fixed:** the win screen tightens up on short screens; her catches come first in the aquarium; the quitline is a tap-to-call link; one shared locale for dates, times and numbers (British English, so 24-hour time); the glossary hook shrinks on short screens; the snag screen's spacing is tighter on small phones; the hook drops in step with its line; the apostrophe is typographic.

## Pass 2: 8.5/10

All pass 1 fixes verified at every size. New cases checked: the installed app (no install guide, intro first), "How it works" and the install guide both return to Settings, live language switching, the timer running out, closing mid-craving (saved as "Not yet" with both ratings), reduced motion, and sounds off (no audio started). One more find:

- **Bug: the home screen scrolled on short phones** once she had 3 favourites (the All / Favourites switch shows). It was 24px too tall on an iPhone SE 3 in Safari.

**Fixed:** the big button also scales with the screen's height, with a smaller tuna and tighter spacing below 600px. Re-measured: the home screen, every step of a craving, and the intro fit without scrolling at all six sizes. Only the one-time install guide scrolls, in Safari on the smallest phones.

Still open:

- Sounds, vibrations and the real install flow need a real iPhone. The Czech needs a native speaker's read.
- On short phones the All / Favourites switch sits over the seabed decorations. It stays readable, and the seabed is backdrop by design (D43).
- Content, for a decision rather than a fix: a few at-home cards assume she's gaming or watching a series ("Controller down…", "Pause the game…", "Before the next episode autoplays…"). Drawn at other times, they cost her one throw-back.

---

# Current Run (D58)

## Pass 1

Checked in Chromium at iPhone SE (375×667) and iPhone 13 (390×844) sizes, with simulated motion readings (a 2 Hz march, then holding still) and with the motion sensor removed:

- **From a 9:** “Give me another game” cycles through all five rounds, Current Run included. Its card fits, with the brutal line, how-to and safety line.
- **Sensed:** the warm-up, then “Swim!” in gold with the countdown; marching gives “You've caught the current.”, bubbles behind the tuna and the river rushing past; holding still gives “The current's pulling. Swim!” and the tuna drifts back. Nothing overlaps at either size.
- **Ending:** a tap on the back button during the round does nothing; holding it fills the button, shows “Keep holding to stop” and ends the round after a second. Ended inside the first minute, it goes back to the rating with nothing recorded.
- **Guided** (no sensor): the one-line note shows for a few seconds, the full plan runs, and the check screen says “You moved with the tuna.” Yes goes to the win screen (“Current Run · upstream and back”) and the hook is saved with `runs: 1`.
- **Out and about, or with movement rounds off:** ten taps of “Give me another game” never show Current Run.
- **Settings:** the “Movement rounds” toggle with its note. **Logbook:** the history row and the chart detail say “Current Run”.
- No console errors.

Not verifiable without a real phone:

- Whether `still` and `brisk` suit real movement (in a hand, a trouser pocket, a jacket pocket); see the checklist in [current-run.md](tickets/current-run.md), C5.
- The iPhone permission prompt from Start, the wake lock in the installed app for the whole 5 minutes, sounds with the silent switch, coming back from the background, and press and hold with the phone in a pocket.
- The Czech.
