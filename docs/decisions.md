# Decisions

Every product and technical decision, numbered. Code comments refer to these numbers.

**Last number used: D47.** D1–D38, T1, T2 and the questions Q1–Q8 come from the original decision record (a private artifact, which also holds the personal context behind them). They are summarised here; D39 onwards are written here first.

Status: **Decided**, **Proposed** (suggested, not confirmed), **Open** (needs an answer), **Superseded**.

---

## Scope

- **D1 · Build for the craving moment only.** Decided. The app is about getting through the next few minutes. *Why:* no duplicate features, and it opens straight into something useful.
- **Out of scope:** health-recovery timelines and journaling, to avoid repeating what dedicated quit apps already do. The money counter was later added after all (D38), and so was a milestone timeline (D41).

## Theme and tone

- **D2 · Tuna theme throughout.** Decided. Everything happens underwater; the vape is bait on a hook, a craving is a hook.
- **D3 · Name: “Off the Hook”.** Decided.
- **D27 · Humour: dark and unhinged.** Decided. Eulogies for the craving, trials, obituaries for household objects. *Guardrail:* the dark jokes target the craving, never her and never self-harm.
- **D45 · Jungkook Easter eggs.** Decided, built. See below.
- **D46 · Japan, South Korea and China in the treasure.** Decided, built. See below.
- **D47 · Tea, not coffee.** Decided, built. See below.
- **D30 · No card brings a vape back.** Decided. Cards never assume a vape is around and never ask her to picture or remember vaping. *Why:* picturing what you crave makes the craving stronger. The milestone text follows the same rule (D41).

## Home and the craving flow

- **D4 · The home screen is one big button.** Decided. “There’s a hook!”, with her school swimming behind it.
- **D5 · Tapping it draws a random side-quest card.** Decided.
- **D9 · Throw it back: one free redraw per hook.** Decided. *Why:* if the card is often impossible to do, she’ll stop opening the app. (D39 now removes most impossible cards before they’re drawn.)
- **D10 · Hook strength before and after.** Decided. One optional tap, 1 to 10, at the start and the end. *Why:* her own proof that cravings fade.
- **D11 · Count hooks beaten, not days clean.** Decided. A slip never removes fish or resets a counter. *Why:* a reset after one slip often turns into “I’ve failed anyway” (the abstinence violation effect).
- **D19 · A card is collected when she completes it,** not when it’s drawn. Decided.
- **D31 · The slip option is small and quiet.** Decided. “Yes” and “Not yet” are the big buttons; “I got snagged” is a muted text link that appears nowhere else.
- **D29 · No trigger-specific features.** Decided. The app doesn’t try to map triggers. A handful of cards fit common moments (gaming, watching series).
- **D39 · Draw only cards she can do where she is.** Decided, built. See below.

## Cards and rarity

- **D6 · Rarity exists but stays generous.** Decided. Every draw should feel good.
- **D7 · Collecting, favourites and the aquarium.** Decided. She can heart caught cards and draw only from favourites.
- **D8 · Duplicates still count.** Decided. “Caught ×3”, a badge at 5.
- **D12 · Where-can-I-do-it tags on every card.** Decided. `anywhere`, `quiet`, `home`, `outside`. Drawing by location was planned for later; it’s now D39.
- **D13 · Card IDs are permanent.** Decided. Titles and tasks can change; an ID never changes or gets reused.
- **D14 · Five categories, mixed in every deck.** Decided. Physical, sensory, ridiculous, social, grounding.
- **D15 · Starting deck of 40 cards.** Decided: 20 common, 11 uncommon, 7 rare, 2 legendary. Grown to 51 by D40.
- **D16 · Tier chances 55 / 28 / 14 / 3.** Decided. In `DRAW_SETTINGS` (`src/draw.ts`).
- **D17 · Guaranteed rare after 8 draws** without one. Decided.
- **D18 · Uncaught cards weigh 3× in the draw.** Decided.
- **D37 · Every card takes under a minute.** Decided. Timers 60 seconds or less; tests enforce it.
- **D40 · At least half the deck works out of the house.** Decided, built. See below.

## Onboarding, feel and language

- **D20 · Guided install-to-home-screen screen on first launch.** Decided.
- **D28 · iPhone first.** Decided. Safari on iOS is the target; home-screen apps are safe from Safari clearing stored data.
- **D32 · English and Czech.** Decided. Picked from the phone’s language, switchable in Settings. Czech text needs a native speaker’s read.
- **D33 · Sounds and vibrations, on by default, both switchable.** Decided. On iPhone, vibrations only happen on a real tap.
- **D34 · A short intro after the install guide.** Decided.
- **D36 · Vibration rhythms match the sounds; no extra taps.** Decided. Tap-to-flip and a four-tap “snap the line” were tried and reverted.
- **D44 · Ask for the quit date in the intro.** Decided, built. See below.

