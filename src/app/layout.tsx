import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AppChrome } from "@/components/app-chrome";
import { CartProvider } from "@/components/cart-provider";
import { LanguageProvider } from "@/components/language-provider";
import { validateMedusaEnv } from "@/lib/medusa";

import "./globals.css";

// Warn at startup if Medusa env vars look stale or missing (e.g. after a DB rebuild).
// See docs/medusa-auth-keys.md for the refresh procedure.
for (const warning of validateMedusaEnv()) {
  console.warn("[medusa-env]", warning)
}

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurelia | Biyuterie mayorista",
  description:
    "Catálogo mayorista de Biyuterie moderna: colecciones listas para vender, envíos rápidos y packs curados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="bg-slate-50">
      <body className={`${plusJakarta.variable} antialiased`}>
        <LanguageProvider>
          <CartProvider>
            <AppChrome>
              {children}
            </AppChrome>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
