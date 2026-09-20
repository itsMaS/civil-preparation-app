import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

const TABS = [
  { to: '/', icon: 'home', key: 'nav.home' },
  { to: '/now', icon: 'siren', key: 'nav.now' },
  { to: '/shelters', icon: 'pin', key: 'nav.shelters' },
  { to: '/profile', icon: 'user', key: 'nav.profile' },
  { to: '/about', icon: 'info', key: 'nav.about' },
];

export function Layout() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      <main className="safe-bottom px-4 pt-4"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur" aria-label="Main">
        <div className="mx-auto flex max-w-lg justify-around pb-[env(safe-area-inset-bottom)]">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => `flex min-w-16 flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-semibold ${isActive ? 'text-orange' : 'text-muted'}`}>
              <Icon name={tab.icon} size={22} />
              <span>{t(tab.key)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return (
    <header className="mb-4">
      {back && <button onClick={back} className="btn btn-ghost -ml-2 mb-1 min-h-0 gap-1 px-2 py-1 text-sm" aria-label="Back"><Icon name="back" size={18} /></button>}
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </header>
  );
}
