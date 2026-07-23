"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Language, type TranslationKey, getDir } from "./i18n";

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => {
    const topLevelKey = (translations as Record<string, unknown>)[key as string];
    if (topLevelKey && typeof topLevelKey === "object" && topLevelKey !== null) {
      const frValue = (topLevelKey as Record<string, string>)["fr"];
      if (frValue) return frValue;
    }
    return (translations.fr as Record<string, string>)[key as string] || String(key);
  },
  dir: "ltr",
  isRTL: false,
});

const STORAGE_KEY = "ovinformulation:language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("fr");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en" || stored === "ar") {
      Promise.resolve().then(() => setLangState(stored));
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    // Update document direction
    document.documentElement.dir = getDir(newLang);
    document.documentElement.lang = newLang;
  };

  // Update dir on mount and language change
  useEffect(() => {
    document.documentElement.dir = getDir(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string => {
    // Check if this is a top-level key with { fr, en, ar } structure
    // (landing_* and auth_* keys are stored at the top level, not inside fr/en/ar)
    const topLevelKey = (translations as Record<string, unknown>)[key as string];
    if (topLevelKey && typeof topLevelKey === "object" && topLevelKey !== null) {
      const langValue = (topLevelKey as Record<string, string>)[lang];
      if (langValue) return langValue;
      const frValue = (topLevelKey as Record<string, string>)["fr"];
      if (frValue) return frValue;
    }
    // Standard flat key lookup inside translations[lang]
    return (translations[lang] as Record<string, string>)[key as string]
      || (translations.fr as Record<string, string>)[key as string]
      || String(key);
  };

  const dir = getDir(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isRTL: dir === "rtl" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
