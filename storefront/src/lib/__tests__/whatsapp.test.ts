import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WHATSAPP_DRAFT_KEY,
  buildWhatsAppLink,
  saveWhatsAppDraft,
  readWhatsAppDraft,
  openWhatsAppDraft,
  type WhatsAppDraft,
} from "../whatsapp";

// ─── helpers ────────────────────────────────────────────────────────────────

const makeDraft = (overrides: Partial<WhatsAppDraft> = {}): WhatsAppDraft => ({
  message: "Hola, quiero confirmar mi pedido",
  orderId: "order_123",
  paymentMethod: "whatsapp",
  phone: "5491122334455",
  createdAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

// ─── buildWhatsAppLink ───────────────────────────────────────────────────────

describe("buildWhatsAppLink", () => {
  it("returns a wa.me URL with the correct phone and encoded message", () => {
    const url = buildWhatsAppLink("5491122334455", "Hello World");
    expect(url).toBe("https://wa.me/5491122334455?text=Hello%20World");
  });

  it("encodes special characters including #, $, and em-dash", () => {
    const msg = "Pedido #42 – $1.000";
    const url = buildWhatsAppLink("123", msg);
    expect(url).toBe(`https://wa.me/123?text=${encodeURIComponent(msg)}`);
  });

  it("encodes newlines so multi-line messages are preserved", () => {
    const msg = "Línea 1\nLínea 2";
    const url = buildWhatsAppLink("123", msg);
    expect(url).toContain(encodeURIComponent("\n"));
  });

  it("handles an empty message gracefully", () => {
    const url = buildWhatsAppLink("123", "");
    expect(url).toBe("https://wa.me/123?text=");
  });

  it("works with different phone formats (no plus prefix)", () => {
    const url = buildWhatsAppLink("1800555000", "test");
    expect(url).toContain("https://wa.me/1800555000");
  });
});

// ─── saveWhatsAppDraft ───────────────────────────────────────────────────────

describe("saveWhatsAppDraft", () => {
  it("writes the draft to localStorage under WHATSAPP_DRAFT_KEY", () => {
    const draft = makeDraft();
    saveWhatsAppDraft(draft);
    const raw = localStorage.getItem(WHATSAPP_DRAFT_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(draft);
  });

  it("overwrites an existing draft with the new one", () => {
    saveWhatsAppDraft(makeDraft({ orderId: "old-order" }));
    saveWhatsAppDraft(makeDraft({ orderId: "new-order" }));
    const stored = JSON.parse(localStorage.getItem(WHATSAPP_DRAFT_KEY)!);
    expect(stored.orderId).toBe("new-order");
  });

  it("serialises every field of WhatsAppDraft", () => {
    const draft = makeDraft();
    saveWhatsAppDraft(draft);
    const stored = JSON.parse(localStorage.getItem(WHATSAPP_DRAFT_KEY)!);
    expect(stored).toMatchObject({
      message: draft.message,
      orderId: draft.orderId,
      paymentMethod: draft.paymentMethod,
      phone: draft.phone,
      createdAt: draft.createdAt,
    });
  });
});

// ─── readWhatsAppDraft ───────────────────────────────────────────────────────

describe("readWhatsAppDraft", () => {
  it("returns null when localStorage has no entry", () => {
    expect(readWhatsAppDraft()).toBeNull();
  });

  it("returns the stored draft when all required fields are present", () => {
    const draft = makeDraft();
    saveWhatsAppDraft(draft);
    expect(readWhatsAppDraft()).toEqual(draft);
  });

  it("returns null when `message` is missing", () => {
    localStorage.setItem(
      WHATSAPP_DRAFT_KEY,
      JSON.stringify({ phone: "123", paymentMethod: "cash" }),
    );
    expect(readWhatsAppDraft()).toBeNull();
  });

  it("returns null when `phone` is missing", () => {
    localStorage.setItem(
      WHATSAPP_DRAFT_KEY,
      JSON.stringify({ message: "hi", paymentMethod: "cash" }),
    );
    expect(readWhatsAppDraft()).toBeNull();
  });

  it("returns null when `paymentMethod` is missing", () => {
    localStorage.setItem(
      WHATSAPP_DRAFT_KEY,
      JSON.stringify({ message: "hi", phone: "123" }),
    );
    expect(readWhatsAppDraft()).toBeNull();
  });

  it("defaults `orderId` to empty string when the field is absent", () => {
    localStorage.setItem(
      WHATSAPP_DRAFT_KEY,
      JSON.stringify({ message: "hi", phone: "123", paymentMethod: "whatsapp" }),
    );
    const result = readWhatsAppDraft();
    expect(result?.orderId).toBe("");
  });

  it("uses a valid ISO fallback for `createdAt` when the field is absent", () => {
    localStorage.setItem(
      WHATSAPP_DRAFT_KEY,
      JSON.stringify({ message: "hi", phone: "123", paymentMethod: "whatsapp" }),
    );
    const result = readWhatsAppDraft();
    expect(result?.createdAt).toBeDefined();
    expect(new Date(result!.createdAt).getTime()).not.toBeNaN();
  });

  it("returns null for syntactically invalid JSON", () => {
    localStorage.setItem(WHATSAPP_DRAFT_KEY, "not-json{{{");
    expect(readWhatsAppDraft()).toBeNull();
  });

  it("returns null when the stored value is a JSON array (not an object)", () => {
    localStorage.setItem(WHATSAPP_DRAFT_KEY, JSON.stringify([]));
    expect(readWhatsAppDraft()).toBeNull();
  });
});

// ─── openWhatsAppDraft ───────────────────────────────────────────────────────

describe("openWhatsAppDraft", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls window.open with the correct wa.me URL", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const draft = makeDraft({ phone: "5491122334455", message: "Confirmar pedido" });

    openWhatsAppDraft(draft);

    expect(openSpy).toHaveBeenCalledOnce();
    const [url] = openSpy.mock.calls[0];
    expect(url).toBe(buildWhatsAppLink(draft.phone, draft.message));
  });

  it("opens the URL in a new tab (_blank)", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    openWhatsAppDraft(makeDraft());

    const [, target] = openSpy.mock.calls[0];
    expect(target).toBe("_blank");
  });

  it("passes noopener,noreferrer security features", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    openWhatsAppDraft(makeDraft());

    const [, , features] = openSpy.mock.calls[0];
    expect(features).toBe("noopener,noreferrer");
  });
});
