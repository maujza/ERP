import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

describe("AccountPage authenticated state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerRetrieve.mockResolvedValue({
      customer: {
        first_name: "Mauro",
        last_name: "Zalazar",
        email: "mauro@example.com",
        groups: [{ name: "VIP" }],
      },
    });
    mockOrderList.mockResolvedValue({
      orders: [
        {
          id: "order_1",
          display_id: 649,
          status: "pending",
          payment_status: "authorized",
          fulfillment_status: "not_fulfilled",
          total: 101900,
          currency_code: "ars",
          created_at: "2026-02-23T02:07:35.000Z",
          promotions: [{ code: "bienvenida20" }],
        },
      ],
      count: 1,
    });
  });

  it("shows promo codes and vip price list details", async () => {
    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Promociones disponibles")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /AURELIA10 copiar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /BIENVENIDA20 copiar/i })).toBeInTheDocument();
    expect(screen.getByText("Lista de precios")).toBeInTheDocument();
    expect(screen.getByText("Nivel actual: VIP")).toBeInTheDocument();
  });

  it("shows tracking badges and expands timeline details", async () => {
    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Pedido #649")).toBeInTheDocument();
    });

    expect(screen.getByText("Estado: Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Pago: Autorizado")).toBeInTheDocument();
    expect(screen.getByText("Envio: Aun no despachado")).toBeInTheDocument();
    expect(screen.getByText("Seguimiento: Entrega pendiente")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Pedido confirmado")).toBeInTheDocument();
    expect(screen.getByText("Pago validado")).toBeInTheDocument();
    expect(screen.getByText("Preparando / enviando")).toBeInTheDocument();
    expect(screen.getByText("Entrega pendiente")).toBeInTheDocument();
  });
});
