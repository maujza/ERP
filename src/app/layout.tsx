import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { LanguageProvider } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";

import "./globals.css";

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
          <LanguageToggle />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
