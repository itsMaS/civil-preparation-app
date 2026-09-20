import { ExprError, identifiers, parse } from './expr';
import type { ContentPack, FactDef, LString } from './types';

/** Aggregates exposed by buildContext that expressions may reference. */
export const CONTEXT_AGGREGATES = [
  'people.count', 'people.infants', 'people.children', 'people.adults', 'people.seniors', 'people.onMeds',
  'people.mobility', 'people.allergies', 'people.specialDiet',
  'pets.count', 'pets.dogs', 'pets.cats', 'pets.small', 'pets.onMeds', 'pets.large',
  'vehicles.count', 'vehicles.cars', 'vehicles.bikes', 'household.size',
];

const LOCALES: (keyof LString)[] = ['en', 'lt'];

/**
 * Lints a content pack. Returns a list of human-readable problems; empty means valid.
 * Run in CI so a broken formula or orphaned id never reaches users.
 */
export function validatePack(pack: ContentPack): string[] {
  const errors: string[] = [];
  const err = (m: string): void => { errors.push(m); };

  const lstr = (where: string, s: LString | undefined, required = true): void => {
    if (!s) { if (required) err(`${where}: missing text`); return; }
    for (const l of LOCALES) if (!s[l] || !s[l].trim()) err(`${where}: missing '${l}' translation`);
  };

  const unique = <T extends { id: string }>(xs: T[], what: string): Map<string, T> => {
    const map = new Map<string, T>();
    for (const x of xs) {
      if (!x.id) err(`${what}: entry without id`);
      if (map.has(x.id)) err(`${what}: duplicate id '${x.id}'`);
      map.set(x.id, x);
    }
    return map;
  };

  const facts = unique(pack.facts, 'facts');
  const entities = unique(pack.entities, 'entities');
  const items = unique(pack.items, 'items');
  const badges = unique(pack.badges, 'badges');
  const sources = unique(pack.sources, 'sources');
  unique(pack.scenarios, 'scenarios');

  const knownIds = new Set<string>([...facts.keys(), ...CONTEXT_AGGREGATES]);
  for (const f of pack.facts) if (f.kind === 'multi') for (const o of f.options ?? []) knownIds.add(`${f.id}.${o.value}`);

  const checkExpr = (where: string, src: string | undefined, extra: Set<string> = new Set()): void => {
    if (!src) return;
    try { parse(src); } catch (e) { err(`${where}: ${(e as ExprError).message}`); return; }
    for (const id of identifiers(src)) {
      if (!knownIds.has(id) && !extra.has(id)) err(`${where}: references unknown identifier '${id}'`);
    }
  };

  const checkFact = (where: string, f: FactDef, extra?: Set<string>): void => {
    lstr(`${where}.question`, f.question);
    lstr(`${where}.help`, f.help, false);
    if (['single', 'multi'].includes(f.kind)) {
      if (!f.options?.length) err(`${where}: '${f.kind}' fact needs options`);
      for (const o of f.options ?? []) lstr(`${where}.options.${o.value}`, o.label);
    }
    if (f.kind === 'entityList') {
      if (!f.entity || !entities.has(f.entity)) err(`${where}: unknown entity '${f.entity}'`);
      lstr(`${where}.gate`, f.gate);
      lstr(`${where}.more`, f.more);
    }
    checkExpr(`${where}.when`, f.when, extra);
  };

  for (const f of pack.facts) checkFact(`fact ${f.id}`, f);

  for (const e of pack.entities) {
    lstr(`entity ${e.id}.label`, e.label);
    lstr(`entity ${e.id}.labelPlural`, e.labelPlural);
    const local = new Set(e.fields.map((f) => `this.${f.id}`));
    unique(e.fields, `entity ${e.id}.fields`);
    for (const f of e.fields) checkFact(`entity ${e.id}.${f.id}`, f, local);
    if (e.nameField && !e.fields.some((f) => f.id === e.nameField)) err(`entity ${e.id}: nameField '${e.nameField}' not a field`);
  }

  for (const i of pack.items) {
    lstr(`item ${i.id}.name`, i.name);
    lstr(`item ${i.id}.why`, i.why);
    lstr(`item ${i.id}.how`, i.how, false);
    lstr(`item ${i.id}.unit`, i.unit, false);
    if (i.source && !sources.has(i.source.id)) err(`item ${i.id}: unknown source '${i.source.id}'`);
    if (!i.source) err(`item ${i.id}: every item must cite a source`);
    for (const s of i.substitutes ?? []) {
      if (!items.has(s)) err(`item ${i.id}: unknown substitute '${s}'`);
      if (s === i.id) err(`item ${i.id}: substitutes itself`);
    }
    if (i.factTarget && !facts.has(i.factTarget)) err(`item ${i.id}: unknown factTarget '${i.factTarget}'`);
    if (i.covers && !entities.has(i.covers)) err(`item ${i.id}: unknown covers '${i.covers}'`);
    if (i.buy) lstr(`item ${i.id}.buy.search`, i.buy.search);
  }

  const orders = new Set<number>();
  for (const b of pack.badges) {
    lstr(`badge ${b.id}.name`, b.name);
    lstr(`badge ${b.id}.tagline`, b.tagline);
    lstr(`badge ${b.id}.description`, b.description);
    if (orders.has(b.order)) err(`badge ${b.id}: duplicate order ${b.order}`);
    orders.add(b.order);
    for (const f of b.requiredFacts) if (!facts.has(f)) err(`badge ${b.id}: unknown required fact '${f}'`);
    for (const r of b.recommendedAfter ?? []) if (!badges.has(r)) err(`badge ${b.id}: unknown recommendedAfter '${r}'`);
    if (!b.requirements.length) err(`badge ${b.id}: no requirements`);
    if (b.status === 'live' && !b.requirements.some((r) => !r.optional)) err(`badge ${b.id}: live badge has no core requirements`);
    const seen = new Set<string>();
    for (const r of b.requirements) {
      if (!items.has(r.item)) err(`badge ${b.id}: unknown item '${r.item}'`);
      if (seen.has(r.item)) err(`badge ${b.id}: item '${r.item}' listed twice`);
      seen.add(r.item);
      checkExpr(`badge ${b.id}.${r.item}.when`, r.when);
      checkExpr(`badge ${b.id}.${r.item}.quantity`, r.quantity);
      const item = items.get(r.item);
      if (r.quantity && item && !item.unit) err(`badge ${b.id}: item '${r.item}' has a quantity but no unit`);
      lstr(`badge ${b.id}.${r.item}.note`, r.note, false);
    }
    // Facts referenced by requirement expressions should be asked by the badge (or be aggregates).
    for (const r of b.requirements) {
      for (const src of [r.when, r.quantity]) {
        if (!src) continue;
        let ids: string[] = [];
        try { ids = identifiers(src); } catch { continue; }
        for (const id of ids) {
          if (CONTEXT_AGGREGATES.includes(id)) {
            const needs = id.startsWith('people.') || id === 'household.size' ? 'household.people' : id.startsWith('pets.') ? 'pets.list' : 'vehicles.list';
            if (!b.requiredFacts.includes(needs)) err(`badge ${b.id}: '${r.item}' uses '${id}' but badge does not require '${needs}'`);
          } else if (facts.has(id) && !b.requiredFacts.includes(id)) {
            err(`badge ${b.id}: '${r.item}' uses fact '${id}' but badge does not require it`);
          }
        }
      }
    }
  }

  for (const s of pack.scenarios) {
    lstr(`scenario ${s.id}.title`, s.title);
    if (!s.steps.length) err(`scenario ${s.id}: no steps`);
    s.steps.forEach((st, i) => lstr(`scenario ${s.id}.steps[${i}]`, st));
    if (s.source && !sources.has(s.source.id)) err(`scenario ${s.id}: unknown source '${s.source.id}'`);
  }

  for (const s of pack.sources) {
    if (!s.url.startsWith('https://')) err(`source ${s.id}: url must be https`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.retrieved)) err(`source ${s.id}: retrieved must be YYYY-MM-DD`);
  }

  if (!/^\d+\.\d+\.\d+$/.test(pack.meta.version)) err(`pack: version '${pack.meta.version}' is not semver`);
  pack.meta.notes.forEach((n, i) => lstr(`pack.notes[${i}]`, n));
  for (const n of pack.emergencyNumbers) lstr(`emergencyNumbers.${n.number}`, n.label);

  return errors;
}
