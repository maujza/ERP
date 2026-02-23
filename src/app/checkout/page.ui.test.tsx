import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CheckoutPage from "./page";

const mockPush = vi.fn();
const mockCustomerRetrieve = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: "es" as const }),
}));

vi.mock("@/components/cart-provider", () => ({
  useCart: () => ({
    cartId: "cart_test",
    items: [
      {
        id: "line_1",
        variantId: "var_1",
        title: "Aros Siena",
        variantTitle: "Dorado",
        thumbnail: null,
        quantity: 1,
        unitPrice: 12000,
      },
    ],
    subtotal: 12000,
    clearCart: vi.fn(),
  }),
}));

vi.mock("@/lib/shop-data", () => ({
  formatArs: (value: number) => `$${value}`,
}));

vi.mock("@/lib/medusa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/medusa")>();
  return {
    ...actual,
    sdk: {
      ...actual.sdk,
      store: {
        ...actual.sdk.store,
        customer: {
          ...actual.sdk.store.customer,
          retrieve: (...args: unknown[]) => mockCustomerRetrieve(...args),
        },
        cart: {
          ...actual.sdk.store.cart,
          update: vi.fn(),
          retrieve: vi.fn(),
          complete: vi.fn(),
          addShippingMethod: vi.fn(),
        },
        fulfillment: {
          ...actual.sdk.store.fulfillment,
          listCartOptions: vi.fn(),
        },
        payment: {
          ...actual.sdk.store.payment,
          initiatePaymentSession: vi.fn(),
        },
      },
    },
  };
});

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerRetrieve.mockRejectedValue(new Error("Unauthorized"));
  });

  it("keeps step title color styling", () => {
    render(<CheckoutPage />);

    [
      "Paso 1 - Contacto",
      "Paso 2 - Dirección de envío",
      "Paso 3 - Método de envío",
      "Paso 4 - Pago",
    ].forEach((step) => {
      const heading = screen.getByText(step);
      expect(heading).toHaveClass("text-[#3f3f3f]");
    });
  });

  it("shows account-choice popup for unauthenticated users when trying to pay", async () => {
    render(<CheckoutPage />);

    await waitFor(() => {
      expect(mockCustomerRetrieve).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Pagar ahora" })[0]);

    await waitFor(() => {
      expect(screen.getByText("¿Cómo querés finalizar?")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Continuar sin cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar con mi cuenta" })).toBeInTheDocument();
  });

  it("shows account-choice popup on checkout load for unauthenticated users", async () => {
    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText("¿Cómo querés finalizar?")).toBeInTheDocument();
    });
  });

  it("shows account-choice popup even if user clicks pay before auth check finishes", async () => {
    render(<CheckoutPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Pagar ahora" })[0]);

    await waitFor(() => {
      expect(screen.getByText("¿Cómo querés finalizar?")).toBeInTheDocument();
    });
  });

  it("navigates to auth from popup login action", async () => {
    render(<CheckoutPage />);

    await waitFor(() => {
      expect(mockCustomerRetrieve).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Pagar ahora" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Entrar con mi cuenta" }));

    expect(mockPush).toHaveBeenCalledWith("/auth?next=/checkout");
  });

  it("does not auto-show popup on checkout load for authenticated users", async () => {
    mockCustomerRetrieve.mockResolvedValue({ customer: { id: "cus_1" } });
    render(<CheckoutPage />);

    await waitFor(() => {
      expect(mockCustomerRetrieve).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("¿Cómo querés finalizar?")).not.toBeInTheDocument();
  });
});
