import { applyOverlay } from '@/engine/content';
import type { ContentOverlay, ContentPack } from '@/engine/types';
import coreMeta from '@content/core/pack.json';
import facts from '@content/core/facts.json';
import entities from '@content/core/entities.json';
import items from '@content/core/items.json';
import scenarios from '@content/core/scenarios.json';
import sources from '@content/core/sources.json';
import numbers from '@content/core/numbers.json';
import alerts from '@content/core/badges/alerts.json';
import shelter72 from '@content/core/badges/shelter72.json';
import grabbag from '@content/core/badges/grabbag.json';
import air from '@content/core/badges/air.json';
import outage from '@content/core/badges/outage.json';
import nuclear from '@content/core/badges/nuclear.json';
import plan from '@content/core/badges/plan.json';
import twoweeks from '@content/core/badges/twoweeks.json';
import ltOverlay from '@content/lt/overlay.json';

export const corePack: ContentPack = {
  meta: coreMeta as ContentPack['meta'],
  facts: facts as ContentPack['facts'],
  entities: entities as ContentPack['entities'],
  items: items as ContentPack['items'],
  badges: [alerts, shelter72, grabbag, air, outage, nuclear, plan, twoweeks] as ContentPack['badges'],
  scenarios: scenarios as ContentPack['scenarios'],
  sources: sources as ContentPack['sources'],
  emergencyNumbers: numbers as ContentPack['emergencyNumbers'],
};

const overlays: Record<string, ContentOverlay> = {
  lt: ltOverlay as ContentOverlay,
};

/** The pack served to users. Country is a build-time choice for now. */
export const COUNTRY = 'lt';
export const pack: ContentPack = applyOverlay(corePack, overlays[COUNTRY]);
export const allOverlays = overlays;
