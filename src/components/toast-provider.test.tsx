import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "./toast-provider";

// ---------------------------------------------------------------------------
// Safe defaults outside provider
// ---------------------------------------------------------------------------
describe("useToast – outside provider (safe defaults)", () => {
  it("returns toasts array without throwing", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it("returns showToast function without throwing", () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.showToast).toBe("function");
  });

  it("returns dismissToast function without throwing", () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.dismissToast).toBe("function");
  });

  it("calling showToast outside provider does not throw", () => {
    const { result } = renderHook(() => useToast());
    expect(() => result.current.showToast({ message: "test", type: "success" })).not.toThrow();
  });

  it("calling dismissToast outside provider does not throw", () => {
    const { result } = renderHook(() => useToast());
    expect(() => result.current.dismissToast("any-id")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Within provider
// ---------------------------------------------------------------------------
function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe("useToast – within ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with an empty toasts array", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("showToast adds a toast to the list", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "Item added!", type: "success" });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Item added!");
  });

  it("toast has an id field", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "Hello", type: "success" });
    });

    expect(result.current.toasts[0].id).toBeDefined();
    expect(typeof result.current.toasts[0].id).toBe("string");
  });

  it("toast has a message field", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "Check this out", type: "error" });
    });

    expect(result.current.toasts[0].message).toBe("Check this out");
  });

  it("toast has a type field", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "Nice!", type: "success" });
    });

    expect(result.current.toasts[0].type).toBe("success");
  });

  it("dismissToast removes a toast by id", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "Remove me", type: "success" });
    });

    const id = result.current.toasts[0].id;

    act(() => {
      result.current.dismissToast(id);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("dismissToast only removes the targeted toast", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "First", type: "success" });
      result.current.showToast({ message: "Second", type: "error" });
    });

    const firstId = result.current.toasts[0].id;

    act(() => {
      result.current.dismissToast(firstId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Second");
  });

  it("toast is auto-dismissed after 2500ms", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "Auto dismiss", type: "success" });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("toast is still present before 2500ms", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "Still here", type: "success" });
    });

    act(() => {
      vi.advanceTimersByTime(2499);
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it("multiple toasts can stack", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "First", type: "success" });
      result.current.showToast({ message: "Second", type: "success" });
      result.current.showToast({ message: "Third", type: "error" });
    });

    expect(result.current.toasts).toHaveLength(3);
  });

  it("each stacked toast has a unique id", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast({ message: "A", type: "success" });
      result.current.showToast({ message: "B", type: "success" });
    });

    const ids = result.current.toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
