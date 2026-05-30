/**
 * whatsapp.ts — WhatsApp deep-link builder and draft persistence helpers
 *
 * When a customer chooses "pay via WhatsApp" at checkout, the storefront:
 *   1. Builds a wa.me deep link with a pre-filled message (buildWhatsAppLink)
 *   2. Saves a draft of the pending order to localStorage (saveWhatsAppDraft)
 *   3. Opens the link in a new tab (openWhatsAppDraft)
 *
 * The draft is saved to localStorage so it survives a page refresh — the customer
 * can return to the site later and the order details are still available.
 *
 * Server-side note: localStorage is only available in the browser.
 * Every function that touches localStorage guards with `typeof window === "undefined"`
 * to safely run in Next.js server-side rendering (SSR) without crashing.
 *
 * No external SDK or API calls are made here — this file is pure utility functions.
 */

export const WHATSAPP_DRAFT_KEY = "aurelia-whatsapp-draft";

export type WhatsAppDraft = {
  message: string;
  orderId: string;
  paymentMethod: string;
  phone: string;
  createdAt: string;
};

export function buildWhatsAppLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function saveWhatsAppDraft(draft: WhatsAppDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WHATSAPP_DRAFT_KEY, JSON.stringify(draft));
}

export function readWhatsAppDraft(): WhatsAppDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(WHATSAPP_DRAFT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<WhatsAppDraft>;
    if (!parsed.message || !parsed.phone || !parsed.paymentMethod) return null;
    return {
      message: parsed.message,
      orderId: parsed.orderId ?? "",
      paymentMethod: parsed.paymentMethod,
      phone: parsed.phone,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function openWhatsAppDraft(draft: WhatsAppDraft) {
  const url = buildWhatsAppLink(draft.phone, draft.message);
  window.open(url, "_blank", "noopener,noreferrer");
}
