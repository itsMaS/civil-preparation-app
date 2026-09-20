import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { useInstallPrompt, type InstallMethod } from './useInstallPrompt';

/** Why install, plus the button or the instructions for this browser. */
function InstallBody({ method, onInstall, onLater }: { method: InstallMethod; onInstall: () => void; onLater?: () => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-muted">{t('install.body')}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {(['offline', 'homescreen', 'noStore'] as const).map((k) => (
          <li key={k} className="flex items-start gap-2"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-green" /><span>{t(`install.why.${k}`)}</span></li>
        ))}
      </ul>
      {method === 'native' && (
        <button className="btn btn-primary mt-5 w-full text-lg" onClick={onInstall}><Icon name="download" />{t('install.install')}</button>
      )}
      {method === 'ios' && (
        <ol className="card-2 mt-5 space-y-2 p-3 text-sm">
          <li className="flex gap-2"><span className="font-bold text-orange">1.</span><span>{t('install.ios.share')}</span></li>
          <li className="flex gap-2"><span className="font-bold text-orange">2.</span><span>{t('install.ios.add')}</span></li>
          <li className="flex gap-2"><span className="font-bold text-orange">3.</span><span>{t('install.ios.confirm')}</span></li>
        </ol>
      )}
      {method === 'manual' && <p className="card-2 mt-5 p-3 text-sm">{t('install.manual')}</p>}
      {onLater && <button className="btn btn-ghost mt-3 w-full" onClick={onLater}>{t('install.notNow')}</button>}
    </div>
  );
}

/** One-time sheet shown on Home right after onboarding. */
export function InstallModal() {
  const { t } = useTranslation();
  const s = useInstallPrompt();
  if (!s.showModal) return null;
  const onInstall = () => { void s.install().then((ok) => { if (!ok) s.dismissModal(); }); };
  return (
    <Sheet open onOpenChange={(o) => !o && s.dismissModal()} title={t('install.title')}>
      <InstallBody method={s.method} onInstall={onInstall} onLater={s.dismissModal} />
    </Sheet>
  );
}

/** Compact reminder on Home after the modal was dismissed. */
export function InstallBanner() {
  const { t } = useTranslation();
  const s = useInstallPrompt();
  const [open, setOpen] = useState(false);
  if (!s.showBanner) return null;
  const onInstall = () => { if (s.method === 'native') void s.install(); else setOpen(true); };
  return (
    <>
      <div className="card mb-4 flex items-center gap-3 p-3" role="region" aria-label={t('install.title')}>
        <Icon name="download" className="shrink-0 text-orange" />
        <p className="flex-1 text-sm font-semibold">{t('install.banner')}</p>
        <button className="btn btn-primary min-h-0 px-3 py-2 text-sm" onClick={onInstall}>{t('install.install')}</button>
        <button className="btn btn-ghost min-h-0 p-1" aria-label={t('common.close')} onClick={s.dismissBanner}><Icon name="close" size={18} /></button>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title={t('install.title')}>
        <InstallBody method={s.method} onInstall={() => void s.install()} />
      </Sheet>
    </>
  );
}

/** Always-available entry point on the About screen. */
export function InstallRow() {
  const { t } = useTranslation();
  const s = useInstallPrompt();
  const [open, setOpen] = useState(false);
  if (s.installed) {
    return <p className="flex items-center gap-2 text-sm text-muted"><Icon name="check" size={16} className="text-green" />{t('common.installed')}</p>;
  }
  const onClick = () => { if (s.method === 'native') void s.install(); else setOpen(true); };
  return (
    <>
      <button className="btn btn-secondary w-full" onClick={onClick}><Icon name="download" size={16} />{t('common.install')}</button>
      <Sheet open={open} onOpenChange={setOpen} title={t('install.title')}>
        <InstallBody method={s.method} onInstall={() => void s.install()} />
      </Sheet>
    </>
  );
}
