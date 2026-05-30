'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dictionaries, Lang } from './dictionaries';

type Vars = Record<string, string | number>;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'lang';
const DEFAULT_LANG: Lang = 'tr';

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (stored === 'tr' || stored === 'en') {
      setLangState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  };

  const t = (key: string, vars?: Vars): string => {
    const dict = dictionaries[lang] || dictionaries[DEFAULT_LANG];
    const value = dict[key] ?? dictionaries[DEFAULT_LANG][key] ?? key;
    return interpolate(value, vars);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}

// Convenience hook returning only the translation function.
export function useT() {
  return useI18n().t;
}

// Translates a backend error response into the active language.
// The API returns { error, code, field? }. We prefer the stable `code`
// (mapped through the `error.*` dictionary keys) and fall back to the raw
// message, then to a generic fallback key.
export function apiErrorMessage(
  t: (key: string, vars?: Vars) => string,
  err: any,
  fallbackKey = 'error.UNKNOWN'
): string {
  const data = err?.response?.data;
  const code = data?.code;
  if (code) {
    const key = `error.${code}`;
    const vars = data?.field ? { field: data.field } : undefined;
    const translated = t(key, vars);
    if (translated !== key) return translated;
  }
  if (typeof data?.error === 'string') return data.error;
  return t(fallbackKey);
}
