import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pack } from '@/content';
import { addMonths, badgesUsingItem, type Entry } from '@/engine/checklist';
import { planSurvey, type Step } from '@/engine/survey';
import type { FactValue } from '@/engine/types';
import { useDerived } from '@/hooks/useDerived';
import { formatDate, useL } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { FactInput, factValueLabel } from '@/components/FactInput';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/Layout';

type Mode = 'intro' | 'survey' | 'confirm' | 'checklist';

export function BadgeScreen() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const L = useL();
  const d = useDerived();
  const view = d.views.find((v) => v.badge.id === id);
  const [mode, setMode] = useState<Mode>(() => (view?.progress?.surveyCompletedAt ? 'checklist' : 'intro'));
  const [surveyStartedAt, setSurveyStartedAt] = useState<string>(() => new Date().toISOString());
  const completeSurvey = useAppStore((s) => s.completeSurvey);
  const startSurvey = () => { setSurveyStartedAt(new Date().toISOString()); setMode('survey'); };

  const plan = useMemo(() => (view ? planSurvey(view.badge, d.data.profile, pack) : null), [view, d.data.profile]);

  // Survey finished -> confirm what we know (if anything was reused), else straight to the checklist.
  useEffect(() => {
    if (mode !== 'survey' || !plan || !view) return;
    if (plan.next) return;
    // Only confirm facts that were answered before this survey began: a first badge has nothing to confirm.
    const facts = d.data.profile.facts;
    const reused = plan.known.some((f) => (facts[f.id]?.answeredAt ?? '') < surveyStartedAt)
      || plan.knownEntities.some(({ instances }) => instances.some((i) => Object.values(i.fields).some((r) => r.answeredAt < surveyStartedAt)));
    if (reused && !view.progress?.surveyCompletedAt) setMode('confirm');
    else { completeSurvey(view.badge.id); setMode('checklist'); }
  }, [mode, plan, view, completeSurvey, surveyStartedAt, d.data.profile.facts]);

  if (!view || !plan) return <p className="text-muted">Unknown badge.</p>;
  const { badge, checklist, status } = view;

  if (mode === 'intro') {
    const n = plan.remaining;
    return (
      <div>
        <PageHeader title={L(badge.name)} subtitle={L(badge.tagline)} back={() => nav('/')} />
        <p className="leading-relaxed">{L(badge.description)}</p>
        {badge.status === 'stub' && <p className="card-2 mt-3 p-3 text-sm text-muted">{t('badge.stub')}</p>}
        <p className="mt-4 text-sm text-muted">{n === 0 ? t('badge.questionsNone') : plan.known.length > 0 ? t('badge.questionsKnown', { count: n }) : t('badge.questions', { count: n })}</p>
        <button className="btn btn-primary mt-4 w-full text-lg" onClick={() => (n === 0 && plan.known.length + plan.knownEntities.length > 0 ? setMode('confirm') : startSurvey())}>{t('badge.start')}</button>
      </div>
    );
  }

  if (mode === 'survey' && plan.next) {
    return <Survey step={plan.next} remaining={plan.remaining} badgeName={L(badge.name)} onExit={() => setMode('intro')} />;
  }

  if (mode === 'confirm' || (mode === 'survey' && !plan.next)) {
    return (
      <Confirm
        plan={plan}
        badgeName={L(badge.name)}
        onFix={startSurvey}
        onOk={() => { completeSurvey(badge.id); setMode('checklist'); }}
      />
    );
  }

  const stale = plan.next !== null;
  return (
    <div>
      <PageHeader title={L(badge.name)} subtitle={L(badge.tagline)} back={() => nav('/')} />
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${status === 'earned' ? 'bg-green text-black' : status === 'needs_attention' ? 'bg-amber text-black' : 'bg-surface-3'}`}><Icon name={badge.icon} size={24} /></div>
          <div className="flex-1">
            <p className="font-bold">{t(`badge.status.${status}`)}</p>
            <p className="text-sm text-muted">{t('badge.progress', { done: checklist.coreDone, total: checklist.coreTotal })}{view.progress?.earnedAt && status === 'earned' && ` · ${t('badge.earnedOn', { date: formatDate(view.progress.earnedAt, d.data.profile.locale) })}`}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3"><div className={`h-full rounded-full transition-all ${status === 'needs_attention' ? 'bg-amber' : 'bg-green'}`} style={{ width: `${checklist.coreTotal ? (checklist.coreDone / checklist.coreTotal) * 100 : 0}%` }} /></div>
        {stale && <button className="btn btn-secondary mt-3 w-full text-sm" onClick={startSurvey}>{t('badge.continue')} · {t('survey.remaining', { count: plan.remaining })}</button>}
      </div>
      {badge.status === 'stub' && <p className="card-2 mt-3 p-3 text-sm text-muted">{t('badge.stub')}</p>}

      <h2 className="label mt-5 mb-2">{t('badge.core')}</h2>
      <ul className="space-y-2">{checklist.core.map((e) => <ItemRow key={e.item.id} entry={e} badgeId={badge.id} />)}</ul>
      {checklist.optional.length > 0 && (
        <>
          <h2 className="label mt-5 mb-2">{t('badge.optional')}</h2>
          <ul className="space-y-2">{checklist.optional.map((e) => <ItemRow key={e.item.id} entry={e} badgeId={badge.id} />)}</ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Survey
// ---------------------------------------------------------------------------
function Survey({ step, remaining, badgeName, onExit }: { step: Step; remaining: number; badgeName: string; onExit: () => void }) {
  const { t } = useTranslation();
  const L = useL();
  const store = useAppStore();
  const [n, setN] = useState(1);
  const advance = () => setN((x) => x + 1);

  // Household: the first member is created silently ("you").
  useEffect(() => {
    if (step.kind === 'entityGate' && (step.fact.minInstances ?? 0) > 0) {
      const count = store.data?.profile.entities[step.entity.id]?.length ?? 0;
      if (count < (step.fact.minInstances ?? 0)) store.addEntity(step.entity.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const header = (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <button className="btn btn-ghost -ml-2 min-h-0 gap-1 px-2 py-1" onClick={onExit}><Icon name="back" size={18} />{badgeName}</button>
        <span>{t('survey.remaining', { count: remaining })}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-orange transition-all" style={{ width: `${Math.min(95, (n / (n + remaining)) * 100)}%` }} /></div>
    </div>
  );

  if (step.kind === 'entityGate') {
    if ((step.fact.minInstances ?? 0) > 0) return <div>{header}</div>;
    return (
      <div className="anim-rise" key={`gate-${step.fact.id}`}>
        {header}
        <h2 className="text-2xl font-bold">{L(step.fact.gate)}</h2>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="option text-center font-semibold" onClick={() => { store.addEntity(step.entity.id); advance(); }}>{t('survey.yes')}</button>
          <button className="option text-center font-semibold" onClick={() => { store.setListDone(step.fact.id, true); advance(); }}>{t('survey.no')}</button>
        </div>
      </div>
    );
  }
  if (step.kind === 'entityMore') {
    return (
      <div className="anim-rise" key={`more-${step.fact.id}`}>
        {header}
        <h2 className="text-2xl font-bold">{L(step.fact.more)}</h2>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="option text-center font-semibold" onClick={() => { store.addEntity(step.entity.id); advance(); }}>{t('survey.addAnother')}</button>
          <button className="option text-center font-semibold" onClick={() => { store.setListDone(step.fact.id, true); advance(); }}>{step.entity.id === 'person' ? t('survey.thatsAll') : t('survey.thatsAllPets')}</button>
        </div>
      </div>
    );
  }
  if (step.kind === 'entityField') {
    const { field, entity, instance, index } = step;
    const isYou = entity.id === 'person' && index === 0;
    const nameVal = instance.fields[entity.nameField ?? 'name']?.value;
    const title = isYou ? t('survey.you') : (typeof nameVal === 'string' && nameVal) ? nameVal : t('survey.entityIndex', { label: L(entity.label), n: index + 1 });
    const canSkip = !field.critical;
    return (
      <div className="anim-rise" key={`${instance.id}-${field.id}`}>
        {header}
        <p className="label mb-1">{title}</p>
        <h2 className="text-2xl font-bold">{L(field.question)}</h2>
        {isYou && field.id === 'name' && <p className="mt-1 text-sm text-muted">{t('survey.firstPersonHint')}</p>}
        {field.help && <p className="mt-2 text-muted">{L(field.help)}</p>}
        {field.sensitive && <p className="mt-2 flex items-center gap-1 text-xs text-olive"><Icon name="lock" size={14} />{t('survey.sensitive')}</p>}
        <div className="mt-5">
          <FactInput key={`${instance.id}-${field.id}`} fact={field} autoFocus onSubmit={(v) => { store.setEntityField(entity.id, instance.id, field.id, v); advance(); }} />
        </div>
        <div className="mt-4 flex justify-between">
          <span className="text-xs text-muted">{!canSkip && t('survey.required')}</span>
          {canSkip && <button className="btn btn-ghost min-h-0 px-2 py-1 text-sm" onClick={() => { store.setEntityField(entity.id, instance.id, field.id, (field.default as FactValue) ?? (isYou && field.id === 'name' ? t('survey.you') : null)); advance(); }}>{t('survey.skip')}</button>}
        </div>
      </div>
    );
  }
  // plain fact
  const { fact } = step;
  const canSkip = !fact.critical;
  return (
    <div className="anim-rise" key={fact.id}>
      {header}
      <h2 className="text-2xl font-bold">{L(fact.question)}</h2>
      {fact.help && <p className="mt-2 text-muted">{L(fact.help)}</p>}
      {fact.sensitive && <p className="mt-2 flex items-center gap-1 text-xs text-olive"><Icon name="lock" size={14} />{t('survey.sensitive')}</p>}
      <div className="mt-5">
        <FactInput key={fact.id} fact={fact} autoFocus onSubmit={(v) => { store.setFact(fact.id, v); advance(); }} />
      </div>
      <div className="mt-4 flex justify-between">
        <span className="text-xs text-muted">{!canSkip && t('survey.required')}</span>
        {canSkip && <button className="btn btn-ghost min-h-0 px-2 py-1 text-sm" onClick={() => { store.setFact(fact.id, (fact.default as FactValue) ?? null, true); advance(); }}>{t('survey.skip')}</button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm what we know
// ---------------------------------------------------------------------------
function Confirm({ plan, badgeName, onFix, onOk }: { plan: ReturnType<typeof planSurvey>; badgeName: string; onFix: () => void; onOk: () => void }) {
  const { t } = useTranslation();
  const L = useL();
  const data = useAppStore((s) => s.data)!;
  const clearFact = useAppStore((s) => s.clearFact);
  return (
    <div className="anim-rise">
      <PageHeader title={badgeName} subtitle={t('survey.confirmTitle')} />
      <p className="mb-3 text-sm text-muted">{t('survey.confirmHint')}</p>
      <div className="flex flex-wrap gap-2">
        {plan.knownEntities.map(({ fact, entity, instances }) => (
          <Link key={fact.id} to="/profile" className="chip">
            <span className="font-semibold">{instances.length} {L(instances.length === 1 ? entity.label : entity.labelPlural)}</span>
            {instances.length > 0 && <span className="text-muted">· {instances.map((i) => String(i.fields[entity.nameField ?? 'name']?.value ?? '')).filter(Boolean).join(', ')}</span>}
          </Link>
        ))}
        {plan.known.map((f) => (
          <button key={f.id} className="chip" onClick={() => { clearFact(f.id); onFix(); }}>
            <span className="text-muted">{L(f.question)}</span>
            <span className="font-semibold">{factValueLabel(f, data.profile.facts[f.id]?.value, L, t)}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-primary mt-6 w-full text-lg" onClick={onOk}>{t('survey.looksRight')}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist row
// ---------------------------------------------------------------------------
function ItemRow({ entry, badgeId }: { entry: Entry; badgeId: string }) {
  const { t } = useTranslation();
  const L = useL();
  const d = useDerived();
  const setItem = useAppStore((s) => s.setItem);
  const setFact = useAppStore((s) => s.setFact);
  const pushToast = useAppStore((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const { item, state, satisfied, expired, target } = entry;
  const others = badgesUsingItem(d.views, item.id, badgeId);
  const source = item.source ? pack.sources.find((s) => s.id === item.source!.id) : undefined;
  const hasQty = !!item.unit;
  const factVal = item.factTarget ? d.data.profile.facts[item.factTarget]?.value : undefined;
  const [factText, setFactText] = useState(typeof factVal === 'string' ? factVal : '');

  const tick = () => {
    if (satisfied || state?.have) {
      setItem(item.id, { have: false, checkBy: undefined });
      return;
    }
    if (item.factTarget || hasQty) { setOpen(true); }
    const patch: Partial<typeof state> = { have: true };
    if (hasQty && target !== null && !(state?.quantity)) patch.quantity = target;
    if (item.checkByMonths) patch.checkBy = addMonths(new Date(), item.checkByMonths);
    if (!item.factTarget) {
      setItem(item.id, patch);
      if (others.length) pushToast(t('badge.alsoCountsToast', { count: others.length }), 'success');
    }
  };

  const saveFact = () => {
    if (!item.factTarget || !factText.trim()) return;
    setFact(item.factTarget, factText.trim());
    setItem(item.id, { have: true });
    if (others.length) pushToast(t('badge.alsoCountsToast', { count: others.length }), 'success');
  };

  const typeBadge = { acquire: 'bg-orange/20 text-orange', knowledge: 'bg-olive/20 text-olive', action: 'bg-amber/20 text-amber', maintain: 'bg-surface-3 text-muted' }[item.type];
  const stateClass = satisfied ? 'border-green/60' : expired ? 'border-amber/60' : '';

  return (
    <li className={`card p-3 ${stateClass}`}>
      <div className="flex items-start gap-3">
        <button onClick={tick} aria-pressed={satisfied} aria-label={L(item.name)} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${satisfied ? 'border-green bg-green text-black' : expired ? 'border-amber text-amber' : 'border-border'}`}>
          {satisfied ? <Icon name="check" size={18} /> : expired ? <Icon name="clock" size={16} /> : null}
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="flex items-center gap-2">
            <p className={`font-semibold ${satisfied ? 'text-muted line-through decoration-green/60' : ''}`}>{L(item.name)}</p>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${typeBadge}`}>{item.type}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{L(item.why)}</p>
          {target !== null && (
            <p className={`mt-1 text-xs font-semibold ${satisfied ? 'text-green' : 'text-orange'}`}>
              {t('badge.target', { qty: target, unit: L(item.unit) })}{state?.have && state.quantity !== undefined && ` · ${t('badge.youHave')} ${state.quantity}`}
            </p>
          )}
          {entry.satisfiedBy && <p className="mt-1 text-xs text-green">{t('badge.coveredBy', { item: L(pack.items.find((i) => i.id === entry.satisfiedBy)?.name) })}</p>}
          {expired && <p className="mt-1 text-xs font-semibold text-amber">{t('badge.expired')}</p>}
          {state?.checkBy && !expired && satisfied && <p className="mt-1 text-xs text-muted">{t('badge.checkBy')} {formatDate(state.checkBy, d.data.profile.locale)}</p>}
        </button>
        <Icon name="chevron" className={`mt-1 shrink-0 text-muted transition ${open ? 'rotate-90' : ''}`} />
      </div>

      {open && (
        <div className="anim-rise mt-3 space-y-3 border-t border-border pt-3">
          {item.how && <div><p className="label mb-1">{t('badge.how')}</p><p className="text-sm leading-relaxed">{L(item.how)}</p></div>}
          {hasQty && (
            <div>
              <p className="label mb-1">{t('badge.youHave')} ({L(item.unit)})</p>
              <div className="flex items-center gap-2">
                <button className="btn btn-secondary h-11 w-11" aria-label="-" onClick={() => setItem(item.id, { have: true, quantity: Math.max(0, (state?.quantity ?? 0) - 1), ...(item.checkByMonths && !state?.checkBy ? { checkBy: addMonths(new Date(), item.checkByMonths) } : {}) })}>-</button>
                <input type="number" inputMode="numeric" className="input text-center font-bold" value={state?.quantity ?? 0} min={0} onChange={(e) => setItem(item.id, { have: true, quantity: Math.max(0, Number(e.target.value) || 0), ...(item.checkByMonths && !state?.checkBy ? { checkBy: addMonths(new Date(), item.checkByMonths) } : {}) })} />
                <button className="btn btn-secondary h-11 w-11" aria-label="+" onClick={() => setItem(item.id, { have: true, quantity: (state?.quantity ?? 0) + 1, ...(item.checkByMonths && !state?.checkBy ? { checkBy: addMonths(new Date(), item.checkByMonths) } : {}) })}>+</button>
              </div>
              <p className="mt-1 text-xs text-muted">{t('badge.quantityHint')}</p>
            </div>
          )}
          {item.factTarget && (
            <div>
              <p className="label mb-1">{L(pack.facts.find((f) => f.id === item.factTarget)?.question)}</p>
              <div className="flex gap-2">
                <input className="input" value={factText} placeholder={L(pack.facts.find((f) => f.id === item.factTarget)?.placeholder)} onChange={(e) => setFactText(e.target.value)} />
                <button className="btn btn-primary" onClick={saveFact} disabled={!factText.trim()}>{t('badge.saveFact')}</button>
              </div>
            </div>
          )}
          {item.checkByMonths && (state?.have || satisfied) && (
            <div>
              <p className="label mb-1">{t('badge.checkBy')}</p>
              <input type="date" className="input" value={state?.checkBy ?? ''} onChange={(e) => setItem(item.id, { checkBy: e.target.value || undefined })} />
            </div>
          )}
          {others.length > 0 && <p className="text-xs text-muted">{t('badge.alsoCounts', { badges: others.map((b) => L(b.name)).join(', ') })}</p>}
          {source && (
            <a href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-olive">
              <Icon name="external" size={14} />{t('badge.source')}: {source.org}{item.source?.section ? ` · ${item.source.section}` : ''}
            </a>
          )}
        </div>
      )}
    </li>
  );
}
