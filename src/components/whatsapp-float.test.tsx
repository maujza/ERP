/**
 * WhatsAppFloat unit tests
 *
 * Key behaviours under test:
 *  - Renders on the home page
 *  - Hidden on /backoffice, /catalog, /search, /product/*, /checkout   ← bug fix
 *  - Shows "WhatsApp" in Spanish and "왓츠앱" in Korean
 *  - Link target, href, and bottom positioning
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsAppFloat } from "./whatsapp-float";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    target,
    rel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    target?: string;
    rel?: string;
  }) => (
    <a href={href} className={className} target={target} rel={rel}>
      {children}
    </a>
  ),
}));

let mockLanguage: "es" | "ko" = "es";

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: mockLanguage }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockPathname = "/";
  mockLanguage = "es";
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Visibility – renders on home
// ---------------------------------------------------------------------------
describe("WhatsAppFloat – renders on home", () => {
  it("renders a link on the home page (/)", () => {
    mockPathname = "/";
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("renders on the order-confirmation page", () => {
    mockPathname = "/order-confirmation";
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Visibility – hidden on specific routes
// ---------------------------------------------------------------------------
describe("WhatsAppFloat – hidden on specific routes", () => {
  const hiddenRoutes = [
    "/backoffice",
    "/backoffice/settings",
    "/catalog",
    "/catalog?category=Aros",
    "/search",
    "/search?q=collar",
    "/product/siena-pack",
    "/product/layering-aura",
    "/checkout",          // ← the key fix: duplicate button prevented
  ];

  it.each(hiddenRoutes)("renders nothing on %s", (pathname) => {
    mockPathname = pathname;
    const { container } = render(<WhatsAppFloat />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------
describe("WhatsAppFloat – language", () => {
  it("shows 'WhatsApp' in Spanish (es)", () => {
    mockLanguage = "es";
    render(<WhatsAppFloat />);
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });

  it("shows '왓츠앱' in Korean (ko)", () => {
    mockLanguage = "ko";
    render(<WhatsAppFloat />);
    expect(screen.getByText("왓츠앱")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Link attributes
// ---------------------------------------------------------------------------
describe("WhatsAppFloat – link attributes", () => {
  it("links to a wa.me URL", () => {
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });

  it("opens in a new tab (_blank target)", () => {
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).toHaveAttribute("target", "_blank");
  });

  it("has rel=noreferrer for security", () => {
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).toHaveAttribute("rel", "noreferrer");
  });
});

// ---------------------------------------------------------------------------
// Positioning
// ---------------------------------------------------------------------------
describe("WhatsAppFloat – positioning", () => {
  it("is fixed-positioned", () => {
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).toHaveClass("fixed");
  });

  it("has bottom-5 class (no longer adjusts position on checkout)", () => {
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).toHaveClass("bottom-5");
  });

  it("does NOT have bottom-24 class (removed checkout-specific offset)", () => {
    render(<WhatsAppFloat />);
    expect(screen.getByRole("link")).not.toHaveClass("bottom-24");
  });
});
