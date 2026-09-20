import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/avatar/Avatar';
import { Icon } from '@/components/Icon';
import { IS_BETA } from '@/config';
import { useL } from '@/i18n';
import { useDerived } from '@/hooks/useDerived';
import { estimateQuestions, planSurvey } from '@/engine/survey';
import { pack } from '@/content';
import type { BadgeView } from '@/engine/checklist';

const STATUS_STYLE: Record<BadgeView['status'], string> = {
  not_started: 'text-muted',
  in_progress: 'text-orange',
  earned: 'text-green',
  needs_attention: 'text-amber',
};

export function Home() {
  const { t } = useTranslation();
  const L = useL();
  const d = useDerived();
  const earnedCount = d.earned.length;
  const total = d.views.length;
  const headline = earnedCount === 0 ? t('home.zero') : earnedCount === total ? t('home.all') : earnedCount / total >= 0.6 ? t('home.most') : t('home.some');
  const next = d.views.find((v) => v.badge.status === 'live' && v.status !== 'earned');

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('app.name')}</h1>
        {IS_BETA && <span className="chip text-xs">{t('app.beta')}</span>}
      </div>

      <section className="card overflow-hidden">
        <Avatar look={d.data.profile.avatar} gear={d.gear} mood={d.mood} environment={d.environment} cast={d.cast} decayed={d.decayed} />
        <div className="border-t border-border p-4">
          <p className="text-lg font-bold">{headline}</p>
          <p className="text-muted">{t('home.readiness', { earned: earnedCount, total })}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-green transition-all" style={{ width: `${(earnedCount / total) * 100}%` }} />
          </div>
        </div>
      </section>

      {d.attention.length > 0 && (
        <section className="card mt-4 border-amber/50 p-4">
          <div className="flex items-center gap-2 text-amber"><Icon name="alert" /><h2 className="font-bold">{t('home.attention')}</h2></div>
          <p className="mt-1 text-sm text-muted">{t('home.attentionHint')}</p>
          <ul className="mt-3 space-y-2">
            {d.attention.map(({ entry, badges }) => (
              <li key={entry.item.id}>
                <Link to={`/badge/${badges[0].badge.id}`} className="card-2 flex items-center gap-3 p-3">
                  <Icon name="clock" className="shrink-0 text-amber" />
                  <span className="flex-1 text-sm font-semibold">{L(entry.item.name)}</span>
                  <Icon name="chevron" className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h2 className="label mb-2">{t('home.badges')}</h2>
        <ul className="space-y-2">
          {d.views.map((v) => {
            const stub = v.badge.status === 'stub';
            const isNext = next?.badge.id === v.badge.id;
            const after = v.badge.recommendedAfter?.map((id) => pack.badges.find((b) => b.id === id)).filter(Boolean);
            const plan = v.status === 'not_started' ? planSurvey(v.badge, d.data.profile, pack) : null;
            const questions = plan ? plan.remaining : 0;
            return (
              <li key={v.badge.id}>
                <Link to={`/badge/${v.badge.id}`} className={`card flex items-center gap-3 p-3 ${isNext ? 'border-orange' : ''}`}>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${v.status === 'earned' ? 'bg-green text-black' : v.status === 'needs_attention' ? 'bg-amber text-black' : 'bg-surface-3 text-text'}`}>
                    <Icon name={v.badge.icon} size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-bold leading-tight">{L(v.badge.name)}</p>
                      {stub && <span className="chip py-0 text-[10px]">{t('home.comingSoon')}</span>}
                      {isNext && <span className="chip border-orange py-0 text-[10px] text-orange">{t('home.startHere')}</span>}
                    </div>
                    <p className={`text-xs font-semibold ${STATUS_STYLE[v.status]}`}>
                      {t(`badge.status.${v.status}`)}
                      {v.status !== 'not_started' && ` · ${t('badge.progress', { done: v.checklist.coreDone, total: v.checklist.coreTotal })}`}
                      {v.status === 'not_started' && plan && ` · ${questions === 0 ? t('badge.questionsNone') : t('badge.questions', { count: Math.max(questions, Math.min(questions, estimateQuestions(v.badge, pack))) })}`}
                    </p>
                    {v.status === 'not_started' && after && after.length > 0 && !isNext && (
                      <p className="text-xs text-muted">{t('home.recommendedAfter', { badge: after.map((b) => L(b!.name)).join(', ') })}</p>
                    )}
                  </div>
                  <Icon name="chevron" className="text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-5">
        <h2 className="label mb-2">{t('home.todo')}</h2>
        {d.todo.length === 0 ? (
          <p className="card p-4 text-sm text-muted">{t('home.todoEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {d.todo.map(({ entry, badges }) => (
              <li key={entry.item.id}>
                <Link to={`/badge/${badges[0].id}`} className="card flex items-center gap-3 p-3">
                  <span className="h-5 w-5 shrink-0 rounded-md border-2 border-border" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{L(entry.item.name)}{entry.target !== null && <span className="text-muted"> · {entry.target} {L(entry.item.unit)}</span>}</p>
                    <p className="text-xs text-muted">{t('home.forBadges', { count: badges.length })}</p>
                  </div>
                  <Icon name="chevron" className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
