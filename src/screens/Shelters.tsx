import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDerived } from '@/hooks/useDerived';
import { formatDate } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/Layout';
import { distanceKm, isStale, loadShelters, refreshShelters } from '@/shelters/cache';
import type { Shelter, ShelterDataset } from '@/shelters/types';

const ShelterMap = lazy(() => import('@/shelters/ShelterMap'));
const VILNIUS: [number, number] = [54.6872, 25.2797];

export function Shelters() {
  const { t } = useTranslation();
  const d = useDerived();
  const setFact = useAppStore((s) => s.setFact);
  const setItem = useAppStore((s) => s.setItem);
  const pushToast = useAppStore((s) => s.pushToast);
  const [ds, setDs] = useState<ShelterDataset | null>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const pinnedName = d.data.profile.facts['plan.shelter']?.value;

  useEffect(() => {
    let alive = true;
    void loadShelters().then(async (loaded) => {
      if (!alive) return;
      setDs(loaded);
      if (isStale(loaded) && navigator.onLine) {
        const fresh = await refreshShelters();
        if (alive && fresh) setDs(fresh);
      }
    });
    return () => { alive = false; };
  }, []);

  const locate = () => {
    if (!navigator.geolocation) { setDenied(true); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos([p.coords.latitude, p.coords.longitude]); setLocating(false); setDenied(false); },
      () => { setDenied(true); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const refresh = async () => {
    setRefreshing(true);
    const fresh = await refreshShelters();
    setRefreshing(false);
    if (fresh) setDs(fresh); else pushToast(t('shelters.refreshFailed'));
  };

  const list = useMemo(() => {
    if (!ds) return [];
    const q = query.trim().toLowerCase();
    let items = ds.features.filter((s) => !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
    if (pos) items = items.map((s) => ({ ...s, km: distanceKm(pos[0], pos[1], s.lat, s.lng) })).sort((a, b) => a.km - b.km);
    return items as (Shelter & { km?: number })[];
  }, [ds, pos, query]);

  const pin = useCallback((s: Shelter) => {
    setFact('plan.shelter', `${s.name} - ${s.address}`);
    setItem('shelter.locate', { have: true });
    pushToast(t('shelters.pinned'), 'success');
  }, [setFact, setItem, pushToast, t]);

  const center: [number, number] = pos ?? (list[0] ? [list[0].lat, list[0].lng] : VILNIUS);

  return (
    <div>
      <PageHeader title={t('shelters.title')} subtitle={t('shelters.subtitle')} />
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={locate} disabled={locating}><Icon name="pin" />{locating ? t('shelters.locating') : t('shelters.locate')}</button>
        <button className="btn btn-secondary" onClick={() => setShowMap((m) => !m)}>{showMap ? t('shelters.hideMap') : t('shelters.showMap')}</button>
      </div>
      <p className="mt-2 text-xs text-muted">{t('shelters.locationNote')}</p>
      {denied && <p className="card-2 mt-2 p-3 text-sm text-amber">{t('shelters.denied')}</p>}

      {showMap && (
        <div className="mt-3">
          <Suspense fallback={<div className="h-64 rounded-2xl bg-surface-2" />}>
            {ds && <ShelterMap shelters={list} center={center} pinned={list.find((s) => pinnedName === `${s.name} - ${s.address}`)?.id} onPick={pin} />}
          </Suspense>
          {!navigator.onLine && <p className="mt-1 text-xs text-muted">{t('shelters.mapOffline')}</p>}
        </div>
      )}

      <input className="input mt-3" placeholder={t('shelters.search')} value={query} onChange={(e) => setQuery(e.target.value)} />

      {ds && (
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{ds.sample ? <span className="text-amber">{t('shelters.sample')}</span> : t('shelters.dataFrom', { date: formatDate(ds.fetchedAt, d.data.profile.locale) })}</span>
          <button className="btn btn-ghost min-h-0 gap-1 px-2 py-1 text-xs" onClick={() => void refresh()} disabled={refreshing}><Icon name="refresh" size={14} />{refreshing ? t('shelters.refreshing') : t('shelters.refresh')}</button>
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {list.map((s) => {
          const isPinned = pinnedName === `${s.name} - ${s.address}`;
          return (
            <li key={s.id} className={`card p-3 ${isPinned ? 'border-orange' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.kind === 'shelter' ? 'bg-green/20 text-green' : 'bg-olive/20 text-olive'}`}><Icon name="shield" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">{s.address}</p>
                  <p className="mt-1 text-xs text-muted">
                    {t(`shelters.${s.kind}`)}{s.capacity ? ` · ${t('shelters.capacity', { count: s.capacity })}` : ''}{s.km !== undefined ? ` · ${t('shelters.km', { km: s.km.toFixed(1) })}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button className={`btn flex-1 text-sm ${isPinned ? 'btn-secondary text-orange' : 'btn-secondary'}`} onClick={() => pin(s)}><Icon name="pin" size={16} />{isPinned ? t('shelters.pinned') : t('shelters.pin')}</button>
                <a className="btn btn-secondary text-sm" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`} target="_blank" rel="noreferrer"><Icon name="external" size={16} />{t('shelters.openMap')}</a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
