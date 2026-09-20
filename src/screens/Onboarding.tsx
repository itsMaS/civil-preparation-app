import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, HAIR_STYLES, BODY_TYPES, SKIN_TONES } from '@/avatar/Avatar';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icon';
import { IS_BETA } from '@/config';

export function Onboarding() {
  const { t, i18n } = useTranslation();
  const data = useAppStore((s) => s.data)!;
  const setAvatar = useAppStore((s) => s.setAvatar);
  const setLocale = useAppStore((s) => s.setLocale);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const [step, setStep] = useState(0);
  const look = data.profile.avatar;

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
      <div className="card overflow-hidden"><Avatar look={look} gear={[]} mood="uneasy" environment="bare" /></div>
      {step === 0 ? (
        <div className="anim-rise mt-6 flex-1">
          <h1 className="text-3xl font-bold leading-tight">{t('onboarding.title')}</h1>
          <p className="mt-3 text-lg leading-relaxed">{t('onboarding.body')}</p>
          <div className="card-2 mt-5 flex gap-3 p-3 text-sm"><Icon name="lock" className="mt-0.5 shrink-0 text-olive" /><span>{t('onboarding.privacy')}</span></div>
          <button className="btn btn-primary mt-6 w-full text-lg" onClick={() => setStep(1)}>{t('onboarding.cta')}</button>
        </div>
      ) : (
        <div className="anim-rise mt-6 flex-1">
          <h1 className="text-2xl font-bold">{t('onboarding.pickLook')}</h1>
          <p className="label mt-4 mb-2">{t('profile.skin')}</p>
          <div className="flex gap-3">
            {Object.entries(SKIN_TONES).map(([k, c]) => (
              <button key={k} aria-label={k} aria-pressed={look.skin === k} onClick={() => setAvatar({ skin: k })} className={`h-11 w-11 rounded-full border-4 ${look.skin === k ? 'border-orange' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
          <p className="label mt-4 mb-2">{t('profile.hair')}</p>
          <div className="flex flex-wrap gap-2">
            {HAIR_STYLES.map((h) => <button key={h} className="option w-auto min-h-0 px-4 py-2" aria-pressed={look.hair === h} onClick={() => setAvatar({ hair: h })}>{h}</button>)}
          </div>
          <p className="label mt-4 mb-2">{t('profile.body')}</p>
          <div className="flex flex-wrap gap-2">
            {BODY_TYPES.map((b) => <button key={b} className="option w-auto min-h-0 px-4 py-2" aria-pressed={look.body === b} onClick={() => setAvatar({ body: b })}>{b}</button>)}
          </div>
          <button className="btn btn-primary mt-8 w-full text-lg" onClick={setOnboarded}>{t('onboarding.next')}</button>
        </div>
      )}
    </div>
  );
}
