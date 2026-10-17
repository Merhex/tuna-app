# Tickets: Net Packing and School Tracker

Two new rounds for a brutal hook (8 to 10), next to Dodge the hooks (D50) and Bubbles (D54). Written so each ticket can be picked up cold by someone who has not read the rest.

Read first: [decisions.md](../decisions.md) D50, D51, D54 (how the existing rounds work and why), and D11, D29, D30, D33, D38 (the rules below come from them).

## Order and dependencies

```
T0 activity framework  ──┬─►  T1 pack engine ─► T2 pack screen ─► T3 pack in the flow ─┐
                         └─►  T4 track engine ─► T5 track screen ─► T6 track in the flow ─┤
                                                                                        └─► T7 docs + QA
```

- **T0 goes first and alone.** It changes no behaviour, but both games depend on it.
- After T0, the Net Packing chain (T1–T3) and the School Tracker chain (T4–T6) are independent. Engines (T1, T4) touch only new files, so they can run in parallel. T3 and T6 both edit `HookFlow.tsx`, `i18n.ts`, `storage.ts`, `Logbook.tsx` and `styles.css`: merge one before starting the other, or expect conflicts.
- T7 goes last.

## Rules that apply to every ticket

These are product decisions already made. A ticket that seems to break one is wrong, not the rule.

- **No game over, no losing** (D50). Nothing fails the player; the round is a fixed length and ends by itself or by the back button.
- **No scores that persist.** No high score, best streak, level reached or "beat your record". A finish line or a streak can turn into an excuse to start again (D11, D38). A round's score is shown once on the check screen and then forgotten. Only the *count of rounds played* is stored (see T3, T6).
- **Never any vape or smoke imagery** (D30). Fish, nets, crates, ocean only.
- **Waits for her first touch** before anything moves, with how-to shown until then. Leaving before that goes back without counting a round (D50, D54).
- **Fits an iPhone SE (375×667) and an iPhone 13 (390×844) with no scrolling,** at the device's safe areas.
- **No vibration during play on iPhone** (D33): only a real tap vibrates there. Buttons use `<Haptic />`. Android may vibrate on events through `fx`.
- **"Less motion" (`settings.reducedMotion`) is respected** (see how `calm` is used in `Dodge.tsx` and `Breathe.tsx`).
- **English and Czech** for every string (`src/i18n.ts`), with Czech plurals through `csPlural`. The Czech gets a native speaker's read later (D32); note it in the docs, don't block on it.
- **Public-safe docs** ([README](../README.md)): write about the app, not about her.
- **Match the existing code:** rules in a pure `src/<name>.ts` with a `*_SETTINGS` object holding every tuning number, an injectable `rng`, drawing and touch in `src/components/<Name>.tsx`, tests in `src/<name>.test.ts`. Read `src/dodge.ts`, `src/components/Dodge.tsx` and `src/dodge.test.ts` before starting; they are the template.
- **Done means:** `npm test` and `npm run build` both pass, and the round has been run in a real browser at phone size (use the `run` skill). Say honestly in the PR what could not be checked (sounds and vibration need a real iPhone, see [qa-log.md](../qa-log.md)).

---

## T0 · Make activities a list, not a pair

**Why.** `Activity` is `'dodge' | 'breathe'` and the code around it assumes exactly two: `other()` flips between them, `HookFlow.tsx` has hard-coded `'game'` and `'breathe'` steps, and the "instead" links and "Not yet" buttons name each other directly. Adding two more would multiply the special cases. Do this once, with no visible change, then each new game is one entry.

**Scope.**
- `src/activities.ts`
  - `Activity` becomes `'dodge' | 'breathe' | 'pack' | 'track'` (the two new values are unused until T3 and T6, but the type and tests should already accept them).
  - `pickActivity(recent, random)`: uniform over the *enabled* activities, never the same one three times in a row (keep the existing rule and its test). Take the list of enabled activities as a parameter, defaulting to the two that exist today, so T3 and T6 each just add to the list.
  - Replace `other()` with a helper that returns the alternatives for a given activity (see below).
  - `rememberPick` is unchanged.
