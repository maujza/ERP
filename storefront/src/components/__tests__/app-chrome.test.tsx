import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// We test MobileStickyCheckout by importing AppChrome but we need the
// internal component. Since it's not exported, we render AppChrome with
// children and check that the sticky bar appears/disappears correctly.
// We test this via a re-export pattern — since MobileStickyCheckout is
// not exported, we test its effects through the rendered AppChrome output.

// ---------------------------------------------------------------------------
// Mocks (must be set up before component import)
// ---------------------------------------------------------------------------
let mockTotalItems = 0;
let mockSubtotal = 0;
let mockPathname = "/";
let mockLanguage: "es" | "ko" = "es";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

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

vi.mock("@/components/cart-provider", () => ({
  useCart: () => ({
    get totalItems() { return mockTotalItems; },
    get subtotal() { return mockSubtotal; },
    items: [],
    cartId: null,
    openDrawer: vi.fn(),
    addToCart: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    isDrawerOpen: false,
    closeDrawer: vi.fn(),
  }),
}));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: mockLanguage, toggleLanguage: vi.fn() }),
  SUPPORTED_LANGUAGES: [
    { code: "es", label: "Español" },
    { code: "ko", label: "한국어" },
  ],
}));

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

vi.mock("@/components/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

vi.mock("@/components/whatsapp-float", () => ({
  WhatsAppFloat: () => null,
}));

vi.mock("@/components/toast-list", () => ({
  ToastList: () => null,
}));

vi.mock("@/lib/shop-data", () => ({
  formatArs: (value: number) => `$${value}`,
}));

// Import AppChrome after mocks
import { AppChrome } from "../app-chrome";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockTotalItems = 0;
  mockSubtotal = 0;
  mockPathname = "/";
  mockLanguage = "es";
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// MobileStickyCheckout tests (tested via AppChrome)
// ---------------------------------------------------------------------------
describe("MobileStickyCheckout", () => {
  it("renders nothing when cart is empty (totalItems=0)", () => {
    mockTotalItems = 0;
    mockPathname = "/";
    render(<AppChrome><div>Content</div></AppChrome>);
    // The sticky bar contains a link to /checkout; it should not exist when cart is empty
    const checkoutLinks = screen
      .queryAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/checkout");
    expect(checkoutLinks).toHaveLength(0);
  });

  it("renders a link to /checkout when cart has items", () => {
    mockTotalItems = 2;
    mockSubtotal = 24000;
    mockPathname = "/catalog";
    render(<AppChrome><div>Content</div></AppChrome>);
    const checkoutLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/checkout");
    expect(checkoutLinks.length).toBeGreaterThan(0);
  });

  it("renders nothing on /checkout path even with items in cart", () => {
    mockTotalItems = 3;
    mockSubtotal = 36000;
    mockPathname = "/checkout";
    render(<AppChrome><div>Content</div></AppChrome>);
    // On /checkout the sticky bar is hidden; the link should not appear
    const checkoutLinks = screen
      .queryAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/checkout");
    expect(checkoutLinks).toHaveLength(0);
  });

  it("renders nothing on /backoffice path even with items in cart", () => {
    mockTotalItems = 1;
    mockPathname = "/backoffice/orders";
    render(<AppChrome><div>Content</div></AppChrome>);
    const checkoutLinks = screen
      .queryAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/checkout");
    expect(checkoutLinks).toHaveLength(0);
  });

  it("shows item count and subtotal in the sticky bar", () => {
    mockTotalItems = 3;
    mockSubtotal = 36000;
    mockPathname = "/";
    render(<AppChrome><div>Content</div></AppChrome>);
    // The sticky bar shows "{totalItems} art. · {formatArs(subtotal)}"
    expect(screen.getByText(/3 art\./)).toBeInTheDocument();
    expect(screen.getByText(/\$36000/)).toBeInTheDocument();
  });
});
