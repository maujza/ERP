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

  // ─── phone field ────────────────────────────────────────────────────────────

  it("renders the phone label 'Número de WhatsApp' in Step 1", () => {
    render(<CheckoutPage />);
    expect(screen.getByText("Número de WhatsApp")).toBeInTheDocument();
  });

  it("renders a tel input for the phone number", () => {
    render(<CheckoutPage />);
    const phoneInput = screen.getByPlaceholderText("+54 9 11 1234-5678");
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).toHaveAttribute("type", "tel");
  });

  it("shows '(opcional)' when card payment is selected (default)", () => {
    render(<CheckoutPage />);
    expect(screen.getByText("(opcional)")).toBeInTheDocument();
  });

  it("hides '(opcional)' after switching to Efectivo", () => {
    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole("button", { name: "Efectivo" }));
    expect(screen.queryByText("(opcional)")).not.toBeInTheDocument();
  });

  it("hides '(opcional)' after switching to Transferencia", () => {
    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole("button", { name: "Transferencia" }));
    expect(screen.queryByText("(opcional)")).not.toBeInTheDocument();
  });

  it("shows the WhatsApp hint text after switching to Efectivo", () => {
    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole("button", { name: "Efectivo" }));
    expect(
      screen.getByText("Si el chat falla, te contactamos por este número.")
    ).toBeInTheDocument();
  });

  it("does not show the WhatsApp hint text for card payment", () => {
    render(<CheckoutPage />);
    expect(
      screen.queryByText("Si el chat falla, te contactamos por este número.")
    ).not.toBeInTheDocument();
  });
});

// ─── progress bar step derivation logic ─────────────────────────────────────

function getStep(
  contactComplete: boolean,
  allShippingRequiredComplete: boolean,
  selectedShippingMethod: string | undefined,
): number {
  return selectedShippingMethod ? 3 : allShippingRequiredComplete ? 2 : contactComplete ? 1 : 0;
}

describe("CheckoutPage – progress bar step logic", () => {
  it("returns 0 when nothing is complete", () => {
    expect(getStep(false, false, undefined)).toBe(0);
  });

  it("returns 1 when only contactComplete is true", () => {
    expect(getStep(true, false, undefined)).toBe(1);
  });

  it("returns 2 when allShippingRequiredComplete is true but no method selected", () => {
    expect(getStep(true, true, undefined)).toBe(2);
  });

  it("returns 3 when selectedShippingMethod is set", () => {
    expect(getStep(true, true, "standard")).toBe(3);
  });

  it("returns 3 even when contact/shipping flags are false if method is set", () => {
    expect(getStep(false, false, "express")).toBe(3);
  });
});

describe("CheckoutPage – progress bar DOM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerRetrieve.mockRejectedValue(new Error("Unauthorized"));
  });

  it("renders 4 step nodes in the progress bar", () => {
    render(<CheckoutPage />);
    // Each step node is a div with h-7 w-7 classes; look for the step numbers 1–4
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("first step node (index 0) has border-2 border-[#111111] class when currentStep=0", () => {
    render(<CheckoutPage />);
    // Step "1" is in the active state (border-2 border-[#111111]) because nothing is filled
    const step1 = screen.getByText("1");
    expect(step1).toHaveClass("border-2");
    expect(step1).toHaveClass("border-[#111111]");
  });
});
