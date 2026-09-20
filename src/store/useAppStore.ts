import { create } from 'zustand';
import { pack } from '@/content';
import { buildBadgeViews } from '@/engine/checklist';
import { emptyUserData, migrateUserData, type MigrationResult } from '@/engine/migrate';
import { newId } from '@/engine/profile';
import type { EntityInstance, FactValue, ItemState, Locale, UserData } from '@/engine/types';
import { createRepository, type Repository } from '@/data/repository';

export interface Toast { id: number; text: string; kind?: 'info' | 'success' }

interface AppState {
  data: UserData | null;
  ready: boolean;
  migration: MigrationResult | null;
  celebration: string | null;
  toasts: Toast[];

  load(): Promise<void>;
  update(fn: (d: UserData) => void): void;

  setFact(id: string, value: FactValue, assumed?: boolean): void;
  clearFact(id: string): void;
  addEntity(type: string): EntityInstance;
  setEntityField(type: string, instanceId: string, fieldId: string, value: FactValue): void;
  removeEntity(type: string, instanceId: string): void;
  setListDone(factId: string, done: boolean): void;

  setItem(itemId: string, patch: Partial<ItemState>): void;
  completeSurvey(badgeId: string): void;

  setLocale(locale: Locale): void;
  setTheme(theme: 'dark' | 'light'): void;
  setOnboarded(): void;
  dismissMigration(): void;
  dismissCelebration(): void;
  pushToast(text: string, kind?: Toast['kind']): void;
  popToast(id: number): void;

  exportJson(): string;
  importJson(json: string): void;
  resetAll(): Promise<void>;
}

const repo: Repository = createRepository();
let toastSeq = 0;

function clone<T>(x: T): T {
  return typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x));
}

/** Detects newly earned badges and records milestones. Returns a celebration id, if any. */
function settleBadges(data: UserData): string | null {
  const now = new Date();
  let celebrate: string | null = null;
  const views = buildBadgeViews(data, pack, now);
  for (const v of views) {
    const p = data.badges[v.badge.id];
    if (!p?.surveyCompletedAt) continue;
    if (v.checklist.allCoreSatisfied && !p.earnedAt) {
      p.earnedAt = now.toISOString();
      const m = `badge:${v.badge.id}`;
      if (!data.milestones.includes(m)) { data.milestones.push(m); celebrate = m; }
    }
  }
  const anyItem = Object.values(data.items).some((s) => s.have);
  if (anyItem && !data.milestones.includes('first_item')) { data.milestones.push('first_item'); celebrate ??= 'first_item'; }
  const liveIds = pack.badges.filter((b) => b.status === 'live').map((b) => b.id);
  if (liveIds.every((id) => data.badges[id]?.earnedAt) && !data.milestones.includes('all_live')) {
    data.milestones.push('all_live'); celebrate = 'all_live';
  }
  return celebrate;
}

export const useAppStore = create<AppState>((set, get) => ({
  data: null,
  ready: false,
  migration: null,
  celebration: null,
  toasts: [],

  async load() {
    const stored = await repo.load();
    const browserLocale: Locale = navigator.language?.toLowerCase().startsWith('lt') ? 'lt' : 'en';
    if (!stored) {
      const data = emptyUserData(pack, browserLocale);
      await repo.save(data);
      set({ data, ready: true });
      return;
    }
    const result = migrateUserData(stored, pack);
    if (result.changed) await repo.save(result.data);
    set({ data: result.data, ready: true, migration: result.packChanged ? result : null });
  },

  update(fn) {
    const cur = get().data;
    if (!cur) return;
    const next = clone(cur);
    fn(next);
    const celebrate = settleBadges(next);
    set({ data: next, ...(celebrate ? { celebration: celebrate } : {}) });
    void repo.save(next);
  },

  setFact(id, value, assumed) {
    get().update((d) => { d.profile.facts[id] = { value, answeredAt: new Date().toISOString(), ...(assumed ? { assumed } : {}) }; });
  },
  clearFact(id) {
    get().update((d) => { delete d.profile.facts[id]; });
  },
  addEntity(type) {
    const inst: EntityInstance = { id: newId(), fields: {} };
    get().update((d) => { (d.profile.entities[type] ??= []).push(inst); });
    return inst;
  },
  setEntityField(type, instanceId, fieldId, value) {
    get().update((d) => {
      const inst = d.profile.entities[type]?.find((e) => e.id === instanceId);
      if (inst) inst.fields[fieldId] = { value, answeredAt: new Date().toISOString() };
    });
  },
  removeEntity(type, instanceId) {
    get().update((d) => { d.profile.entities[type] = (d.profile.entities[type] ?? []).filter((e) => e.id !== instanceId); });
  },
  setListDone(factId, done) {
    get().update((d) => { d.profile.listsDone[factId] = done; });
  },

  setItem(itemId, patch) {
    get().update((d) => {
      const prev = d.items[itemId] ?? { have: false, updatedAt: '' };
      d.items[itemId] = { ...prev, ...patch, updatedAt: new Date().toISOString() };
    });
  },
  completeSurvey(badgeId) {
    get().update((d) => {
      const p = d.badges[badgeId] ?? {};
      p.surveyCompletedAt ??= new Date().toISOString();
      d.badges[badgeId] = p;
    });
  },

  setLocale(locale) { get().update((d) => { d.profile.locale = locale; }); },
  setTheme(theme) { get().update((d) => { d.profile.theme = theme; }); },
  setOnboarded() { get().update((d) => { d.onboarded = true; }); },
  dismissMigration() { set({ migration: null }); },
  dismissCelebration() { set({ celebration: null }); },
  pushToast(text, kind) {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => get().popToast(id), 3500);
  },
  popToast(id) { set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })); },

  exportJson() {
    return JSON.stringify({ app: 'civil-resilience', exportedAt: new Date().toISOString(), data: get().data }, null, 2);
  },
  importJson(json) {
    const parsed = JSON.parse(json) as { app?: string; data?: UserData };
    if (parsed.app !== 'civil-resilience' || !parsed.data?.profile) throw new Error('Not a backup from this app');
    const result = migrateUserData(parsed.data, pack);
    set({ data: result.data });
    void repo.save(result.data);
  },
  async resetAll() {
    await repo.clear();
    const data = emptyUserData(pack, get().data?.profile.locale ?? 'lt');
    await repo.save(data);
    set({ data, migration: null, celebration: null });
  },
}));
