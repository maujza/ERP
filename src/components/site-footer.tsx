"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useLanguage } from "@/components/language-provider";

export function SiteFooter() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);

  const sections = language === "ko"
    ? [
        {
          title: "스토어",
          links: [
            { href: "/catalog", label: "컬렉션" },
            { href: "/search?q=aros", label: "검색" },
            { href: "/checkout", label: "결제" },
          ],
        },
        {
          title: "도움말",
          links: [
            { href: "/catalog?subcategory=Novedades", label: "신상품" },
            { href: "/catalog?subcategory=Best%20Sellers", label: "베스트셀러" },
            { href: "/", label: "홈으로" },
          ],
        },
        {
          title: "회사",
          links: [
            { href: "mailto:hola@aurelia.com", label: "문의" },
            { href: "https://wa.me/5491112345678", label: "WhatsApp" },
            { href: "/order-confirmation", label: "주문 확인" },
          ],
        },
      ]
    : [
        {
          title: "Tienda",
          links: [
            { href: "/catalog", label: "Coleccion" },
            { href: "/search?q=aros", label: "Buscar" },
            { href: "/checkout", label: "Checkout" },
          ],
        },
        {
          title: "Ayuda",
          links: [
            { href: "/catalog?subcategory=Novedades", label: "Novedades" },
            { href: "/catalog?subcategory=Best%20Sellers", label: "Best Sellers" },
            { href: "/", label: "Volver al home" },
          ],
        },
        {
          title: "Empresa",
          links: [
            { href: "mailto:hola@aurelia.com", label: "Contacto" },
            { href: "https://wa.me/5491112345678", label: "WhatsApp" },
            { href: "/order-confirmation", label: "Confirmacion" },
          ],
        },
      ];

  if (pathname.startsWith("/backoffice")) {
    return null;
  }

  return (
    <footer className="border-t border-black/10 bg-white px-4 py-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="hidden gap-8 md:grid md:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#333333]">
                {section.title}
              </h4>
              <div className="space-y-2 text-sm text-[#555555]">
                {section.links.map((link) => (
                  <Link key={link.label} href={link.href} className="block hover:text-[#111111]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 md:hidden">
          {sections.map((section) => {
            const expanded = open === section.title;
            return (
              <div key={section.title} className="rounded-2xl border border-black/10">
                <button
                  onClick={() => setOpen(expanded ? null : section.title)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.16em]">{section.title}</span>
                  <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : "rotate-0"}`} />
                </button>
                {expanded && (
                  <div className="space-y-2 border-t border-black/10 px-4 py-3 text-sm text-[#555555]">
                    {section.links.map((link) => (
                      <Link key={link.label} href={link.href} className="block hover:text-[#111111]">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
