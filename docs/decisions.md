# Decisions

Every product and technical decision, numbered. Code comments refer to these numbers.

**Last number used: D55.** D1–D38, T1, T2 and the questions Q1–Q8 come from the original decision record (a private artifact, which also holds the personal context behind them). They are summarised here; D39 onwards are written here first.

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
- **D48 · The treasure list is three random things, no headline.** Decided, built. See below.
- **D53 · Postcards: share a win.** Decided, built. See below.
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
- **D50 · Dodge the hooks, offered on “Not yet”.** Decided, built. See below.
- **D51 · A brutal hook (8 to 10) starts with Dodge the hooks.** Decided, built. See below.
- **D55 · The home screen is a 3D tank.** Decided, built. See below.

## Cards and rarity

- **D6 · Rarity exists but stays generous.** Decided. Every draw should feel good.
- **D7 · Collecting, favourites and the aquarium.** Decided. She can heart caught cards and draw only from favourites.
- **D8 · Duplicates still count.** Decided. “Caught ×3”, a badge at 5.
- **D12 · Where-can-I-do-it tags on every card.** Decided. `anywhere`, `quiet`, `home`, `outside`. Drawing by location was planned for later; it’s now D39.
- **D13 · Card IDs are permanent.** Decided. Titles and tasks can change; an ID never changes or gets reused.
- **D14 · Five categories, mixed in every deck.** Decided. Physical, sensory, ridiculous, social, grounding. A sixth, daydream, joined in D52.
- **D15 · Starting deck of 40 cards.** Decided: 20 common, 11 uncommon, 7 rare, 2 legendary. Grown to 51 by D40.
- **D16 · Tier chances 55 / 28 / 14 / 3.** Decided. In `DRAW_SETTINGS` (`src/draw.ts`).
- **D17 · Guaranteed rare after 8 draws** without one. Decided.
- **D18 · Uncaught cards weigh 3× in the draw.** Decided.
- **D37 · Every card takes under a minute.** Decided. Timers 60 seconds or less; tests enforce it.
- **D40 · At least half the deck works out of the house.** Decided, built. See below.
- **D52 · Daydream cards: picture something she'd love.** Decided, built. See below.

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
- **D49 · Count every pet of the tuna, shown in the Logbook.** Decided, built. See below.

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

- **In the background, nothing to tap.** They sit on the seabed behind the school (in 3D since D55). The middle of the screen stays one big button (D4).
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
- **The treasure's “would already buy” list:** Jungkook things from a photocard (350 Kč) up to a trip to Seoul to see him live (40,000 Kč). Once she can afford one, one item in the list is always a Jungkook thing, with a purple coin. The generic concert ticket became the Jungkook one.

- **Still no goal** (D38). The concert is something the treasure *would already buy*, never something she's saving toward: no progress bar, no “x% of the way to Seoul”.
- **Wholesome only.** The tuna is a fellow fan, a bit jealous, never creepy about a real person. No vape imagery (D30).
- Prices are rough guesses, like the other comparisons. The Czech needs a native speaker's read (D32).

*Code:* `jokeKind` and `PET_SETTINGS.jungkookChance` in `src/pet.ts`, the jokes in `src/i18n.ts`, the bubble in `src/components/Home.tsx`; the items and the always-one-Jungkook rule in `src/comparisons.ts`; tests in `src/pet.test.ts` and `src/comparisons.test.ts`.

## D46 · Japan, South Korea and China in the treasure

**Decided, built.** Extends D45.

She'd love to go to Japan, South Korea and China someday, so the treasure's “would already buy” list has 29 things from there, from a tuna-mayo onigiri in a Tokyo konbini (30 Kč) to a month in Tokyo, Seoul and Beijing (90,000 Kč):

- **Food and small things:** onigiri, bubble tea in Shanghai, genmaicha (rice tea) from Kyoto, a pot of tea in a Chengdu tea house, gachapon, tteokbokki, soup dumplings, Japanese KitKats, ramen, Korean sheet masks, Korean barbecue, Peking duck, a tea ceremony in Kyoto.
- **Places:** the Shanghai maglev, the Ghibli Museum, the Chengdu pandas, karaoke in Seoul, a hanbok day at Gyeongbokgung, the Great Wall at Mutianyu, Tokyo DisneySea.
- **Trips:** Jeju, the KTX to Busan, the Shinkansen to Kyoto, a ryokan night, a Japan Rail Pass, Beijing, two weeks in China, cherry blossom season in Japan, and all three in one month. The existing Tokyo, Seoul and Busan trips count too.

