import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteFooter } from "../site-footer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

let mockLanguage: "es" | "ko" = "es";
vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: mockLanguage, toggleLanguage: vi.fn() }),
}));

vi.mock("@/lib/shop-data", () => ({
  translateLabel: (label: string) => label,
}));

// Backend-driven collections power the footer "Ayuda" column.
let mockCollections: { id: string; title: string; handle: string }[] = [];
vi.mock("@/hooks/use-collections", () => ({
  useCollections: () => ({ collections: mockCollections, loading: false, error: false }),
}));

beforeEach(() => {
  mockLanguage = "es";
  mockCollections = [
    { id: "pcol_1", title: "Novedades", handle: "novedades" },
    { id: "pcol_2", title: "Best Sellers", handle: "best-sellers" },
  ];
  vi.clearAllMocks();
});

// The desktop grid renders all links in the DOM regardless of CSS visibility.
function footerLinks() {
  return screen.getAllByRole("link");
}

describe("SiteFooter — backend-driven collection links", () => {
  it("renders a link per collection using the ?collection= handle", () => {
    render(<SiteFooter />);
    const hrefs = footerLinks().map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/catalog?collection=novedades");
    expect(hrefs).toContain("/catalog?collection=best-sellers");
  });

  it("does NOT use the legacy ?subcategory= param", () => {
    render(<SiteFooter />);
    const hrefs = footerLinks().map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.includes("subcategory="))).toBe(false);
  });

  it("labels collection links via translateLabel", () => {
    render(<SiteFooter />);
    expect(screen.getAllByText("Novedades").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Best Sellers").length).toBeGreaterThan(0);
  });

  it("renders only the static links when there are no collections", () => {
    mockCollections = [];
    render(<SiteFooter />);
    const hrefs = footerLinks().map((a) => a.getAttribute("href"));
    expect(hrefs.some((h) => h?.startsWith("/catalog?collection="))).toBe(false);
    // The static "Volver al home" link still renders.
    expect(hrefs).toContain("/");
  });

  it("keeps the static store links (catalog, search, checkout)", () => {
    render(<SiteFooter />);
    const hrefs = footerLinks().map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/catalog");
    expect(hrefs).toContain("/search?q=aros");
    expect(hrefs).toContain("/checkout");
  });

  it("encodes handles with special characters", () => {
    mockCollections = [{ id: "pcol_3", title: "Edición Fiesta", handle: "edición fiesta" }];
    render(<SiteFooter />);
    const hrefs = footerLinks().map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(`/catalog?collection=${encodeURIComponent("edición fiesta")}`);
  });
});

describe("SiteFooter — i18n", () => {
  it("renders Korean section titles when language is ko", () => {
    mockLanguage = "ko";
    render(<SiteFooter />);
    // "도움말" (Ayuda) section heading appears in the Korean variant.
    expect(screen.getAllByText("도움말").length).toBeGreaterThan(0);
  });
});
