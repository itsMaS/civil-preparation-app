import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pack } from '@/content';
import { identifiers } from '@/engine/expr';
import type { EntityDef, EntityInstance, FactDef, FactGroup } from '@/engine/types';
import { useDerived } from '@/hooks/useDerived';
import { formatDate, useL } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { FactInput, factValueLabel } from '@/components/FactInput';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/Layout';
import { Sheet } from '@/components/Sheet';

const GROUPS: FactGroup[] = ['household', 'pets', 'vehicles', 'home', 'health', 'plan', 'info'];

/** Which badges use a fact: listed in requiredFacts, or referenced by a requirement expression, or set by an action item. */
function badgesUsingFact(factId: string) {
  return pack.badges.filter((b) => {
    if (b.requiredFacts.includes(factId)) return true;
    for (const r of b.requirements) {
      for (const src of [r.when, r.quantity]) {
        if (src && identifiers(src).includes(factId)) return true;
      }
      const item = pack.items.find((i) => i.id === r.item);
      if (item?.factTarget === factId) return true;
    }
    return false;
  });
}

export function Profile() {
  const { t } = useTranslation();
  const L = useL();
  const d = useDerived();
  const store = useAppStore();
  const [editing, setEditing] = useState<{ fact: FactDef; entity?: EntityDef; instance?: EntityInstance } | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const locale = d.data.profile.locale;

  const factsByGroup = useMemo(() => {
    const map = new Map<FactGroup, FactDef[]>();
    for (const f of pack.facts) {
      if (f.kind === 'entityList') continue;
      (map.get(f.group) ?? map.set(f.group, []).get(map.has(f.group) ? f.group : f.group)!).push(f);
    }
    return map;
  }, []);

  const exportBackup = () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `civil-resilience-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importBackup = async (file: File) => {
    try { store.importJson(await file.text()); store.pushToast(t('profile.imported'), 'success'); }
    catch { store.pushToast(t('profile.importError')); }
  };

  const coverageItems = (type: string) => pack.items.filter((i) => i.covers === type);

  return (
    <div>
      <PageHeader title={t('profile.title')} />
      <button className="card-2 mb-4 flex w-full items-start gap-3 p-3 text-left" onClick={() => setShowPrivacy(true)}>
        <Icon name="lock" className="mt-0.5 shrink-0 text-olive" />
        <span className="flex-1 text-sm font-semibold">{t('profile.privacy')}</span>
        <Icon name="chevron" className="text-muted" />
      </button>

      {/* Entities */}
      {pack.entities.map((entity) => {
        const listFact = pack.facts.find((f) => f.kind === 'entityList' && f.entity === entity.id);
        const instances = d.data.profile.entities[entity.id] ?? [];
        const covers = coverageItems(entity.id);
        return (
          <section key={entity.id} className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="label">{L(entity.labelPlural)}</h2>
              <button className="btn btn-ghost min-h-0 gap-1 px-2 py-1 text-sm" onClick={() => { store.addEntity(entity.id); if (listFact) store.setListDone(listFact.id, true); }}>+ {t('profile.add')}</button>
            </div>
            {instances.length === 0 ? <p className="card p-3 text-sm text-muted">{t('profile.empty')}</p> : (
              <ul className="space-y-2">
                {instances.map((inst, idx) => {
                  const name = String(inst.fields[entity.nameField ?? 'name']?.value ?? '') || (entity.id === 'person' && idx === 0 ? t('survey.you') : `${L(entity.label)} ${idx + 1}`);
                  const covered = covers.length > 0 && d.cast.find((c) => c.id === inst.id)?.covered;
                  const isYou = entity.id === 'person' && idx === 0;
                  return (
                    <li key={inst.id} className="card p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold">{name}</p>
                        <div className="flex items-center gap-2">
                          {covers.length > 0 && !isYou && <span className={`chip py-0 text-[11px] ${covered ? 'text-green' : 'text-amber'}`}>{covered ? t('profile.covered') : t('profile.notCovered')}</span>}
                          {!isYou && <button className="btn btn-ghost min-h-0 p-1" aria-label={t('profile.remove')} onClick={() => store.removeEntity(entity.id, inst.id)}><Icon name="trash" size={18} /></button>}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entity.fields.map((f) => {
                          const rec = inst.fields[f.id];
                          return (
                            <button key={f.id} className="chip" onClick={() => setEditing({ fact: f, entity, instance: inst })}>
                              <span className="text-muted">{L(f.question)}</span>
                              <span className="font-semibold">{factValueLabel(f, rec?.value, L, t)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      {/* Facts by group */}
      {GROUPS.filter((g) => factsByGroup.get(g)?.length).map((group) => {
        const facts = factsByGroup.get(group)!;
        return (
          <section key={group} className="mt-5">
            <h2 className="label mb-2">{t(`profile.groups.${group}`)}</h2>
            <ul className="card divide-y divide-border">
              {facts.map((f) => {
                const rec = d.data.profile.facts[f.id];
                const users = badgesUsingFact(f.id);
                return (
                  <li key={f.id}>
                    <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setEditing({ fact: f })}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted">{L(f.question)}</p>
                        <p className="font-semibold">{factValueLabel(f, rec?.value, L, t)}{rec?.assumed && <span className="chip ml-2 py-0 text-[10px]">{t('profile.assumed')}</span>}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {users.length ? `${t('profile.usedBy')}: ${users.map((b) => L(b.name)).join(', ')}` : t('profile.notUsed')}
                          {rec && ` · ${t('profile.answeredOn', { date: formatDate(rec.answeredAt, locale) })}`}
                        </p>
                      </div>
                      <Icon name="chevron" className="shrink-0 text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* My plan */}
      <section className="mt-5">
        <h2 className="label mb-2">{t('profile.myPlan')}</h2>
        <div className="card p-4">
          <p className="mb-3 text-sm text-muted">{t('profile.myPlanHint')}</p>
          <dl className="space-y-2">
            {pack.facts.filter((f) => f.group === 'plan').map((f) => (
              <div key={f.id} className="flex gap-3"><dt className="w-2/5 shrink-0 text-sm text-muted">{L(f.question)}</dt><dd className="font-semibold">{factValueLabel(f, d.data.profile.facts[f.id]?.value, L, t)}</dd></div>
            ))}
            {pack.emergencyNumbers.map((n) => (
              <div key={n.number} className="flex gap-3"><dt className="w-2/5 shrink-0 text-sm text-muted">{L(n.label)}</dt><dd className="font-semibold">{n.number}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      {/* Settings */}
      <section className="mt-5">
        <h2 className="label mb-2">{t('profile.language')} / {t('profile.theme')}</h2>
        <div className="card flex flex-wrap gap-2 p-3">
          {(['lt', 'en'] as const).map((l) => <button key={l} className="option w-auto min-h-0 px-4 py-2" aria-pressed={locale === l} onClick={() => store.setLocale(l)}>{l === 'lt' ? 'Lietuvių' : 'English'}</button>)}
          <span className="w-2" />
          <button className="option w-auto min-h-0 px-4 py-2" aria-pressed={d.data.profile.theme === 'dark'} onClick={() => store.setTheme('dark')}>{t('profile.dark')}</button>
          <button className="option w-auto min-h-0 px-4 py-2" aria-pressed={d.data.profile.theme === 'light'} onClick={() => store.setTheme('light')}>{t('profile.light')}</button>
        </div>
      </section>

      {/* Data */}
      <section className="mt-5 space-y-2">
        <button className="btn btn-secondary w-full" onClick={exportBackup}><Icon name="download" />{t('profile.export')}</button>
        <button className="btn btn-secondary w-full" onClick={() => fileRef.current?.click()}><Icon name="upload" />{t('profile.import')}</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.target.value = ''; }} />
        <button className="btn btn-secondary w-full text-red" onClick={() => { if (confirm(t('profile.deleteConfirm'))) void store.resetAll(); }}><Icon name="trash" />{t('profile.delete')}</button>
      </section>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing ? L(editing.fact.question) : ''}>
        {editing && (
          <div>
            {editing.fact.help && <p className="mb-3 text-sm text-muted">{L(editing.fact.help)}</p>}
            {!editing.entity && badgesUsingFact(editing.fact.id).length > 0 && <p className="mb-3 text-xs text-muted">{t('profile.affects', { count: badgesUsingFact(editing.fact.id).length })}</p>}
            <FactInput
              key={editing.fact.id + (editing.instance?.id ?? '')}
              fact={editing.fact}
              value={editing.instance ? editing.instance.fields[editing.fact.id]?.value : d.data.profile.facts[editing.fact.id]?.value}
              submitLabel={t('common.save')}
              onSubmit={(v) => {
                if (editing.entity && editing.instance) store.setEntityField(editing.entity.id, editing.instance.id, editing.fact.id, v);
                else store.setFact(editing.fact.id, v);
                setEditing(null);
              }}
            />
          </div>
        )}
      </Sheet>
      <Sheet open={showPrivacy} onOpenChange={setShowPrivacy} title={t('about.privacy')}>
        <p className="leading-relaxed">{t('profile.privacyLong')}</p>
      </Sheet>
    </div>
  );
}
