import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AuthPage from "./page";

// ---------------------------------------------------------------------------
// Mutable language mock (hoisted so vi.mock factory can reference it)
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

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockCreateCustomer = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/medusa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/medusa")>();
  return {
    ...actual,
    sdk: {
      ...actual.sdk,
      auth: {
        ...actual.sdk.auth,
        login: (...args: unknown[]) => mockLogin(...args),
        register: (...args: unknown[]) => mockRegister(...args),
      },
      store: {
        ...actual.sdk.store,
        customer: {
          ...actual.sdk.store.customer,
          create: (...args: unknown[]) => mockCreateCustomer(...args),
        },
      },
    },
  };
});

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage.current = "es";
    window.history.pushState({}, "", "/auth?next=/checkout");
    mockLogin.mockResolvedValue("jwt-token");
    mockRegister.mockResolvedValue("reg-token");
    mockCreateCustomer.mockResolvedValue({ customer: { id: "cus_1" } });
  });

  it("redirects to `next` after successful login", async () => {
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "qa@example.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "supersecret123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Ingresar" })[1]);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });

    expect(mockPush).toHaveBeenCalledWith("/checkout");
    expect(mockRefresh).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// i18n — Spanish (es)
// ---------------------------------------------------------------------------
describe("AuthPage – i18n Spanish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage.current = "es";
    mockLogin.mockResolvedValue("jwt-token");
  });

  it("renders Spanish title in login mode", () => {
    render(<AuthPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Iniciar sesión");
  });

  it("renders Spanish tab labels", () => {
    render(<AuthPage />);
    expect(screen.getAllByRole("button", { name: "Ingresar" })).toHaveLength(2); // tab + submit
    expect(screen.getByRole("button", { name: "Registrarme" })).toBeInTheDocument();
  });

  it("renders Spanish field labels", () => {
    render(<AuthPage />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Contraseña")).toBeInTheDocument();
  });

  it("renders Spanish submit button", () => {
    render(<AuthPage />);
    // submit button with name "Ingresar" (there are two: tab + submit)
    expect(screen.getAllByRole("button", { name: "Ingresar" })).toHaveLength(2);
  });

  it("renders Spanish footer link text", () => {
    render(<AuthPage />);
    expect(screen.getByText("Ir a tienda")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// i18n — Korean (ko)
// ---------------------------------------------------------------------------
describe("AuthPage – i18n Korean", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage.current = "ko";
    mockLogin.mockResolvedValue("jwt-token");
  });

  it("renders Korean title in login mode", () => {
    render(<AuthPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("로그인");
  });

  it("renders Korean tab labels", () => {
    render(<AuthPage />);
    expect(screen.getAllByRole("button", { name: "로그인" })).toHaveLength(2); // tab + submit
    expect(screen.getByRole("button", { name: "회원 가입" })).toBeInTheDocument();
  });

  it("renders Korean field labels", () => {
    render(<AuthPage />);
    expect(screen.getByText("이메일")).toBeInTheDocument();
    expect(screen.getByText("비밀번호")).toBeInTheDocument();
  });

  it("renders Korean footer link text", () => {
    render(<AuthPage />);
    expect(screen.getByText("쇼핑하러 가기")).toBeInTheDocument();
  });

  it("shows Korean signup field labels when signup tab is clicked", () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "회원 가입" }));
    expect(screen.getByText("이름")).toBeInTheDocument();
    expect(screen.getByText("성")).toBeInTheDocument();
  });

  it("renders Korean subtitle", () => {
    render(<AuthPage />);
    expect(screen.getByText("주문 추적, 내역, 프로모션을 보려면 로그인하세요.")).toBeInTheDocument();
  });
});
