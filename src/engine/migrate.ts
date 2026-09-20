import { buildChecklist } from './checklist';
import { SCHEMA_VERSION, emptyProfile } from './profile';
import type { ContentPack, UserData } from './types';

export interface BadgeChange {
  badgeId: string;
  added: string[];
  removed: string[];
}

export interface MigrationResult {
  data: UserData;
  changed: boolean;
  fromVersion: string;
  changes: BadgeChange[];
}

export function emptyUserData(pack: ContentPack, locale: 'en' | 'lt' = 'lt'): UserData {
  return {
    schemaVersion: SCHEMA_VERSION,
    packVersion: pack.meta.version,
    createdAt: new Date().toISOString(),
    onboarded: false,
    profile: emptyProfile(locale),
    items: {},
    badges: {},
    milestones: [],
  };
}

/**
 * Brings stored user data up to the current schema and content pack version.
 *
 * Content migrations are structural, not destructive: ticks survive by item id,
 * removed items simply stop being required, and every badge with a completed
 * survey gets a diff so the UI can show "what changed".
 */
export function migrateUserData(input: UserData, pack: ContentPack, now = new Date()): MigrationResult {
  let data: UserData = { ...input };
  const fromVersion = data.packVersion;

  // Schema migrations (add cases as SCHEMA_VERSION grows).
  if (data.schemaVersion < 1) data = { ...data, schemaVersion: 1 };
  if (!data.profile.listsDone) data.profile = { ...data.profile, listsDone: {} };
  if (!data.milestones) data.milestones = [];

  const changes: BadgeChange[] = [];
  const badges = { ...data.badges };
  for (const badge of pack.badges) {
    const progress = badges[badge.id];
    if (!progress?.surveyCompletedAt) continue;
    const ids = buildChecklist(badge, data, pack, now).core.map((e) => e.item.id);
    const before = progress.lastItems ?? ids;
    const added = ids.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !ids.includes(id));
    if (added.length || removed.length) changes.push({ badgeId: badge.id, added, removed });
    badges[badge.id] = { ...progress, lastItems: ids };
  }
  data.badges = badges;

  const changed = fromVersion !== pack.meta.version || data.schemaVersion !== input.schemaVersion;
  data.packVersion = pack.meta.version;
  return { data, changed, fromVersion, changes };
}
