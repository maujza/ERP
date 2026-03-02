import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import OrderConfirmationPage from "./page";

// ─── mocks ───────────────────────────────────────────────────────────────────

const mockClientFetch = vi.fn();
const mockReadDraft = vi.fn();
const mockOpenDraft = vi.fn();

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

vi.mock("@/lib/whatsapp", () => ({
  readWhatsAppDraft: () => mockReadDraft(),
  openWhatsAppDraft: (...args: unknown[]) => mockOpenDraft(...args),
}));

vi.mock("@/lib/medusa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/medusa")>();
  return {
    ...actual,
    sdk: {
      ...actual.sdk,
      client: {
        fetch: (...args: unknown[]) => mockClientFetch(...args),
      },
    },
  };
});

// ─── helpers ─────────────────────────────────────────────────────────────────

const DRAFT = {
  message: "Quiero confirmar mi pedido",
  orderId: "order_test_123",
  paymentMethod: "whatsapp",
  phone: "5491122334455",
  createdAt: "2024-01-01T00:00:00.000Z",
};

function setLocation(search: string) {
  delete (window as unknown as { location?: unknown }).location;
  (window as unknown as { location: { search: string; href: string } }).location = {
    search,
    href: "",
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("OrderConfirmationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLocation("?wa=1&order_id=order_test_123");
    mockReadDraft.mockReturnValue(DRAFT);
  });

  // ── static content ──────────────────────────────────────────────────────────

  describe("static content", () => {
    it("renders the confirmed label and thank-you heading", () => {
      render(<OrderConfirmationPage />);
      expect(screen.getByText("Orden confirmada")).toBeInTheDocument();
      expect(screen.getByText("Gracias por tu compra")).toBeInTheDocument();
    });

    it("shows the order ID from the query string", () => {
      render(<OrderConfirmationPage />);
      expect(screen.getByText("N° pedido: order_test_123")).toBeInTheDocument();
    });

    it("does not show an order ID line when the param is absent", () => {
      setLocation("?wa=1");
      render(<OrderConfirmationPage />);
      expect(screen.queryByText(/N° pedido/)).not.toBeInTheDocument();
    });

    it("shows Seguir comprando link pointing to /catalog", () => {
      render(<OrderConfirmationPage />);
      expect(screen.getByRole("link", { name: "Seguir comprando" })).toHaveAttribute(
        "href",
        "/catalog",
      );
    });

    it("shows Volver al home link pointing to /", () => {
      render(<OrderConfirmationPage />);
      expect(screen.getByRole("link", { name: "Volver al home" })).toHaveAttribute("href", "/");
    });
  });

  // ── WhatsApp section visibility ─────────────────────────────────────────────

  describe("WhatsApp section visibility", () => {
    it("shows both action buttons when wa=1 and a draft exists", () => {
      render(<OrderConfirmationPage />);
      expect(screen.getByRole("button", { name: "Reintentar por WhatsApp" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Notificar al agente" })).toBeInTheDocument();
    });

    it("hides the section when wa param is absent", () => {
      setLocation("?order_id=order_test_123");
      render(<OrderConfirmationPage />);
      expect(
        screen.queryByRole("button", { name: "Reintentar por WhatsApp" }),
      ).not.toBeInTheDocument();
    });

    it("hides the section when wa=0", () => {
      setLocation("?wa=0&order_id=order_test_123");
      render(<OrderConfirmationPage />);
      expect(
        screen.queryByRole("button", { name: "Reintentar por WhatsApp" }),
      ).not.toBeInTheDocument();
    });

    it("hides the section when no draft is stored in localStorage", () => {
      mockReadDraft.mockReturnValue(null);
      render(<OrderConfirmationPage />);
      expect(
        screen.queryByRole("button", { name: "Reintentar por WhatsApp" }),
      ).not.toBeInTheDocument();
    });
  });

  // ── Reintentar por WhatsApp ─────────────────────────────────────────────────

  describe("Reintentar por WhatsApp button", () => {
    it("calls openWhatsAppDraft with the stored draft", () => {
      render(<OrderConfirmationPage />);
      fireEvent.click(screen.getByRole("button", { name: "Reintentar por WhatsApp" }));
      expect(mockOpenDraft).toHaveBeenCalledOnce();
      expect(mockOpenDraft).toHaveBeenCalledWith(DRAFT);
    });

    it("does not call sdk.client.fetch", () => {
      render(<OrderConfirmationPage />);
      fireEvent.click(screen.getByRole("button", { name: "Reintentar por WhatsApp" }));
      expect(mockClientFetch).not.toHaveBeenCalled();
    });
  });

  // ── Notificar al agente ─────────────────────────────────────────────────────

  describe("Notificar al agente button", () => {
    it("calls sdk.client.fetch with the correct endpoint and body", async () => {
      mockClientFetch.mockResolvedValue({ ok: true });
      render(<OrderConfirmationPage />);

      fireEvent.click(screen.getByRole("button", { name: "Notificar al agente" }));

      await waitFor(() => {
        expect(mockClientFetch).toHaveBeenCalledWith("/store/notify-agent", {
          method: "POST",
          body: { order_id: "order_test_123" },
        });
      });
    });

    it("shows success text and disables button after successful notification", async () => {
      mockClientFetch.mockResolvedValue({ ok: true });
      render(<OrderConfirmationPage />);

      fireEvent.click(screen.getByRole("button", { name: "Notificar al agente" }));

      await waitFor(() => {
        const btn = screen.getByRole("button", { name: "Agente notificado ✓" });
        expect(btn).toBeDisabled();
      });
    });

    it("does not allow a second click after success", async () => {
      mockClientFetch.mockResolvedValue({ ok: true });
      render(<OrderConfirmationPage />);

      fireEvent.click(screen.getByRole("button", { name: "Notificar al agente" }));
      await waitFor(() => screen.getByRole("button", { name: "Agente notificado ✓" }));

      fireEvent.click(screen.getByRole("button", { name: "Agente notificado ✓" }));
      expect(mockClientFetch).toHaveBeenCalledTimes(1);
    });

    it("shows error text and keeps button enabled on failure", async () => {
      mockClientFetch.mockRejectedValue(new Error("Network error"));
      render(<OrderConfirmationPage />);

      fireEvent.click(screen.getByRole("button", { name: "Notificar al agente" }));

      await waitFor(() => {
        const btn = screen.getByRole("button", { name: "Error al notificar — reintentar" });
        expect(btn).not.toBeDisabled();
      });
    });

    it("allows retry after an error", async () => {
      mockClientFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue({ ok: true });
      render(<OrderConfirmationPage />);

      fireEvent.click(screen.getByRole("button", { name: "Notificar al agente" }));
      await waitFor(() => screen.getByRole("button", { name: "Error al notificar — reintentar" }));

      fireEvent.click(screen.getByRole("button", { name: "Error al notificar — reintentar" }));
      await waitFor(() => screen.getByRole("button", { name: "Agente notificado ✓" }));

      expect(mockClientFetch).toHaveBeenCalledTimes(2);
    });

    it("does not fire a second request if clicked while loading", async () => {
      let resolveFirst!: (value: unknown) => void;
      const pending = new Promise((r) => {
        resolveFirst = r;
      });
      mockClientFetch.mockReturnValue(pending);

      render(<OrderConfirmationPage />);
      const btn = screen.getByRole("button", { name: "Notificar al agente" });

      fireEvent.click(btn);
      fireEvent.click(btn); // second click while loading

      resolveFirst({ ok: true });

      await waitFor(() => screen.getByRole("button", { name: "Agente notificado ✓" }));
      expect(mockClientFetch).toHaveBeenCalledTimes(1);
    });
  });
});
