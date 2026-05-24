"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { ToastProvider } from "@/components/toast-provider";
import { ToastList } from "@/components/toast-list";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/components/language-provider";
import { formatArs } from "@/lib/shop-data";

function MobileStickyCheckout() {
  const { totalItems, subtotal } = useCart();
  const { language } = useLanguage();
  const pathname = usePathname();

  // Hide on checkout and backoffice routes to avoid duplication
  if (!totalItems || pathname.startsWith("/checkout") || pathname.startsWith("/backoffice")) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white/90 backdrop-blur-md p-3 md:hidden">
      <Link
        href="/checkout"
        className="flex w-full items-center justify-between rounded-2xl bg-[#111111] px-4 py-3"
      >
        <span className="text-sm font-medium text-white">
          {totalItems} art. · {formatArs(subtotal, language)}
        </span>
        <span className="text-sm font-semibold text-white">Ir al pago →</span>
      </Link>
    </div>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBackoffice = pathname.startsWith("/backoffice");

  return (
    <ToastProvider>
      <SiteHeader />
      <div className={isBackoffice ? "" : "pt-[72px]"}>{children}</div>
      <SiteFooter />
      <WhatsAppFloat />
      <ToastList />
      <MobileStickyCheckout />
    </ToastProvider>
  );
}
