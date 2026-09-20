# Content authoring guide

Everything users read lives in `content/`. Edit JSON, run `npm test`, commit,
push to `main`. The Action validates, builds and deploys. Users see a
"What changed" sheet on their next launch.

```
content/
  core/
    pack.json          version + notes (shown on update)
    facts.json         questions the app can ask
    entities.json      person / pet / vehicle field definitions
    items.json         the shared item library
    badges/*.json      one file per badge
    scenarios.json     "Right now" pages
    sources.json       citation registry
    numbers.json       emergency numbers
  lt/
    overlay.json       Lithuanian overrides/additions (merged by id)
    shelters.sample.json
```

Every human-readable string is `{ "en": "...", "lt": "..." }`. The validator
fails the build if a locale is missing.

## Checklist for a content change

1. **Bump `content/core/pack.json` version** (semver) and add a note.
2. **Never reuse an id.** Ticks are stored by item id; a reused id inherits old state.
3. Run `npm test`. `validate.test.ts` lints every pack.

## Facts

```json
{ "id": "home.floor", "kind": "number", "group": "home",
  "when": "home.type == 'apartment'", "min": 0, "max": 40,
  "question": { "en": "Which floor?", "lt": "Kuriame aukšte?" },
  "help": { "en": "...", "lt": "..." },
  "volatileMonths": 24, "critical": false, "default": 0, "sensitive": false }
```

- `kind`: `single` | `multi` | `boolean` | `number` | `text` | `entityList`
- `when`: expression; the fact is only asked (and only exists) when truthy.
- `volatileMonths`: re-ask after N months.
- `critical`: cannot be skipped when a badge requires it.
- `default`: value used when skipped (marked "assumed" in the profile).
- `group`: `household` | `pets` | `home` | `vehicles` | `health` | `plan` | `info` (Profile sections).
- `entityList` facts need `entity`, `gate` ("Do you have pets?"), `more` ("Add another?") and optionally `minInstances` (1 for the household: the user is created silently).

Facts in group `plan` are written by action items (`factTarget`), not asked in surveys.

## Entities

Fields are facts with local ids. Field `when` expressions may use `this.<field>`:
`"when": "this.species == 'dog'"`.

## Items

```json
{ "id": "water.drinking", "type": "acquire",
  "unit": { "en": "litres", "lt": "litrai" }, "checkByMonths": 6,
  "gear": "water", "covers": "person", "substitutes": [],
  "source": { "id": "lt72", "section": "water" },
  "name": {...}, "why": {...}, "how": {...},
  "buy": { "search": { "en": "still water 5 litre", "lt": "..." } } }
```

- `type`: `acquire` | `knowledge` | `action` | `maintain`
- `unit`: makes it a quantity item; badges must then give a `quantity`.
- `checkByMonths`: default check-by horizon on tick.
- `gear`: avatar layer id (`backpack`, `water`, `radio`, `torch`, `powerbank`, `firstaid`, `documents`, `blanket`, `boots`, `food`, `stove`). Add a layer in `src/avatar/Avatar.tsx` for new ids.
- `covers`: `person` | `pet` - all items covering a type must be satisfied for the cast member to show as covered.
- `factTarget`: action items that save a plan fact.
- `substitutes`: other item ids that satisfy this one.
- `source` is required. `why` is one line: the stakes, plainly.
- `buy` is stored but not rendered in v1.

## Badges

```json
{ "id": "shelter72", "order": 2, "status": "live", "icon": "home", "environment": "stocked",
  "recommendedAfter": ["alerts"],
  "requiredFacts": ["household.people", "pets.list", "home.type", "home.floor", "home.lift"],
  "requirements": [
    { "item": "water.drinking", "quantity": "3 * household.size * 3" },
    { "item": "water.pets", "when": "pets.count > 0", "quantity": "pets.dogs * 3" },
    { "item": "heat.blankets", "optional": true }
  ] }
```

- `status: "stub"` shows a "Coming soon" chip and a note; it is still playable.
- `requiredFacts` must include every fact and entity list the expressions use. The validator enforces this.
- `icon`: a name from `src/components/Icon.tsx`.

## Expressions

A small safe language, no `eval`:

- literals: `3`, `1.5`, `'apartment'`, `true`, `null`
- identifiers: fact ids (`home.floor`) and aggregates below
- operators: `+ - * / %`, `== != < <= > >=`, `&& || !`, `a ? b : c`, parentheses
- functions: `ceil floor round min max has num`

Missing values are `null`: comparisons are false, arithmetic yields null (the
UI shows the target as unknown rather than guessing). Use `num(x)` to treat
missing as 0.

Aggregates computed from entities:

```
people.count people.infants people.children people.adults people.seniors
people.onMeds people.mobility people.allergies people.specialDiet
pets.count pets.dogs pets.cats pets.small pets.onMeds pets.large
vehicles.count vehicles.cars vehicles.bikes
household.size  (= max(1, people.count))
```

Multi-select facts also expose `<factId>.<option>` booleans.

## Country overlays

`content/<cc>/overlay.json` has `meta` plus any of `facts`, `entities`, `items`,
`badges`, `scenarios`, `sources`, `emergencyNumbers`. Entries with an existing id
replace the core entry wholesale; new ids are appended. Register the overlay in
`src/content/index.ts` and set `COUNTRY`.

## Sources

Every item and scenario cites a source id from `sources.json`. Keep `retrieved`
current. URLs must be https. The About screen lists them all.
