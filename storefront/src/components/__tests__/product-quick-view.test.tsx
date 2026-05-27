import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ProductQuickView } from "../product-quick-view";

const mockAddToCart = vi.fn();
const mockRetrieveProduct = vi.fn();

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: "es" as const }),
}));

vi.mock("@/components/cart-provider", () => ({
  useCart: () => ({ addToCart: mockAddToCart }),
}));

vi.mock("@/lib/medusa", () => ({
  sdk: {
    store: {
      product: {
        retrieve: (...args: unknown[]) => mockRetrieveProduct(...args),
      },
    },
  },
  withStorePricingContext: (params: Record<string, unknown>) => params,
}));

const mockProduct = {
  id: "prod_1",
  title: "Aros Argolla Fina Plateada",
  description: "Argollas finas tono plateado.",
  thumbnail: "https://example.com/product.jpg",
  metadata: {
    dimensions: "20 x 20 x 2 mm",
  },
  variants: [
    {
      id: "var_small",
      title: "S - Chica (20 mm)",
      inventory_quantity: 5,
      calculated_price: { calculated_amount: 12500, original_amount: 14000 },
    },
    {
      id: "var_medium",
      title: "M - Mediana (30 mm)",
      inventory_quantity: 3,
      calculated_price: { calculated_amount: 12500, original_amount: 14000 },
    },
  ],
};

describe("ProductQuickView – renderTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetrieveProduct.mockResolvedValue({ product: mockProduct });
  });

  it("renders custom trigger content provided via renderTrigger", () => {
    render(
      <ProductQuickView
        productId="prod_1"
        renderTrigger={({ onClick }) => (
          <button type="button" onClick={onClick} data-testid="custom-trigger">
            Abrir vista rápida
          </button>
        )}
      />,
    );
    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
    expect(screen.getByText("Abrir vista rápida")).toBeInTheDocument();
  });

  it("clicking the custom trigger opens the modal and loads product details", async () => {
    render(
      <ProductQuickView
        productId="prod_1"
        renderTrigger={({ onClick }) => (
          <button type="button" onClick={onClick} data-testid="custom-trigger">
            Abrir vista rápida
          </button>
        )}
      />,
    );

    fireEvent.click(screen.getByTestId("custom-trigger"));

    await screen.findByText("Aros Argolla Fina Plateada");
    expect(mockRetrieveProduct).toHaveBeenCalledWith("prod_1", expect.anything());
  });

  it("does not render the default eye-icon trigger when renderTrigger is provided", () => {
    render(
      <ProductQuickView
        productId="prod_1"
        renderTrigger={({ onClick }) => (
          <button type="button" onClick={onClick}>
            Custom
          </button>
        )}
      />,
    );
    // The default "Ver" button should NOT be present
    expect(screen.queryByText("Ver")).toBeNull();
  });
});

describe("ProductQuickView – dotMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToCart.mockResolvedValue(undefined);
    mockRetrieveProduct.mockResolvedValue({ product: mockProduct });
  });

  it("renders a button (not a Link) when dotMode is true", () => {
    render(<ProductQuickView productId="prod_1" dotMode />);
    // dotMode renders a round button trigger, not a link
    const btn = screen.getByRole("button", { name: "Vista rapida" });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("the dot button has a white inner circle span", () => {
    render(<ProductQuickView productId="prod_1" dotMode />);
    const btn = screen.getByRole("button", { name: "Vista rapida" });
    // Inner span has h-2 w-2 rounded-full bg-white classes
    const innerSpan = btn.querySelector("span");
    expect(innerSpan).not.toBeNull();
    expect(innerSpan).toHaveClass("bg-white");
    expect(innerSpan).toHaveClass("rounded-full");
  });

  it("dot button has a dark background (bg-[#111111])", () => {
    render(<ProductQuickView productId="prod_1" dotMode />);
    const btn = screen.getByRole("button", { name: "Vista rapida" });
    expect(btn).toHaveClass("bg-[#111111]");
  });
});

describe("ProductQuickView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToCart.mockResolvedValue(undefined);
    mockRetrieveProduct.mockResolvedValue({ product: mockProduct });
  });

  it("renders an always-visible quick-view trigger", () => {
    render(<ProductQuickView productId="prod_1" />);
    expect(screen.getByRole("button", { name: "Vista rapida" })).toBeInTheDocument();
    expect(screen.getByText("Ver")).toBeInTheDocument();
  });

  it("fetches and displays product details when opened", async () => {
    render(<ProductQuickView productId="prod_1" />);

    fireEvent.click(screen.getByRole("button", { name: "Vista rapida" }));

    await screen.findByText("Aros Argolla Fina Plateada");
    expect(mockRetrieveProduct).toHaveBeenCalledWith(
      "prod_1",
      expect.objectContaining({
        fields: expect.stringContaining("+variants.calculated_price"),
      }),
    );
  });

  it("adds from quick-view without opening the cart drawer option", async () => {
    render(<ProductQuickView productId="prod_1" />);

    fireEvent.click(screen.getByRole("button", { name: "Vista rapida" }));
    await screen.findByText("Aros Argolla Fina Plateada");

    fireEvent.click(screen.getByRole("button", { name: "M - Mediana (30 mm)" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith("var_medium", 1);
    });
    expect(mockAddToCart.mock.calls[0]).toHaveLength(2);
  });
});
