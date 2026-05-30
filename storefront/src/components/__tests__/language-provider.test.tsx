import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { LanguageProvider, useLanguage, SUPPORTED_LANGUAGES } from "../language-provider";

const STORAGE_KEY = "aurelia-language";

function TestConsumer() {
  const { language, setLanguage, toggleLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <button onClick={() => setLanguage("ko")}>Set KO</button>
      <button onClick={() => setLanguage("es")}>Set ES</button>
      <button onClick={() => toggleLanguage()}>Toggle</button>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

// ---------------------------------------------------------------------------
// LanguageProvider – initial state
// ---------------------------------------------------------------------------
describe("LanguageProvider – initial state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 'es' when localStorage is empty", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
  });

  it("reads 'ko' from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "ko");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("ko");
  });

  it("reads 'es' from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "es");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
  });

  it("defaults to 'es' for an invalid localStorage value", () => {
    localStorage.setItem(STORAGE_KEY, "fr");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
  });
});

// ---------------------------------------------------------------------------
// LanguageProvider – setLanguage
// ---------------------------------------------------------------------------
describe("LanguageProvider – setLanguage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setLanguage('ko') persists 'ko' in localStorage", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    act(() => {
      screen.getByText("Set KO").click();
      window.dispatchEvent(new Event("aurelia-language-change"));
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ko");
  });

  it("setLanguage('es') persists 'es' in localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "ko");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    act(() => {
      screen.getByText("Set ES").click();
      window.dispatchEvent(new Event("aurelia-language-change"));
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
  });
});

// ---------------------------------------------------------------------------
// LanguageProvider – toggleLanguage
// ---------------------------------------------------------------------------
describe("LanguageProvider – toggleLanguage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggleLanguage switches 'es' → 'ko'", () => {
    localStorage.setItem(STORAGE_KEY, "es");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    act(() => {
      screen.getByText("Toggle").click();
      window.dispatchEvent(new Event("aurelia-language-change"));
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ko");
  });

  it("toggleLanguage switches 'ko' → 'es'", () => {
    localStorage.setItem(STORAGE_KEY, "ko");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    act(() => {
      screen.getByText("Toggle").click();
      window.dispatchEvent(new Event("aurelia-language-change"));
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
  });

  it("toggleLanguage defaults to 'ko' when localStorage is empty (treats null as 'es')", () => {
    // no localStorage entry → treated as 'es', toggle → 'ko'
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    act(() => {
      screen.getByText("Toggle").click();
      window.dispatchEvent(new Event("aurelia-language-change"));
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ko");
  });
});

// ---------------------------------------------------------------------------
// LanguageProvider – document.documentElement.lang side-effect
// ---------------------------------------------------------------------------
describe("LanguageProvider – document.lang side-effect", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
  });

  it("sets document.documentElement.lang to 'es' by default", () => {
    render(
      <LanguageProvider>
        <span />
      </LanguageProvider>
    );
    expect(document.documentElement.lang).toBe("es");
  });

  it("sets document.documentElement.lang to 'ko' when localStorage is 'ko'", () => {
    localStorage.setItem(STORAGE_KEY, "ko");
    render(
      <LanguageProvider>
        <span />
      </LanguageProvider>
    );
    expect(document.documentElement.lang).toBe("ko");
  });
});

// ---------------------------------------------------------------------------
// useLanguage – outside of provider
// ---------------------------------------------------------------------------
describe("useLanguage – outside of LanguageProvider", () => {
  it("returns 'es' as default language", () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe("es");
  });

  it("setLanguage is a no-op function that does not throw", () => {
    const { result } = renderHook(() => useLanguage());
    expect(() => result.current.setLanguage("ko")).not.toThrow();
  });

  it("toggleLanguage is a no-op function that does not throw", () => {
    const { result } = renderHook(() => useLanguage());
    expect(() => result.current.toggleLanguage()).not.toThrow();
  });

  it("returns an object with language, setLanguage, toggleLanguage keys", () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current).toHaveProperty("language");
    expect(result.current).toHaveProperty("setLanguage");
    expect(result.current).toHaveProperty("toggleLanguage");
  });
});

