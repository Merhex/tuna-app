# Tickets: Current Run

A fifth round for a brutal hook (8 to 10), and the first one that asks her to move her body: swim up a river against the current by marching on the spot, dancing or swinging her arms, while the phone senses how hard she's moving.

Written so each ticket can be picked up cold. Read first: [decisions.md](../decisions.md) D39 (where she is), D50, D51, D54 (how rounds work and why), and D11, D30, D33, D38. Read [minigames-pack-and-track.md](minigames-pack-and-track.md) too, for the rules every round follows (no game over, nothing persistent, and so on). They apply here unchanged.

The first ticket set is built (Net Packing and School Tracker are on `main`), so this set builds on the finished structure: `src/activities.ts` (`ACTIVITIES`, `ENABLED`, `pickActivity`, `alternatives`, `notYetRounds`), `components/RoundIntro.tsx` (the shared Start card and "Give me another game"), and the `round()` / `roundText` / `addRound` / `RoundSummary` pieces in `components/HookFlow.tsx`. `components/Track.tsx` and `src/track.ts` are the newest, closest templates.

## Why this one (the science, stated honestly)

Short bouts of exercise are among the best-supported ways to ease cravings. Taylor, Katomeri & Ussher's meta-analysis (2007) and the Cochrane review by Ussher et al. (2019) find that brief, moderate exercise (a brisk walk or similar, about 5 to 15 minutes) lowers cravings and withdrawal **while she does it and for a short while after.** That is minutes, not hours, and the studies are mostly on tobacco. It works on a different channel from the other rounds: a change in body state and mood, plus distraction, rather than a mental load competing with craving imagery. So it's the best candidate for the cravings the other rounds don't shift.

What this means for the design:
- **It has to be real effort.** A game she can play sitting still would only be a distraction. So the phone senses movement, and the round only "works" if she moves.
- **Brisk, not hard.** The target is "brisk but you could still talk". More effort must not earn more reward, so nobody is pushed past comfortable. This is not a fitness tracker.
- **About 5 minutes**, longer than the other rounds (2½), because the exercise studies used bouts of that length. The label says "5 min".
- **The app makes no health claim.** The docs state the evidence as above; the in-app text says only that moving can help a craving pass, and to go at her own pace.

## Rules specific to this round

On top of the shared rules:
- **Only offered at home** (`settings.place === 'home'`, D39). Marching on the spot in public is not something to ask at a craving. Out and about, the round is never picked at random and never offered.
- **She can switch movement rounds off** in Settings (an injury, a bad day, no space). Off means it is never picked or offered, anywhere. Default on.
- **Any movement counts**: marching, dancing, stairs, jumping jacks, arm swings, wheelchair-friendly arm movements. The sensing measures how much the phone moves, not steps, so it never says she's doing it "wrong".
- **No stored or shown records of effort.** No step counts, no minutes, no "best". A round's summary is shown once on the check screen and forgotten (D11, D38). Only "she did a round" is stored.
- **No judgement text.** Never "you slowed down". The tuna narrates the current, not her performance.
- **A safety line on the how-to:** "Go at your own pace. Stop if anything hurts."
- **Never vape imagery** (D30), as ever.

## Order and dependencies

```
C0 eligibility ─────────────────────────────────────────┐
C1 motion signal ─► C2 run rules ─► C3 run screen ───────┴─► C4 in the flow ─► C5 docs + device tuning
```

- C0 and C1 are independent and can run in parallel. C2 needs C1's types; C3 needs C2; C4 needs C0 and C3.
- C3 and C4 both edit `i18n.ts`, `styles.css`, `feedback.ts` and `HookFlow.tsx`: merge one before the other.
- C5 goes last. Part of it needs a real phone and cannot be done by an agent: see it.

---

## C0 · Activities that aren't always available