## Progress screens

- **D35 · Logbook: see cravings get weaker.** Decided. Before/after chart, per-day trend, day-by-day history.
- **D38 · Sunken Treasure: money not spent, live.** Decided. Optional; weekly amount, currency and start date; ticks live and never resets. *Deliberately no savings goal, now or later:* a goal is closed. Once it's reached there's a finish line, and a finish line can become the excuse to start vaping again. The counter is open-ended instead: it keeps growing, so the effort keeps showing, with nothing to “finish”. No “I bought one” subtraction either.
- **D41 · Milestones in the Sunken Treasure.** Decided, built. See below.
- **D43 · Seabed decorations at milestones.** Decided, built. See below.

## Technical

- **D21 · A PWA: installable and works offline.** Decided.
- **D22 · No backend, no database, no login.** Decided.
- **D23 · New cards ship by redeploying** (bump `deckVersion`; the app shows “New catches washed ashore!”). Decided.
- **D24 · All progress stays on her phone,** with `navigator.storage.persist()`. Decided.
- **D25 · Backup and restore** to a file with a `schemaVersion`. Decided.
- **D26 · Free static hosting.** Decided.
- **T1 · Stack:** Vite, TypeScript, Preact, `vite-plugin-pwa`, `idb-keyval`. Decided.
- **T2 · Host:** GitHub Pages; every push to `main` tests, builds and deploys. Decided.
- **D42 · Planning docs live in `docs/`, outside the app.** Decided. See below.

## Questions

- **Q1–Q2, Q4–Q8:** answered (humour: D27; iPhone: D28; triggers: D29; language: D32; name: D3; canned-tuna jokes: yes; sound: D33).
- **Q3 · How involved does the app’s maker want to be?** Open. Bottles (messages unlocked at milestones), the flare button, both or neither. Decides phase 3 of the [roadmap](roadmap.md).

---

## D39 · Draw only cards she can do where she is

**Decided, built (deck version 2).**

The rating screen at the start of a craving has a two-way switch: **At home** / **Out and about**. It remembers the last choice, so most of the time she doesn’t touch it.

- **At home:** cards tagged `home` or `anywhere`. That’s every card today.
- **Out and about:** cards tagged `anywhere` or `outside`. Cards that need a kitchen, a floor or privacy (ice cubes, hot sauce, lying on the floor, eulogies out loud) stay home.
- **Favourites mode** uses only the hearted cards that fit where she is. If fewer than 3 fit, it draws from all cards that fit, so it never deals the same one or two over and over.
- “Throw it back” stays at one per hook (D9).

*Why:* 18 of the original 40 cards could only be done at home, and she gets one throw-back per hook. Out of the house, the app often dealt a card she couldn’t do, at the worst moment. That was D9’s own example (jumping jacks on a bus), and D12 had planned this filter for later.

*Code:* `fitsPlace` in `src/cards.ts`; the switch and the pool in `src/components/HookFlow.tsx`; tests in `src/draw.test.ts`.

## D40 · At least half the deck works out of the house

**Decided, built (deck version 2).**

Rule: at least half of all cards must be doable out of the house, and every rarity needs at least two of them, so the guaranteed rare (D17) and the no-repeat rule have something to choose from. `npm test` fails if the deck breaks this.

Deck version 2 adds 11 cards that work anywhere, weighted toward the tiers that were short out of the house:

| | Common | Uncommon | Rare | Legendary | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Out of the house, before | 11 | 5 | 2 | 1 | 19 of 40 |
| Added | 3 | 4 | 3 | 1 | 11 |
| Out of the house, after | 14 | 9 | 5 | 2 | **30 of 51** |

New cards: Clam Up, Nose Sommelier, Tongue Tied, Toe Piano, Freshwater Upgrade, Alphabet Aquarium, Pearl Diver, Undercover Tuna, Hieroglyphs, Haiku of Spite, End Credits. They follow D27, D30 and D37. Their Czech text needs a native speaker’s read.

## D41 · Milestones in the Sunken Treasure

**Decided, built.** Supersedes the “health-recovery timelines” part of the out-of-scope note, the same way D38 did for money.

