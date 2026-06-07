"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useCart } from "@/components/cart-provider";

export function WhatsAppFloat() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const { totalItems } = useCart();

  const hiddenRoutes = ["/catalog", "/search", "/product", "/checkout"];
  if (hiddenRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  const isCheckout = pathname.startsWith("/checkout");
  const bottomClass = (totalItems > 0 && !isCheckout) ? "bottom-20" : "bottom-5";

  return (
    <Link
      href="https://wa.me/5491112345678"
      className={`fixed right-5 z-30 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold !text-white shadow-xl ${bottomClass}`}
      target="_blank"
      rel="noreferrer"
    >
      {language === "ko" ? "왓츠앱" : "WhatsApp"}
    </Link>
  );
}
