import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SiteHeader } from "./site-header";

// ---------------------------------------------------------------------------
// Next.js mocks
// ---------------------------------------------------------------------------
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Provider / data mocks
// ---------------------------------------------------------------------------
const mockToggleLanguage = vi.fn();
vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({
    language: "es" as const,
    toggleLanguage: mockToggleLanguage,
  }),
  SUPPORTED_LANGUAGES: [
    { code: "es", label: "Español" },
    { code: "ko", label: "한국어" },
  ],
}));

const mockOpenDrawer = vi.fn();
let mockTotalItemsHeader = 3;

vi.mock("@/components/cart-provider", () => ({
  useCart: () => ({
    get totalItems() { return mockTotalItemsHeader; },
    openDrawer: mockOpenDrawer,
  }),
}));

vi.mock("@/lib/shop-data", () => ({
  navCategories: ["Novedades", "Best Sellers", "Aros", "Collares", "Pulseras"],
  translateLabel: (label: string) => label,
}));

// Stub the LanguageToggle now imported into SiteHeader for the desktop row.
vi.mock("@/components/language-toggle", () => ({
  LanguageToggle: ({ className }: { className?: string }) => (
    <button className={className} data-testid="language-toggle-stub">
      ES/KO
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function getAside() {
  return document.querySelector("aside");
}

/** The backdrop is a direct-child <div> of the RTL container, sibling to <header>. */
function getBackdrop() {
  const header = screen.getByRole("banner");
  return header.parentElement?.querySelector(":scope > div") ?? null;
}

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------
describe("SiteHeader – rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the AURELIA logo link inside the header", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    expect(within(header).getByText("AURELIA")).toBeInTheDocument();
  });

  it("renders the hamburger button with accessible label (Spanish, with accent)", () => {
    render(<SiteHeader />);
    expect(screen.getByLabelText("Abrir menú")).toBeInTheDocument();
  });

  it("renders the cart button", () => {
    render(<SiteHeader />);
    // When cart has items, both the icon button (mobile) and pill button (desktop) render
    expect(screen.getAllByLabelText("Abrir carrito").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the cart item count badge", () => {
    render(<SiteHeader />);
    // Count may appear in both the icon badge and the pill button — either is fine
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("calls openDrawer when cart button is clicked", () => {
    render(<SiteHeader />);
    // Click the first cart button (icon button visible on mobile)
    fireEvent.click(screen.getAllByLabelText("Abrir carrito")[0]);
    expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
  });

  it("renders nav links inside the desktop nav (with Spanish accent on Colección)", () => {
    render(<SiteHeader />);
    const nav = document.querySelector("nav")!;
    expect(within(nav).getByText("Home")).toBeInTheDocument();
    expect(within(nav).getByText("Colección")).toBeInTheDocument();
  });

  it("renders Finalizar compra button in the header (outside nav) when cart has items", () => {
    render(<SiteHeader />);
    // The pill button renders as md:inline-flex outside <nav> when cart has items
    const header = screen.getByRole("banner");
    expect(within(header).getAllByText("Finalizar compra").length).toBeGreaterThanOrEqual(1);
  });

  it("renders account icon action on the right side", () => {
    render(<SiteHeader />);
    const accountLink = document.querySelector('a[href="/account"]');
    expect(accountLink).toBeInTheDocument();
    expect(accountLink).toHaveAttribute("href", "/account");
  });

  it("does NOT render a Coleccion link (without accent) — regression guard", () => {
    render(<SiteHeader />);
    expect(screen.queryByText("Coleccion")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Language toggle — moved to hamburger drawer
// ---------------------------------------------------------------------------
describe("SiteHeader – language toggle in hamburger drawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("language toggle is NOT rendered in the header bar (it lives only in the drawer)", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    expect(header).not.toContainElement(screen.queryByTestId("language-toggle-stub"));
  });

  it("hamburger drawer contains the Korean language option when language is es", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByLabelText("Abrir menú"));
    expect(within(getAside()!).getByText("한국어")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Critical structural fix: backdrop and aside are OUTSIDE <header>
// ---------------------------------------------------------------------------
describe("SiteHeader – mobile menu DOM structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("the mobile menu aside is NOT a descendant of the <header>", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    const aside = getAside();

    expect(aside).not.toBeNull();
    expect(header.contains(aside)).toBe(false);
  });

  it("the mobile menu aside is a direct sibling of the <header>", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    const siblingAside = header.parentElement?.querySelector(":scope > aside");
    expect(siblingAside).not.toBeNull();
  });

  it("the mobile backdrop div is NOT a descendant of the <header>", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    const backdrop = getBackdrop();

    expect(backdrop).not.toBeNull();
    expect(header.contains(backdrop)).toBe(false);
  });

  it("the mobile backdrop div is a direct sibling of the <header>", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    const siblingDiv = header.parentElement?.querySelector(":scope > div");
    expect(siblingDiv).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mobile menu – open / close
// ---------------------------------------------------------------------------
describe("SiteHeader – mobile menu open/close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aside starts translated off-screen (-translate-x-full)", () => {
    render(<SiteHeader />);
    expect(getAside()).toHaveClass("-translate-x-full");
  });

  it("aside does not start with translate-x-0", () => {
    render(<SiteHeader />);
    expect(getAside()).not.toHaveClass("translate-x-0");
  });

  it("aside slides in (translate-x-0) when hamburger is clicked", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByLabelText("Abrir menú"));
    expect(getAside()).toHaveClass("translate-x-0");
  });

  it("aside slides back when X close button is clicked", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByLabelText("Abrir menú"));
    // First button inside aside is the X close button
    const closeBtn = within(getAside()!).getAllByRole("button")[0];
    fireEvent.click(closeBtn);
    expect(getAside()).toHaveClass("-translate-x-full");
  });

  it("aside slides back when backdrop is clicked", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByLabelText("Abrir menú"));
    fireEvent.click(getBackdrop()!);
    expect(getAside()).toHaveClass("-translate-x-full");
  });

  it("backdrop is pointer-events-none when menu is closed", () => {
    render(<SiteHeader />);
    expect(getBackdrop()).toHaveClass("pointer-events-none");
  });

  it("backdrop is pointer-events-auto when menu is open", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByLabelText("Abrir menú"));
    expect(getBackdrop()).toHaveClass("pointer-events-auto");
  });

  it("backdrop transitions from opacity-0 to opacity-100 on open", () => {
    render(<SiteHeader />);
    expect(getBackdrop()).toHaveClass("opacity-0");
    fireEvent.click(screen.getByLabelText("Abrir menú"));
    expect(getBackdrop()).toHaveClass("opacity-100");
  });
});

