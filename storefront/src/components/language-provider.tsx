"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

type Language = "es" | "ko";

export const SUPPORTED_LANGUAGES: { code: Language; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "ko", label: "한국어" },
];

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LANGUAGE_STORAGE_KEY = "aurora-language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window === "undefined") {
      return () => {};
    }
    const handler = () => onStoreChange();
    window.addEventListener("storage", handler);
    window.addEventListener("aurora-language-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("aurora-language-change", handler);
    };
  }, []);

  const getSnapshot = useCallback((): Language => {
    if (typeof window === "undefined") {
      return SUPPORTED_LANGUAGES[0]?.code ?? "es";
    }
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const match = SUPPORTED_LANGUAGES.find((l) => l.code === saved);
    return match ? match.code : (SUPPORTED_LANGUAGES[0]?.code ?? "es");
  }, []);

  const language = useSyncExternalStore<Language>(subscribe, getSnapshot, () => "es");

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event("aurora-language-change"));
  }, []);

  const toggleLanguage = useCallback(() => {
    if (typeof window === "undefined") return;
    const current = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const currentLanguage: Language = current === "ko" ? "ko" : "es";
    const nextLanguage: Language = currentLanguage === "es" ? "ko" : "es";
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event("aurora-language-change"));
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

const noop = () => {};
const defaultContext: LanguageContextValue = { language: "es", setLanguage: noop, toggleLanguage: noop };

export function useLanguage() {
  return useContext(LanguageContext) ?? defaultContext;
}
