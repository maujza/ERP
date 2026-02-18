"use client";

import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBackoffice = pathname.startsWith("/backoffice");

  return (
    <>
      <SiteHeader />
      <div className={isBackoffice ? "" : "pt-[72px]"}>{children}</div>
      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
