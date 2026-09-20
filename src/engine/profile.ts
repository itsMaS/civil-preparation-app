import type { Context, Value } from './expr';
import type { ContentPack, EntityInstance, FactRecord, FactValue, Profile } from './types';

export const SCHEMA_VERSION = 1;

export function emptyProfile(locale: 'en' | 'lt' = 'lt'): Profile {
  return {
    facts: {},
    entities: {},
    listsDone: {},
    avatar: { skin: 'medium', hair: 'short', body: 'average' },
    locale,
    theme: 'dark',
  };
}

function toValue(v: FactValue | undefined): Value {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v.join(',');
  return v;
}

function ageBand(v: FactValue | undefined): string | null {
  return typeof v === 'string' ? v : null;
}

/**
 * Flattens the profile into the expression context.
 * Facts: "home.type" etc. Multi-select facts also expose "<id>.<option>" booleans.
 * Entities expose aggregate counters so pack authors never loop.
 */
export function buildContext(profile: Profile, pack: ContentPack): Context {
  const ctx: Context = {};
  const factDefs = new Map(pack.facts.map((f) => [f.id, f]));

  for (const [id, rec] of Object.entries(profile.facts)) {
    ctx[id] = toValue(rec.value);
    const def = factDefs.get(id);
    if (def?.kind === 'multi' && Array.isArray(rec.value)) {
      for (const opt of def.options ?? []) ctx[`${id}.${opt.value}`] = rec.value.includes(opt.value);
    }
  }

  // Entity aggregates
  const people = profile.entities.person ?? [];
  const pets = profile.entities.pet ?? [];
  const vehicles = profile.entities.vehicle ?? [];
  const field = (e: EntityInstance, f: string): FactValue | undefined => e.fields[f]?.value;

  ctx['people.count'] = people.length;
  ctx['people.infants'] = people.filter((p) => ageBand(field(p, 'age')) === 'infant').length;
  ctx['people.children'] = people.filter((p) => ['infant', 'child', 'teen'].includes(ageBand(field(p, 'age')) ?? '')).length;
  ctx['people.adults'] = people.filter((p) => ['adult', 'senior'].includes(ageBand(field(p, 'age')) ?? '')).length;
  ctx['people.seniors'] = people.filter((p) => ageBand(field(p, 'age')) === 'senior').length;
  ctx['people.onMeds'] = people.filter((p) => field(p, 'meds') === true).length;
  ctx['people.mobility'] = people.filter((p) => field(p, 'mobility') === true).length;
  ctx['people.allergies'] = people.filter((p) => field(p, 'allergies') === true).length;
  ctx['people.specialDiet'] = people.filter((p) => field(p, 'diet') === true).length;

  ctx['pets.count'] = pets.length;
  ctx['pets.dogs'] = pets.filter((p) => field(p, 'species') === 'dog').length;
  ctx['pets.cats'] = pets.filter((p) => field(p, 'species') === 'cat').length;
  ctx['pets.small'] = pets.filter((p) => ['small', 'other'].includes(String(field(p, 'species')))).length;
  ctx['pets.onMeds'] = pets.filter((p) => field(p, 'meds') === true).length;
  ctx['pets.large'] = pets.filter((p) => field(p, 'size') === 'large').length;

  ctx['vehicles.count'] = vehicles.length;
  ctx['vehicles.cars'] = vehicles.filter((v) => field(v, 'kind') === 'car').length;
  ctx['vehicles.bikes'] = vehicles.filter((v) => field(v, 'kind') === 'bike').length;

  // Convenience: household size = people (the user counts themselves as a person entity)
  ctx['household.size'] = Math.max(1, people.length);
  return ctx;
}

export function monthsSince(iso: string, now = new Date()): number {
  const d = new Date(iso);
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

export function isStale(rec: FactRecord, volatileMonths: number | undefined, now = new Date()): boolean {
  if (!volatileMonths) return false;
  return monthsSince(rec.answeredAt, now) >= volatileMonths;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
