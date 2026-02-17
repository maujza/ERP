"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type Language = "es" | "ko";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LANGUAGE_STORAGE_KEY = "aurelia-language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window === "undefined") {
      return () => {};
    }
    const handler = () => onStoreChange();
    window.addEventListener("storage", handler);
    window.addEventListener("aurelia-language-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("aurelia-language-change", handler);
    };
  }, []);

  const getSnapshot = useCallback((): Language => {
    if (typeof window === "undefined") {
      return "es";
    }
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === "es" || saved === "ko" ? saved : "es";
  }, []);

  const language = useSyncExternalStore<Language>(subscribe, getSnapshot, () => "es");

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event("aurelia-language-change"));
  }, []);

  const toggleLanguage = useCallback(() => {
    if (typeof window === "undefined") return;
    const current = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const currentLanguage: Language = current === "ko" ? "ko" : "es";
    const nextLanguage: Language = currentLanguage === "es" ? "ko" : "es";
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event("aurelia-language-change"));
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context) {
    return context;
  }

  return {
    language: "es" as const,
    setLanguage: () => {},
    toggleLanguage: () => {},
  };
}
