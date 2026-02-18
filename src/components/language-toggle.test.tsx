import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageToggle } from "./language-toggle";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockToggleLanguage = vi.fn();

// Default mock: language = "es"
vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({
    language: "es" as const,
    toggleLanguage: mockToggleLanguage,
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("LanguageToggle – rendering", () => {
  it("renders a button", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows Korean label when language is Spanish (es → 한국어)", () => {
    render(<LanguageToggle />);
    expect(screen.getByText("한국어")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Mobile visibility — the key fix
// ---------------------------------------------------------------------------
describe("LanguageToggle – mobile visibility", () => {
  it("has the 'hidden' class so it is invisible on mobile", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toHaveClass("hidden");
  });

  it("has the 'md:inline-flex' class to show on desktop", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toHaveClass("md:inline-flex");
  });

  it("does NOT have 'inline-flex' without the md: prefix (stays hidden at mobile breakpoint)", () => {
    render(<LanguageToggle />);
    const btn = screen.getByRole("button");
    // The class list should contain 'hidden' but the bare 'inline-flex' should not exist
    // (only 'md:inline-flex' is used, not plain 'inline-flex')
    const classes = btn.className.split(/\s+/);
    expect(classes).not.toContain("inline-flex");
  });
});

// ---------------------------------------------------------------------------
// Position — fixed to avoid layout interference
// ---------------------------------------------------------------------------
describe("LanguageToggle – positioning", () => {
  it("is fixed positioned", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toHaveClass("fixed");
  });

  it("is positioned at top-4 right-4", () => {
    render(<LanguageToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("top-4");
    expect(btn).toHaveClass("right-4");
  });

  it("has z-50 to sit above page content on desktop", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toHaveClass("z-50");
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
describe("LanguageToggle – interaction", () => {
  it("calls toggleLanguage when clicked", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });
});
