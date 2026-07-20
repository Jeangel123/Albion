import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '../auth';
import { translations, type Locale, type TranslationKey } from './translations';

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
};

const Ctx = createContext<I18nCtx | undefined>(undefined);

const STORAGE_KEY = 'imperio-locale';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'es';
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored === 'es' || stored === 'en' || stored === 'pt') return stored;
  const nav = navigator.language.slice(0, 2);
  if (nav === 'en' || nav === 'pt') return nav;
  return 'es';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  // Sync from profile when it loads or changes
  useEffect(() => {
    if (profile?.language) {
      const lang = profile.language as Locale;
      if (lang === 'es' || lang === 'en' || lang === 'pt') {
        setLocaleState(lang);
        localStorage.setItem(STORAGE_KEY, lang);
      }
    }
  }, [profile?.language]);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[locale]?.[key] ?? translations.es[key] ?? key,
    [locale],
  );

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
