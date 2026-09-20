import { useTranslation } from 'react-i18next';
import { pack } from '@/content';
import { useL } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from './Icon';

const COLORS = ['var(--orange)', 'var(--olive)', 'var(--amber)', 'var(--green)', '#6fa8dc'];

export function Celebration() {
  const { t } = useTranslation();
  const L = useL();
  const id = useAppStore((s) => s.celebration);
  const dismiss = useAppStore((s) => s.dismissCelebration);
  if (!id) return null;
  const badge = id.startsWith('badge:') ? pack.badges.find((b) => b.id === id.slice(6)) : undefined;
  const title = badge ? t('celebrate.badge') : t(`celebrate.${id}`);
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6" onClick={dismiss} role="dialog" aria-modal="true" aria-label={title}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {pieces.map((i) => (
          <span key={i} className="absolute top-0 block h-3 w-2 rounded-sm" style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animation: `confetti ${2.2 + (i % 5) * 0.4}s linear ${(i % 7) * 0.15}s both` }} />
        ))}
      </div>
      <div className="card anim-pop w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green text-black"><Icon name={badge?.icon ?? 'sparkle'} size={32} /></div>
        <h2 className="text-xl font-bold">{title}</h2>
        {badge && <p className="mt-1 text-lg">{L(badge.name)}</p>}
        <button className="btn btn-primary mt-5 w-full" onClick={dismiss}>{t('celebrate.close')}</button>
      </div>
    </div>
  );
}
