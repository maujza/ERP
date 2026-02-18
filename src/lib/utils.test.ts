import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn – class name utility", () => {
  it("returns a single class name unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("combines two class names with a space", () => {
    const result = cn("foo", "bar");
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("combines multiple class names", () => {
    const result = cn("a", "b", "c", "d");
    expect(result).toContain("a");
    expect(result).toContain("b");
    expect(result).toContain("c");
    expect(result).toContain("d");
  });

  it("ignores false values", () => {
    expect(cn("foo", false)).toBe("foo");
  });

  it("ignores undefined values", () => {
    expect(cn("foo", undefined)).toBe("foo");
  });

  it("ignores null values", () => {
    // clsx accepts null as ClassValue
    expect(cn("foo", null as never)).toBe("foo");
  });

  it("ignores empty strings", () => {
    expect(cn("foo", "")).toBe("foo");
  });

  it("returns empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(false, undefined)).toBe("");
  });

  it("merges conflicting Tailwind padding classes (last wins)", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
    expect(result).not.toContain("p-4");
  });

  it("merges conflicting Tailwind text-color classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
    expect(result).not.toContain("text-red-500");
  });

  it("merges conflicting Tailwind background classes", () => {
    const result = cn("bg-white", "bg-black");
    expect(result).toBe("bg-black");
  });

  it("handles object syntax – includes truthy keys", () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toContain("foo");
    expect(result).toContain("baz");
    expect(result).not.toContain("bar");
  });

  it("handles object syntax – excludes all false keys", () => {
    const result = cn({ foo: false, bar: false });
    expect(result).toBe("");
  });

  it("handles array syntax", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("handles conditional class with ternary", () => {
    const active = true;
    expect(cn("base", active ? "active" : "inactive")).toContain("active");
    expect(cn("base", !active ? "active" : "inactive")).toContain("inactive");
  });

  it("handles conditional class with &&", () => {
    const result = cn("base", true && "extra");
    expect(result).toContain("extra");

    const result2 = cn("base", false && "extra");
    expect(result2).toBe("base");
  });

  it("accepts custom class alongside Tailwind classes", () => {
    const result = cn("custom-class", "p-4");
    expect(result).toContain("custom-class");
    expect(result).toContain("p-4");
  });
});
