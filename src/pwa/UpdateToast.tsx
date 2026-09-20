import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';

/**
 * Auto-update with a toast: the new service worker installs in the background;
 * the user can refresh now, or it applies on the next cold start.
 */
export function UpdateToast() {
  const { t } = useTranslation();
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, r) {
      // Check for a new version every hour while the app stays open.
      if (r) setInterval(() => { void r.update(); }, 60 * 60 * 1000);
    },
  });
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);
  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 mx-auto max-w-lg p-3" role="status">
      <div className="card flex items-center gap-3 p-3 shadow-lg anim-rise">
        <p className="flex-1 text-sm font-semibold">{needRefresh ? t('update.available') : t('update.offlineReady')}</p>
        {needRefresh ? (
          <>
            <button className="btn btn-ghost min-h-0 px-2 py-1 text-sm" onClick={() => setNeedRefresh(false)}>{t('update.later')}</button>
            <button className="btn btn-primary min-h-0 px-3 py-2 text-sm" onClick={() => void updateServiceWorker(true)}>{t('update.reload')}</button>
          </>
        ) : (
          <button className="btn btn-ghost min-h-0 px-2 py-1 text-sm" onClick={() => setOfflineReady(false)}>{t('update.ok')}</button>
        )}
      </div>
    </div>
  );
}
