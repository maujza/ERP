"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Languages, Menu, Search, ShoppingBag, User, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { translateLabel } from "@/lib/shop-data";
import { useCollections } from "@/hooks/use-collections";
import { useCart } from "@/components/cart-provider";

export function SiteHeader() {
  const router = useRouter();
  const { totalItems, openDrawer } = useCart();
  const { language, toggleLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { collections } = useCollections();

  const navCollections = useMemo(() => collections.slice(0, 5), [collections]);
  const checkoutNavLink = language === "ko"
    ? { href: "/checkout", label: "결제" }
    : { href: "/checkout", label: "Finalizar compra" };
  const t = language === "ko"
    ? {
        navLinks: [
          { href: "/", label: "홈" },
          { href: "/catalog", label: "컬렉션" },
        ],
        searchPlaceholder: "상품 검색",
        openMenu: "메뉴 열기",
        openCart: "장바구니 열기",
        categories: "카테고리",
      }
    : {
        navLinks: [
          { href: "/", label: "Home" },
          { href: "/catalog", label: "Colección" },
        ],
        searchPlaceholder: "Buscar productos",
        openMenu: "Abrir menú",
        openCart: "Abrir carrito",
        categories: "Categorías",
      };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setMobileSearchOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 z-50 w-full border-b border-[#9595db]/25 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-2.5 py-3 min-[361px]:gap-3 min-[361px]:px-4 md:gap-3 lg:gap-6">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9595db]/35"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t.openMenu}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="text-lg font-black tracking-[0.12em] text-black max-[360px]:max-w-[108px] max-[360px]:truncate min-[361px]:text-xl min-[361px]:tracking-[0.16em] md:text-2xl md:tracking-[0.18em]"
          >
            AURORA
          </Link>

          <nav className="ml-2 hidden items-center gap-5 text-sm md:flex">
            {t.navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-[#2a2148] hover:text-black">
                {link.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={submitSearch} className="ml-auto hidden w-full max-w-[180px] items-center md:flex lg:max-w-md">
            <div className="flex h-10 w-full items-center rounded-full border border-[#9595db]/35 bg-white px-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-full w-full bg-transparent text-sm outline-none"
              />
              <button type="submit" className="text-[#5a4f7a]" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <button
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9595db]/35 md:hidden"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Mobile: always cart icon. md+: morphs into "Finalizar compra N" pill when cart has items */}
          <button
            onClick={openDrawer}
            aria-label={t.openCart}
            className={
              totalItems > 0
                ? "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9595db]/35 md:hidden"
                : "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9595db]/35"
            }
          >
            <ShoppingBag className="h-4 w-4" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4660bc] px-1 text-[11px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </button>
          {totalItems > 0 && (
            <button
              onClick={openDrawer}
              aria-label={t.openCart}
              className="hidden items-center gap-2 whitespace-nowrap rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a2148]/80 md:inline-flex"
            >
              {checkoutNavLink.label}
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[11px] font-semibold">
                {totalItems}
              </span>
            </button>
          )}

          <Link
            href="/account"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9595db]/35 max-[360px]:hidden"
            aria-label={language === "ko" ? "내 계정" : "Mi cuenta"}
          >
            <User className="h-4 w-4" />
          </Link>

        </div>

        {mobileSearchOpen && (
          <form onSubmit={submitSearch} className="border-t border-[#9595db]/25 px-4 pb-3 pt-2 md:hidden">
            <div className="flex h-10 w-full items-center rounded-full border border-[#9595db]/35 bg-white px-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-full w-full bg-transparent text-sm outline-none"
                autoFocus
              />
              <button type="submit" className="text-[#5a4f7a]">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </header>

      {/* Mobile menu — rendered outside <header> so backdrop-filter doesn't affect fixed positioning */}
      <div
        className={`fixed inset-0 z-[80] bg-[#2a2148]/50 transition-opacity ${
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside
        className={`fixed left-0 top-0 z-[85] flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl transition-transform ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg font-bold tracking-[0.18em]">AURORA</p>
          <button onClick={() => setMobileMenuOpen(false)} className="rounded-full border border-[#9595db]/35 p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {t.navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-2xl border border-[#9595db]/25 px-4 py-3 text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
          {totalItems > 0 && (
            <button
              onClick={() => { setMobileMenuOpen(false); openDrawer(); }}
              className="block w-full rounded-2xl bg-black px-4 py-3 text-left text-sm font-semibold text-white"
            >
              {checkoutNavLink.label}
            </button>
          )}
        </div>
        {navCollections.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[#5a4f7a]">{t.categories}</p>
            <div className="flex flex-wrap gap-2">
              {navCollections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/catalog?collection=${encodeURIComponent(collection.handle)}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Badge variant="outline" className="cursor-pointer bg-white">
                    {translateLabel(collection.title, language)}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 border-t border-[#9595db]/25 pt-4">
          <button
            onClick={toggleLanguage}
            className="flex w-full items-center gap-2 rounded-2xl border border-[#9595db]/25 px-4 py-3 text-sm font-medium"
          >
            <Languages className="h-4 w-4" />
            {language === "es" ? "한국어" : "Español"}
          </button>
        </div>
      </aside>
    </>
  );
}
