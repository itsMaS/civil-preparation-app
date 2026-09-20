# Civil Resilience App

An offline-first PWA that turns official civil-protection guidance into a
checklist sized to your household, and makes completing it feel like progress.
Built for Lithuania first, structured to expand.

- **Readiness Badges** for 72h at home, grab bag, alerts, air threat, winter outage, radiation, household plan, two weeks.
- **Asks once.** A fact-driven profile means the fourth badge asks almost nothing.
- **Sized to you.** Water and food targets come from formulas over your household and pets.
- **Honest decay.** Supplies have check-by dates; a badge fades and the avatar loses its gear when they lapse.
- **Local only.** No account, no server, no analytics. Export a backup any time.
- **LT + EN**, dark and light themes, works with no network after first load.

## Run it

```
npm install
npm run dev
```

## Docs

- [docs/SPEC.md](docs/SPEC.md) - what the app is and how the engine works
- [docs/CONTENT.md](docs/CONTENT.md) - how to add or change badges, items, questions
- [docs/DEPLOY.md](docs/DEPLOY.md) - GitHub Pages setup
- [docs/FUNDING.md](docs/FUNDING.md) - donations, affiliate, grants, B2B

## License

Code: MIT. Content packs (`content/`): CC BY 4.0. Guidance derives from the
official sources listed in `content/core/sources.json`.

Status: beta. Three badges are fully authored; five are stubs with their core
actions in place.
