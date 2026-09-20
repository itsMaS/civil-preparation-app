import { useTranslation } from 'react-i18next';
import { pack } from '@/content';
import { useL } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { Sheet } from './Sheet';

/** Shown once after a content-pack update: version notes plus per-badge checklist diffs. */
export function MigrationDialog() {
  const { t } = useTranslation();
  const L = useL();
  const migration = useAppStore((s) => s.migration);
  const dismiss = useAppStore((s) => s.dismissMigration);
  if (!migration) return null;
  const itemName = (id: string) => L(pack.items.find((i) => i.id === id)?.name) || id;
  return (
    <Sheet open onOpenChange={(o) => !o && dismiss()} title={t('update.changed')}>
      <p className="text-sm text-muted">{migration.fromVersion} → {pack.meta.version}</p>
      <ul className="mt-3 space-y-2">
        {pack.meta.notes.map((n, i) => <li key={i} className="card-2 p-3 text-sm">{L(n)}</li>)}
      </ul>
      {migration.changes.map((c) => {
        const badge = pack.badges.find((b) => b.id === c.badgeId);
        return (
          <div key={c.badgeId} className="mt-4">
            <p className="font-semibold">{L(badge?.name)}</p>
            {c.added.length > 0 && <p className="mt-1 text-sm"><span className="label">{t('update.added')}</span> {c.added.map(itemName).join(', ')}</p>}
            {c.removed.length > 0 && <p className="mt-1 text-sm"><span className="label">{t('update.removed')}</span> {c.removed.map(itemName).join(', ')}</p>}
          </div>
        );
      })}
      <button className="btn btn-primary mt-5 w-full" onClick={dismiss}>{t('update.ok')}</button>
    </Sheet>
  );
}
