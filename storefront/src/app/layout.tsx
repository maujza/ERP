import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";

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

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-ibm-plex-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURORA Shop | Mayorista de accesorios",
  description:
    "Comprás hoy. Vendés esta semana. Colecciones mayoristas de accesorios con alta rotación, envíos rápidos y packs curados.",
};

// Match the browser chrome (mobile address bar, PWA splash) to the brand lilac
// used by the favicon/manifest and the <html> background.
export const viewport: Viewport = {
  themeColor: "#f2e6f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="bg-[#f2e6f7]">
      <body className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} antialiased`}>
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