- **Always one in the list,** like the Jungkook things (D45): once she can afford both, the three items always include one of each, and the third is anything.
- **Still no goal** (D38): they're what the treasure would already buy, never a trip she's saving toward.
- Prices are rough guesses for one person, converted to Kč. The Czech needs a native speaker's read (D32), especially the place names (Čcheng-tu, Mu-tchien-jü, Kjongbokkung, Čedžu).

*Code:* the `asia` flag and `ALWAYS_ONE` in `src/comparisons.ts`; tests in `src/comparisons.test.ts`.

## D47 · Tea, not coffee

**Decided, built.**

She drinks tea (chai, homemade rice tea), never coffee, so nothing in the app mentions coffee:

- The treasure's “fancy coffee” is now a fancy spiced chai, and three tea things joined the Japan, Korea and China list (D46): genmaicha from Kyoto (“rice tea, like your homemade one, but well travelled”), a Chengdu tea house and a Kyoto tea ceremony.
- The Nose Sommelier card suggests sniffing her tea instead of coffee. Same card, same ID (D13), only the text changed.

*Code:* `src/comparisons.ts`, `src/data/cards.json`.

## D48 · The treasure list is three random things, no headline

**Decided, built.**

The “would already buy” list used to start with a headline: the most expensive trip she could already afford, in big bold type with an emoji. It's gone. The list is now three things, all picked at random, and Shuffle changes all three.

*Why:* the headline didn't shuffle and only changed when the treasure passed the next trip's price. With a few hundred Kč saved, that meant a train to Vienna at the top for weeks, whatever she tapped. It also looked like the box's title rather than one of the things it would buy.

- The trips stay in the list as ordinary items.
- The Jungkook thing and the Japan, South Korea or China thing are still always there once she can afford them (D45, D46).

*Code:* `pickComparisons` in `src/comparisons.ts`, the list in `src/components/Treasure.tsx`; tests in `src/comparisons.test.ts`.

## D49 · Count every pet of the tuna, shown in the Logbook

**Decided, built.**

