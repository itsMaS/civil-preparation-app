import type { ContentOverlay, ContentPack } from './types';

function mergeById<T extends { id: string }>(base: T[], overlay: T[] | undefined): T[] {
  if (!overlay) return base;
  const map = new Map(base.map((x) => [x.id, x]));
  for (const o of overlay) map.set(o.id, o);
  return [...map.values()];
}

/**
 * Applies a country overlay on top of the core pack. Entries merge by id
 * (overlay wins, new ids are appended). The overlay's meta becomes the pack meta.
 */
export function applyOverlay(core: ContentPack, overlay: ContentOverlay): ContentPack {
  return {
    meta: { ...overlay.meta, notes: [...(overlay.meta.notes ?? []), ...core.meta.notes] },
    facts: mergeById(core.facts, overlay.facts),
    entities: mergeById(core.entities, overlay.entities),
    items: mergeById(core.items, overlay.items),
    badges: mergeById(core.badges, overlay.badges),
    scenarios: mergeById(core.scenarios, overlay.scenarios),
    sources: mergeById(core.sources, overlay.sources),
    emergencyNumbers: overlay.emergencyNumbers ?? core.emergencyNumbers,
  };
}
