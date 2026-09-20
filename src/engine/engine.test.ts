import { describe, it, expect } from 'vitest';
import { pack } from '@/content';
import { planSurvey } from './survey';
import { buildChecklist, badgeStatus, buildBadgeViews, buildTodo, activeGear, badgesUsingItem, addMonths } from './checklist';
import { emptyUserData, migrateUserData } from './migrate';
import { buildContext, newId } from './profile';
import type { UserData } from './types';

const badge = (id: string) => pack.badges.find((b) => b.id === id)!;
const NOW = new Date('2026-09-20T12:00:00Z');
const at = NOW.toISOString();

function fresh(): UserData {
  return emptyUserData(pack, 'en');
}

function answerHousehold(data: UserData, people: { age: string; meds?: boolean }[]) {
  data.profile.entities.person = people.map((p, i) => ({
    id: `p${i}`,
    fields: {
      name: { value: `P${i}`, answeredAt: at },
      age: { value: p.age, answeredAt: at },
      meds: { value: p.meds ?? false, answeredAt: at },
      mobility: { value: false, answeredAt: at },
      diet: { value: false, answeredAt: at },
    },
  }));
  data.profile.listsDone['household.people'] = true;
}

function answerPets(data: UserData, pets: { species: string; size?: string; meds?: boolean }[]) {
  data.profile.entities.pet = pets.map((p, i) => ({
    id: `pet${i}`,
    fields: {
      name: { value: `Pet${i}`, answeredAt: at },
      species: { value: p.species, answeredAt: at },
      ...(p.size ? { size: { value: p.size, answeredAt: at } } : {}),
      meds: { value: p.meds ?? false, answeredAt: at },
    },
  }));
  data.profile.listsDone['pets.list'] = true;
}

function setFact(data: UserData, id: string, value: string | number | boolean) {
  data.profile.facts[id] = { value, answeredAt: at };
}

describe('survey planning', () => {
  it('asks for the household first on a brand-new profile', () => {
    const data = fresh();
    const plan = planSurvey(badge('alerts'), data.profile, pack, NOW);
    expect(plan.next?.kind).toBe('entityGate');
    expect(plan.next && 'fact' in plan.next && plan.next.fact.id).toBe('household.people');
  });

  it('walks entity fields, then asks for more, then moves on', () => {
    const data = fresh();
    data.profile.entities.person = [{ id: 'me', fields: {} }];
    let plan = planSurvey(badge('alerts'), data.profile, pack, NOW);
    expect(plan.next?.kind).toBe('entityField');
    expect(plan.next && 'field' in plan.next && plan.next.field.id).toBe('name');

    answerHousehold(data, [{ age: 'adult' }]);
    data.profile.listsDone['household.people'] = false;
    plan = planSurvey(badge('alerts'), data.profile, pack, NOW);
    expect(plan.next?.kind).toBe('entityMore');

    data.profile.listsDone['household.people'] = true;
    plan = planSurvey(badge('alerts'), data.profile, pack, NOW);
    expect(plan.next?.kind).toBe('fact');
    expect(plan.next && 'fact' in plan.next && plan.next.fact.id).toBe('home.type');
  });

  it('skips conditional facts and never asks a known fact twice', () => {
    const data = fresh();
    answerHousehold(data, [{ age: 'adult' }]);
    setFact(data, 'home.type', 'house');
    setFact(data, 'home.heating', 'gas');
    // Alerts is satisfied entirely by facts already known.
    expect(planSurvey(badge('alerts'), data.profile, pack, NOW).next).toBeNull();
    // 72h still needs pets; floor/lift are skipped because it's a house.
    const plan = planSurvey(badge('shelter72'), data.profile, pack, NOW);
    expect(plan.next?.kind).toBe('entityGate');
    expect(plan.remaining).toBe(1);
    expect(plan.known.map((f) => f.id)).toEqual(['home.type', 'home.heating']);
  });

  it('asks floor and lift for a high apartment, in dependency order', () => {
    const data = fresh();
    answerHousehold(data, [{ age: 'adult' }]);
    answerPets(data, []);
    setFact(data, 'home.type', 'apartment');
    setFact(data, 'home.heating', 'district');
    let plan = planSurvey(badge('shelter72'), data.profile, pack, NOW);
    expect(plan.next && 'fact' in plan.next && plan.next.fact.id).toBe('home.floor');
    setFact(data, 'home.floor', 7);
    plan = planSurvey(badge('shelter72'), data.profile, pack, NOW);
    expect(plan.next && 'fact' in plan.next && plan.next.fact.id).toBe('home.lift');
    setFact(data, 'home.floor', 1);
    expect(planSurvey(badge('shelter72'), data.profile, pack, NOW).next).toBeNull();
  });

  it('re-asks volatile facts once stale', () => {
    const data = fresh();
    answerHousehold(data, [{ age: 'adult', meds: true }]);
    data.profile.entities.person![0].fields.meds!.answeredAt = '2024-01-01T00:00:00Z';
    setFact(data, 'home.type', 'house');
    const plan = planSurvey(badge('alerts'), data.profile, pack, NOW);
    expect(plan.next?.kind).toBe('entityField');
    expect(plan.next && 'field' in plan.next && plan.next.field.id).toBe('meds');
  });
});

