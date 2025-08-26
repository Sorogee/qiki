'use client';
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import en from '../locales/en.json';

type Dict = Record<string, string>;
type Locale = 'en'; // scaffold

const dictionaries: Record<Locale, Dict> = { en };

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('locale') as Locale | null;
  return saved || 'en';
}

const I18nCtx = createContext<{ t: (k: string, vars?: Record<string,string|number>) => string; locale: Locale; setLocale: (l: Locale) => void } | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale());
  useEffect(()=>{ try { localStorage.setItem('locale', locale); } catch {} }, [locale]);
  const dict = dictionaries[locale];
  const t = useMemo(() => (key: string, vars?: Record<string,string|number>) => {
    let s = dict[key] || key;
    if (vars) for (const [k,v] of Object.entries(vars)) s = s.replace(new RegExp('\\{'+k+'\\}','g'), String(v));
    return s;
  }, [dict]);
  return <I18nCtx.Provider value={{ t, locale, setLocale }}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const ctx = useContext(I18nCtx);
  if (!ctx) return { t: (k:string)=>k, locale: 'en', setLocale: () => {} };
  return ctx;
}