**Why.** Until now every activity was always eligible. Current Run is not: it needs `place === 'home'`, a setting that's on, and (to be sensed rather than guided) a phone with motion sensors. `ENABLED` is a static list; the helpers already take an `enabled` argument, but `HookFlow.tsx` calls them without one.

**Scope.**
- `src/activities.ts`
  - Add `'run'` to the `Activity` type and to `ACTIVITIES`, **but not to `ENABLED`** until C4 (so nothing changes for her before the round exists).
  - Add `eligible(settings, enabled = ENABLED): Activity[]`: `enabled` filtered by rules per activity. Today every activity returns true except `run`, which needs `settings.place === 'home'` and `settings.movementRounds`. Keep it a small table/switch so the next activity with a condition is one line.
  - Nothing here may use the DOM or sensors. Capability (sensors present or not) is the *screen's* concern, because it decides guided vs. sensed mode, not eligibility (C3).
- `src/storage.ts`
  - `settings.movementRounds: boolean`, default `true`. Old saves and backups without it load as `true`. Add a test next to the existing `storage.test.ts` cases.
- `src/components/HookFlow.tsx`
  - Compute `const open = eligible(data.settings)` and pass it as the `enabled` argument to `pickActivity`, `alternatives` and `notYetRounds` everywhere they are called.
  - If `open` ever has no entries other than the current one, "Give me another game" must not show (check how `another` is built).
- `src/components/Settings.tsx` and `src/i18n.ts`
  - A toggle "Movement rounds" with one line of explanation ("Rounds that get you moving, at home. Turn off if you'd rather not."), English and Czech. Match the look of the existing toggles.

**Acceptance.**
- With `run` not yet in `ENABLED`, behaviour is identical to today.
- Tests in `activities.test.ts` with a fake enabled list that includes `run`: it is excluded when `place` is `out`, excluded when `movementRounds` is false, included at home with it on; `pickActivity` never returns it when excluded; `alternatives` and `notYetRounds` never list it when excluded; still never the same round three times in a row when it is included.
- Toggle persists, survives a backup and restore, and an old backup without the field loads.

---

## C1 · The motion signal (`src/motion.ts`, `src/sensors.ts`)

**Why.** Everything else depends on a trustworthy answer to "how hard is she moving right now?" Split it in two so the hard part is testable without a phone.

**`src/motion.ts`: pure, no DOM.**
- Input: a stream of accelerometer samples `{ t (seconds), x, y, z }` in m/s² (including gravity or not: handle both by high-pass filtering). Output: an **intensity** in `0..1`, updated at each sample or at ~10 Hz.
- Method (start here, adjust if a better one is clearly simpler): high-pass the acceleration magnitude to remove gravity and slow tilt (a running mean with a ~1 s time constant, subtracted), then take the RMS over a sliding ~1.5 s window, then map through two thresholds in `MOTION_SETTINGS`: below `still` → 0, above `brisk` → 1, linear between. Then smooth with a quick attack and slower release so the tuna doesn't flicker.
- **Saturates at 1.** Moving harder than `brisk` gives nothing extra (see the rules).
- Phone orientation must not matter (use magnitude, not a single axis). Hand-held, pocketed or on an armband must all work; thresholds are shared.
- Handle uneven sample intervals (browsers deliver 16 to 60 Hz, sometimes irregularly) and ignore `null` readings.
- Export: `createMotion(rate?)`, `feed(m, sample)`, `intensity(m)`, and `MOTION_SETTINGS`. All thresholds and time constants live in `MOTION_SETTINGS` with a comment on what each does.

