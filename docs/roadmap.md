# Roadmap

What's shipped, what's next and what was ruled out. Ranked by how much it helps her get through cravings and stay quit, highest first. Decision numbers refer to [decisions.md](decisions.md).

## Done

| Feature | Decision | Shipped |
| --- | --- | --- |
| Phase 1: hook flow, card draw with rarity, throw it back, hook strength, aquarium, favourites, school, backup, offline | D1–D37 | Deck v1 |
| Logbook: before/after chart, trend, history | D35 | |
| Sunken Treasure: money not spent | D38 | |
| **Where are you?** At home / Out and about, draws only cards she can do there | D39 | Deck v2 |
| **11 new cards that work anywhere**; at least half the deck works out of the house | D40 | Deck v2 |
| **Milestones** in the treasure: what to expect from quit day to one year | D41 | |
| **Seabed decorations** at every milestone, sparkling the first time; after a year the coral keeps changing colour every month | D43 | |
| **Quit date asked in the intro,** so milestones and decorations work without the money counter | D44 | |
| **Jungkook Easter eggs:** Jungkook jokes when she pets the tuna; Jungkook things (up to a concert trip to Seoul) in the treasure | D45 | |
| **Japan, South Korea and China in the treasure:** 26 things to eat, see and do there, always one in the list | D46 | |

## Next, ranked

| # | Feature | Impact | Effort | Notes |
| ---: | --- | --- | --- | --- |
| 1 | **Bubbles: ride the wave.** A tuna blowing slow bubbles to breathe along with, for brutal hooks (8–10) or after “Not yet”. | High | Medium | Phase 2 in the original plan. Cards are under a minute (D37); this covers a craving that outlasts several cards. Slow breathing and urge surfing are standard techniques. |
| 2 | **Cards that work for her.** Show “your best lures” (cards with the biggest drop in hook strength) in the Logbook, and weight them a little higher in the draw. | Medium | Small | The data is already stored (D10). Attribution is fuzzy when a hook used several cards: count only the last completed card, or only one-card hooks. |
| 3 | **Bottles from the app's maker**, unlocking at milestones or washing up at random. | Medium | Medium | Phase 3. Milestone IDs are permanent (D41), so bottles can key on them. Waits on Q3. |
| 4 | **Lifeline / flare.** One tap on “Not yet” to ask someone for a text. | Medium | Small to large | Phase 3's flare needs a push server (D22). A cheaper version opens Messages with a ready-made text (an `sms:` link), no server. Waits on Q3. |
| 5 | **Messages in a bottle.** Her own reasons, written on good days, shown during hard ones. | Medium | Small | Phase 2. |
| 6 | **Tuna facts as rewards** on the win screen. | Low | Small | Phase 2. |
| 7 | **Dodge the hooks** mini-game. | Medium | Large | Phase 2. Visual distraction like Tetris measurably weakens cravings, but it's the biggest build here. |
| 8 | **Navigation charts.** If-then plans (“If I'm at a party, then I'll…”). | Medium | Medium | Phase 3. Sits awkwardly with D29 (no trigger features); decide that first. |
| 9 | **Bait insights.** When hooks hit and when slips happen, from times and bait notes. | Medium | Medium | Phase 3. Conflicts with D29 as it stands: needs a decision before building. |

## Ruled out

| Idea | Why not |
| --- | --- |
| **A savings goal in the treasure** (“save for Lisbon”). Scratched for good. | D38: a goal is closed. Once it's reached there's a finish line, and a finish line can become the excuse to start vaping again. The treasure stays open-ended: it only grows, with no end point. |
| **Streaks or “days clean”** | D11: a reset after a slip often turns into “I've failed anyway”. Milestones count days since quitting and never reset. |
| **Reminders at risky times** | No backend (D22), and iPhone web apps can't schedule their own notifications. Would need the same push server as the flare. |

## Open before release

- A native speaker's read of the Czech in the new cards, the milestones, the decoration names, the quit-date question and the Jungkook jokes and the Jungkook, Japan, Korea and China treasure items (D32, D45, D46).
- A test on a real iPhone: sounds, vibrations and the install flow can't be checked in a desktop browser (see [qa-log.md](qa-log.md)).
