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
