import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AuthPage from "./page";

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
