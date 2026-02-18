"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="fixed right-4 top-4 z-50 border-black/10 bg-white/95 shadow-sm backdrop-blur hover:bg-white"
    >
      <Languages className="mr-1 h-4 w-4" />
      {language === "es" ? "한국어" : "Español"}
    </Button>
  );
}
