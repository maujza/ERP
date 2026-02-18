"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { navCategories, translateLabel } from "@/lib/shop-data";
import { useCart } from "@/components/cart-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, openDrawer } = useCart();
  const { language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isBackoffice = pathname.startsWith("/backoffice");

  const categories = useMemo(() => navCategories.slice(0, 5), []);
  const t = language === "ko"
    ? {
        navLinks: [
          { href: "/", label: "홈" },
          { href: "/catalog", label: "컬렉션" },
          { href: "/checkout", label: "결제" },
        ],
        searchPlaceholder: "상품 검색",
        openMenu: "메뉴 열기",
        openCart: "장바구니 열기",
        categories: "카테고리",
      }
    : {
        navLinks: [
          { href: "/", label: "Home" },
          { href: "/catalog", label: "Coleccion" },
          { href: "/checkout", label: "Checkout" },
        ],
        searchPlaceholder: "Buscar productos",
        openMenu: "Abrir menu",
        openCart: "Abrir carrito",
        categories: "Categorias",
      };

  if (isBackoffice) {
    return null;
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setMobileSearchOpen(false);
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 md:gap-6">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/15 md:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t.openMenu}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="text-xl font-black tracking-[0.18em] text-black md:text-2xl">
          AURELIA
        </Link>

        <nav className="ml-2 hidden items-center gap-5 text-sm md:flex">
          {t.navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-[#222222] hover:text-black">
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden w-full max-w-md items-center md:flex">
          <div className="flex h-10 w-full items-center rounded-full border border-black/15 bg-white px-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-full w-full bg-transparent text-sm outline-none"
            />
            <button type="submit" className="text-[#444444]" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        <button
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/15 md:hidden"
          onClick={() => setMobileSearchOpen((prev) => !prev)}
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/15"
          onClick={openDrawer}
          aria-label={t.openCart}
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#111111] px-1 text-[11px] font-semibold text-white">
            {totalItems}
          </span>
        </button>
      </div>

      {mobileSearchOpen && (
        <form onSubmit={submitSearch} className="border-t border-black/10 px-4 pb-3 pt-2 md:hidden">
          <div className="flex h-10 w-full items-center rounded-full border border-black/15 bg-white px-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-full w-full bg-transparent text-sm outline-none"
              autoFocus
            />
            <button type="submit" className="text-[#444444]">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      <div
        className={`fixed inset-0 z-[80] bg-black/50 transition md:hidden ${
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside
        className={`fixed left-0 top-0 z-[85] h-full w-[88%] max-w-sm bg-white p-5 shadow-2xl transition-transform md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg font-bold tracking-[0.18em]">AURELIA</p>
          <button onClick={() => setMobileMenuOpen(false)} className="rounded-full border border-black/15 p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {t.navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[#666666]">{t.categories}</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/catalog?subcategory=${encodeURIComponent(category)}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Badge variant="outline" className="cursor-pointer bg-white">
                  {translateLabel(category, language)}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </header>
  );
}