// ---------------------------------------------------------------------------
// Mobile menu – content
// ---------------------------------------------------------------------------
describe("SiteHeader – mobile menu content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<SiteHeader />);
    fireEvent.click(screen.getByLabelText("Abrir menú"));
  });

  it("shows Home nav link inside the aside", () => {
    expect(within(getAside()!).getByText("Home")).toBeInTheDocument();
  });

  it("shows Colección nav link inside the aside (with accent)", () => {
    expect(within(getAside()!).getByText("Colección")).toBeInTheDocument();
  });

  it("shows Finalizar compra nav link inside the aside", () => {
    expect(within(getAside()!).getByText("Finalizar compra")).toBeInTheDocument();
  });

  it("shows at least one category link in the aside", () => {
    expect(within(getAside()!).getByText("Novedades")).toBeInTheDocument();
  });

  it("shows the language toggle button (Korean label when language is es)", () => {
    expect(within(getAside()!).getByText("한국어")).toBeInTheDocument();
  });

  it("calls toggleLanguage when the mobile language button is clicked", () => {
    fireEvent.click(within(getAside()!).getByText("한국어"));
    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it("closes the menu when a nav link is clicked", () => {
    fireEvent.click(within(getAside()!).getByText("Home"));
    expect(getAside()).toHaveClass("-translate-x-full");
  });

  it("closes the menu when a category link is clicked", () => {
    fireEvent.click(within(getAside()!).getByText("Novedades"));
    expect(getAside()).toHaveClass("-translate-x-full");
  });
});

