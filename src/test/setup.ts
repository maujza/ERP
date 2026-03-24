import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// jsdom doesn't implement window.matchMedia — provide a no-op stub
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Reset localStorage between tests
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// Silence Next.js image/link console errors in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (
    msg.includes("Warning:") ||
    msg.includes("ReactDOMTestUtils") ||
    msg.includes("act(")
  ) {
    return;
  }
  originalConsoleError(...args);
};
