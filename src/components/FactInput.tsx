import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FactDef, FactValue } from '@/engine/types';
import { useL } from '@/i18n';

/**
 * Renders the input for one fact definition. Single-select answers submit on tap;
 * everything else shows a Next button. Used by the survey and the profile editor.
 */
export function FactInput({ fact, value, onSubmit, submitLabel, autoFocus }: {
  fact: FactDef;
  value?: FactValue;
  onSubmit: (v: FactValue) => void;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const L = useL();
  const [local, setLocal] = useState<FactValue>(value ?? (fact.kind === 'multi' ? [] : fact.kind === 'number' ? (fact.min ?? 0) : ''));
  const label = submitLabel ?? t('survey.next');

  if (fact.kind === 'single') {
    return (
      <div className="space-y-2">
        {fact.options?.map((o) => (
          <button key={o.value} className="option" aria-pressed={value === o.value} onClick={() => onSubmit(o.value)}>
            <span className="font-semibold">{L(o.label)}</span>
            {o.help && <span className="mt-0.5 block text-sm text-muted">{L(o.help)}</span>}
          </button>
        ))}
      </div>
    );
  }
  if (fact.kind === 'boolean') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button className="option text-center font-semibold" aria-pressed={value === true} onClick={() => onSubmit(true)}>{t('survey.yes')}</button>
        <button className="option text-center font-semibold" aria-pressed={value === false} onClick={() => onSubmit(false)}>{t('survey.no')}</button>
      </div>
    );
  }
  if (fact.kind === 'multi') {
    const arr = Array.isArray(local) ? local : [];
    const toggle = (v: string) => setLocal(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    return (
      <div className="space-y-2">
        {fact.options?.map((o) => (
          <button key={o.value} className="option" aria-pressed={arr.includes(o.value)} onClick={() => toggle(o.value)}>
            <span className="font-semibold">{L(o.label)}</span>
          </button>
        ))}
        <button className="btn btn-primary mt-2 w-full" onClick={() => onSubmit(arr)}>{label}</button>
      </div>
    );
  }
  if (fact.kind === 'number') {
    const n = typeof local === 'number' ? local : Number(local) || 0;
    const clamp = (x: number) => Math.min(fact.max ?? 999, Math.max(fact.min ?? 0, x));
    return (
      <div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary h-12 w-12 text-xl" aria-label="-" onClick={() => setLocal(clamp(n - 1))}>-</button>
          <input type="number" inputMode="numeric" className="input text-center text-xl font-bold" value={n} min={fact.min} max={fact.max} autoFocus={autoFocus} onChange={(e) => setLocal(clamp(Number(e.target.value)))} />
          <button className="btn btn-secondary h-12 w-12 text-xl" aria-label="+" onClick={() => setLocal(clamp(n + 1))}>+</button>
        </div>
        {fact.unit && <p className="mt-1 text-center text-sm text-muted">{L(fact.unit)}</p>}
        <button className="btn btn-primary mt-4 w-full" onClick={() => onSubmit(n)}>{label}</button>
      </div>
    );
  }
  // text
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(String(local ?? '').trim()); }}>
      <input className="input" value={String(local ?? '')} autoFocus={autoFocus} placeholder={L(fact.placeholder) || t('survey.textPlaceholder')} onChange={(e) => setLocal(e.target.value)} />
      <button type="submit" className="btn btn-primary mt-4 w-full" disabled={!String(local ?? '').trim()}>{label}</button>
    </form>
  );
}

export function factValueLabel(fact: FactDef, value: FactValue | undefined, L: (s: { en: string; lt: string } | undefined) => string, t: (k: string) => string): string {
  if (value === undefined || value === null || value === '') return '-';
  if (fact.kind === 'boolean') return value ? t('common.yes') : t('common.no');
  if (fact.kind === 'single') return L(fact.options?.find((o) => o.value === value)?.label) || String(value);
  if (fact.kind === 'multi' && Array.isArray(value)) return value.map((v) => L(fact.options?.find((o) => o.value === v)?.label) || v).join(', ');
  if (fact.kind === 'number') return `${value}${fact.unit ? ` ${L(fact.unit)}` : ''}`;
  return String(value);
}
