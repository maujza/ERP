import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import CheckoutPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    items: [{ productId: "p1", quantity: 1 }],
    subtotal: 12000,
  }),
}));

vi.mock("@/lib/shop-data", () => ({
  getProductById: () => ({
    id: "p1",
    name: "Aros Siena",
    image: "/img/p1.jpg",
    price: 12000,
    stock: 10,
  }),
  getProductName: () => "Aros Siena",
  formatArs: (value: number) => `$${value}`,
  translateLabel: (value: string) => value,
}));

describe("CheckoutPage step headings", () => {
  it("uses darker heading color for all step titles", () => {
    render(<CheckoutPage />);

    const steps = [
      "Paso 1 - Contacto",
      "Paso 2 - Dirección de envío",
      "Paso 3 - Método de envío",
      "Paso 4 - Pago",
    ];

    steps.forEach((step) => {
      const heading = screen.getByText(step);
      expect(heading).toHaveClass("text-[#3f3f3f]");
      expect(heading).not.toHaveClass("text-[#666666]");
    });
  });
});