- `src/components/HookFlow.tsx`
  - Replace the per-activity steps (`'game'`, `'breathe'`) with one `'round'` step plus state holding which activity is running. Check `styles.css` and the topbar condition (`step !== 'game' && step !== 'breathe'`) for anything keyed on the old step names.
  - `LastRound` becomes a discriminated union with one member per activity; `roundLine`, the check screen summary and the "Not yet" screen should switch on it, so a new activity is one more `case`.
  - `toRound(next)` takes an `Activity`.
- **Alternatives.** Today a round started from a rating shows `[the other activity, Draw a card]` under how-to (`OtherWays`). With more activities, show **one** other activity (the least recently picked of the rest, found from `brutalPicks`, ties broken by a fixed order) plus "Draw a card". Do not show every game: a long list is a decision at the worst moment (D51).
- **"Not yet"** currently offers both rounds. With four, offer **two**: the activities she did not just do, least recently picked first, plus the draw button as now. Same reason.
- `brutalPicks` in `storage.ts` already stores `Activity[]`; values written today (`'dodge'`, `'breathe'`) stay valid. Add a test that an older save loads untouched.

**Out of scope.** The new games themselves, any new i18n beyond what the refactor needs (the "instead" labels are per activity: give each an `i18n` key for its title, its "· N min" offer line and its "X instead" link; for T0 only dodge and breathe have them).

**Acceptance.**
- With only `dodge` and `breathe` enabled, behaviour is exactly as today: same picks, same links, same "Not yet" buttons, same check/win/Logbook/postcard output. Verify by playing both rounds from a rating of 9 and from "Not yet".
- `activities.test.ts` covers: picks across 3–4 enabled activities, no three-in-a-row over 500 picks, the alternatives helper, and an old `brutalPicks` value.
- Adding a fake third activity in a test requires no change outside the registry/list and its own round component.

---

## T1 · Net Packing: the rules (`src/pack.ts`)

**What it is.** A falling-block puzzle themed as packing the catch. It is the closest thing to the Tetris studies (Holmes et al. 2009; Skorka-Brown, Andrade & May 2014, 2015: a few minutes of play made cravings, nicotine included, roughly a fifth weaker). The effect comes from the *visuospatial* work of rotating and fitting shapes, so **the mechanics must stay faithful to the standard tetromino game.** Do not simplify away rotation or fitting.

**Scope: pure rules, no drawing, no DOM.** Follow `dodge.ts`.

- **Board and pieces.** A grid (start from 10 wide × 18 tall; the screen ticket may change this, so it lives in `PACK_SETTINGS`). Seven pieces with the standard tetromino shapes and rotations. Each piece also carries a `fish` kind (e.g. sardine, mackerel, tuna, …) that T2 uses for colour and art; the mapping from shape to fish is data in `PACK_SETTINGS`.
- **Randomiser.** A 7-bag, using the injected `rng`, so she never waits long for a shape.
- **State:** `createGame(cols, rows, rng)`, `step(g, dt)`, plus input functions `moveBy(g, dx)`, `rotate(g)`, `softDrop(g, on)`, `hardDrop(g)`. Keep a `ghostRow` or `ghost(g)` helper (where the piece would land). Next piece is exposed for the preview.
- **Rotation** uses simple wall kicks (try the rotated shape shifted 1 column each way, and up 1) so a rotation next to a wall doesn't silently fail. Rotation must never place a piece inside the stack.
- **Gravity.** Starts slow and rises gently over the round (`startFall` → `endFall`, cells/second, in `PACK_SETTINGS`). Soft drop is a multiple of the current gravity. A piece locks after a short grace (`lockDelay`) once it rests, so she can slide it at the last moment.
- **Clearing.** A full row clears and the rows above drop. Count cleared rows as `crates` (a row is a full crate). Emit events: `lock`, `clear { rows: number[] }` (so T2 can animate), `topout`.
- **No game over (D50).** When a new piece can't spawn, emit `topout`, then **clear the bottom half of the stack** ("the net is hauled in") and carry on. Count `hauls`. Never end the round early.
- **Round length:** `roundSeconds: 150`, same as Dodge. `over` is set when `time` reaches it; `events` gets `{type:'over'}`.
- **Score returned:** `{ crates, pieces, hauls }`. `pieces` > 0 is "she played"; the screen uses it to decide null vs. a result.
- `dt` is clamped like `dodge.ts` (a background pause must not drop a piece through the floor).

