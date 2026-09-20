import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from './en.json';
import lt from './lt.json';
import type { LString, Locale } from '@/engine/types';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, lt: { translation: lt } },
  lng: 'lt',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

/** Resolve a content-pack localised string in the current UI language. */
export function useL(): (s: LString | undefined) => string {
  const { i18n: inst } = useTranslation();
  const locale = (inst.language as Locale) ?? 'en';
  return (s) => (s ? s[locale] ?? s.en ?? '' : '');
}

export function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(locale === 'lt' ? 'lt-LT' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