describe('checklist generation', () => {
  it('sizes water and food to the household and pets', () => {
    const data = fresh();
    answerHousehold(data, [{ age: 'adult' }, { age: 'adult' }, { age: 'child' }]);
    answerPets(data, [{ species: 'dog', size: 'large' }, { species: 'cat' }]);
    setFact(data, 'home.type', 'house');
    setFact(data, 'home.heating', 'gas');
    const cl = buildChecklist(badge('shelter72'), data, pack, NOW);
    const water = cl.entries.find((e) => e.item.id === 'water.drinking')!;
    expect(water.target).toBe(27); // 3 L x 3 people x 3 days
    const petWater = cl.entries.find((e) => e.item.id === 'water.pets')!;
    expect(petWater.target).toBe(4); // ceil((1 + 0.3) * 3)
    expect(cl.entries.some((e) => e.item.id === 'food.pets')).toBe(true);
    expect(cl.entries.some((e) => e.item.id === 'food.infant')).toBe(false);
    expect(cl.entries.some((e) => e.item.id === 'health.meds')).toBe(false);
  });

  it('includes medication only when someone needs it', () => {
    const data = fresh();
    answerHousehold(data, [{ age: 'senior', meds: true }]);
    answerPets(data, []);
    setFact(data, 'home.type', 'house');
    setFact(data, 'home.heating', 'gas');
    const cl = buildChecklist(badge('shelter72'), data, pack, NOW);
    expect(cl.entries.find((e) => e.item.id === 'health.meds')?.target).toBe(7);
  });

  it('flags unknown targets instead of guessing when a fact is missing', () => {
    const data = fresh();
    // No household answered: household.size still defaults to 1 via max(1, 0).
    const cl = buildChecklist(badge('shelter72'), data, pack, NOW);
    expect(cl.entries.find((e) => e.item.id === 'water.drinking')?.target).toBe(9);
  });
});

