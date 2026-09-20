/**
 * Content pack schema (what authors write) and user data schema (what the app stores).
 * See docs/CONTENT.md for the authoring guide.
 */

export type Locale = 'en' | 'lt';
export type LString = Record<Locale, string>;

export type FactKind = 'single' | 'multi' | 'number' | 'boolean' | 'text' | 'entityList';
export type FactGroup = 'household' | 'pets' | 'home' | 'vehicles' | 'health' | 'plan' | 'info';

export interface FactOption {
  value: string;
  label: LString;
  help?: LString;
}

export interface FactDef {
  id: string;
  kind: FactKind;
  group: FactGroup;
  question: LString;
  help?: LString;
  options?: FactOption[];
  min?: number;
  max?: number;
  unit?: LString;
  placeholder?: LString;
  /** Only ask when this expression is truthy (evaluated against the profile context). */
  when?: string;
  /** Re-confirm after this many months (life changes). */
  volatileMonths?: number;
  /** Cannot be skipped when a badge lists it in requiredFacts. */
  critical?: boolean;
  /** Assumed value when skipped. */
  default?: string | number | boolean | string[];
  /** entityList only: which entity type this list holds. */
  entity?: string;
  /** entityList only: the yes/no question that starts the list ("Do you have pets?"). */
  gate?: LString;
  /** entityList only: prompt for adding more ("Add another pet?"). */
  more?: LString;
  /** entityList only: instances created without asking the gate (1 for household: "you"). */
  minInstances?: number;
  sensitive?: boolean;
}

export interface EntityDef {
  id: string;
  label: LString;
  labelPlural: LString;
  /** Fields asked per instance. Field ids are local ("name", "species"). */
  fields: FactDef[];
  /** Field used as the display name of an instance. */
  nameField?: string;
  /** Avatar cast layer: 'person' | 'pet' | none. */
  cast?: 'person' | 'pet';
}

export type ItemType = 'acquire' | 'knowledge' | 'action' | 'maintain';

export interface BuyInfo {
  /** Generic search term users can paste into any shop. */
  search: LString;
  /** Optional per-country links. `affiliate: true` triggers the disclosure line. Unused in v1. */
  links?: { country: string; label: string; url: string; affiliate?: boolean }[];
}

export interface ItemDef {
  id: string;
  type: ItemType;
  name: LString;
  /** One line: the stakes, plainly. */
  why: LString;
  /** Optional how-to paragraph. */
  how?: LString;
  source?: { id: string; section?: string };
  /** Unit for quantity items (e.g. litres). Omit for boolean items. */
  unit?: LString;
  /** Default "check by" horizon in months when the user ticks without a date. */
  checkByMonths?: number;
  /** Other item ids that satisfy this one. */
  substitutes?: string[];
  /** Avatar gear layer id shown when satisfied. */
  gear?: string;
  /** Action items that save a fact into the profile (e.g. plan.shelter). */
  factTarget?: string;
  /** For cast coverage: which entity type this item protects. */
  covers?: string;
  buy?: BuyInfo;
  tags?: string[];
}

export interface Requirement {
  item: string;
  /** Include only when truthy. */
  when?: string;
  /** Target quantity expression, in the item's unit. */
  quantity?: string;
  /** Optional items count toward "depth" but not toward earning. */
  optional?: boolean;
  note?: LString;
}

export interface BadgeDef {
  id: string;
  order: number;
  status: 'live' | 'stub';
  name: LString;
  tagline: LString;
  description: LString;
  icon: string;
  /** Soft gate: shown as "recommended after" but never blocks. */
  recommendedAfter?: string[];
  requiredFacts: string[];
  requirements: Requirement[];
  /** Environment layer contribution when earned. */
  environment?: string;
}

export interface ScenarioDef {
  id: string;
  order: number;
  title: LString;
  icon: string;
  steps: LString[];
  source?: { id: string; section?: string };
}

export interface SourceDef {
  id: string;
  name: string;
  org: string;
  url: string;
  retrieved: string;
  note?: string;
}

export interface PackMeta {
  id: string;
  version: string;
  /** Localised "what's new" lines shown after an update. */
  notes: LString[];
  /** Overlay packs name the pack they extend. */
  extends?: string;
}

export interface EmergencyNumber {
  label: LString;
  number: string;
}

export interface ContentPack {
  meta: PackMeta;
  facts: FactDef[];
  entities: EntityDef[];
  items: ItemDef[];
  badges: BadgeDef[];
  scenarios: ScenarioDef[];
  sources: SourceDef[];
  emergencyNumbers: EmergencyNumber[];
}

/** Overlay packs may provide partial lists; entries merge by id. */
export type ContentOverlay = { meta: PackMeta } & Partial<Omit<ContentPack, 'meta'>>;

// ---------------------------------------------------------------------------
// User data (local only)
// ---------------------------------------------------------------------------

export type FactValue = string | number | boolean | string[] | null;

export interface FactRecord {
  value: FactValue;
  answeredAt: string; // ISO
  /** true when the value came from a default because the user skipped. */
  assumed?: boolean;
}

export interface EntityInstance {
  id: string;
  fields: Record<string, FactRecord>;
}

export interface AvatarLook {
  skin: string;
  hair: string;
  body: string;
}

export interface Profile {
  facts: Record<string, FactRecord>;
  entities: Record<string, EntityInstance[]>;
  /** entityList facts marked complete ("no more pets"). */
  listsDone: Record<string, boolean>;
  avatar: AvatarLook;
  locale: Locale;
  theme: 'dark' | 'light';
}

export interface ItemState {
  have: boolean;
  quantity?: number;
  /** ISO date; the item should be re-checked after this. */
  checkBy?: string;
  updatedAt: string;
  /** Free-text "I have something else" note. */
  note?: string;
}

export interface BadgeProgress {
  surveyCompletedAt?: string;
  earnedAt?: string;
  /** Snapshot of required item ids at last computation, for change diffs. */
  lastItems?: string[];
}

export interface UserData {
  schemaVersion: number;
  packVersion: string;
  createdAt: string;
  onboarded: boolean;
  profile: Profile;
  items: Record<string, ItemState>;
  badges: Record<string, BadgeProgress>;
  milestones: string[];
  lastSeenNotesVersion?: string;
}