**Acceptance (tests in `src/pack.test.ts`, deterministic with a seeded rng).**
- Every piece × rotation stays on the board and never overlaps locked cells after `rotate`, including against both walls and the floor.
- A 7-bag contains each piece once before repeating.
- Completing 1, 2 and 4 rows at once clears them and drops the rest correctly.
- Hard drop lands on the ghost row; soft drop is faster than gravity; lock delay allows a last-moment slide.
- Topout clears the bottom half, increments `hauls`, and the game continues; the round never ends before `roundSeconds`.
- `step` with a huge `dt` behaves like a clamped one.

---

## T2 · Net Packing: the screen (`src/components/Pack.tsx`)

**Scope.** Drawing, touch and sound for the engine in T1. Template: `Dodge.tsx` (canvas, `requestAnimationFrame`, a HUD, a how-to overlay that waits for the first touch, `onEnd(score | null)`).

- **Props:** `{ calm, lead?, others?, onEnd }`, the same shape as `DodgeGame` and `BreatheRound`, so T0's flow can mount it like the others.
- **Layout.** HUD at the top in the style of `.dodge-hud` (back button "End the round", progress bar for the round, crates counter). The board fills the rest. **Compute the cell size from the space left after the HUD and the next-piece preview**, then derive the number of columns/rows, so it fits both an SE and a 13. A small "next" preview and the ghost piece are required (they cut the frustration of misjudged drops).
- **Art (theme).** Each cell is a rounded scale-tile; each piece reads as a fish (colour per fish kind from the existing palette in `styles.css`, plus an eye and a tail fin on the end cells so orientation is obvious). Keep it readable first, cute second: at phone size the player must be able to tell the shape and its rotation at a glance. The board is the inside of a crate/net; a full row "ships" with a short slide-off animation. With `calm`, no row-flash or shake, just a quick fade.
- **Touch (one finger, no on-screen buttons, `touch-action: none`).**
  - Drag left/right: the piece follows the finger column by column.
  - Tap: rotate.
  - Drag down: soft drop while held.
  - Quick flick down: hard drop.
  - Ignore a tap that arrives in the first 300 ms after the screen shows (as `Dodge.tsx` does with `shownAt`), and make a drag distinguishable from a tap with a small movement threshold.
  - Make sure a rotating tap is never read as the first touch that "starts the game *and* rotates"; the first touch only starts it.
- **Sound (`src/feedback.ts`).** Add cues to `fx`: a soft `packLock`, a rising `packClear` (more notes for more rows), and a quiet `packRotate`. Sounds must be gentle and frequent ones must not vibrate (see `catchBubble`). A haul (`topout`) gets a soft "net pulled in" sound, not an alarm.
- Add the `dodging`-style class on `<html>` if the backdrop bubbles distract (check; Dodge hides them).
- Add styles in `styles.css`, next to the Dodge block, with a `.pack-` prefix.

**Acceptance.**
- Playable end to end in a phone-sized browser: all four gestures work, first touch starts it, back button before first touch returns `null`, ending after at least one piece returns the score.
- No scrolling or layout overflow at 375×667 and 390×844, portrait.
- Pausing the tab for 10 s and returning does not drop the piece through the floor.
- `calm` removes flashing/shaking.
- No console errors; no frame-time spike when the stack is high (draw only what changed or keep it simple, but measure on a throttled CPU).

---

## T3 · Net Packing in the craving flow

**Scope.** Wire the round into the hook flow and the surrounding screens.