// ---------------------------------------------------------------------------
// useLanguage – inside provider via renderHook
// ---------------------------------------------------------------------------
describe("useLanguage – inside provider (renderHook)", () => {
  it("returns current language from context", () => {
    localStorage.setItem(STORAGE_KEY, "ko");
    const { result } = renderHook(() => useLanguage(), { wrapper: Wrapper });
    expect(result.current.language).toBe("ko");
  });

  it("setLanguage updates localStorage", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: Wrapper });
    act(() => {
      result.current.setLanguage("ko");
      window.dispatchEvent(new Event("aurelia-language-change"));
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ko");
  });

  it("toggleLanguage updates localStorage from es to ko", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: Wrapper });
    act(() => {
      result.current.toggleLanguage();
      window.dispatchEvent(new Event("aurelia-language-change"));
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ko");
  });
});

// ---------------------------------------------------------------------------
// LanguageProvider – event subscription
// ---------------------------------------------------------------------------
describe("LanguageProvider – storage event subscription", () => {
  it("subscribes to aurelia-language-change event", () => {
    const addEventSpy = vi.spyOn(window, "addEventListener");
    render(
      <LanguageProvider>
        <span />
      </LanguageProvider>
    );
    expect(addEventSpy).toHaveBeenCalledWith(
      "aurelia-language-change",
      expect.any(Function)
    );
    addEventSpy.mockRestore();
  });

  it("subscribes to storage event", () => {
    const addEventSpy = vi.spyOn(window, "addEventListener");
    render(
      <LanguageProvider>
        <span />
      </LanguageProvider>
    );
    expect(addEventSpy).toHaveBeenCalledWith(
      "storage",
      expect.any(Function)
    );
    addEventSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// SUPPORTED_LANGUAGES export
// ---------------------------------------------------------------------------
describe("SUPPORTED_LANGUAGES", () => {
  it("is exported as an array", () => {
    expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
  });

  it("contains at least 2 entries", () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(2);
  });

  it("every entry has a string 'code' property", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(typeof lang.code).toBe("string");
      expect(lang.code.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty string 'label' property", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(typeof lang.label).toBe("string");
      expect(lang.label.length).toBeGreaterThan(0);
    }
  });

  it("first entry has code 'es' (Spanish is the default language)", () => {
    expect(SUPPORTED_LANGUAGES[0].code).toBe("es");
  });

  it("second entry has code 'ko' (Korean is the second language)", () => {
    expect(SUPPORTED_LANGUAGES[1].code).toBe("ko");
  });

  it("'es' entry has the label 'Español'", () => {
    const es = SUPPORTED_LANGUAGES.find((l) => l.code === "es");
    expect(es?.label).toBe("Español");
  });

  it("'ko' entry has the label '한국어'", () => {
    const ko = SUPPORTED_LANGUAGES.find((l) => l.code === "ko");
    expect(ko?.label).toBe("한국어");
  });

  it("all codes are unique", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

// ---------------------------------------------------------------------------
// getSnapshot — validates against SUPPORTED_LANGUAGES (updated behaviour)
// ---------------------------------------------------------------------------
describe("LanguageProvider – getSnapshot validates against SUPPORTED_LANGUAGES", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("falls back to first SUPPORTED_LANGUAGES entry for an invalid locale", () => {
    localStorage.setItem("aurelia-language", "fr");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    // 'fr' is not in SUPPORTED_LANGUAGES → falls back to SUPPORTED_LANGUAGES[0].code = 'es'
    expect(screen.getByTestId("lang")).toHaveTextContent(SUPPORTED_LANGUAGES[0].code);
  });

  it("accepts all codes listed in SUPPORTED_LANGUAGES", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      localStorage.setItem("aurelia-language", lang.code);
      const { unmount } = render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );
      expect(screen.getByTestId("lang")).toHaveTextContent(lang.code);
      unmount();
    }
  });
});
