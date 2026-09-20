import { useTranslation } from 'react-i18next';
import { Avatar } from '@/avatar/Avatar';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icon';
import { IS_BETA } from '@/config';

export function Onboarding() {
  const { t, i18n } = useTranslation();
  const setLocale = useAppStore((s) => s.setLocale);
  const setOnboarded = useAppStore((s) => s.setOnboarded);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-muted">{t('app.name')} {IS_BETA && <span className="chip ml-1 py-0 text-[10px]">{t('app.beta')}</span>}</span>
        <div className="flex gap-1">
          {(['lt', 'en'] as const).map((l) => (
            <button key={l} className={`chip min-h-0 ${i18n.language === l ? 'border-orange text-orange' : ''}`} onClick={() => setLocale(l)}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden"><Avatar gear={[]} mood="uneasy" environment="bare" interactive /></div>
      <div className="anim-rise mt-6 flex-1">
        <h1 className="text-3xl font-bold leading-tight">{t('onboarding.title')}</h1>
        <p className="mt-3 text-lg leading-relaxed">{t('onboarding.body')}</p>
        <div className="card-2 mt-5 flex gap-3 p-3 text-sm"><Icon name="lock" className="mt-0.5 shrink-0 text-olive" /><span>{t('onboarding.privacy')}</span></div>
        <button className="btn btn-primary mt-6 w-full text-lg" onClick={setOnboarded}>{t('onboarding.cta')}</button>
      </div>
    </div>
  );
}
