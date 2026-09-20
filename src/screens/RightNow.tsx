import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pack } from '@/content';
import { useDerived } from '@/hooks/useDerived';
import { useL } from '@/i18n';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/Layout';
import { factValueLabel } from '@/components/FactInput';

/** Offline "something is happening" page: big buttons, numbered steps, your saved plan facts. */
export function RightNow() {
  const { t } = useTranslation();
  const L = useL();
  const d = useDerived();
  const [openId, setOpenId] = useState<string | null>(null);
  const scenarios = [...pack.scenarios].sort((a, b) => a.order - b.order);
  const planFacts = pack.facts.filter((f) => f.group === 'plan' && d.data.profile.facts[f.id]?.value);

  return (
    <div>
      <PageHeader title={t('now.title')} subtitle={t('now.subtitle')} />
      <p className="mb-3 flex items-center gap-1 text-xs text-olive"><Icon name="check" size={14} />{t('now.offline')}</p>
      <ul className="space-y-2">
        {scenarios.map((s) => {
          const open = openId === s.id;
          return (
            <li key={s.id} className={`card overflow-hidden ${open ? 'border-orange' : ''}`}>
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange text-black"><Icon name={s.icon} size={26} /></div>
                <span className="flex-1 text-lg font-bold">{L(s.title)}</span>
                <Icon name="chevron" className={`text-muted transition ${open ? 'rotate-90' : ''}`} />
              </button>
              {open && (
                <ol className="anim-rise space-y-3 border-t border-border p-4">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-base font-bold">{i + 1}</span>
                      <p className="text-lg leading-snug">{L(step)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="label mt-6 mb-2">{t('now.numbers')}</h2>
      <ul className="space-y-2">
        {pack.emergencyNumbers.map((n) => (
          <li key={n.number}>
            <a href={`tel:${n.number}`} className="card flex items-center gap-3 p-4">
              <Icon name="phone" className="text-green" />
              <span className="flex-1 font-semibold">{L(n.label)}</span>
              <span className="text-2xl font-bold">{n.number}</span>
            </a>
          </li>
        ))}
      </ul>

      <h2 className="label mt-6 mb-2">{t('now.yourInfo')}</h2>
      {planFacts.length === 0 ? <p className="card p-4 text-sm text-muted">{t('now.noInfo')}</p> : (
        <dl className="card divide-y divide-border">
          {planFacts.map((f) => (
            <div key={f.id} className="p-3"><dt className="text-xs text-muted">{L(f.question)}</dt><dd className="text-lg font-semibold">{factValueLabel(f, d.data.profile.facts[f.id]?.value, L, t)}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}