Every tap on the tuna on the home screen counts as a pet (D45's Easter egg). The Logbook shows the total in a small strip just above the history: a coral heart, the number, and one quip picked at random each time the Logbook opens (“Best-petted fish in the ocean.”).

- **Counting starts with this version.** Older pets weren't stored, so the count starts at 0. At 0 the strip says the tuna is waiting for its first pet, which also points out the Easter egg.
- **It only goes up.** Like the school (D11), nothing resets it.
- **Stored as `pets`,** next to the other data, and included in backups. Older saves and backups load with 0.
- The Czech needs a native speaker's read (D32).

*Code:* the count in `PettableTuna` in `src/components/Home.tsx`, the strip (`PetCount`) in `src/components/Logbook.tsx`, the text in `src/i18n.ts`, `pets` in `src/storage.ts`; tests in `src/storage.test.ts`.

## D50 · Dodge the hooks, offered on “Not yet”

**Decided, built.**

A 2½-minute mini-game (roadmap #7, phase 2). The tuna follows her finger, hooks drop, swing and get pulled across on lines, and bubbles rise to catch. It gets harder through the round, and the bubbles rise faster. There's no game over: a hook only nicks the tuna, which is safe for a moment after, and the hooks ease off for a while.

*Why a game:* steering between moving things is a visual-spatial task, the kind that competes with craving imagery. In the Tetris studies (Skorka-Brown, Andrade & May, 2014 and 2015), about 3 minutes of play made cravings, nicotine included, roughly a fifth weaker. The round was cut to 2½ minutes after a playtest, because 3 felt too long.

- **On “Not yet”,** as a second button under “Draw another card”, and since D51 straight away for a brutal hook. Not on the home screen: one big button that goes straight to a card is deliberate (D4, D5), and “card or game?” would be a decision at the worst moment. The game could also crowd out the cards, which get her moving and fill the aquarium. “Not yet” is exactly when a craving has outlasted a card.
- **It waits for her first touch,** with how to play shown until then. Leaving before that goes back to “Not yet” without counting a round.
- **Then the usual check:** the hooks' eulogy and her bubbles above “Did the hook let go?”, the after rating, and Yes / Not yet / the quiet slip link (D31). Yes adds a tuna to her school like a card does (D11). The game's “hooks dodged” is a separate count and isn't stored.
- **Stored as `rounds` on the hook** (how many rounds she played), and shown in the Logbook's history. Absent when she didn't play, so older saves and backups need nothing. It's there for comparing hooks with and without the game later (roadmap: “Cards that work for her”).
- **No vibration on iPhone during play:** only a real tap vibrates there (D33), and dragging doesn't count. Android vibrates on a nick.
- **Tuning** (round length, hook speeds and counts, bubble speed, how much a nick eases things) is in `DODGE_SETTINGS`.
- The Czech needs a native speaker's read (D32).

*Code:* rules in `src/dodge.ts`, drawing and touch in `src/components/Dodge.tsx`, the “Not yet” button and the check in `src/components/HookFlow.tsx`, `rounds` in `src/storage.ts`, the history line in `src/components/Logbook.tsx`; tests in `src/dodge.test.ts`.

## D51 · A brutal hook (8 to 10) starts with Dodge the hooks

**Decided, built.** Extends D50.

When she rates a hook 8, 9 or 10 at the start, the game comes up instead of a card. Above how to play there's a line in the tuna's voice (“A 10? This one gets the big guns.”) and a small “Draw a card instead” link.

*Why:* tucked away on “Not yet”, the game would rarely be found, and a hook that strong is when a card that takes under a minute (D37) is least likely to be enough. Going straight in, rather than asking “card or game?”, saves a decision and a tap at the worst moment, and the card is still one tap away.

- **Only with a rating.** Skipping the rating draws a card as before. Hooks rated 1 to 7 are unchanged, and home stays one big button (D4).
- **Leaving before her first touch goes back to the rating,** so a mis-tap can be corrected. Nothing is recorded.
- **After the round,** the usual check. “Not yet” then offers “Draw a card” (not “another”, as she hasn't had one) or another round. A hook beaten with the game alone adds a tuna to her school and shows the game on the win screen and in the Logbook.
- **Brutal hooks with and without the game** can now be compared in the Logbook data (`rounds`, D50), for the roadmap's “Cards that work for her”.
- **The threshold is `GAME_FROM`** in `src/components/HookFlow.tsx`. It started at 9 and was lowered to 8 after testing, so the game comes up more often.
- The Czech needs a native speaker's read (D32).

*Code:* `GAME_FROM` and the game step in `src/components/HookFlow.tsx`, the line and the link (`lead`, `onSkip`) in `src/components/Dodge.tsx`, the text in `src/i18n.ts`.

## D52 · Daydream cards: picture something she'd love

**Decided, built.** Deck v3.

Ten new cards in a sixth category, **Daydream** (*Snění*): each one walks her through picturing something she'd love, with a few questions about what she sees, hears, smells and tastes. They're the places and things from the treasure (D45, D46, D47):

- **Common:** ramen in Tokyo, a 1 a.m. konbini run, a tangerine on Jeju.
- **Uncommon:** a tea ceremony in Kyoto, a hanbok day at Gyeongbokgung, the Chengdu pandas, a karaoke room in Seoul (Seven is mandatory).
- **Rare:** a ryokan hot spring in the snow, one perfect day anywhere in the world.
- **Legendary:** front row at a Jungkook concert in Seoul.

- **All tagged `anywhere`:** they're done in her head, so they work on the tram or in a meeting. The deck goes from 51 to 61 cards, and more of it works out of the house (D40).
- **Under a minute** (D37): timers of 30 to 60 seconds, or none.
- **Never the vape** (D30): picturing what you crave makes the craving stronger, so the cards picture something else instead. That's the whole point.
- **Still no goal** (D38): they're daydreams, never a trip she's saving toward.
- The Czech needs a native speaker's read (D32), especially the place names (Kjongbokkung, Čedžu, Čcheng-tu, rjokan).

*Why:* cravings are kept going by vivid mental pictures of the thing you want (elaborated intrusion theory, Kavanagh, Andrade and May). A competing picture takes up the same mental space, which is also why visual games like Tetris, and Dodge the hooks (D50), ease cravings.

*Code:* the cards in `src/data/cards.json` (`addedIn: 3`), the `daydream` category in `src/cards.ts` and `src/i18n.ts`; tests in `src/draw.test.ts`.

## D53 · Postcards: share a win

**Decided, built.**

The win screen has a **Send a postcard** button under “Back to the tank”. It opens the share sheet with a picture of the win, so she can send it to a friend, a group chat or her story:

- **On the postcard:** a headline picked at random (“Greetings from the open sea!”, “Wish you were here. The hook wasn’t.”), the smug tuna, a stamp, the hook strength before and after (when she rated both), the card and its rarity (or Dodge the hooks and the hooks dodged), “Tuna no. 12 in my school” and the date.
- **Never mentions vaping** (D30). A hook is just a hook to whoever gets it, so she decides how much to say.
- **She chooses who sees it.** Nothing is sent anywhere unless she picks someone in the share sheet. No server (D22). It's a light answer to part of Q3: the app's maker sees wins when she wants to share them.
- **Drawn as the win screen opens,** so the tap goes straight to the share sheet: iPhone only allows sharing right after a tap. Where files can't be shared (most computers), it downloads instead.
- **1080 × 1350 PNG** (4:5, fits chats and stories), in the app's fonts and colours.
- The Czech needs a native speaker's read (D32).

*Why:* support from other people is one of the strongest helps when quitting, and a celebrated win gets reinforced. Sharing a good moment is easier than asking for help in a bad one (the roadmap's lifeline / flare).

*Code:* drawing and sharing in `src/postcard.ts`, the button in `src/components/HookFlow.tsx`, the text in `src/i18n.ts`; tests in `src/postcard.test.ts`.

## D54 · Bubbles: a brutal hook starts with breathing or the game, at random

**Decided, built.** Extends D50 and D51. Roadmap #1, “Bubbles: ride the wave”.

Bubbles is two minutes of slow breathing with the tuna. The tuna sits in a big bubble that grows as she breathes in and shrinks as she breathes out, while little bubbles leave its mouth. A dot goes up the left half of a circle breathing in and down the right half breathing out, with “Breathe in” / “Breathe out” above and a countdown below. Soft tones rise and fall with the breath; Android vibrates as each half starts.

- **In for 4, out for 6, no holds.** A prototype also had box breathing (4-4-4-4) on a square, but in testing the holds and the square were confusing, so it was dropped. A longer out-breath is the calming part.
- **12 breaths,** about two minutes after a 3-second “Ready?”. The back button (“That's enough”) ends it early.
- **Her finger is optional.** She can just watch, or keep a finger down while breathing in and lift it to breathe out. Pressing and lifting within 0.9 s of the beat counts the breath as on the beat, and the tuna cheers (“Perfect bubble.”). The bubble brightens while her finger is down.
- **A brutal hook (8 to 10) starts with Bubbles or Dodge the hooks, at random,** never the same one three times in a row. The last two picks are kept in settings (`brutalPicks`). Like D51, it goes straight in: no “game or breathing?” question at the worst moment.
- **The other one, or a card, is one tap away:** under how it works, “Dodge the hooks instead” and “Draw a card” (or “Breathe instead” and “Draw a card” on the game), each with a line in the tuna's voice (“A 9? Let's slow this one right down.”). They replace D51's “Draw a card instead”.
- **It waits for Start,** with the stage dimmed behind how it works. Leaving before finishing a breath counts nothing and goes back, to the rating if she came straight from it (like the game, D50).
- **“Not yet” offers both,** for any hook: Dodge the hooks · 2½ min and Breathe with the tuna · 2 min, the one she didn't just do first. After a card, the game comes first.
- **Then the usual check:** how many big breaths (and how many on the beat, if she used her finger) above “Did the hook let go?”, then Yes / Not yet / the quiet slip link (D31). Yes adds a tuna to her school. The win screen and the postcard (D53) say “Bubbles · 12 big breaths”.
- **Stored as `breaths` on the hook** (breaths over all its rounds), next to `rounds`, and shown in the Logbook's history (“Bubbles · 12 breaths”). Absent when she didn't breathe, so older saves and backups need nothing.
- **“Less motion”** drops the little bubbles and the dot's glow. The big bubble still grows and shrinks: it's the guide.
- The Czech needs a native speaker's read (D32).

*Why:* slow breathing with a long out-breath calms the body, and riding a craving out instead of fighting it (urge surfing) is a standard way through one. The game works the other way, by crowding out craving imagery (D50). Which helps her more at a 10 isn't known, so picking at random and recording `rounds` and `breaths` with the before and after ratings lets the Logbook data answer it later (roadmap: “Cards that work for her”). Two activities also wear thin more slowly than one.

*Code:* the timing and beat in `src/breathe.ts` (`BREATHE_SETTINGS`), the pick in `src/activities.ts`, the round in `src/components/Breathe.tsx`, the swap links in `src/components/OtherWays.tsx`, the flow in `src/components/HookFlow.tsx`, the sounds in `src/feedback.ts`, `breaths` and `brutalPicks` in `src/storage.ts`, the history line in `src/components/Logbook.tsx`; tests in `src/breathe.test.ts` and `src/activities.test.ts`.

## D55 · The home screen is a 3D tank

**Decided, built.** Extends D4 and D43. Tried first as a prototype (“Visit my school”, behind a small button in Settings).

The home screen's backdrop is a 3D seabed: her school swimming behind the button, her milestone decorations on the sand, and the tuna she pets in front, all in 3D (three.js). “Visit my school”, under the school count, fades the buttons away and pulls the camera back to show the whole tank.

- **One tuna per hook beaten,** up to 200 drawn. Past 200 the count still shows her real number, and the wide view adds “200 swimming here, the rest just out of sight.” They swim round the tank in little groups of about eight, all the same way, so the school never crashes into itself. A new tuna joins without the others moving.
- **Her decorations, always on** (D43): the ones she has earned, with no switch to hide them. A new one still sparkles once: it pops up, a glow comes and goes and five stars twinkle. The coral still grows and changes colour after a year. All of them sit outside the band the school swims in, so no tuna swims through one.
- **The tuna she pets is 3D too,** in the drawing's colours, with its three home-screen faces: happy, eyes closed and blushing while she pets it, and the wide-eyed stare with a zigzag mouth for a dark joke (D45). It bobs like the drawing did, wags its tail and squishes a little when tapped. The drawing's button stays where it was, invisible, so tapping, the hearts, the jokes and the pet count (D49) work as before. In the wide view it's the big tuna at the front. Other screens (the intro, the win screen, postcards) keep the drawn tuna.
- **The button never waits for it.** three.js (about 150 kB gzipped, saved for offline with the rest) loads just after the home screen shows. Until it's ready, the drawn seabed and school show; then the tank fades in over them, with the 3D tuna exactly where the drawing was. A phone without 3D keeps the drawn home screen, without “Visit my school”. So does a phone that takes the 3D away (low memory, a long time in the background), until it gives it back.
- **Made once, kept.** Leaving the home screen pauses it, and coming back is instant. It only draws while the home screen shows and the app is open.
- **The wide view** has “Swim back” at the top and a card with the count and “Drag to look around”. Dragging turns the camera round the tank and tilts it; left alone, it drifts slowly round. It always fits the whole tank, the big tuna included, between the top bar and the card, on any phone.
- **If the phone struggles** (under 40 frames a second for two seconds), it draws fewer pixels.
- **“Less motion”:** nothing swims or sparkles, the tuna doesn't bob, and the camera jumps to the wide view instead of gliding.
- The Czech needs a native speaker's read (D32).

*Why:* the count under the button was the only sign of the school. Seeing roughly as many tuna as hooks beaten turns the number into something to look at. Battery and older phones were the worries, so the tank only draws on the home screen and lowers its resolution when it has to.

*Code:* the rules (swimming, the camera, where the decorations and the big tuna go) in `src/school3d.ts` (`SCHOOL3D_SETTINGS`); the scene in `src/tank/` (`scene.ts`; the school in `tuna.ts`, the big tuna in `mascot.ts`, the decorations in `decorations.ts`, sparkles in `sparkle.ts`, water, sand, kelp and light in `world.ts`); the canvas in `src/components/TankLayer.tsx`; the screen in `src/components/Home.tsx`; earning decorations in `useSeabed` (`src/components/Seabed.tsx`). Tests in `src/school3d.test.ts`.