Below the money counter, a timeline of milestones counted from the treasure’s start date: quit day, 1 and 3 days, 1 and 2 weeks, 1, 2, 3 and 6 months, 1 year. Each says what’s typical at that point. The one she’s at is highlighted (“You are here”) and the next one shows a countdown (“in 14 days”), both open; the rest open with a tap. A milestone reached since she last looked gets a “NEW” pill, and a coral dot on the Treasure button on the home screen.

- **Never resets** (D11). It’s worded “days since you quit”, never “days clean”, so a slip doesn’t make it untrue.
- **Typical, not promises.** Hedged wording, a footnote saying everyone’s different, and a source for every claim in [milestones.md](milestones.md). No vape imagery (D30).
- **Lives in the treasure** because the start date already does. Trade-off: no milestones without setting up the treasure. The empty treasure screen mentions them. *Superseded by D44:* the intro asks for the quit date, so milestones don't need the money counter.
- **Milestone IDs are permanent,** so phase 3’s bottles can unlock at them.

*Why:* knowing that day 3 is usually the peak and that most withdrawal fades within a month makes a hard day feel like a stage, not a failure.

*Code:* `src/data/milestones.json` (text), `src/milestones.ts` (counting), the `Milestones` component in `src/components/Treasure.tsx`, the dot in `src/components/Home.tsx`; tests in `src/milestones.test.ts`.

## D42 · Planning docs live in `docs/`, outside the app

**Decided.**

Roadmap, decisions, milestone sources and QA notes live in `docs/` as Markdown. The deploy only publishes `dist/`, so none of it ships in the app. The repository is public, so these files are written about the app only, with no personal or health details about her. That context stays in the private decision record.

## D43 · Seabed decorations at milestones

**Decided, built.**

Every milestone (D41) adds a decoration to the seabed at the bottom of the home screen. For now the milestones are the only achievements.

| Day | Milestone | Decoration |
| ---: | --- | --- |
| 0 | Cast Off | A small anchor |
| 1 | First Tide | A shell |
| 3 | Top of the Wave | A bright starfish. Day 3 is usually the hardest, so it gets the brightest one. |
| 7 | Open Water | A coral branch |
| 14 | Finding the Current | An anemone that sways like the seaweed |
| 30 | Deep Water | A pearl in a clam |
| 60 | Calmer Waters | A glowing jellyfish |
| 90 | Rewired | A lantern |
| 182 | Ocean Crosser | A small shipwreck, in the background |
| 365 | Legend of the Deep | A sunken castle, in the background |

