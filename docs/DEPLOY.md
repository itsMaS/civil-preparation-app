# Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` runs tests and content validation,
builds, and deploys to Pages on every push to `main`.

## One-time setup (you)

1. **Unlock Actions.** The first run on 2026-09-20 failed with
   "The job was not started because your account is locked due to a billing
   issue." Go to GitHub -> your avatar -> **Settings -> Billing and plans**
   and resolve the flagged payment method or overdue amount. Public repos are
   free, but a locked account blocks Actions everywhere.
2. **Settings -> General -> Default branch:** set to `main` (the first push
   made `claude/brave-cerf-affdvf` the default).
3. **Settings -> Pages -> Build and deployment -> Source: GitHub Actions.**
4. **Actions tab -> "Test and deploy to GitHub Pages" -> Re-run** (or push to `main`).
5. The site appears at `https://itsmas.github.io/civil-preparation-app/`.

No secrets, no tokens.

### Fallback without Actions

If Actions stays unavailable, publish from your machine to a `gh-pages` branch:

```
npm ci && npm test && npm run build
git checkout --orphan gh-pages && git rm -rf . -q
cp -r dist/* . && cp dist/.nojekyll . 2>/dev/null; touch .nojekyll
git add -A && git commit -m "Publish" && git push -f origin gh-pages
git checkout main
```

Then set **Settings -> Pages -> Source: Deploy from a branch -> `gh-pages` / root**.
Repeat for each release. Switch back to the Actions workflow once the account is unlocked.

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
