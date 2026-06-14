import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useCollections } from "../use-collections";

// Controllable mock for the Medusa store collection list call.
const mockList = vi.fn();

vi.mock("@/lib/medusa", () => ({
  sdk: {
    store: {
      collection: {
        list: (...args: unknown[]) => mockList(...args),
      },
    },
  },
}));

describe("useCollections", () => {
  beforeEach(() => {
    mockList.mockReset();
  });

  it("starts in a loading state with no collections", () => {
    mockList.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useCollections());
    expect(result.current.loading).toBe(true);
    expect(result.current.collections).toEqual([]);
    expect(result.current.error).toBe(false);
  });

  it("maps fetched collections to {id, title, handle}", async () => {
    mockList.mockResolvedValue({
      collections: [
        { id: "pcol_1", title: "Novedades", handle: "novedades" },
        { id: "pcol_2", title: "Best Sellers", handle: "best-sellers" },
      ],
    });
    const { result } = renderHook(() => useCollections());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.collections).toEqual([
      { id: "pcol_1", title: "Novedades", handle: "novedades" },
      { id: "pcol_2", title: "Best Sellers", handle: "best-sellers" },
    ]);
    expect(result.current.error).toBe(false);
  });

  it("defaults missing title/handle to empty strings", async () => {
    mockList.mockResolvedValue({
      collections: [{ id: "pcol_3", title: null, handle: null }],
    });
    const { result } = renderHook(() => useCollections());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.collections).toEqual([{ id: "pcol_3", title: "", handle: "" }]);
  });

  it("sets error and an empty list when the request rejects (never throws)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockList.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useCollections());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.collections).toEqual([]);
  });

  it("requests id, title, and handle fields with a high limit", async () => {
    mockList.mockResolvedValue({ collections: [] });
    renderHook(() => useCollections());

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(mockList).toHaveBeenCalledWith({ limit: 100, fields: "id,title,handle" });
  });
});
