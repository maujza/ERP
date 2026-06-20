"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { CheckoutChoiceModal } from "./checkout-choice-modal";
import { ContactForm } from "./contact-form";
import { OrderSummary } from "./order-summary";
import { PaymentMethodPicker } from "./payment-method-picker";
import { ShippingForm } from "./shipping-form";
import { useCheckout } from "./use-checkout";

export default function CheckoutPage() {
  const router = useRouter();
  const checkout = useCheckout();
  const { t, language, cartLines, isSubmitting } = checkout;

  const steps = language === "ko"
    ? ["연락처", "배송지", "결제"]
    : ["Contacto", "Envío", "Pago"];

  const currentStep = checkout.allShippingRequiredComplete
    ? 2
    : checkout.contactComplete
      ? 1
      : 0;

  if (cartLines.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-4 py-8">
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-semibold text-[#2a2148]">{t.emptyCartTitle}</h1>
          <p className="mt-2 text-sm text-[#5a4f7a]">{t.emptyCartDesc}</p>
          <Button asChild className="mt-5">
            <Link href="/">{t.backHome}</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <div className="bg-[#f2e6f7] pb-28 md:pb-10">
      <main className="mx-auto grid w-full max-w-[1300px] gap-5 px-4 py-6 md:grid-cols-[1fr_360px] md:px-6 md:py-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            {steps.map((step, i) => (
              <React.Fragment key={i}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  i < currentStep ? "bg-[#4660bc] text-white" :
                  i === currentStep ? "border-2 border-[#4660bc] text-[#2a2148]" :
                  "border border-[#9595db]/45 text-[#8a80ab]"
                }`}>{i + 1}</div>
                {i < steps.length - 1 && <div className={`h-px flex-1 ${i < currentStep ? "bg-[#4660bc]" : "bg-[#9595db]/30"}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <section className="space-y-4">
          <PaymentMethodPicker t={t} language={language} />

          <ContactForm
            email={checkout.email}
            setEmail={checkout.setEmail}
            onEmailBlur={checkout.onEmailBlur}
            phone={checkout.phone}
            setPhone={checkout.setPhone}
            phoneError={checkout.phoneError}
            setPhoneError={checkout.setPhoneError}
            showLoginHint={checkout.showLoginHint}
            isWhatsAppPaymentMethod={true}
            t={t}
            onLoginClick={() => router.push("/auth?next=/checkout")}
            onPhoneBlur={() => checkout.setPhoneError("")}
          />

          <ShippingForm
            contactComplete={checkout.contactComplete}
            shipping={checkout.shipping}
            setShipping={checkout.setShipping}
            shippingErrors={checkout.shippingErrors}
            onShippingBlur={checkout.onShippingBlur}
            t={t}
          />
        </section>

        <OrderSummary
          cartLines={cartLines}
          subtotal={checkout.subtotal}
          discountAmount={checkout.discountAmount}
          total={checkout.total}
          discountCode={checkout.discountCode}
          setDiscountCode={checkout.setDiscountCode}
          discountError={checkout.discountError}
          applyDiscount={checkout.applyDiscount}
          t={t}
          language={language}
          summaryOpenMobile={checkout.summaryOpenMobile}
          setSummaryOpenMobile={checkout.setSummaryOpenMobile}
        />
      </main>

      {/* Mobile submit */}
      <div className="fixed inset-x-0 bottom-0 z-45 border-t border-[#9595db]/25 bg-white p-3 md:hidden">
        <Button
          disabled={isSubmitting}
          className="w-full bg-[#25d366] hover:bg-[#1fb558]"
          onClick={() => void checkout.submitOrder()}
        >
          {t.wppSend}
        </Button>
      </div>

      {/* Desktop submit */}
      <div className="hidden md:fixed md:bottom-5 md:right-5 md:block">
        <Button
          size="lg"
          disabled={isSubmitting}
          className="bg-[#25d366] hover:bg-[#1fb558]"
          onClick={() => void checkout.submitOrder()}
        >
          {t.wppSend}
        </Button>
      </div>

      {checkout.showCheckoutChoice && (
        <CheckoutChoiceModal
          t={t}
          onGuest={() => {
            checkout.setShowCheckoutChoice(false);
            void checkout.submitOrder(true);
          }}
          onLogin={() => router.push("/auth?next=/checkout")}
          onCancel={() => checkout.setShowCheckoutChoice(false)}
        />
      )}
    </div>
  );
}
