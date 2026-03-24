import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/shop-data";

// window.matchMedia is stubbed to return matches: false (desktop) in setup.ts

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/components/product-quick-view", () => ({
  ProductQuickView: ({
    renderTrigger,
    className,
  }: {
    renderTrigger?: (props: { onClick: () => void }) => React.ReactNode;
    className?: string;
  }) => {
    if (renderTrigger) return <>{renderTrigger({ onClick: () => {} })}</>;
    return <button className={className}>Vista rapida</button>;
  },
}));

const baseProduct: Product = {
  id: "p1",
  name: "Aros Siena",
  description: "Aros dorados",
  image: "/img/p1.jpg",
  price: 10000,
  stock: 5,
  category: "Aros",
  subcategory: "Novedades",
  brand: "Aurelia",
};

function renderCard(overrides: Partial<Product> = {}, variant?: "catalog" | "featured") {
  return render(
    <ProductCard
      product={{ ...baseProduct, ...overrides }}
      language="es"
      soldOutLabel="AGOTADO"
      variant={variant}
    />,
  );
}

describe("ProductCard – basic rendering", () => {
  it("renders product name", () => {
    renderCard();
    expect(screen.getByText("Aros Siena")).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    renderCard();
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
  });

  it("image links to the product page", () => {
    renderCard();
    const imgLink = screen.getByRole("link", { name: /Aros Siena/i });
    expect(imgLink).toHaveAttribute("href", "/product/p1");
  });
});

describe("ProductCard – discount", () => {
  it("shows discounted price and original price", () => {
    renderCard({ price: 8000, originalPrice: 10000 });
    expect(screen.getByText(/8\.000/)).toBeInTheDocument();
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
  });

  it("shows discount percentage badge", () => {
    renderCard({ price: 8000, originalPrice: 10000 });
    expect(screen.getByText(/-20%/)).toBeInTheDocument();
  });

  it("does not show original price when there is no discount", () => {
    renderCard({ price: 10000 });
    const prices = screen.getAllByText(/10\.000/);
    expect(prices).toHaveLength(1);
  });
});

describe("ProductCard – out of stock", () => {
  it("shows soldOutLabel badge when stock is 0", () => {
    renderCard({ stock: 0 });
    expect(screen.getByText("AGOTADO")).toBeInTheDocument();
  });

  it("does not show soldOutLabel when in stock", () => {
    renderCard({ stock: 3 });
    expect(screen.queryByText("AGOTADO")).toBeNull();
  });
});

describe("ProductCard – image height variant", () => {
  it("applies h-52 class by default (catalog)", () => {
    const { container } = renderCard();
    expect(container.querySelector(".h-52")).toBeTruthy();
  });

  it("applies h-52 class when variant=catalog", () => {
    const { container } = renderCard({}, "catalog");
    expect(container.querySelector(".h-52")).toBeTruthy();
  });

  it("applies h-64 class when variant=featured", () => {
    const { container } = renderCard({}, "featured");
    expect(container.querySelector(".h-64")).toBeTruthy();
  });
});

describe("ProductCard – hover buttons (desktop)", () => {
  // matchMedia mock returns matches: false → isMobile=false after effect → buttons rendered

  it("renders the add-to-cart circle link on desktop", async () => {
    renderCard();
    const addLink = await screen.findByRole("link", { name: "Seleccionar opciones" });
    expect(addLink).toHaveAttribute("href", "/product/p1");
  });

  it("renders the quick-view circle button on desktop", async () => {
    renderCard();
    const qvBtn = await screen.findByRole("button", { name: "Vista rapida" });
    expect(qvBtn).toBeInTheDocument();
  });
});

describe("ProductCard – favorites heart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the favorites button with minimum 44px touch target", () => {
    const { container } = renderCard();
    const btn = screen.getByRole("button", { name: "Guardar en favoritos" });
    expect(btn).toBeInTheDocument();
    // h-11 w-11 = 44px minimum touch target per DESIGN.md
    expect(btn).toHaveClass("h-11");
    expect(btn).toHaveClass("w-11");
  });

  it("aria-pressed is false initially", () => {
    renderCard();
    const btn = screen.getByRole("button", { name: "Guardar en favoritos" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles aria-pressed and aria-label on click", () => {
    renderCard();
    const btn = screen.getByRole("button", { name: "Guardar en favoritos" });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Quitar de favoritos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("persists favorite to localStorage", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Guardar en favoritos" }));
    const stored = JSON.parse(localStorage.getItem("aurelia_favorites") ?? "[]");
    expect(stored).toContain("p1");
  });
});

describe("ProductCard – Korean language", () => {
  it("uses Korean tooltip labels", async () => {
    render(
      <ProductCard
        product={baseProduct}
        language="ko"
        soldOutLabel="품절"
      />,
    );
    const addLink = await screen.findByRole("link", { name: "옵션 선택" });
    expect(addLink).toBeInTheDocument();
  });

  it("shows Korean sold-out label", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, stock: 0 }}
        language="ko"
        soldOutLabel="품절"
      />,
    );
    expect(screen.getByText("품절")).toBeInTheDocument();
  });
});
