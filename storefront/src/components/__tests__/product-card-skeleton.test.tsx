import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCardSkeleton } from "../product-card-skeleton";

describe("ProductCardSkeleton", () => {
  it("renders without throwing", () => {
    expect(() => render(<ProductCardSkeleton />)).not.toThrow();
  });

  it("contains animated pulse elements", () => {
    const { container } = render(<ProductCardSkeleton />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders a card-like wrapper element", () => {
    const { container } = render(<ProductCardSkeleton />);
    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass("rounded-2xl");
  });
});
