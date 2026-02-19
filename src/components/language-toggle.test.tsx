/**
 * LanguageToggle unit tests
 *
 * Scalability rules under test (per UX spec):
 *  ≤1 language  → renders nothing
 *   2 languages → toggle button showing the OTHER language's label
 *  ≥3 languages → <select> dropdown listing all supported languages
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageToggle } from "./language-toggle";

// ---------------------------------------------------------------------------
// Mutable state used by the mock factory.
// vi.hoisted() ensures these are initialized before vi.mock factories run.
// ---------------------------------------------------------------------------
const { mockSupportedLanguages, mockToggleLanguage, mockSetLanguage } = vi.hoisted(() => ({
  mockSupportedLanguages: [
    { code: "es", label: "Español" },
    { code: "ko", label: "한국어" },
  ] as { code: string; label: string }[],
  mockToggleLanguage: vi.fn(),
  mockSetLanguage: vi.fn(),
}));

let mockCurrentLanguage: string = "es";

vi.mock("@/components/language-provider", () => ({
  // Pass the mutable array reference; in-place mutations are visible each render.
  SUPPORTED_LANGUAGES: mockSupportedLanguages,
  useLanguage: () => ({
    language: mockCurrentLanguage,
    setLanguage: mockSetLanguage,
    toggleLanguage: mockToggleLanguage,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers — mutate the shared array to simulate different language counts
// ---------------------------------------------------------------------------
function setTwoLanguages() {
  mockSupportedLanguages.splice(0, Infinity,
    { code: "es", label: "Español" },
    { code: "ko", label: "한국어" },
  );
}

function setOneLanguage() {
  mockSupportedLanguages.splice(0, Infinity,
    { code: "es", label: "Español" },
  );
}

function setThreeLanguages() {
  mockSupportedLanguages.splice(0, Infinity,
    { code: "es", label: "Español" },
    { code: "ko", label: "한국어" },
    { code: "pt", label: "Português" },
  );
}

// ---------------------------------------------------------------------------
// 2 languages — toggle button (current = "es")
// ---------------------------------------------------------------------------
describe("LanguageToggle – 2 languages, current es", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTwoLanguages();
    mockCurrentLanguage = "es";
  });

  it("renders a button element", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("does NOT render a select element", () => {
    render(<LanguageToggle />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("shows the OTHER language label (한국어) when current is es", () => {
    render(<LanguageToggle />);
    expect(screen.getByText("한국어")).toBeInTheDocument();
  });

  it("does NOT show the current language label (Español) in the button text", () => {
    render(<LanguageToggle />);
    expect(screen.queryByText("Español")).toBeNull();
  });

  it("calls toggleLanguage when the button is clicked", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it("does NOT call setLanguage on click (toggle path uses toggleLanguage)", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSetLanguage).not.toHaveBeenCalled();
  });

  it("is NOT fixed-positioned (lives in the header flow, not floating)", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).not.toHaveClass("fixed");
  });

  it("does NOT carry top-4 positioning class", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).not.toHaveClass("top-4");
  });

  it("does NOT carry right-4 positioning class", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).not.toHaveClass("right-4");
  });

  it("does NOT carry z-50 class", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).not.toHaveClass("z-50");
  });

  it("forwards className to the button element", () => {
    render(<LanguageToggle className="hidden md:inline-flex" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("hidden");
    expect(btn).toHaveClass("md:inline-flex");
  });

  it("prevents width collapse and label wrapping in tight header layouts", () => {
    render(<LanguageToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("shrink-0");
    expect(btn).toHaveClass("whitespace-nowrap");
  });

  it("renders without className when prop is omitted", () => {
    expect(() => render(<LanguageToggle />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2 languages — toggle button (current = "ko")
// ---------------------------------------------------------------------------
describe("LanguageToggle – 2 languages, current ko", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTwoLanguages();
    mockCurrentLanguage = "ko";
  });

  it("shows Español when current language is ko", () => {
    render(<LanguageToggle />);
    expect(screen.getByText("Español")).toBeInTheDocument();
  });

  it("does NOT show 한국어 in the button when current is ko", () => {
    render(<LanguageToggle />);
    expect(screen.queryByText("한국어")).toBeNull();
  });

  it("calls toggleLanguage when clicked", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ≤1 language → renders nothing
// ---------------------------------------------------------------------------
describe("LanguageToggle – 0 languages → renders nothing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupportedLanguages.splice(0); // clear all
    mockCurrentLanguage = "es";
  });

  it("renders nothing when SUPPORTED_LANGUAGES is empty", () => {
    const { container } = render(<LanguageToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LanguageToggle – 1 language → renders nothing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOneLanguage();
    mockCurrentLanguage = "es";
  });

  it("renders nothing when only 1 language is supported", () => {
    const { container } = render(<LanguageToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// ≥3 languages → <select> dropdown
// ---------------------------------------------------------------------------
describe("LanguageToggle – 3+ languages → select dropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setThreeLanguages();
    mockCurrentLanguage = "es";
  });

  it("renders a select element (combobox role)", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("does NOT render a plain button", () => {
    render(<LanguageToggle />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has one <option> per supported language (3 total)", () => {
    render(<LanguageToggle />);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("has an option for Español", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
  });

  it("has an option for 한국어", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("option", { name: "한국어" })).toBeInTheDocument();
  });

  it("has an option for Português", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("option", { name: "Português" })).toBeInTheDocument();
  });

  it("calls setLanguage with the selected code when dropdown changes", () => {
    render(<LanguageToggle />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ko" } });
    expect(mockSetLanguage).toHaveBeenCalledWith("ko");
  });

  it("calls setLanguage with 'pt' when Português is selected", () => {
    render(<LanguageToggle />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "pt" } });
    expect(mockSetLanguage).toHaveBeenCalledWith("pt");
  });

  it("does NOT call toggleLanguage when dropdown changes", () => {
    render(<LanguageToggle />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ko" } });
    expect(mockToggleLanguage).not.toHaveBeenCalled();
  });

  it("select is NOT fixed-positioned", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("combobox")).not.toHaveClass("fixed");
  });
});