- Add `pack` to the enabled-activities list from T0, so a brutal hook can start with it, and so "Not yet" and the "instead" links can offer it.
- `src/storage.ts`: add `packs?: number` to `HookEntry` (rounds of Net Packing, absent when none), mirroring `rounds`. Update `HookFlow.finish` to write it, and the `rounds`/`breaths` counters in state to a per-activity count. Older saves and backups must still load unchanged; add a test next to the existing `storage.test.ts` cases.
- Check screen: one line above "Did the hook let go?", e.g. "N crates shipped" with a calm sub-line (e.g. how many fish packed). Use `dodge-summary` styling.
- Win screen and postcard (`postcard.ts`, via `roundLine`): "Net Packing · N crates".
- Logbook history (`Logbook.tsx`) and the `used()` helper in `Charts.tsx`: show the round the way `rounds` and `breaths` are shown, with an icon (add one to `Icons.tsx` in the same style).
- `src/i18n.ts`, English and Czech: title, offer line ("Net Packing · 2½ min"), how-to, "instead" link, brutal lead (`packBrutal(n)`, in the tuna's voice, like `dodgeBrutal`), summary, eulogy, log line, postcard line, with plurals. How-to should say: drag to slide, tap to turn, flick down to drop; you can't lose.
- Never show a high score or a "best" anywhere (see the rules above).

**Acceptance.**
- A hook rated 8, 9 or 10 can start with Net Packing, at random with the others, never the same three times in a row.
- Starting from a rating and leaving before the first touch returns to the rating; leaving after the first piece lands counts one round and goes to the check screen; "Not yet" can offer it again.
- Win screen, postcard and Logbook all mention it; export/import of a backup keeps `packs`.
- All strings exist in both languages (the app's i18n type-checks this; keep it green).

---

## T4 · School Tracker: the rules (`src/track.ts`)

**What it is.** A multiple-object-tracking task (Pylyshyn & Storm 1988): a few fish in a moving school are marked, the marks vanish, the fish keep swimming, and she has to follow the marked ones and pick them when the school stops. It loads visual attention and working memory in the same way a Tetris-style task does, and stays calm and wordless. **Be honest in docs and copy:** the direct evidence that this specific task weakens cravings is thinner than for Tetris; the case rests on the same mechanism (a visuospatial load competing with craving imagery, elaborated intrusion theory) plus how well-established the task is. Do not claim a health effect in the app.

**Scope: pure rules, no drawing.**

- **Trial cycle (a state machine in `step`):** `show` (the targets are marked, ~2 s) → `track` (marks hidden, all fish move, ~6–8 s) → `pick` (fish stop; she taps; waits for her, no timer pressure) → `reveal` (~1.5 s: which were right/missed) → next trial. A round is about 150 s, so roughly 8–10 trials; `roundSeconds` and every duration live in `TRACK_SETTINGS`. The round ends after the trial that crosses `roundSeconds`.
- **Fish motion.** `fishCount` fish with a steady heading that wanders slightly, constant-ish speed, bounce off the walls, and a soft repulsion so they don't stack on top of one another (targets that overlap for long make the task unfair, not hard). Keep them inside the play area, below the HUD. Use the injected `rng`; same seed → same trial.
- **Difficulty adapts, gently, both ways.** Start easy (e.g. 8 fish, 3 targets, slow). After a trial with all targets found, raise difficulty one notch (alternate between +1 target up to a maximum of 5 and +speed). After a trial with 2 or more misses, lower it one notch. Never below the start. All steps in `TRACK_SETTINGS`. The aim is a task that stays slightly hard for her whatever her skill; that is what keeps it absorbing.
- **Picking.** `pick(g, x, y)` toggles the nearest fish within a generous hit radius (≥ 28 px, so a thumb works), up to `targets` picks. When she has picked as many as there are targets, the trial resolves automatically; she can untap a pick before that. Expose `selected`.
- **Result per trial:** `{ targets, correct }`. Round score: `{ trials, correct, targets }` where `trials` is the number of trials she answered (≥ 1 means she played) and the rest are totals (the screen uses `correct`/`targets` for a line like "you followed 21 of 24").
- Same `dt` clamp and `events` pattern as `dodge.ts` (`select`, `right`, `wrong`, `trial`, `over`).
- Abandoning a trial mid-way (back button) counts only trials already answered.

**Acceptance (tests in `src/track.test.ts`, seeded).**
- Fish never leave the play area and don't overlap past a threshold after a long run.
- The phase order is show → track → pick → reveal, with the configured durations; marks are present only in `show` (and in `reveal` for the answer).
- Picking toggles, caps at `targets`, auto-resolves, and scores right/missed correctly.
- Difficulty goes up after a perfect trial, down after a poor one, is clamped at both ends, and is deterministic for a seed.
- Same seed reproduces the same trial; a huge `dt` is clamped.

---

## T5 · School Tracker: the screen (`src/components/Track.tsx`)

**Scope.** Drawing, touch and sound for T4. Template: `Dodge.tsx` again (canvas, rAF loop, HUD, waits for first touch, `onEnd(score | null)`, same props shape).

- **Theme.** A school of small fish; the targets are **tuna** shown with a soft gold ring/glow during `show` (reuse the tuna art style from `Dodge.tsx`/`Tuna.tsx` for the targets, a plainer small fish for the rest, **and make the targets look identical to the others once the ring is gone**: that is the whole task). The how-to line in the tuna's voice: "Watch the golden tunas. They'll hide in the school. Find them again when it stops."
- **HUD.** Back button, a thin round-progress bar, and a counter of trials answered. During `pick`, show how many picks are left (a row of dots is enough). No timer on the pick phase.
- **Reveal.** Right picks get a gentle sparkle; missed targets pulse gold so she sees where they were. Wrong picks just fade. No red, no buzzer, no "wrong" text: this is the "can't lose" game (D50).
- **Touch.** Tap fish to select; large hit targets; ignore a tap in the first 300 ms after the screen shows. Taps during `track` do nothing. First touch starts the round (it should not also count as a pick).
- **Sound (`fx`).** A soft `trackSelect` blip, a gentle `trackRight` chime and a quiet `trackMiss` that is not an alarm. No vibration on iPhone.
- `calm`: slower base speed, no pulsing glow, reveal without sparkle.
- Styles in `styles.css` with a `.track-` prefix. Hide backdrop bubbles the way Dodge does if they distract.

**Acceptance.**
- A full round runs in a phone-sized browser: marks → tracking → pick → reveal, repeating; difficulty visibly adapts after a few trials.
- Targets are indistinguishable from the others once the marks fade (check by screenshot at the start of `track`).
- Back button before the first touch returns `null`; after the first answered trial returns the score.
- Fits 375×667 and 390×844 portrait; no overflow, no console errors; smooth with 12 fish on a throttled CPU.

---

## T6 · School Tracker in the craving flow

Same job as T3, for `track`.

- Add `track` to the enabled-activities list from T0.
- `storage.ts`: `tracks?: number` on `HookEntry` (rounds of School Tracker, absent when none); old saves unchanged, with a test.
- Check screen line, e.g. "You kept track of 21 of 24 tunas." (honest and kind when the number is low: lead with the effort, e.g. "You followed 14 tunas through the school."; no judgement). Win screen, postcard and Logbook/`Charts.tsx` `used()` mention it, with an icon in `Icons.tsx`.
- English and Czech strings with plurals: title, offer ("School Tracker · 2½ min"), how-to, "instead" link, `trackBrutal(n)` lead, summary, log line, postcard line.
- No stored or shown "best", level or streak. The difficulty level lives only inside the round.

**Acceptance.** As T3: can start a brutal hook, appears in "Not yet", early-exit rules match Dodge, win/postcard/Logbook/backup all handle it, both languages complete, tests green.

---

## T7 · Docs and QA (after both games land)

- **`docs/decisions.md`:** add **D57 · Net Packing** and **D58 · School Tracker** in the existing format (Decided / built, what it is, *Why* with the science stated honestly, bullets for each behaviour, *Code:* with files and tests). Add **D59** if T0's choices (how many alternatives are shown; one `round` step) are worth recording; mention it from D54 as "extended by". Update the "last decision" number at the top of the file.
- **`docs/roadmap.md`:** add both to *Done*; extend roadmap #1's note ("Cards that work for her") with `packs` and `tracks`, so the Logbook can later compare which round eases a 10 most; add both to *Open before release* (Czech read; real-iPhone feel).
- **`src/activities.ts` doc comment** and the `GAME_FROM` comment in `HookFlow.tsx`: update the "one of two" wording.
- **`docs/qa-log.md`:** add a pass: every round from a rating of 8, 9 and 10; from "Not yet"; leaving before the first touch; the swap links; the check/win screens; the postcard; Logbook; Czech; "Less motion"; both phone sizes. Record what couldn't be checked without a device.
- **Playtest note for the product owner (not code):** with four activities, a brutal hook is picked uniformly. If one turns out to be much less used or less helpful, `pickActivity` weighting is the place to change it, and `rounds`/`breaths`/`packs`/`tracks` with the before/after ratings are the data to decide with.

**Acceptance.** `npm test` and `npm run build` green on the merged result; docs consistent with the code (decision numbers in code comments, e.g. `// (D57)`).
