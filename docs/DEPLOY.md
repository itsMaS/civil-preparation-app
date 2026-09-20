# Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` runs tests and content validation,
builds, and deploys to Pages on every push to `main`.

## One-time setup (you)

1. On GitHub: **Settings -> Pages -> Build and deployment -> Source: GitHub Actions.**
2. Push to `main` (or run the workflow manually from the Actions tab).
3. The site appears at `https://itsmas.github.io/civil-preparation-app/`.

That is all. No secrets, no tokens.

## Base path

The app is built for the `/civil-preparation-app/` subpath (`vite.config.ts`).
When you add a custom domain, set the base to `/`:

```
VITE_BASE=/ npm run build
```

or change the default in `vite.config.ts`. The hash router means deep links
and refreshes work on Pages without a 404 fallback.

## Updating content

Edit `content/`, bump `content/core/pack.json` version, add a note, commit,
push to `main`. Users get the new service worker on next launch with a
"Updated guidance available" toast; the "What changed" sheet shows your note
and any checklist differences.

## Local development

```
npm install
npm run dev        # http://localhost:5173/civil-preparation-app/
npm test           # engine tests + content validation
npm run build      # production build in dist/
npm run preview    # serve dist/ locally (service worker active)
```

## Shelter data

`src/shelters/fetch.ts` is a stub until the official endpoint is confirmed.
If the endpoint lacks CORS headers, Pages cannot proxy it; instead add a
scheduled GitHub Action that fetches the dataset and commits it to
`content/lt/shelters.json`, then import that file in `src/shelters/cache.ts`
in place of the sample. Weekly is plenty.
