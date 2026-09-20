import { evalBool, evalNumber } from './expr';
import { buildContext } from './profile';
import type { BadgeDef, BadgeProgress, ContentPack, ItemDef, ItemState, Requirement, UserData } from './types';

export type BadgeStatus = 'not_started' | 'in_progress' | 'earned' | 'needs_attention';

export interface Entry {
  item: ItemDef;
  requirement: Requirement;
  /** Target quantity in item.unit, or null for boolean items. */
  target: number | null;
  /** True when the quantity formula could not be computed (missing fact). */
  unknownTarget: boolean;
  state: ItemState | undefined;
  satisfied: boolean;
  /** Item id that satisfied this entry, when a substitute did. */
  satisfiedBy?: string;
  /** Item is ticked but past its check-by date. */
  expired: boolean;
}

export interface Checklist {
  badge: BadgeDef;
  entries: Entry[];
  core: Entry[];
  optional: Entry[];
  coreDone: number;
  coreTotal: number;
  optionalDone: number;
  allCoreSatisfied: boolean;
}

export function isExpired(state: ItemState | undefined, now: Date): boolean {
  return !!state?.checkBy && new Date(state.checkBy).getTime() < now.getTime();
}

function stateSatisfies(state: ItemState | undefined, target: number | null, now: Date): boolean {
  if (!state?.have) return false;
  if (isExpired(state, now)) return false;
  if (target !== null && (state.quantity ?? 0) < target) return false;
  return true;
}

export function checkSatisfied(
  itemId: string,
  target: number | null,
  items: Record<string, ItemState>,
  pack: ContentPack,
  now: Date,
): { satisfied: boolean; by?: string; expired: boolean } {
  const own = items[itemId];
  if (stateSatisfies(own, target, now)) return { satisfied: true, expired: false };
  const def = pack.items.find((i) => i.id === itemId);
  for (const sub of def?.substitutes ?? []) {
    if (stateSatisfies(items[sub], target, now)) return { satisfied: true, by: sub, expired: false };
  }
  return { satisfied: false, expired: isExpired(own, now) && !!own?.have };
}

export function buildChecklist(badge: BadgeDef, data: UserData, pack: ContentPack, now = new Date()): Checklist {
  const ctx = buildContext(data.profile, pack);
  const itemDefs = new Map(pack.items.map((i) => [i.id, i]));
  const entries: Entry[] = [];

  for (const req of badge.requirements) {
    if (req.when && !evalBool(req.when, ctx)) continue;
    const item = itemDefs.get(req.item);
    if (!item) throw new Error(`Badge ${badge.id} references unknown item ${req.item}`);
    let target: number | null = null;
    let unknownTarget = false;
    if (req.quantity) {
      const q = evalNumber(req.quantity, ctx);
      if (q === null) unknownTarget = true;
      else target = Math.ceil(q);
    }
    const s = checkSatisfied(item.id, target, data.items, pack, now);
    entries.push({
      item, requirement: req, target, unknownTarget,
      state: data.items[item.id], satisfied: s.satisfied, satisfiedBy: s.by, expired: s.expired,
    });
  }

  const core = entries.filter((e) => !e.requirement.optional);
  const optional = entries.filter((e) => e.requirement.optional);
  const coreDone = core.filter((e) => e.satisfied).length;
  return {
    badge, entries, core, optional, coreDone, coreTotal: core.length,
    optionalDone: optional.filter((e) => e.satisfied).length,
    allCoreSatisfied: core.length > 0 && coreDone === core.length,
  };
}

export function badgeStatus(progress: BadgeProgress | undefined, checklist: Checklist): BadgeStatus {
  if (!progress?.surveyCompletedAt) return 'not_started';
  if (checklist.allCoreSatisfied) return 'earned';
  if (progress.earnedAt) return 'needs_attention';
  return 'in_progress';
}

export interface BadgeView {
  badge: BadgeDef;
  checklist: Checklist;
  status: BadgeStatus;
  progress: BadgeProgress | undefined;
}

export function buildBadgeViews(data: UserData, pack: ContentPack, now = new Date()): BadgeView[] {
  return [...pack.badges]
    .sort((a, b) => a.order - b.order)
    .map((badge) => {
      const checklist = buildChecklist(badge, data, pack, now);
      const progress = data.badges[badge.id];
      return { badge, checklist, status: badgeStatus(progress, checklist), progress };
    });
}

/** Aggregated to-do across every badge whose survey is complete. Deduped by item id. */
export function buildTodo(views: BadgeView[]): { entry: Entry; badges: BadgeDef[] }[] {
  const map = new Map<string, { entry: Entry; badges: BadgeDef[] }>();
  for (const v of views) {
    if (v.status === 'not_started') continue;
    for (const e of v.checklist.core) {
      if (e.satisfied) continue;
      const hit = map.get(e.item.id);
      if (hit) {
        hit.badges.push(v.badge);
        // Keep the larger target so one tick clears every badge.
        if ((e.target ?? 0) > (hit.entry.target ?? 0)) hit.entry = e;
      } else map.set(e.item.id, { entry: e, badges: [v.badge] });
    }
  }
  return [...map.values()];
}

/** Gear layer ids currently visible on the avatar. Gear needs "have" and not expired. */
export function activeGear(data: UserData, pack: ContentPack, now = new Date()): string[] {
  const gear = new Set<string>();
  for (const item of pack.items) {
    if (!item.gear) continue;
    const s = checkSatisfied(item.id, null, data.items, pack, now);
    if (s.satisfied) gear.add(item.gear);
  }
  return [...gear];
}

/** Coverage of household members and pets for the avatar cast. */
export function castCoverage(data: UserData, pack: ContentPack, now = new Date()): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const type of ['person', 'pet'] as const) {
    const items = pack.items.filter((i) => i.covers === type);
    out[type] = items.length > 0 && items.every((i) => checkSatisfied(i.id, null, data.items, pack, now).satisfied);
  }
  return out;
}

/**
 * Other badges (with a completed survey) that a single item tick also progressed.
 * Used for the "this also counts toward N badges" toast.
 */
export function badgesUsingItem(views: BadgeView[], itemId: string, exceptBadge?: string): BadgeDef[] {
  return views
    .filter((v) => v.status !== 'not_started' && v.badge.id !== exceptBadge)
    .filter((v) => v.checklist.core.some((e) => e.item.id === itemId || e.item.substitutes?.includes(itemId)))
    .map((v) => v.badge);
}

/** Adds months to a date and returns an ISO date (YYYY-MM-DD). */
export function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
