import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pack } from '@/content';
import { APP_VERSION, FEEDBACK_URL, REPO_URL } from '@/config';
import { useDerived } from '@/hooks/useDerived';
import { formatDate, useL } from '@/i18n';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/Layout';

export function About() {
  const { t } = useTranslation();
  const L = useL();
  const d = useDerived();
  const [qr, setQr] = useState<string>('');
  const url = `${location.origin}${import.meta.env.BASE_URL}`;

  useEffect(() => {
    void import('qrcode').then((m) => m.toDataURL(url, { margin: 1, width: 220, color: { dark: '#15181c', light: '#ffffff' } })).then(setQr).catch(() => setQr(''));
  }, [url]);

  return (
    <div>
      <PageHeader title={t('about.title')} subtitle={t('about.what')} />

      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-bold"><Icon name="lock" className="text-olive" />{t('about.privacy')}</h2>
        <p className="text-sm leading-relaxed text-muted">{t('profile.privacyLong')}</p>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="mb-1 font-bold">{t('about.whatsNew')}</h2>
        <p className="mb-2 text-xs text-muted">{t('about.version', { app: APP_VERSION, pack: pack.meta.version })}</p>
        <ul className="space-y-1 text-sm">{pack.meta.notes.map((n, i) => <li key={i}>· {L(n)}</li>)}</ul>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="mb-1 font-bold">{t('about.sources')}</h2>
        <p className="mb-3 text-sm text-muted">{t('about.sourcesHint')}</p>
        <ul className="space-y-2">
          {pack.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm">
                <Icon name="external" size={16} className="mt-0.5 shrink-0 text-olive" />
                <span><span className="font-semibold">{s.name}</span><br /><span className="text-muted">{s.org} · {t('about.retrieved', { date: formatDate(s.retrieved, d.data.profile.locale) })}</span></span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="mb-1 font-bold">{t('about.funding')}</h2>
        <p className="text-sm leading-relaxed text-muted">{t('about.fundingText')}</p>
      </section>

      <section className="card mt-4 p-4 text-center">
        <h2 className="mb-1 font-bold">{t('about.share')}</h2>
        <p className="mb-3 text-sm text-muted">{t('about.shareHint')}</p>
        {qr && <img src={qr} alt={url} className="mx-auto rounded-xl bg-white p-2" width={220} height={220} />}
        <p className="mt-2 break-all text-xs text-muted">{url}</p>
      </section>

      <section className="mt-4 space-y-2">
        <a className="btn btn-secondary w-full" href={FEEDBACK_URL} target="_blank" rel="noreferrer"><Icon name="external" size={16} />{t('about.feedback')}</a>
        <a className="btn btn-ghost w-full text-sm" href={REPO_URL} target="_blank" rel="noreferrer">{t('about.license')}</a>
      </section>
    </div>
  );
}