**`src/sensors.ts`: thin and untested by unit tests.**
- `motionAvailable()`: `'DeviceMotionEvent' in window`.
- `requestMotion()`: on iPhone, `DeviceMotionEvent.requestPermission()` must be called **inside the user gesture** that started the round (the Start tap in `RoundIntro`). Return `'granted' | 'denied' | 'unavailable'`. On other browsers, no prompt: return `'granted'` if the API exists. Never throw.
- `listen(onSample)`: adds the `devicemotion` listener (use `accelerationIncludingGravity`, falling back to `acceleration`), returns an unsubscribe. A listener that receives no events at all within ~2 s means "no sensor" (some desktops expose the API but send nothing): expose that so C3 can fall back to guided mode.
- `keepAwake()` / release: the Screen Wake Lock API (`navigator.wakeLock.request('screen')`), re-requested on `visibilitychange`; resolve quietly if unsupported or refused. The screen must not sleep mid-round, because motion events stop when it does.

**Acceptance (tests in `src/motion.test.ts`, with synthetic signals; no randomness without a seed).**
- A still phone (gravity only, with small noise) reads ~0.
- A 2 Hz bounce at walking-march amplitude reads at or near 1 after the window fills; a 1 Hz gentle sway reads in between; a single bump decays back to 0.
- Gravity tilting slowly (rotating the phone) does not read as movement.
- The result is the same for the same motion on different axes (orientation independence).
- Intensity never exceeds 1 and never goes below 0, for any input including huge spikes and missing values.
- Uneven sample times give a similar answer to even ones.
- Thresholds are only read from `MOTION_SETTINGS`.

The numbers will need tuning on a real phone (C5). Ship conservative defaults (it should be easy to reach "brisk", not hard) and say so.

---

## C2 · The round's rules (`src/run.ts`)

Pure rules, no drawing, in the style of `track.ts`: a `RUN_SETTINGS` object, an injectable `rng`, `createGame`, `step(g, dt, intensity)`, `events`, and tests.

**The plan.** About 300 s in `RUN_SETTINGS`: 30 s warm-up (easy), four intervals of 45 s *swim* (brisk) then 15 s *drift* (easy), and a 30 s cool-down. The phases, their lengths and the target intensity of each are data, so the plan can be reshaped without touching logic.

**The current.** A river with a current pushing the tuna back. The tuna's horizontal position is a simple model: when intensity is above a *swim threshold* during a swim phase it moves upstream; below it, it drifts back, **slowly, and never past its starting point.** Easy phases always hold position (no push). There is no fail state: drifting just looks different.
- Make the response smooth (position follows intensity with inertia) so that natural pauses between steps don't make it jitter.
- The round is **time-based**, never goal-based: reaching the top changes nothing about when it ends. (A finish line in the river would be a goal she can fail, D38.) Progress is shown as the round clock, as in the other rounds.

**Sensing and guided mode.** `step` takes the intensity as an input, so the same rules run in two modes:
- *Sensed*: the screen passes real intensity from C1.
- *Guided*: no usable sensor (desktop, permission denied, no events). The screen passes a constant `1` during swim phases and `0` otherwise: she's trusted. The summary in guided mode must not claim anything about her effort (see C4), and the how-to says to march on the spot or move however she likes.

**What counts as a round.** `score.moved` is the number of seconds with intensity above the swim threshold (sensed mode) or the swim-phase seconds she stayed in the round (guided mode). `score.seconds` is how long she stayed. A round counts (returns a score rather than `null` to the flow) if she stayed in for at least **60 s**, which is `RUN_SETTINGS.minSeconds`. Ending sooner returns `null` and goes back like any early exit.

**Events** for sound: `swim` (a swim phase begins), `drift` (it ends), `over`, plus a quiet periodic `current` while she's catching it (for the soft sound in C3, sparse enough not to annoy).

**Acceptance.**
- Phase order and lengths follow the plan; the round ends at the total.
- With intensity held at 1, the tuna ends each swim phase upstream of where it started it; with 0 it drifts back but not past the start; during easy phases it holds.
- Intensity jitter (alternating 1 and 0 every step) moves the tuna smoothly, not by jumps.
- Ending before `minSeconds` gives no score; after it gives one.
- Same seed → same round; a huge `dt` is clamped.
- Guided mode produces the same phases without any intensity input.

---

## C3 · The screen (`src/components/Run.tsx`)

