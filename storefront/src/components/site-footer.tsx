"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCollections } from "@/hooks/use-collections";
import { translateLabel } from "@/lib/shop-data";

export function SiteFooter() {
  const { language } = useLanguage();
  const { collections } = useCollections();
  const [open, setOpen] = useState<string | null>(null);

  // Backend-driven collection shortcuts for the "Ayuda" / "도움말" column.
  const collectionLinks = collections.slice(0, 3).map((collection) => ({
    href: `/catalog?collection=${encodeURIComponent(collection.handle)}`,
    label: translateLabel(collection.title, language),
  }));

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
            ...collectionLinks,
            { href: "/", label: "홈으로" },
          ],
        },
        {
          title: "회사",
          links: [
            { href: "mailto:hola@aurora.com", label: "문의" },
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
            { href: "/checkout", label: "Finalizar compra" },
          ],
        },
        {
          title: "Ayuda",
          links: [
            ...collectionLinks,
            { href: "/", label: "Volver al home" },
          ],
        },
        {
          title: "Empresa",
          links: [
            { href: "mailto:hola@aurora.com", label: "Contacto" },
            { href: "https://wa.me/5491112345678", label: "WhatsApp" },
            { href: "/order-confirmation", label: "Confirmacion" },
          ],
        },
      ];

  return (
    <footer className="border-t border-[#9595db]/25 bg-white px-4 py-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="hidden gap-8 md:grid md:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2a2148]">
                {section.title}
              </h4>
              <div className="space-y-2 text-sm text-[#5a4f7a]">
                {section.links.map((link) => (
                  <Link key={link.label} href={link.href} className="block hover:text-[#2a2148]">
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
              <div key={section.title} className="rounded-2xl border border-[#9595db]/25">
                <button
                  onClick={() => setOpen(expanded ? null : section.title)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.16em]">{section.title}</span>
                  <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : "rotate-0"}`} />
                </button>
                {expanded && (
                  <div className="space-y-2 border-t border-[#9595db]/25 px-4 py-3 text-sm text-[#5a4f7a]">
                    {section.links.map((link) => (
                      <Link key={link.label} href={link.href} className="block hover:text-[#2a2148]">
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
