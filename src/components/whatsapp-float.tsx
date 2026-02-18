"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export function WhatsAppFloat() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const hiddenRoutes = ["/backoffice", "/catalog", "/search", "/product"];
  if (hiddenRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  const bottomClass = pathname === "/checkout" ? "bottom-24" : "bottom-5";

  return (
    <Link
      href="https://wa.me/5491112345678"
      className={`fixed right-5 z-40 rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold !text-white shadow-xl ${bottomClass}`}
      target="_blank"
      rel="noreferrer"
    >
      {language === "ko" ? "왓츠앱" : "WhatsApp"}
    </Link>
  );
}
