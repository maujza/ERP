import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

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