Full-screen canvas round, in the style of `Track.tsx` and `Dodge.tsx`, using the shared `RoundIntro` for the Start card.

- **Props:** `{ calm, lead?, another?, onEnd }`, as the other rounds. `onEnd(score | null)`.
- **Start.** The `RoundIntro` card: title, how-to ("Hold the phone, or keep it in your hand, and get moving: march on the spot, dance, swing your arms. Swim when the river runs, rest when it slows. Go at your own pace. Stop if anything hurts."), and Start. **The Start tap requests motion permission** (C1's `requestMotion`) in the same click, then `listen`, `keepAwake`. If the result is `denied` or `unavailable`, or if no samples arrive within ~2 s, switch to **guided mode** and show one line, once: "No motion sensor here, so just move however you like. The tuna will trust you."
- **Art.** A side-on river, the tuna swimming against the current: water streaking past, reeds on the banks. The tuna's tail beat and the speed of the water track her intensity so that moving visibly makes the world move; on easy phases the water slows and the tuna rests. Calm, bright, readable from arm's length or a metre away (she may be moving and not holding it close): big phase text ("Swim!" / "Drift and breathe"), large countdown for the current phase, a thin bar for the round. Reuse the tuna art from `Dodge.tsx` (`makePaths`) and the palette variables.
- **`calm` ("Less motion").** Water streaks slower, no tail-beat flourish, no sparkles; the phase text and clock stay.
- **Ending the round.** She may have the phone in a pocket or be moving around, so stray touches must not end it. The back button during play needs a **press and hold (~1 s)** with a visible fill. Before the first movement, a plain tap on Back is fine (as in the others), and so is the Start screen's way out.
- **Sound.** Soft cues through `fx` (see C4 for the list): phase changes only, nothing continuous. On iPhone the silent switch silences these and there is no vibration (D33), so everything important is also on screen.
- **Page visibility.** If the tab goes to the background, the sensors stop; on return carry on where it was without jumping ahead (as `dt` clamping does), and do not count the missing time as movement.
- **Hidden debug overlay** for tuning on a device: opening the app with `?motion=1` (or a long press on the round title) shows the live intensity number, the raw RMS and the thresholds in a corner. It is not user-facing and not translated, but it must exist: C5 depends on it.
- Styles in `styles.css` with a `.run-` prefix, near the Track block; hide backdrop bubbles the way the others do.

**Acceptance.**
- In a phone-sized browser: the Start tap asks for permission where the browser asks; granted → sensed; denied or no sensor → guided with the one-line note; the round completes in both.
- On a desktop browser, with simulated device motion (Chrome DevTools sensors), intensity drives the tuna and the water as designed; with none, guided mode runs.
- Press-and-hold ends the round; a tap does not (after play begins).
- Fits 375×667 and 390×844 portrait with no scroll; text readable at arm's length.
- `calm` removes the extra motion; no console errors; the wake lock is released on exit; the listener is removed on exit.

---

## C4 · Current Run in the craving flow

Wire it in and add everything around it, following exactly what was done for School Tracker.

- `src/activities.ts`: add `'run'` to `ENABLED` (C0 already gates it).
- `src/components/HookFlow.tsx`: a `run` member of `LastRound`, the `case 'run'` in `round()`, `roundLine`, `roundText` (offer: "Current Run · 5 min"), `addRound`, and `RoundSummary`. `RoundCounts` gets `runs`.
- `src/storage.ts`: `runs?: number` on `HookEntry` (rounds of Current Run, absent when none). Old saves and backups unchanged; extend the existing `storage.test.ts` case that checks `packs` and `tracks`.
- **Check-screen summary.** Sensed mode: kind and brief, e.g. "You swam against the current for a few minutes." Never numbers of steps or minutes, never praise for intensity. Guided mode: neutral ("You moved with the tuna."), with nothing that claims how hard she tried. English and Czech, with `csPlural` where there are numbers (there shouldn't be any).
- `Logbook.tsx` and `Charts.tsx` `used()`: show `runs` the way `tracks` is shown (`runLog(n)`: "Current Run" / "Current Run ×2"), with an icon in `Icons.tsx` (a small river or a tuna with motion lines, in the existing icon style).
- `src/feedback.ts`: cues `fx.runSwim()` (a soft rising swell as a swim phase starts), `fx.runDrift()` (a falling one), and `fx.runCurrent()` (a quiet bubble that can repeat). Gentle, in the style of `breatheIn` / `breatheOut`; frequent ones must not vibrate (see `catchBubble`).
- `src/i18n.ts`, English and Czech: offer, title, how-to, brutal lead (`runBrutal(n)`, in the tuna's voice, e.g. "A 10? Time to swim it off."), phase labels, the one-line guided-mode note, press-and-hold hint, check summary (sensed and guided), log line. The Czech gets a native speaker's read later (D32).
- With 5 rounds, check that the brutal pick and "Not yet" still behave: never the same round three times in a row, only two rounds on "Not yet", "Give me another game" cycles through eligible ones only. Add the cases to `activities.test.ts` for five entries.

**Acceptance.**
- At home, with movement rounds on: a hook rated 8, 9 or 10 can start with Current Run, at random with the others, and "Not yet" can offer it. Out and about, or with the setting off: it never appears anywhere.
- Early exit before `minSeconds` behaves as for the other rounds (back to the rating if she came straight from it, otherwise "Not yet", nothing recorded). Staying past it counts one round and goes to the check screen.
- Win screen, Logbook, chart tooltip and a backup export/restore all carry `runs`.
- `npm test` and `npm run build` pass; all strings exist in both languages.

---

## C5 · Docs, and tuning on a real phone

**Docs (an agent can do this).**
- `docs/decisions.md`: add the next free decision (check the top of the file; D58 unless the first set's docs have since taken it): **Current Run** in the existing format. Cover: what it is; the *Why* with the evidence above, honestly; place-only and the Settings off switch, and why; any-movement-counts and brisk-not-hard (saturation); time-based with no goal (D38); nothing effort-related stored; sensed vs. guided mode; press-and-hold to end; and the permission flow. *Code:* the files and tests.
- `docs/roadmap.md`: add it to *Done*; add to roadmap #1's note ("Cards that work for her") that `runs` joins `rounds`, `breaths`, `packs` and `tracks`, so exercise can be compared with the other rounds on before/after ratings; add the device tuning and the Czech read to *Open before release*.
- `docs/qa-log.md`: a pass covering: every state of the round (granted, denied, no sensor, guided); leaving early; hold-to-end; the Settings toggle; place switching; both languages; "Less motion"; both phone sizes. Record what couldn't be verified without a device.
- Comments: mention the decision number where the code depends on it, as the rest of the codebase does.

**Device tuning (needs a person with a real iPhone; an agent can't do it).** Write this as a checklist in the PR or issue so the product owner or a tester can run it:
1. Open the installed app with `?motion=1`. Stand still holding the phone: intensity ≈ 0. March on the spot at a normal pace, phone in hand: it should reach "brisk" within a few seconds and stay there. Repeat with the phone in a trouser pocket and in a jacket pocket.
2. Slow, gentle swaying, walking about the room, and arm swings should all land somewhere sensible between still and brisk.
3. Adjust `still` and `brisk` in `MOTION_SETTINGS` if marching doesn't reach 1 or standing reads above 0. Record the values and the phone model in the PR.
4. Confirm: the permission prompt appears from the Start tap; the screen stays on for the full 5 minutes (wake lock, installed PWA); the sounds respect the silent switch; coming back from the background doesn't jump ahead; press-and-hold ends it and a tap in a pocket does not.

**Acceptance.** `npm test` and `npm run build` green; docs consistent with the code; the device checklist posted with anything not yet verified clearly marked as such.
