"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import id from "@/locales/id.json";
import en from "@/locales/en.json";

export type Language = "id" | "en";

type Dict = Record<string, unknown>;

const DICTS: Record<Language, Dict> = { id, en };
const STORAGE_KEY = "kantongku_lang";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolve(dict: Dict, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Dict)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("id");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "id" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = resolve(DICTS[lang], key) ?? resolve(DICTS.id, key) ?? key;
      return interpolate(value, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
