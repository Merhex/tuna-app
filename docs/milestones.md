# Milestones

The Sunken Treasure shows a timeline of milestones, counted in whole days from the day she quit (decision D41). She gives that date at the end of the intro (D44), and each milestone leaves a decoration on the home screen's seabed (D43). Each one says what's typical at that point. The text lives in [`src/data/milestones.json`](../src/data/milestones.json), in English and Czech.

## Rules for the text

- **Only what's typical, hedged.** “Usually”, “for most people”, “on average”. Never a promise, never a diagnosis. The app is not medical advice.
- **Every factual claim has a source below.** If you add or change a claim, add the source here first.
- **“Since you quit”, never “clean”.** The count never resets after a slip (D11), so it must not claim she hasn't vaped since.
- **No vape imagery** (D30). Talk about nicotine, cravings and her brain, never about the device, the taste or the last puff.
- **Tuna voice, but the facts stay straight.** Jokes go in the titles and the last line, not in the numbers.

## The list

| Day | ID | Title | The claim | Source |
| ---: | --- | --- | --- | --- |
| 0 | `quit-day` | Cast Off | The first few days are usually the hardest; a craving lasts a few minutes. | NHS, Smokefree.gov |
| 1 | `day-1` | First Tide | Almost all the nicotine has left the blood after a day. | Nicotine's half-life is about 2 hours (NCI, Benowitz). Even at the slowest measured ~3.4 hours, under 1% is left after 24 hours. |
| 3 | `day-3` | Top of the Wave | Withdrawal is usually at its worst in the first three days. | NHS: strongest in the first week, especially the first 3 days. |
| 7 | `week-1` | Open Water | The first week is the toughest stretch. | NHS; Smokefree.gov: the first week is when people are most at risk of slipping. |
| 14 | `week-2` | Finding the Current | Restlessness, bad sleep and a foggy head keep easing; cravings come less often. | Smokefree.gov: symptoms get weaker and happen less often over time. |
| 30 | `month-1` | Deep Water | Withdrawal symptoms last three to four weeks on average. | NHS: 3 to 4 weeks on average, longer for some. |
| 60 | `month-2` | Calmer Waters | After about six weeks, people who quit report less anxiety and stress than people who continue. | Cochrane review (Taylor et al., 2021). |
| 90 | `month-3` | Rewired | Nicotine receptors were back to normal levels by about 6 to 12 weeks. | Cosgrove et al., 2009, reported by NIDA. |
| 182 | `month-6` | Ocean Crosser | Cravings are usually rare and brief by now, but can still come at a party or in a rough week. | Smokefree.gov (cravings fade over time); the rest is general relapse-prevention advice, not a statistic. |
| 365 | `year-1` | Legend of the Deep | No health claim. | — |

“Every craving you ride out teaches your brain the hook is empty” (1 week) is framing, based on how cue-driven habits weaken when they go unrewarded. It is not presented as a statistic.

## Caveats worth knowing

- **Most of this research is on smoking, not vaping.** Withdrawal is about nicotine, so the timeline carries over. But the mood study (Cochrane) and the brain-scan study (Cosgrove) were done on people who smoked, so the text says “people who quit smoking” or “people who quit” rather than claiming it for vaping.
- **The brain-scan study is small** (6 people in the 6–12-week group). The text says “somewhere between 6 and 12 weeks” rather than a precise date.
- **The mood evidence is observational**, rated very low to moderate certainty. Its clearest finding is that mental health does not get worse after quitting.
- **Everyone is different.** The footnote under the timeline says so.

## Sources

- NHS Better Health: [Managing nicotine withdrawal symptoms](https://www.nhs.uk/better-health/quit-smoking/staying-smoke-free/managing-nicotine-withdrawal-symptoms/)
- Smokefree.gov: [Managing nicotine withdrawal](https://smokefree.gov/challenges-when-quitting/withdrawal/managing-nicotine-withdrawal) and [Nicotine withdrawal and vaping](https://smokefree.gov/quit-vaping-resources/nicotine-withdrawal-vaping)
- National Cancer Institute, Tobacco Control Monograph 7: [nicotine kinetics](https://cancercontrol.cancer.gov/brp/tcrb/monographs/7/m7_7.pdf) (elimination half-life about 2 hours)
- Benowitz, Hukkanen & Jacob, 2009: [Nicotine chemistry, metabolism, kinetics and biomarkers](https://pmc.ncbi.nlm.nih.gov/articles/PMC2953858/)
- NIDA Notes, 2009: [Abstinent smokers' nicotinic receptors take more than a month to normalize](https://archives.drugabuse.gov/news-events/nida-notes/2009/10/abstinent-smokers-nicotinic-receptors-take-more-than-a-month-to-normalize) (Cosgrove et al., [full paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC2796827))
- Cochrane, 2021: [Smoking cessation for improving mental health](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD013522.pub2)

## Changing the milestones

- Edit the text freely. Keep each milestone's `id` permanent: the seabed decorations (D43) key on it, and so will a planned feature (bottles from you, unlocked at milestones).
- Days are counted in whole calendar days from the start date, which is day 0. A new milestone needs a `day`, a `when` label, a `title` and a `body`, each in `en` and `cs`.
- A new milestone also needs a decoration: a name in `src/seabed.ts`, and art and a spot on the sand in `src/components/Seabed.tsx`.
- `npm test` checks the list starts at day 0, is in order, has unique IDs, has both languages and has a decoration for every milestone.
- Czech text should get a native speaker's read, like the cards.
