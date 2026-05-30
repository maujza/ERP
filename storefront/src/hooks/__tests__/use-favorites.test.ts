import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "../use-favorites";

// localStorage is cleared before each test by src/test/setup.ts

describe("useFavorites", () => {
  it("starts with an empty favorites list", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it("isFavorite returns false for an unknown id", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite("p1")).toBe(false);
  });

  it("toggleFavorite adds an id", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite("p1"));
    expect(result.current.isFavorite("p1")).toBe(true);
    expect(result.current.favorites).toContain("p1");
  });

  it("toggleFavorite removes an already-favorited id", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite("p1"));
    act(() => result.current.toggleFavorite("p1"));
    expect(result.current.isFavorite("p1")).toBe(false);
    expect(result.current.favorites).not.toContain("p1");
  });

  it("persists favorites to localStorage", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite("p1"));
    const stored = JSON.parse(localStorage.getItem("aurelia_favorites") ?? "[]");
    expect(stored).toContain("p1");
  });

  it("reads existing favorites from localStorage on mount", () => {
    localStorage.setItem("aurelia_favorites", JSON.stringify(["p42"]));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite("p42")).toBe(true);
  });

  it("does not mutate the existing array (immutable update)", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite("p1"));
    const before = result.current.favorites;
    act(() => result.current.toggleFavorite("p2"));
    expect(result.current.favorites).not.toBe(before);
  });

  it("can hold multiple favorites independently", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite("p1"));
    act(() => result.current.toggleFavorite("p2"));
    expect(result.current.isFavorite("p1")).toBe(true);
    expect(result.current.isFavorite("p2")).toBe(true);
  });
});