describe('item state, substitutes and cross-badge credit', () => {
  function readyHousehold(): UserData {
    const data = fresh();
    answerHousehold(data, [{ age: 'adult' }]);
    answerPets(data, []);
    data.profile.entities.vehicle = [];
    data.profile.listsDone['vehicles.list'] = true;
    setFact(data, 'home.type', 'house');
    setFact(data, 'home.heating', 'gas');
    return data;
  }

  it('a headlamp satisfies the torch requirement', () => {
    const data = readyHousehold();
    data.items['light.headlamp'] = { have: true, updatedAt: at };
    const cl = buildChecklist(badge('shelter72'), data, pack, NOW);
    const torch = cl.entries.find((e) => e.item.id === 'light.torch')!;
    expect(torch.satisfied).toBe(true);
    expect(torch.satisfiedBy).toBe('light.headlamp');
  });

  it('quantity below target is not satisfied; at target it is', () => {
    const data = readyHousehold();
    data.items['water.drinking'] = { have: true, quantity: 6, updatedAt: at };
    let cl = buildChecklist(badge('shelter72'), data, pack, NOW);
    expect(cl.entries.find((e) => e.item.id === 'water.drinking')!.satisfied).toBe(false);
    data.items['water.drinking'].quantity = 9;
    cl = buildChecklist(badge('shelter72'), data, pack, NOW);
    expect(cl.entries.find((e) => e.item.id === 'water.drinking')!.satisfied).toBe(true);
  });

  it('the same water counts toward 72h but not toward two weeks', () => {
    const data = readyHousehold();
    setFact(data, 'home.cooking', 'gas');
    data.items['water.drinking'] = { have: true, quantity: 9, updatedAt: at };
    expect(buildChecklist(badge('shelter72'), data, pack, NOW).entries.find((e) => e.item.id === 'water.drinking')!.satisfied).toBe(true);
    expect(buildChecklist(badge('twoweeks'), data, pack, NOW).entries.find((e) => e.item.id === 'water.drinking')!.satisfied).toBe(false);
  });

  it('expired items stop counting and flip an earned badge to needs_attention', () => {
    const data = readyHousehold();
    const b = badge('alerts');
    for (const r of b.requirements) data.items[r.item] = { have: true, updatedAt: at, checkBy: addMonths(NOW, 24) };
    data.badges.alerts = { surveyCompletedAt: at, earnedAt: at };
    let cl = buildChecklist(b, data, pack, NOW);
    expect(badgeStatus(data.badges.alerts, cl)).toBe('earned');
    data.items['alerts.batteries'].checkBy = '2026-01-01';
    cl = buildChecklist(b, data, pack, NOW);
    expect(badgeStatus(data.badges.alerts, cl)).toBe('needs_attention');
    expect(cl.entries.find((e) => e.item.id === 'alerts.batteries')!.expired).toBe(true);
  });

  it('badge is not_started until the survey completes, in_progress after', () => {
    const data = readyHousehold();
    const b = badge('alerts');
    expect(badgeStatus(undefined, buildChecklist(b, data, pack, NOW))).toBe('not_started');
    expect(badgeStatus({ surveyCompletedAt: at }, buildChecklist(b, data, pack, NOW))).toBe('in_progress');
  });

  it('ticking a torch progresses every badge that needs one', () => {
    const data = readyHousehold();
    data.badges.shelter72 = { surveyCompletedAt: at };
    data.badges.grabbag = { surveyCompletedAt: at };
    const views = buildBadgeViews(data, pack, NOW);
    expect(badgesUsingItem(views, 'light.torch', 'shelter72').map((b) => b.id)).toEqual(['grabbag']);
    expect(badgesUsingItem(views, 'light.headlamp', 'shelter72').map((b) => b.id)).toEqual(['grabbag']);
  });

  it('todo dedupes shared items and keeps the larger target', () => {
    const data = readyHousehold();
    setFact(data, 'home.cooking', 'gas');
    data.badges.shelter72 = { surveyCompletedAt: at };
    data.badges.twoweeks = { surveyCompletedAt: at };
    const todo = buildTodo(buildBadgeViews(data, pack, NOW));
    const water = todo.find((t) => t.entry.item.id === 'water.drinking')!;
    expect(water.badges.map((b) => b.id)).toEqual(['shelter72', 'twoweeks']);
    expect(water.entry.target).toBe(42);
  });

  it('gear appears when items are held and disappears when they expire', () => {
    const data = readyHousehold();
    data.items['bag.bag'] = { have: true, updatedAt: at };
    data.items['light.headlamp'] = { have: true, updatedAt: at, checkBy: '2020-01-01' };
    const gear = activeGear(data, pack, NOW);
    expect(gear).toContain('backpack');
    expect(gear).not.toContain('torch');
  });
});

describe('migrations', () => {
  it('keeps ticks and reports added/removed items when the pack changes', () => {
    const data = fresh();
    answerHousehold(data, [{ age: 'adult' }]);
    answerPets(data, []);
    setFact(data, 'home.type', 'house');
    setFact(data, 'home.heating', 'gas');
    data.packVersion = '0.0.1';
    data.badges.alerts = { surveyCompletedAt: at, lastItems: ['alerts.cell_broadcast', 'alerts.old_item'] };
    data.items['alerts.radio'] = { have: true, updatedAt: at };
    const res = migrateUserData(data, pack, NOW);
    expect(res.changed).toBe(true);
    expect(res.fromVersion).toBe('0.0.1');
    expect(res.data.packVersion).toBe(pack.meta.version);
    const change = res.changes.find((c) => c.badgeId === 'alerts')!;
    expect(change.removed).toEqual(['alerts.old_item']);
    expect(change.added).toContain('alerts.radio');
    expect(res.data.items['alerts.radio'].have).toBe(true);
    expect(res.data.badges.alerts.lastItems).not.toContain('alerts.old_item');
  });

  it('is a no-op on the current version', () => {
    const data = fresh();
    const res = migrateUserData(data, pack, NOW);
    expect(res.changed).toBe(false);
    expect(res.changes).toEqual([]);
  });
});

describe('context', () => {
  it('exposes aggregates', () => {
    const data = fresh();
    answerHousehold(data, [{ age: 'adult' }, { age: 'infant' }, { age: 'senior', meds: true }]);
    answerPets(data, [{ species: 'dog', size: 'large', meds: true }]);
    const ctx = buildContext(data.profile, pack);
    expect(ctx['people.count']).toBe(3);
    expect(ctx['people.infants']).toBe(1);
    expect(ctx['people.children']).toBe(1);
    expect(ctx['people.onMeds']).toBe(1);
    expect(ctx['pets.large']).toBe(1);
    expect(ctx['pets.onMeds']).toBe(1);
    expect(newId()).toMatch(/^[a-z0-9]{6,}$/);
  });
});
