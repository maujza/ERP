import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import AccountPage from "./page";

// ---------------------------------------------------------------------------
// Mutable language mock
// ---------------------------------------------------------------------------
const { mockLanguage } = vi.hoisted(() => ({ mockLanguage: { current: "es" as "es" | "ko" } }));

vi.mock("@/components/language-provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/language-provider")>();
  return {
    ...actual,
    useLanguage: () => ({
      language: mockLanguage.current,
      setLanguage: vi.fn(),
      toggleLanguage: vi.fn(),
    }),
  };
});

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
    mockLanguage.current = "es";
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
    mockLanguage.current = "es";
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

  it("shows order stepper with correct steps for not_fulfilled order", async () => {
    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Pedido #649")).toBeInTheDocument();
    });

    // Stepper step labels
    expect(screen.getByText("Pedido confirmado")).toBeInTheDocument();
    // payment_status "authorized" is NOT captured — should show "Validando pago" (current), not "Pago validado"
    expect(screen.getByText("Validando pago")).toBeInTheDocument();
    expect(screen.queryByText("Pago validado")).not.toBeInTheDocument();
    // Shipping step is future (payment not yet done), label shows "Pendiente de despacho"
    expect(screen.getByText("Pendiente de despacho")).toBeInTheDocument();
    expect(screen.queryByText("Preparando / enviando")).not.toBeInTheDocument();
    expect(screen.getByText("Entrega pendiente")).toBeInTheDocument();
    // Tracking hint shows current step label (payment step is current)
    expect(screen.getByText("Seguimiento: Validando pago")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// i18n — Korean (ko)
// ---------------------------------------------------------------------------
describe("AccountPage – i18n Korean, unauthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage.current = "ko";
    mockCustomerRetrieve.mockRejectedValue(new Error("Unauthorized"));
    mockOrderList.mockResolvedValue({ orders: [], count: 0 });
  });

  it("shows Korean login CTA", async () => {
    render(<AccountPage />);
    expect(await screen.findByRole("link", { name: "로그인" })).toBeInTheDocument();
  });

  it("shows Korean shop CTA", async () => {
    render(<AccountPage />);
    expect(await screen.findByRole("link", { name: "쇼핑하러 가기" })).toBeInTheDocument();
  });

  it("shows Korean needs-login message", async () => {
    render(<AccountPage />);
    expect(await screen.findByText("주문 내역을 보려면 로그인이 필요합니다.")).toBeInTheDocument();
  });
});

describe("AccountPage – i18n Korean, authenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage.current = "ko";
    mockCustomerRetrieve.mockResolvedValue({
      customer: {
        first_name: "지수",
        last_name: "김",
        email: "jisoo@example.com",
        groups: [{ name: "VIP" }],
      },
    });
    mockOrderList.mockResolvedValue({
      orders: [
        {
          id: "order_ko_1",
          display_id: 77,
          status: "pending",
          payment_status: "authorized",
          fulfillment_status: "not_fulfilled",
          total: 50000,
          currency_code: "ars",
          created_at: "2026-03-01T10:00:00Z",
          promotions: [],
        },
      ],
      count: 1,
    });
  });

  it("shows Korean greeting", async () => {
    render(<AccountPage />);
    expect(await screen.findByText("안녕하세요, 지수 김")).toBeInTheDocument();
  });

  it("shows Korean logout button", async () => {
    render(<AccountPage />);
    expect(await screen.findByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("shows Korean orders heading", async () => {
    render(<AccountPage />);
    expect(await screen.findByText("내 주문")).toBeInTheDocument();
  });

  it("shows Korean promos label", async () => {
    render(<AccountPage />);
    expect(await screen.findByText("사용 가능한 프로모션")).toBeInTheDocument();
  });

  it("shows Korean price list label", async () => {
    render(<AccountPage />);
    expect(await screen.findByText("가격 등급")).toBeInTheDocument();
  });

  it("shows Korean copy label on promo button", async () => {
    render(<AccountPage />);
    await screen.findByText("내 주문");
    expect(screen.getByRole("button", { name: /AURELIA10 복사/ })).toBeInTheDocument();
  });

  it("shows Korean order prefix", async () => {
    render(<AccountPage />);
    await screen.findByText("내 주문");
    expect(screen.getByText(/주문 #77/)).toBeInTheDocument();
  });

  it("shows Korean tracking step labels", async () => {
    render(<AccountPage />);
    await screen.findByText("내 주문");
    expect(screen.getByText("주문 확인")).toBeInTheDocument();
    // payment_status "authorized" is not captured — shows "결제 확인 중" (validating), not "결제 확인됨"
    expect(screen.getByText("결제 확인 중")).toBeInTheDocument();
    expect(screen.queryByText("결제 확인됨")).not.toBeInTheDocument();
  });
});
