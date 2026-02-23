import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import AccountPage from "./page";

const mockCustomerRetrieve = vi.fn();
const mockOrderList = vi.fn();

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

vi.mock("@/lib/medusa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/medusa")>();
  return {
    ...actual,
    sdk: {
      ...actual.sdk,
      auth: {
        ...actual.sdk.auth,
        logout: vi.fn(),
      },
      store: {
        ...actual.sdk.store,
        customer: {
          ...actual.sdk.store.customer,
          retrieve: (...args: unknown[]) => mockCustomerRetrieve(...args),
        },
        order: {
          ...actual.sdk.store.order,
          list: (...args: unknown[]) => mockOrderList(...args),
        },
      },
    },
  };
});

describe("AccountPage unauthenticated state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerRetrieve.mockRejectedValue(new Error("Unauthorized"));
    mockOrderList.mockResolvedValue({ orders: [], count: 0 });
  });

  it("shows login CTA with fixed contrast and next param", async () => {
    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Tu cuenta")).toBeInTheDocument();
    });

    const loginLink = screen.getByRole("link", { name: "Iniciar sesión" });
    expect(loginLink).toHaveAttribute("href", "/auth?next=/account");
    expect(loginLink.className).toContain("!text-white");
  });
});
