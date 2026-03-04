"use client";

import { Languages } from "lucide-react";

import { SUPPORTED_LANGUAGES, useLanguage } from "@/components/language-provider";

/**
 * Inline language selector — not floating, safe to place inside any layout row.
 *
 * Scalability rules (per UX spec):
 *  - 0 or 1 language  → renders nothing
 *  - 2 languages      → toggle button (current label shows the *other* language)
 *  - 3+ languages     → <select> dropdown listing all languages
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  if (SUPPORTED_LANGUAGES.length <= 1) {
    return null;
  }

  const baseClass =
    "h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/15 bg-white px-3 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f7f7f7]";

  if (SUPPORTED_LANGUAGES.length === 2) {
    const other = SUPPORTED_LANGUAGES.find((l) => l.code !== language);
    const displayClass = className.trim().length > 0 ? className : "inline-flex";
    return (
      <button onClick={toggleLanguage} className={`${displayClass} ${baseClass}`}>
        <Languages className="h-4 w-4 shrink-0" />
        {other?.label ?? ""}
      </button>
    );
  }

  // 3+ languages: dropdown
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Languages className="pointer-events-none absolute left-3 h-4 w-4 text-[#111111]" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
        className="h-10 appearance-none rounded-full border border-black/15 bg-white py-0 pl-9 pr-4 text-sm font-medium text-[#111111] hover:bg-[#f7f7f7]"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
