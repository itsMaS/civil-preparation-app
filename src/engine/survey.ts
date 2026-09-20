import { evalBool, identifiers, type Context } from './expr';
import { buildContext, isStale } from './profile';
import type { BadgeDef, ContentPack, EntityDef, EntityInstance, FactDef, Profile } from './types';

export type Step =
  | { kind: 'fact'; fact: FactDef; reason: 'missing' | 'stale' }
  | { kind: 'entityGate'; fact: FactDef; entity: EntityDef }
  | { kind: 'entityField'; fact: FactDef; entity: EntityDef; instance: EntityInstance; field: FactDef; index: number }
  | { kind: 'entityMore'; fact: FactDef; entity: EntityDef };

export interface SurveyPlan {
  /** The next thing to ask, or null when the badge has everything it needs. */
  next: Step | null;
  /** Rough count of remaining steps, for the progress bar. */
  remaining: number;
  /** Facts already known that this badge will use (for the confirm screen). */
  known: FactDef[];
  /** Entity lists already known. */
  knownEntities: { fact: FactDef; entity: EntityDef; instances: EntityInstance[] }[];
}

function indexBy<T extends { id: string }>(xs: T[]): Map<string, T> {
  return new Map(xs.map((x) => [x.id, x]));
}

/**
 * Orders fact ids so that anything referenced by a `when` expression is asked
 * before the fact that depends on it. Unknown references are ignored.
 */
export function orderFacts(ids: string[], facts: Map<string, FactDef>): string[] {
  const set = new Set(ids);
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (id: string, stack: Set<string>): void => {
    if (seen.has(id) || stack.has(id)) return;
    stack.add(id);
    const def = facts.get(id);
    if (def?.when) for (const dep of identifiers(def.when)) if (set.has(dep)) visit(dep, stack);
    stack.delete(id);
    seen.add(id);
    out.push(id);
  };
  for (const id of ids) visit(id, new Set());
  return out;
}

function instanceContext(ctx: Context, instance: EntityInstance): Context {
  const c: Context = { ...ctx };
  for (const [k, rec] of Object.entries(instance.fields)) {
    const v = rec.value;
    c[`this.${k}`] = Array.isArray(v) ? v.join(',') : v;
  }
  return c;
}

export function planSurvey(badge: BadgeDef, profile: Profile, pack: ContentPack, now = new Date()): SurveyPlan {
  const facts = indexBy(pack.facts);
  const entities = indexBy(pack.entities);
  const ctx = buildContext(profile, pack);
  const steps: Step[] = [];
  const known: FactDef[] = [];
  const knownEntities: SurveyPlan['knownEntities'] = [];

  for (const id of orderFacts(badge.requiredFacts, facts)) {
    const def = facts.get(id);
    if (!def) throw new Error(`Badge ${badge.id} requires unknown fact ${id}`);
    if (def.when && !evalBool(def.when, ctx)) continue;

    if (def.kind === 'entityList') {
      const entity = entities.get(def.entity ?? '');
      if (!entity) throw new Error(`Fact ${id} references unknown entity ${def.entity}`);
      const instances = profile.entities[entity.id] ?? [];
      const done = profile.listsDone[id] === true;
      const min = def.minInstances ?? 0;

      if (instances.length < min) {
        // Instances below the minimum are created by the UI without a gate; ask fields once they exist.
        steps.push({ kind: 'entityGate', fact: def, entity });
        continue;
      }
      if (instances.length === 0 && !done) {
        steps.push({ kind: 'entityGate', fact: def, entity });
        continue;
      }
      let complete = true;
      instances.forEach((instance, index) => {
        const ictx = instanceContext(ctx, instance);
        for (const field of entity.fields) {
          if (field.when && !evalBool(field.when, ictx)) continue;
          const rec = instance.fields[field.id];
          if (!rec || isStale(rec, field.volatileMonths, now)) {
            complete = false;
            steps.push({ kind: 'entityField', fact: def, entity, instance, field, index });
          }
        }
      });
      if (!done && complete) steps.push({ kind: 'entityMore', fact: def, entity });
      if (done && complete) knownEntities.push({ fact: def, entity, instances });
      continue;
    }

    const rec = profile.facts[id];
    if (!rec) steps.push({ kind: 'fact', fact: def, reason: 'missing' });
    else if (isStale(rec, def.volatileMonths, now)) steps.push({ kind: 'fact', fact: def, reason: 'stale' });
    else known.push(def);
  }

  return { next: steps[0] ?? null, remaining: steps.length, known, knownEntities };
}

/** Number of questions a badge would ask a brand-new user (for "~N questions" hints). */
export function estimateQuestions(badge: BadgeDef, pack: ContentPack): number {
  const facts = indexBy(pack.facts);
  const entities = indexBy(pack.entities);
  let n = 0;
  for (const id of badge.requiredFacts) {
    const def = facts.get(id);
    if (!def) continue;
    if (def.kind === 'entityList') {
      const e = entities.get(def.entity ?? '');
      n += 1 + (e ? Math.min(e.fields.length, 3) : 0);
    } else n += 1;
  }
  return n;
}
