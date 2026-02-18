import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  // --- element type ---
  it("renders as a <button> by default", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders children text", () => {
    render(<Button>Hello World</Button>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  // --- default variant ---
  it("applies default variant background color", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-[#ff2d55]");
  });

  it("applies default variant text-white", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-white");
  });

  // --- outline variant ---
  it("applies outline variant border class", () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("applies outline variant bg-white class", () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-white");
  });

  it("applies outline variant text-[#111111] class", () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-[#111111]");
  });

  // --- ghost variant ---
  it("applies ghost variant text-[#111111] class", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-[#111111]");
  });

  it("ghost variant does not have border class", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).not.toHaveClass("border");
  });

  // --- muted variant ---
  it("applies muted variant background color", () => {
    render(<Button variant="muted">Muted</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-[#ff7a90]");
  });

  // --- sizes ---
  it("default size has h-11 class", () => {
    render(<Button>Default size</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-11");
  });

  it("sm size has h-10 class", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");
  });

  it("lg size has h-12 class", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");
  });

  it("lg size has text-base class", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-base");
  });

  // --- disabled state ---
  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("has opacity-50 class when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toHaveClass("disabled:opacity-50");
  });

  // --- event handling ---
  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // --- asChild ---
  it("renders as anchor element when asChild is used with <a>", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );
    expect(screen.getByRole("link")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/test");
  });

  // --- custom className ---
  it("merges custom className", () => {
    render(<Button className="my-extra-class">Button</Button>);
    expect(screen.getByRole("button")).toHaveClass("my-extra-class");
  });

  // --- shared base classes ---
  it("always has rounded-full class", () => {
    render(<Button>Base</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-full");
  });

  it("always has inline-flex class", () => {
    render(<Button>Base</Button>);
    expect(screen.getByRole("button")).toHaveClass("inline-flex");
  });

  it("always has font-semibold class", () => {
    render(<Button>Base</Button>);
    expect(screen.getByRole("button")).toHaveClass("font-semibold");
  });

  // --- ref forwarding ---
  it("forwards ref to button element", () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(<Button ref={ref}>Ref test</Button>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("BUTTON");
  });

  // --- displayName ---
  it("has Button displayName", () => {
    expect(Button.displayName).toBe("Button");
  });
});

// ---------------------------------------------------------------------------
// buttonVariants helper
// ---------------------------------------------------------------------------
describe("buttonVariants", () => {
  it("returns a string for default variant", () => {
    const classes = buttonVariants({ variant: "default" });
    expect(typeof classes).toBe("string");
    expect(classes.length).toBeGreaterThan(0);
  });

  it("includes default bg class", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-[#ff2d55]");
  });

  it("includes outline border class", () => {
    expect(buttonVariants({ variant: "outline" })).toContain("border");
  });

  it("includes ghost hover class", () => {
    expect(buttonVariants({ variant: "ghost" })).toContain("hover:bg-[#f0f0f0]");
  });

  it("includes muted bg class", () => {
    expect(buttonVariants({ variant: "muted" })).toContain("bg-[#ff7a90]");
  });

  it("includes sm height class", () => {
    expect(buttonVariants({ size: "sm" })).toContain("h-10");
  });

  it("includes lg height class", () => {
    expect(buttonVariants({ size: "lg" })).toContain("h-12");
  });

  it("works with no arguments (uses defaults)", () => {
    const classes = buttonVariants();
    expect(typeof classes).toBe("string");
    expect(classes).toContain("bg-[#ff2d55]"); // default variant
    expect(classes).toContain("h-11"); // default size
  });
});
