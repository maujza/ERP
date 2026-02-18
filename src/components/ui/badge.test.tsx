import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children as text", () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  it("renders as a div element", () => {
    const { container } = render(<Badge>Badge</Badge>);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  // --- default variant ---
  it("applies default variant bg class", () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass("bg-[#ff2d55]");
  });

  it("applies default variant text-white class", () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass("text-white");
  });

  // --- outline variant ---
  it("applies outline variant border class", () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    expect(container.firstChild).toHaveClass("border");
  });

  it("applies outline variant bg-white class", () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    expect(container.firstChild).toHaveClass("bg-white");
  });

  it("outline variant does NOT have default bg class", () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    expect(container.firstChild).not.toHaveClass("bg-[#ff2d55]");
  });

  // --- glow variant ---
  it("applies glow variant bg class", () => {
    const { container } = render(<Badge variant="glow">Glow</Badge>);
    expect(container.firstChild).toHaveClass("bg-[#111111]/90");
  });

  it("applies glow variant text-white class", () => {
    const { container } = render(<Badge variant="glow">Glow</Badge>);
    expect(container.firstChild).toHaveClass("text-white");
  });

  // --- shared base classes ---
  it("always has inline-flex class", () => {
    const { container } = render(<Badge>Base</Badge>);
    expect(container.firstChild).toHaveClass("inline-flex");
  });

  it("always has rounded-full class", () => {
    const { container } = render(<Badge>Base</Badge>);
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  // --- custom className ---
  it("merges a custom className", () => {
    const { container } = render(
      <Badge className="my-custom-class">Badge</Badge>
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  // --- HTML attribute passthrough ---
  it("forwards data-testid attribute", () => {
    render(<Badge data-testid="my-badge">Badge</Badge>);
    expect(screen.getByTestId("my-badge")).toBeInTheDocument();
  });

  it("forwards aria-label attribute", () => {
    const { container } = render(
      <Badge aria-label="badge label">Badge</Badge>
    );
    expect(container.firstChild).toHaveAttribute("aria-label", "badge label");
  });

  it("renders numeric children", () => {
    render(<Badge>{42}</Badge>);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders nested JSX children", () => {
    render(
      <Badge>
        <span data-testid="inner">inner</span>
      </Badge>
    );
    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });
});
