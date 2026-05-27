import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuantitySelector } from "../quantity-selector";

// ---------------------------------------------------------------------------
// QuantitySelector unit tests
//
// Covers:
//  - Rendering: decrease/increase buttons and number input
//  - Decrease button: clamps at 1 (min)
//  - Increase button: clamps at max
//  - Direct input: accepts valid values, clamps, skips NaN
//  - Blur handler: resets to 1 on invalid/empty input
// ---------------------------------------------------------------------------

describe("QuantitySelector – rendering", () => {
  const defaultProps = {
    qty: 2,
    max: 10,
    decreaseLabel: "Reducir",
    increaseLabel: "Aumentar",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the decrease button with correct aria-label", () => {
    render(<QuantitySelector {...defaultProps} />);
    expect(screen.getByLabelText("Reducir")).toBeInTheDocument();
  });

  it("renders the increase button with correct aria-label", () => {
    render(<QuantitySelector {...defaultProps} />);
    expect(screen.getByLabelText("Aumentar")).toBeInTheDocument();
  });

  it("renders the number input with the current qty value", () => {
    render(<QuantitySelector {...defaultProps} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(2);
  });

  it("sets input min attribute to 1", () => {
    render(<QuantitySelector {...defaultProps} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "1");
  });

  it("sets input max attribute to the max prop value", () => {
    render(<QuantitySelector {...defaultProps} max={5} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("max", "5");
  });
});

// ---------------------------------------------------------------------------
// Decrease button
// ---------------------------------------------------------------------------
describe("QuantitySelector – decrease button", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onChange with qty - 1 when decrease is clicked", () => {
    render(<QuantitySelector qty={3} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Reducir"));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("clamps to 1 when qty is already 1 (cannot go below 1)", () => {
    render(<QuantitySelector qty={1} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Reducir"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("clamps to 1 when qty is 0 (defensive edge case)", () => {
    render(<QuantitySelector qty={0} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Reducir"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("calls onChange exactly once per click", () => {
    render(<QuantitySelector qty={5} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Reducir"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Increase button
// ---------------------------------------------------------------------------
describe("QuantitySelector – increase button", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onChange with qty + 1 when increase is clicked", () => {
    render(<QuantitySelector qty={3} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Aumentar"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("clamps to max when qty is already at max", () => {
    render(<QuantitySelector qty={10} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Aumentar"));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("clamps to max when qty exceeds max (defensive edge case)", () => {
    render(<QuantitySelector qty={15} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Aumentar"));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("calls onChange exactly once per click", () => {
    render(<QuantitySelector qty={5} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Aumentar"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("works correctly from qty=1 to qty=2", () => {
    render(<QuantitySelector qty={1} max={5} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Aumentar"));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// Direct input (onChange on the number input)
// ---------------------------------------------------------------------------
describe("QuantitySelector – direct input change", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onChange with the parsed integer value for a valid input", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("clamps value to max when typed value exceeds max", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "99" } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("clamps value to 1 when typed value is 0", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("does NOT call onChange when the typed value is NaN (e.g. empty string during typing)", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does NOT call onChange when typed value is a non-numeric string", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "abc" } });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Blur handler — reset to 1 on invalid input
// ---------------------------------------------------------------------------
describe("QuantitySelector – blur handler", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onChange(1) on blur when the input's value is NaN (simulate via direct event)", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    // jsdom type=number inputs clamp invalid strings; fire blur with empty value directly
    fireEvent.blur(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("calls onChange(1) on blur when the target value is a non-numeric string", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.blur(input, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("does NOT call onChange on blur when valid input was entered (onChange was already called on change)", () => {
    render(<QuantitySelector qty={2} max={10} decreaseLabel="Reducir" increaseLabel="Aumentar" onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });
    onChange.mockClear();
    fireEvent.blur(input);
    // blur handler: parseInt("5") is not NaN and not < 1 → no extra onChange call
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Korean aria-labels
// ---------------------------------------------------------------------------
describe("QuantitySelector – internationalized labels", () => {
  it("accepts Korean aria-labels for decrease and increase", () => {
    const onChange = vi.fn();
    render(
      <QuantitySelector
        qty={1}
        max={5}
        decreaseLabel="감소"
        increaseLabel="증가"
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText("감소")).toBeInTheDocument();
    expect(screen.getByLabelText("증가")).toBeInTheDocument();
  });
});
