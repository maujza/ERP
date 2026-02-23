import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ProductQuickView } from "./product-quick-view";

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
