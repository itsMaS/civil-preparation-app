import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { Layout } from '@/components/Layout';
import { Toasts } from '@/components/Toasts';
import { Celebration } from '@/components/Celebration';
import { MigrationDialog } from '@/components/MigrationDialog';
import { UpdateToast } from '@/pwa/UpdateToast';
import { Home } from '@/screens/Home';
import { BadgeScreen } from '@/screens/Badge';
import { Profile } from '@/screens/Profile';
import { RightNow } from '@/screens/RightNow';
import { Shelters } from '@/screens/Shelters';
import { About } from '@/screens/About';
import { Onboarding } from '@/screens/Onboarding';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function App() {
  const { t, i18n } = useTranslation();
  const ready = useAppStore((s) => s.ready);
  const data = useAppStore((s) => s.data);
  const load = useAppStore((s) => s.load);

  useEffect(() => { void load(); }, [load]);

  const locale = data?.profile.locale;
  const theme = data?.profile.theme;
  useEffect(() => { if (locale && i18n.language !== locale) void i18n.changeLanguage(locale); }, [locale, i18n]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme ?? 'dark');
    document.documentElement.lang = locale ?? 'lt';
  }, [theme, locale]);

  if (!ready || !data) {
    return <div className="flex min-h-dvh items-center justify-center text-muted">{t('common.loading')}</div>;
  }

  return (
    <HashRouter>
      <ScrollToTop />
      <UpdateToast />
      {!data.onboarded ? (
        <Onboarding />
      ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/badge/:id" element={<BadgeScreen />} />
            <Route path="/now" element={<RightNow />} />
            <Route path="/shelters" element={<Shelters />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      )}
      <Toasts />
      <Celebration />
      <MigrationDialog />
    </HashRouter>
  );
}
