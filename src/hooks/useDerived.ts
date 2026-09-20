import { useMemo } from 'react';
import { pack } from '@/content';
import { activeGear, buildBadgeViews, buildTodo, castCoverage, type BadgeView, type Entry } from '@/engine/checklist';
import type { UserData } from '@/engine/types';
import { environmentFor, moodFor, type CastMember, type Environment, type Mood } from '@/avatar/Avatar';
import { useAppStore } from '@/store/useAppStore';

export interface Derived {
  data: UserData;
  views: BadgeView[];
  earned: BadgeView[];
  live: BadgeView[];
  todo: ReturnType<typeof buildTodo>;
  attention: { entry: Entry; badges: BadgeView[] }[];
  gear: string[];
  cast: CastMember[];
  mood: Mood;
  environment: Environment;
  decayed: boolean;
}

/** Everything the UI derives from user data + content, memoised on the data object. */
export function useDerived(): Derived {
  const data = useAppStore((s) => s.data);
  if (!data) throw new Error('useDerived before load');
  return useMemo(() => {
    const now = new Date();
    const views = buildBadgeViews(data, pack, now);
    const earned = views.filter((v) => v.status === 'earned');
    const live = views.filter((v) => v.badge.status === 'live');
    const decayed = views.some((v) => v.status === 'needs_attention');
    const todo = buildTodo(views);
    const attentionMap = new Map<string, { entry: Entry; badges: BadgeView[] }>();
    for (const v of views) {
      if (v.status !== 'needs_attention') continue;
      for (const e of v.checklist.core) {
        if (e.satisfied) continue;
        const hit = attentionMap.get(e.item.id);
        if (hit) hit.badges.push(v);
        else attentionMap.set(e.item.id, { entry: e, badges: [v] });
      }
    }
    const coverage = castCoverage(data, pack, now);
    const people = data.profile.entities.person ?? [];
    const pets = data.profile.entities.pet ?? [];
    const cast: CastMember[] = [
      // The first person is the user; the avatar itself represents them.
      ...people.slice(1).map((p) => ({ id: p.id, kind: 'person' as const, variant: String(p.fields.age?.value ?? 'adult'), covered: coverage.person, name: String(p.fields.name?.value ?? '') })),
      ...pets.map((p) => ({ id: p.id, kind: 'pet' as const, variant: String(p.fields.species?.value ?? 'other'), covered: coverage.pet, name: String(p.fields.name?.value ?? '') })),
    ];
    return {
      data, views, earned, live, todo,
      attention: [...attentionMap.values()],
      gear: activeGear(data, pack, now),
      cast,
      mood: moodFor(earned.length, views.length, decayed),
      environment: environmentFor(earned.map((v) => v.badge.id)),
      decayed,
    };
  }, [data]);
}