- **In the background, nothing to tap.** They sit on the seabed that's already there (the `Ocean` component), behind the school. The middle of the screen stays one big button (D4).
- **A sparkle the first time.** A new decoration sparkles once, the first time she sees it on the home screen. No popup, so it never gets in the way of a craving. With reduced motion on, it just appears.
- **Never taken away.** A decoration stays once it's earned, even if the quit date is moved later (D11). So earned decorations are stored, not worked out from the date each time. Moving the date earlier can earn several at once; each one sparkles.
- **Earned on the home screen only.** Decorations are added when the home screen shows (and once a minute while it's open), never while a date picker is open. Otherwise scrolling past an old date in the picker, or typing a year digit by digit, could earn a whole year's worth for good.
- **No finish line** (D38). After a year the coral keeps changing: 25° further round the colour wheel every month, with no last colour, and 4% bigger every month for a year after that. Like the decorations, its month count only goes up.
- **The Treasure shows them too.** Each milestone in the timeline shows the decoration it earns.
- **Bottles** (phase 3, Q3) could wash up on the same seabed.

*Why:* something new to see on day 0, 1, 3, 7 and 14, the hardest stretch, and a reason to keep opening the app once the card collection is full.

*Needs:* a quit date without setting up the money counter. See D44.

*Code:* `src/seabed.ts` (names, earning, the coral), the art and the layout in `src/components/Seabed.tsx`, the reward line in the `Milestones` component in `src/components/Treasure.tsx`; tests in `src/seabed.test.ts`. A new milestone needs a decoration too, and `npm test` fails without one.

## D44 · Ask for the quit date in the intro

**Decided, built.** Supersedes D41's trade-off (no milestones without setting up the treasure).

The intro ends with one question: “When did you quit?” That date drives the milestones, the decorations (D43) and the treasure's money counter. The money part stays optional.

- **Today** is the big, one-tap answer. **Earlier** opens a date picker (no future dates, like the treasure's picker).
- **Skipping counts as today,** whether she skips the question or the whole intro. If she quit earlier, she can change the date in the Treasure, right under the day count; moving it earlier only adds decorations.
- **One date for everything.** The treasure's start date becomes the quit date. Changing it never takes a decoration away (D43).
- **Phones that already passed the intro** (it shows once, D34): if the treasure is set up, its start date is the quit date and nothing is asked. If not, the question shows once on the next launch.

- **The money form** asks only for the weekly amount and currency. It asks for the date too only if there isn't one (an old backup restored without it).
- **Stored as `quitDate`,** next to the treasure rather than inside it. Data from before (schema 1) and old backups move the treasure's start date across when they load.

*Why:* decorations and milestones shouldn't depend on setting up the money counter, and one question at the start is easier than finding the Treasure.

*Code:* the question in `src/components/Intro.tsx`, when it's shown in `src/app.tsx`, the date field in `src/components/DateField.tsx`, the move in `normalise()` in `src/storage.ts`; tests in `src/storage.test.ts`.

## D45 · Jungkook Easter eggs

**Decided, built.**

She's a huge Jungkook fan, so he turns up in two places:

- **The petting joke** (tap the tuna five times fast): about 3 in 10 jokes are about Jungkook, in a purple speech bubble with a purple heart. The dark list stays at 1 in 10; the rest are the usual jokes. 13 jokes, English and Czech, in `petJungkookJokes`.
- **The treasure's “would already buy” list:** Jungkook things from a photocard (350 Kč) up to a trip to Seoul to see him live (40,000 Kč), with Seoul, Busan and the concert trip as headline trips. Once she can afford one, one item in the list is always a Jungkook thing, with a purple coin. The generic concert ticket became the Jungkook one.

- **Still no goal** (D38). The concert is something the treasure *would already buy*, never something she's saving toward: no progress bar, no “x% of the way to Seoul”.
- **Wholesome only.** The tuna is a fellow fan, a bit jealous, never creepy about a real person. No vape imagery (D30).
- Prices are rough guesses, like the other comparisons. The Czech needs a native speaker's read (D32).

*Code:* `jokeKind` and `PET_SETTINGS.jungkookChance` in `src/pet.ts`, the jokes in `src/i18n.ts`, the bubble in `src/components/Home.tsx`; the items and the always-one-Jungkook rule in `src/comparisons.ts`; tests in `src/pet.test.ts` and `src/comparisons.test.ts`.

## D46 · Japan, South Korea and China in the treasure

**Decided, built.** Extends D45.

She'd love to go to Japan, South Korea and China someday, so the treasure's “would already buy” list has 29 things from there, from a tuna-mayo onigiri in a Tokyo konbini (30 Kč) to a month in Tokyo, Seoul and Beijing (90,000 Kč):

- **Food and small things:** onigiri, bubble tea in Shanghai, genmaicha (rice tea) from Kyoto, a pot of tea in a Chengdu tea house, gachapon, tteokbokki, soup dumplings, Japanese KitKats, ramen, Korean sheet masks, Korean barbecue, Peking duck, a tea ceremony in Kyoto.
- **Places:** the Shanghai maglev, the Ghibli Museum, the Chengdu pandas, karaoke in Seoul, a hanbok day at Gyeongbokgung, the Great Wall at Mutianyu, Tokyo DisneySea.
- **Trips**, which can be the headline: Jeju, the KTX to Busan, the Shinkansen to Kyoto, a ryokan night, a Japan Rail Pass, Beijing, two weeks in China, cherry blossom season in Japan, and all three in one month. The existing Tokyo, Seoul and Busan trips count too.

- **Always one in the list,** like the Jungkook things (D45): once she can afford both, the three items under the headline always include one of each, and the third is anything.
- **Still no goal** (D38): they're what the treasure would already buy, never a trip she's saving toward.
- Prices are rough guesses for one person, converted to Kč. The Czech needs a native speaker's read (D32), especially the place names (Čcheng-tu, Mu-tchien-jü, Kjongbokkung, Čedžu).

*Code:* the `asia` flag and `ALWAYS_ONE` in `src/comparisons.ts`; tests in `src/comparisons.test.ts`.

## D47 · Tea, not coffee

**Decided, built.**

She drinks tea (chai, homemade rice tea), never coffee, so nothing in the app mentions coffee:

- The treasure's “fancy coffee” is now a fancy spiced chai, and three tea things joined the Japan, Korea and China list (D46): genmaicha from Kyoto (“rice tea, like your homemade one, but well travelled”), a Chengdu tea house and a Kyoto tea ceremony.
- The Nose Sommelier card suggests sniffing her tea instead of coffee. Same card, same ID (D13), only the text changed.

*Code:* `src/comparisons.ts`, `src/data/cards.json`.
