# Civil Resilience App - Specification

Working title. The app name is a placeholder: change `APP_NAME` in `src/config.ts`
and `app.name` in `src/i18n/{en,lt}.json`.

## 1. Purpose

An offline-first PWA that turns official civil-protection guidance into a
checklist sized to one household, and makes completing it feel like progress.
Target user for v1: urban adults 25-40 in Lithuania. Goal: real behaviour
change - measured by completed checklists, not signups.

Tone: **stakes stated plainly, then the action.** Every item names the real
consequence in one line, then says what to do. No fear-mongering, no hedging.

## 2. Core concepts

| Concept | What it is |
|---|---|
| **Readiness Badge** | A scenario (72h at home, Grab bag, Air threat...). Two states: *in progress* -> *earned* when every core item is satisfied. Can decay to *needs attention*. |
| **Fact** | One thing the app knows about the household (`home.type`, `home.floor`). Stored once, timestamped, reused by every badge. |
| **Entity** | A structured thing with its own fields: `person`, `pet`, `vehicle`. Lists of entities are facts of kind `entityList`. |
| **Item** | Something to acquire, learn, do, or maintain. Global: one state per item id, shared across badges. |
| **Requirement** | A badge's reference to an item, with an optional condition (`when`) and quantity formula. |
| **Profile** | All facts + entities + avatar look + settings. Local only. |

### 2.1 The fact engine ("never ask twice")

Each badge lists `requiredFacts`. The survey planner (`src/engine/survey.ts`)
diffs the profile against that list and produces the *next* missing step:

- a plain fact question,
- an entity gate ("Do you have pets?"),
- an entity field ("Rex: what kind of animal?"),
- an entity "add another?" prompt.

Facts with a `when` expression are skipped when the condition is false;
`orderFacts` sorts dependencies first. Facts with `volatileMonths` are re-asked
once stale. The result: the first badge asks ~12 questions, the fourth asks 0-2.

Before generating a checklist for a badge that reused facts, the UI shows a
**confirm** screen listing what it will use; tapping a chip clears that fact
and re-asks it.

### 2.2 Checklist generation

`buildChecklist` evaluates each requirement against the profile context:

- `when` false -> requirement omitted.
- `quantity` -> target in the item's unit, `ceil`ed. E.g. `3 * household.size * 3`.
- Satisfied when the global item state has `have`, is not past `checkBy`, and
  `quantity >= target`. Substitutes (`light.headlamp` for `light.torch`) count.
- Core requirements earn the badge; `optional` ones show under "Go further".

Because item state is global, ticking water once credits every badge that
needs water; two-week targets stay honest because they compare against a
larger quantity.

### 2.3 Decay

Items carry `checkByMonths`. Ticking sets `checkBy = today + months` (editable).
Past that date the item stops satisfying; an earned badge becomes
`needs_attention`; its gear disappears from the avatar; the item appears in the
Home "Needs attention" list. Framing is "check by", not "expired".

### 2.4 Avatar

Pure function of user data (`src/avatar/Avatar.tsx`):
- **Look**: skin, hair, body (chosen at onboarding, editable).
- **Gear** layers: from satisfied items with a `gear` field.
- **Mood**: uneasy / neutral / confident from earned ratio; decay drops it a notch.
- **Cast**: household members and pets from entities, each with a covered/uncovered marker.
- **Environment**: bare -> stocked (72h earned) -> fortified (outage or two-week earned).

### 2.5 Right now

Offline emergency page: scenario buttons -> numbered immediate actions,
emergency numbers as `tel:` links, and the plan facts the user saved
(shelter, meeting point, kit location).

### 2.6 Shelters

Bundled sample dataset + IndexedDB cache with stale-while-revalidate (weekly).
The live fetch adapter is a stub until the PAGD endpoint is confirmed
(`src/shelters/fetch.ts`). Location is used once to sort; never stored.
Pinning a shelter writes `plan.shelter` and ticks `shelter.locate`.

## 3. Data & privacy

- All user data lives in IndexedDB (`src/data/db.ts`) behind a `Repository`
  interface. `MemoryRepository` is the fallback. A future `SupabaseRepository`
  for opt-in sync implements the same interface.
- No analytics, no network calls except the optional shelter refresh and map tiles.
- Export/Import: JSON file with `{ app: 'civil-resilience', data }`.
- The privacy promise is shown at first run and persistently on the Profile screen.

## 4. Content model & updates

Content is data in `content/`, merged at build time (`src/content/index.ts`):
`content/core` + `content/<country>/overlay.json` (entries merge by id).
`pack.json` carries a semver `version` and localized `notes`.

On load, `migrateUserData` compares the stored `packVersion`; ticks survive by
item id; each badge with a completed survey gets an added/removed diff shown in
the "What changed" sheet together with the pack notes.

Service worker: `registerType: 'prompt'`; a toast offers refresh, the update
applies on the next cold start regardless. The SW re-checks hourly while open.

See `docs/CONTENT.md` for the authoring guide.

## 5. Screens

Home · Badge (intro -> survey -> confirm -> checklist) · Right now · Shelters ·
Profile (entities, facts with "used by", My plan, avatar, language/theme,
export/import/delete) · About (privacy, what's new, sources, funding, share QR).

## 6. Stack

Vite 8, React 19, TypeScript, Tailwind 4, Radix primitives, Zustand, Dexie,
i18next, vite-plugin-pwa (Workbox), Leaflet (lazy), Vitest. Static build,
GitHub Pages via Actions. Hash router so refreshes never 404.

## 7. Non-goals for v1

Accounts, sync, push notifications, affiliate links, analytics, live alerts.
All are designed for (repository interface, `buy` field on items, pack notes)
but not shipped.

## 8. Roadmap

1. Author the 5 stub badges fully (content-only commits).
2. Confirm the shelter endpoint; or a GitHub Action that snapshots it weekly into `content/lt/shelters.json`.
3. Opt-in anonymous counters for impact reporting (grant requirement).
4. Supabase opt-in sync + web push for maintenance reminders.
5. Affiliate links with the disclosure line already in `about.fundingText`.
6. Second country overlay (LV or EE) to prove the expansion model.
