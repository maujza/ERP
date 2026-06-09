"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useLanguage } from "@/components/language-provider";

export function ToastList() {
  const { toasts, dismissToast } = useToast();
  const { language } = useLanguage();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex min-w-[260px] max-w-sm items-start gap-3 rounded-2xl border border-[#9595db]/25 bg-white px-4 py-3 shadow-xl"
        >
          {toast.type === "success" && (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white text-xs font-bold">
              ✓
            </span>
          )}
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-medium text-[#2a2148]">{toast.message}</p>
            <Link
              href="/checkout"
              className="text-xs font-semibold text-[#5a4f7a] hover:text-[#2a2148]"
            >
              {language === "ko" ? "장바구니 보기 →" : "Ver carrito →"}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Cerrar"
            className="mt-0.5 shrink-0 rounded-full border border-[#9595db]/25 p-1 text-[#8a80ab] hover:text-[#2a2148]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
