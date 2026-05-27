import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastList } from "../toast-list";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockDismissToast = vi.fn();
let mockToasts: Array<{ id: string; message: string; type: "success" | "error" }> = [];
let mockLanguage: "es" | "ko" = "es";

vi.mock("@/components/toast-provider", () => ({
  useToast: () => ({
    toasts: mockToasts,
    dismissToast: mockDismissToast,
  }),
}));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: mockLanguage }),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockToasts = [];
  mockLanguage = "es";
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ToastList", () => {
  it("renders nothing when there are no toasts", () => {
    mockToasts = [];
    const { container } = render(<ToastList />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a toast with the correct message", () => {
    mockToasts = [{ id: "1", message: "Producto agregado", type: "success" }];
    render(<ToastList />);
    expect(screen.getByText("Producto agregado")).toBeInTheDocument();
  });

  it("shows green checkmark span for type success", () => {
    mockToasts = [{ id: "1", message: "Success!", type: "success" }];
    render(<ToastList />);
    // The success indicator contains a checkmark character
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("does not show green checkmark for type error", () => {
    mockToasts = [{ id: "1", message: "Oops", type: "error" }];
    render(<ToastList />);
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
  });

  it("'Ver carrito →' link goes to /checkout in Spanish", () => {
    mockLanguage = "es";
    mockToasts = [{ id: "1", message: "Added", type: "success" }];
    render(<ToastList />);
    const link = screen.getByRole("link", { name: "Ver carrito →" });
    expect(link).toHaveAttribute("href", "/checkout");
  });

  it("dismiss button calls dismissToast with the toast id", () => {
    mockToasts = [{ id: "toast-42", message: "Remove me", type: "success" }];
    render(<ToastList />);
    const dismissBtn = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(dismissBtn);
    expect(mockDismissToast).toHaveBeenCalledWith("toast-42");
  });

  it("shows '장바구니 보기 →' link text when language is Korean", () => {
    mockLanguage = "ko";
    mockToasts = [{ id: "1", message: "추가됨", type: "success" }];
    render(<ToastList />);
    expect(screen.getByText("장바구니 보기 →")).toBeInTheDocument();
  });

  it("Korean link also goes to /checkout", () => {
    mockLanguage = "ko";
    mockToasts = [{ id: "1", message: "추가됨", type: "success" }];
    render(<ToastList />);
    const link = screen.getByRole("link", { name: "장바구니 보기 →" });
    expect(link).toHaveAttribute("href", "/checkout");
  });

  it("renders multiple toasts", () => {
    mockToasts = [
      { id: "1", message: "First toast", type: "success" },
      { id: "2", message: "Second toast", type: "error" },
    ];
    render(<ToastList />);
    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
  });
});
