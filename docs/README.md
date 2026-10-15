# Docs

Planning and decisions for Off the Hook. Nothing in this folder is part of the app: the deploy workflow only publishes the built `dist/` folder, so these files never reach her phone.

| File | What's in it |
| --- | --- |
| [roadmap.md](roadmap.md) | What's done, what's next, ranked by impact, and what was ruled out. |
| [decisions.md](decisions.md) | Every product and technical decision (D1, D2, …), with the reason behind it. |
| [milestones.md](milestones.md) | The milestones shown in the Sunken Treasure, and the source for every claim they make. |
| [qa-log.md](qa-log.md) | QA passes: what was checked, what was found, what was fixed. |

## Keep it public-safe

This repository is public, so anyone can read these files on GitHub. Write about the app, not about her: no health details, no mental-health notes, nothing about her triggers or other apps. Personal context stays in the private decision record artifact, which these docs summarise.

## Adding a decision

1. Add it to [decisions.md](decisions.md) with the next free number (the last one is listed at the top of that file).
2. If it changes an earlier decision, say so in both places (“Supersedes …” / “Superseded by …”).
3. If it adds, ships or rules out a feature, update [roadmap.md](roadmap.md).
4. If code depends on it, mention the number in a code comment (for example `// (D39)`), the way the code already does for D10, D24 and D31.