// ---------------------------------------------------------------------------
// Cart badge
// ---------------------------------------------------------------------------
describe("SiteHeader – cart badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTotalItemsHeader = 3;
  });

  it("cart badge IS in DOM when totalItems === 3, shows '3'", () => {
    mockTotalItemsHeader = 3;
    render(<SiteHeader />);
    // Count appears in the icon badge (mobile) and/or pill button (desktop)
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("cart badge is NOT in DOM when totalItems === 0", () => {
    mockTotalItemsHeader = 0;
    render(<SiteHeader />);
    // The badge span only renders when totalItems > 0
    // We check that the number "0" is not displayed as a badge
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Mobile search
// ---------------------------------------------------------------------------
describe("SiteHeader – mobile search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mobile search input is not in the DOM before toggle", () => {
    render(<SiteHeader />);
    // Desktop hidden form has 1 input; mobile form is conditionally rendered
    expect(screen.getAllByPlaceholderText("Buscar productos")).toHaveLength(1);
  });

  it("adds a second search input when mobile search is toggled on", () => {
    render(<SiteHeader />);
    // There are two buttons with aria-label "Buscar":
    // [0] = desktop form submit, [1] = mobile toggle button
    const [, mobileToggle] = screen.getAllByLabelText("Buscar");
    fireEvent.click(mobileToggle);
    expect(screen.getAllByPlaceholderText("Buscar productos")).toHaveLength(2);
  });

  it("hides mobile search input when toggle is clicked a second time", () => {
    render(<SiteHeader />);
    const [, mobileToggle] = screen.getAllByLabelText("Buscar");
    fireEvent.click(mobileToggle);
    fireEvent.click(mobileToggle);
    expect(screen.getAllByPlaceholderText("Buscar productos")).toHaveLength(1);
  });

  it("navigates to search page when mobile form is submitted", () => {
    render(<SiteHeader />);
    const [, mobileToggle] = screen.getAllByLabelText("Buscar");
    fireEvent.click(mobileToggle);

    // Second placeholder input is the mobile one
    const [, mobileInput] = screen.getAllByPlaceholderText("Buscar productos");
    fireEvent.change(mobileInput, { target: { value: "collar" } });
    fireEvent.submit(mobileInput.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/search?q=collar");
  });

  it("does not navigate when search query is empty", () => {
    render(<SiteHeader />);
    const [, mobileToggle] = screen.getAllByLabelText("Buscar");
    fireEvent.click(mobileToggle);

    const [, mobileInput] = screen.getAllByPlaceholderText("Buscar productos");
    fireEvent.submit(mobileInput.closest("form")!);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("closes mobile search form after a successful submit", () => {
    render(<SiteHeader />);
    const [, mobileToggle] = screen.getAllByLabelText("Buscar");
    fireEvent.click(mobileToggle);

    const [, mobileInput] = screen.getAllByPlaceholderText("Buscar productos");
    fireEvent.change(mobileInput, { target: { value: "aros" } });
    fireEvent.submit(mobileInput.closest("form")!);

    // Back to 1 input (desktop only)
    expect(screen.getAllByPlaceholderText("Buscar productos")).toHaveLength(1);
  });

  it("URL-encodes the search query", () => {
    render(<SiteHeader />);
    const [, mobileToggle] = screen.getAllByLabelText("Buscar");
    fireEvent.click(mobileToggle);

    const [, mobileInput] = screen.getAllByPlaceholderText("Buscar productos");
    fireEvent.change(mobileInput, { target: { value: "best sellers" } });
    fireEvent.submit(mobileInput.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/search?q=best%20sellers");
  });
});
