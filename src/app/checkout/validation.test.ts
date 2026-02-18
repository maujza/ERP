/**
 * Tests for the checkout business logic extracted from checkout/page.tsx.
 *
 * Covers:
 *  - Email validation
 *  - Shipping field validation
 *  - Payment validation rules
 *  - Discount code application
 *  - Shipping amount calculation
 *  - BIN-based installment detection
 *  - Order total calculation
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Replication of helpers from checkout/page.tsx
// ---------------------------------------------------------------------------

const t = {
  requiredField: "Campo obligatorio",
  invalidPostal: "Codigo postal invalido",
  invalidEmail: "Email invalido",
  enterEmail: "Ingresa tu email",
  invalidCard: "Numero de tarjeta invalido",
  expiryFormat: "Formato MM/AA",
  invalidCvc: "Codigo invalido",
  selectInstallments: "Selecciona cuotas",
  requiredAddress: "Direccion requerida",
  requiredCity: "Ciudad requerida",
  enterCode: "Ingresa un codigo",
  invalidCode: "Codigo invalido",
};

function validateEmail(value: string): string {
  if (!value.trim()) return t.enterEmail;
  if (!/^\S+@\S+\.\S+$/.test(value)) return t.invalidEmail;
  return "";
}

function validateShippingField(key: string, value: string): string {
  if (!value.trim()) return t.requiredField;
  if (key === "postalCode" && value.trim().length < 4) return t.invalidPostal;
  return "";
}

type PaymentState = {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  installments: string;
  useShippingAsBilling: boolean;
  billingAddress: string;
  billingCity: string;
};

function validatePayment(
  paymentMethod: "card" | "mp",
  payment: PaymentState,
  installments: string[]
): Record<string, string> {
  const nextErrors: Record<string, string> = {};

  if (paymentMethod === "card") {
    if (!payment.cardName.trim()) nextErrors.cardName = t.requiredField;
    if (payment.cardNumber.replace(/\D/g, "").length < 16)
      nextErrors.cardNumber = t.invalidCard;
    if (!/^[0-9]{2}\/[0-9]{2}$/.test(payment.expiry))
      nextErrors.expiry = t.expiryFormat;
    if (!/^[0-9]{3,4}$/.test(payment.cvc)) nextErrors.cvc = t.invalidCvc;
    if (installments.length > 0 && !payment.installments)
      nextErrors.installments = t.selectInstallments;
    if (!payment.useShippingAsBilling) {
      if (!payment.billingAddress.trim())
        nextErrors.billingAddress = t.requiredAddress;
      if (!payment.billingCity.trim())
        nextErrors.billingCity = t.requiredCity;
    }
  }

  return nextErrors;
}

function applyDiscount(code: string, subtotal: number): {
  amount: number;
  error: string;
} {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { amount: 0, error: t.enterCode };
  if (normalized === "AURELIA10") {
    return { amount: Math.round(subtotal * 0.1), error: "" };
  }
  return { amount: 0, error: t.invalidCode };
}

function getShippingMethods(province: string, language: "es" | "ko") {
  const lower = province.toLowerCase();
  if (lower.includes("buenos")) {
    return [
      {
        id: "normal",
        label: language === "ko" ? "일반 배송" : "Envio estandar",
        amount: 3900,
        eta: "48/72h",
      },
      {
        id: "express",
        label: language === "ko" ? "익스프레스 배송" : "Envio express",
        amount: 7200,
        eta: "24h",
      },
    ];
  }
  return [
    {
      id: "normal",
      label: language === "ko" ? "전국 택배" : "Correo nacional",
      amount: 5600,
      eta: language === "ko" ? "3-5일" : "3 a 5 dias",
    },
    {
      id: "pickup",
      label: language === "ko" ? "운영사 픽업" : "Retiro por operador",
      amount: 2900,
      eta: language === "ko" ? "2-4일" : "2 a 4 dias",
    },
  ];
}

function getInstallmentOptions(
  cardNumberDigits: string,
  language: "es" | "ko"
): string[] {
  const bin = Number(cardNumberDigits.slice(0, 1));
  return bin % 2 === 0
    ? language === "ko"
      ? ["1회", "3회 무이자", "6회"]
      : ["1 cuota", "3 cuotas sin interes", "6 cuotas"]
    : language === "ko"
    ? ["1회", "3회", "12회"]
    : ["1 cuota", "3 cuotas", "12 cuotas"];
}

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------
describe("validateEmail", () => {
  it("returns enterEmail message for empty string", () => {
    expect(validateEmail("")).toBe(t.enterEmail);
  });

  it("returns enterEmail message for whitespace-only string", () => {
    expect(validateEmail("   ")).toBe(t.enterEmail);
  });

  it("returns invalidEmail for string without @", () => {
    expect(validateEmail("notanemail")).toBe(t.invalidEmail);
  });

  it("returns invalidEmail for string with @ but no domain", () => {
    expect(validateEmail("user@")).toBe(t.invalidEmail);
  });

  it("returns invalidEmail for string missing TLD", () => {
    expect(validateEmail("user@domain")).toBe(t.invalidEmail);
  });

  it("returns empty string for a valid email", () => {
    expect(validateEmail("user@example.com")).toBe("");
  });

  it("returns empty string for email with subdomain", () => {
    expect(validateEmail("user@mail.example.com")).toBe("");
  });

  it("returns empty string for email with + alias", () => {
    expect(validateEmail("user+tag@example.com")).toBe("");
  });

  it("is case-sensitive check (uppercase valid email)", () => {
    expect(validateEmail("User@Example.COM")).toBe("");
  });

  it("returns invalidEmail for email with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(t.invalidEmail);
  });
});

// ---------------------------------------------------------------------------
// validateShippingField
// ---------------------------------------------------------------------------
describe("validateShippingField", () => {
  it("returns requiredField for empty string on any field", () => {
    const fields = ["firstName", "lastName", "address", "city", "province"];
    for (const field of fields) {
      expect(validateShippingField(field, "")).toBe(t.requiredField);
    }
  });

  it("returns requiredField for whitespace-only value", () => {
    expect(validateShippingField("firstName", "   ")).toBe(t.requiredField);
  });

  it("returns empty string for a valid firstName", () => {
    expect(validateShippingField("firstName", "Maria")).toBe("");
  });

  it("returns empty string for a valid address", () => {
    expect(validateShippingField("address", "Av. Corrientes 1234")).toBe("");
  });

  // postalCode specific
  it("returns invalidPostal for postalCode shorter than 4 chars", () => {
    expect(validateShippingField("postalCode", "12")).toBe(t.invalidPostal);
    expect(validateShippingField("postalCode", "123")).toBe(t.invalidPostal);
  });

  it("returns empty string for postalCode of exactly 4 chars", () => {
    expect(validateShippingField("postalCode", "1234")).toBe("");
  });

  it("returns empty string for postalCode longer than 4 chars", () => {
    expect(validateShippingField("postalCode", "12345")).toBe("");
  });

  it("returns requiredField for empty postalCode (before length check)", () => {
    expect(validateShippingField("postalCode", "")).toBe(t.requiredField);
  });

  it("returns requiredField when postalCode is whitespace", () => {
    expect(validateShippingField("postalCode", "   ")).toBe(t.requiredField);
  });
});

// ---------------------------------------------------------------------------
// validatePayment
// ---------------------------------------------------------------------------
const validPayment: PaymentState = {
  cardName: "Juan Perez",
  cardNumber: "4111111111111111",
  expiry: "12/25",
  cvc: "123",
  installments: "1 cuota",
  useShippingAsBilling: true,
  billingAddress: "",
  billingCity: "",
};

describe("validatePayment – card method", () => {
  it("returns no errors for fully valid card payment", () => {
    const errors = validatePayment("card", validPayment, ["1 cuota"]);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("requires cardName", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, cardName: "" },
      ["1 cuota"]
    );
    expect(errors.cardName).toBe(t.requiredField);
  });

  it("requires cardName even if whitespace", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, cardName: "   " },
      ["1 cuota"]
    );
    expect(errors.cardName).toBe(t.requiredField);
  });

  it("rejects card number shorter than 16 digits", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, cardNumber: "123456789012345" }, // 15 digits
      []
    );
    expect(errors.cardNumber).toBe(t.invalidCard);
  });

  it("accepts card number with spaces/dashes if 16 digits total", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, cardNumber: "4111 1111 1111 1111" },
      []
    );
    expect(errors.cardNumber).toBeUndefined();
  });

  it("rejects expiry not in MM/YY format", () => {
    const badExpiries = ["1225", "12-25", "1/25", "123/25", "12/2025", "ab/cd"];
    for (const expiry of badExpiries) {
      const errors = validatePayment("card", { ...validPayment, expiry }, []);
      expect(errors.expiry).toBe(t.expiryFormat);
    }
  });

  it("accepts expiry in MM/YY format", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, expiry: "01/30" },
      []
    );
    expect(errors.expiry).toBeUndefined();
  });

  it("rejects CVC shorter than 3 digits", () => {
    const errors = validatePayment("card", { ...validPayment, cvc: "12" }, []);
    expect(errors.cvc).toBe(t.invalidCvc);
  });

  it("accepts 3-digit CVC", () => {
    const errors = validatePayment("card", { ...validPayment, cvc: "123" }, []);
    expect(errors.cvc).toBeUndefined();
  });

  it("accepts 4-digit CVC", () => {
    const errors = validatePayment("card", { ...validPayment, cvc: "1234" }, []);
    expect(errors.cvc).toBeUndefined();
  });

  it("rejects CVC with letters", () => {
    const errors = validatePayment("card", { ...validPayment, cvc: "12a" }, []);
    expect(errors.cvc).toBe(t.invalidCvc);
  });

  it("requires installments selection when installment options exist", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, installments: "" },
      ["1 cuota", "3 cuotas"]
    );
    expect(errors.installments).toBe(t.selectInstallments);
  });

  it("does not require installments when no options exist", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, installments: "" },
      []
    );
    expect(errors.installments).toBeUndefined();
  });

  it("requires billingAddress when useShippingAsBilling is false", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, useShippingAsBilling: false, billingAddress: "" },
      []
    );
    expect(errors.billingAddress).toBe(t.requiredAddress);
  });

  it("requires billingCity when useShippingAsBilling is false", () => {
    const errors = validatePayment(
      "card",
      { ...validPayment, useShippingAsBilling: false, billingCity: "" },
      []
    );
    expect(errors.billingCity).toBe(t.requiredCity);
  });

  it("does not require billing fields when useShippingAsBilling is true", () => {
    const errors = validatePayment(
      "card",
      {
        ...validPayment,
        useShippingAsBilling: true,
        billingAddress: "",
        billingCity: "",
      },
      []
    );
    expect(errors.billingAddress).toBeUndefined();
    expect(errors.billingCity).toBeUndefined();
  });
});

describe("validatePayment – mp (Mercado Pago) method", () => {
  it("returns no errors for mp payment regardless of card fields", () => {
    const incompletePayment: PaymentState = {
      cardName: "",
      cardNumber: "",
      expiry: "",
      cvc: "",
      installments: "",
      useShippingAsBilling: false,
      billingAddress: "",
      billingCity: "",
    };
    const errors = validatePayment("mp", incompletePayment, []);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyDiscount
// ---------------------------------------------------------------------------
describe("applyDiscount", () => {
  it("returns enterCode error for empty code", () => {
    const { error, amount } = applyDiscount("", 100000);
    expect(error).toBe(t.enterCode);
    expect(amount).toBe(0);
  });

  it("returns enterCode error for whitespace-only code", () => {
    const { error, amount } = applyDiscount("   ", 100000);
    expect(error).toBe(t.enterCode);
    expect(amount).toBe(0);
  });

  it("returns invalidCode error for unknown code", () => {
    const { error, amount } = applyDiscount("BADCODE", 100000);
    expect(error).toBe(t.invalidCode);
    expect(amount).toBe(0);
  });

  it("AURELIA10 applies 10% discount", () => {
    const { error, amount } = applyDiscount("AURELIA10", 100000);
    expect(error).toBe("");
    expect(amount).toBe(10000);
  });

  it("AURELIA10 is case-insensitive (lowercase input)", () => {
    const { error, amount } = applyDiscount("aurelia10", 50000);
    expect(error).toBe("");
    expect(amount).toBe(5000);
  });

  it("AURELIA10 discount rounds to nearest integer", () => {
    const { amount } = applyDiscount("AURELIA10", 10001);
    // 10001 * 0.1 = 1000.1 → rounds to 1000
    expect(amount).toBe(1000);
  });

  it("discount amount is 10% of the subtotal", () => {
    const subtotals = [18900, 50000, 200000, 75000];
    for (const subtotal of subtotals) {
      const { amount } = applyDiscount("AURELIA10", subtotal);
      expect(amount).toBe(Math.round(subtotal * 0.1));
    }
  });

  it("AURELIA10 with surrounding whitespace is accepted", () => {
    const { error } = applyDiscount("  AURELIA10  ", 10000);
    expect(error).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Shipping methods
// ---------------------------------------------------------------------------
describe("getShippingMethods", () => {
  it("returns 2 methods for Buenos Aires province", () => {
    const methods = getShippingMethods("Buenos Aires", "es");
    expect(methods).toHaveLength(2);
  });

  it("returns normal and express for Buenos Aires", () => {
    const methods = getShippingMethods("Buenos Aires", "es");
    const ids = methods.map((m) => m.id);
    expect(ids).toContain("normal");
    expect(ids).toContain("express");
  });

  it("normal shipping costs 3900 for Buenos Aires", () => {
    const methods = getShippingMethods("Buenos Aires", "es");
    expect(methods.find((m) => m.id === "normal")?.amount).toBe(3900);
  });

  it("express shipping costs 7200 for Buenos Aires", () => {
    const methods = getShippingMethods("Buenos Aires", "es");
    expect(methods.find((m) => m.id === "express")?.amount).toBe(7200);
  });

  it("returns 2 methods for other provinces", () => {
    const methods = getShippingMethods("Córdoba", "es");
    expect(methods).toHaveLength(2);
  });

  it("returns normal and pickup for other provinces", () => {
    const methods = getShippingMethods("Córdoba", "es");
    const ids = methods.map((m) => m.id);
    expect(ids).toContain("normal");
    expect(ids).toContain("pickup");
  });

  it("national shipping costs 5600 for other provinces", () => {
    const methods = getShippingMethods("Salta", "es");
    expect(methods.find((m) => m.id === "normal")?.amount).toBe(5600);
  });

  it("pickup costs 2900 for other provinces", () => {
    const methods = getShippingMethods("Salta", "es");
    expect(methods.find((m) => m.id === "pickup")?.amount).toBe(2900);
  });

  it("'buenos' appears case-insensitively in province name (lowercase)", () => {
    const methods = getShippingMethods("buenos aires", "es");
    const ids = methods.map((m) => m.id);
    expect(ids).toContain("express");
  });

  it("Korean labels for Buenos Aires methods", () => {
    const methods = getShippingMethods("Buenos Aires", "ko");
    expect(methods.find((m) => m.id === "normal")?.label).toBe("일반 배송");
    expect(methods.find((m) => m.id === "express")?.label).toBe("익스프레스 배송");
  });

  it("Korean labels for other province methods", () => {
    const methods = getShippingMethods("Córdoba", "ko");
    expect(methods.find((m) => m.id === "normal")?.label).toBe("전국 택배");
    expect(methods.find((m) => m.id === "pickup")?.label).toBe("운영사 픽업");
  });
});

// ---------------------------------------------------------------------------
// Installment options (BIN-based)
// ---------------------------------------------------------------------------
describe("getInstallmentOptions", () => {
  it("even first digit → 3-option plan with sin interes", () => {
    const opts = getInstallmentOptions("412345", "es");
    // 4 is even → sin interes option
    expect(opts).toContain("3 cuotas sin interes");
    expect(opts).toHaveLength(3);
  });

  it("odd first digit → 3-option plan with 12 cuotas", () => {
    const opts = getInstallmentOptions("512345", "es");
    // 5 is odd
    expect(opts).toContain("12 cuotas");
    expect(opts).not.toContain("3 cuotas sin interes");
  });

  it("first option is always '1 cuota' (es) or '1회' (ko)", () => {
    const esEven = getInstallmentOptions("200000", "es");
    const esOdd = getInstallmentOptions("100000", "es");
    const koEven = getInstallmentOptions("200000", "ko");
    const koOdd = getInstallmentOptions("100000", "ko");
    expect(esEven[0]).toBe("1 cuota");
    expect(esOdd[0]).toBe("1 cuota");
    expect(koEven[0]).toBe("1회");
    expect(koOdd[0]).toBe("1회");
  });

  it("Korean even BIN gives 무이자 option", () => {
    const opts = getInstallmentOptions("412345", "ko");
    expect(opts).toContain("3회 무이자");
  });

  it("Korean odd BIN gives 12회 option", () => {
    const opts = getInstallmentOptions("512345", "ko");
    expect(opts).toContain("12회");
  });

  it("digit 0 is even", () => {
    const opts = getInstallmentOptions("012345", "es");
    expect(opts).toContain("3 cuotas sin interes");
  });

  it("digit 2 is even", () => {
    const opts = getInstallmentOptions("212345", "es");
    expect(opts).toContain("3 cuotas sin interes");
  });

  it("digit 9 is odd", () => {
    const opts = getInstallmentOptions("912345", "es");
    expect(opts).toContain("12 cuotas");
  });
});

// ---------------------------------------------------------------------------
// Order total calculation
// ---------------------------------------------------------------------------
describe("Order total calculation", () => {
  function computeTotal(
    subtotal: number,
    shippingAmount: number,
    discountAmount: number
  ) {
    return subtotal + shippingAmount - discountAmount;
  }

  it("total = subtotal + shipping when no discount", () => {
    expect(computeTotal(50000, 3900, 0)).toBe(53900);
  });

  it("total = subtotal + shipping - discount", () => {
    expect(computeTotal(50000, 3900, 5000)).toBe(48900);
  });

  it("total equals subtotal when shipping and discount are both 0", () => {
    expect(computeTotal(30000, 0, 0)).toBe(30000);
  });

  it("total can be less than subtotal when discount exceeds shipping", () => {
    expect(computeTotal(100000, 3900, 15000)).toBe(88900);
  });

  it("AURELIA10 with shipping gives correct total", () => {
    const subtotal = 50000;
    const shipping = 3900;
    const discount = Math.round(subtotal * 0.1); // 5000
    expect(computeTotal(subtotal, shipping, discount)).toBe(48900);
  });
});

// ---------------------------------------------------------------------------
// Login hint logic
// ---------------------------------------------------------------------------
describe("login hint logic", () => {
  function shouldShowLoginHint(email: string): boolean {
    return (
      email.toLowerCase().includes("gmail") ||
      email.toLowerCase().includes("empresa")
    );
  }

  it("shows hint for gmail addresses", () => {
    expect(shouldShowLoginHint("user@gmail.com")).toBe(true);
  });

  it("shows hint for empresa addresses", () => {
    expect(shouldShowLoginHint("admin@empresa.com")).toBe(true);
  });

  it("shows hint for uppercase GMAIL", () => {
    expect(shouldShowLoginHint("user@GMAIL.com")).toBe(true);
  });

  it("does not show hint for regular domains", () => {
    expect(shouldShowLoginHint("user@hotmail.com")).toBe(false);
    expect(shouldShowLoginHint("user@yahoo.com")).toBe(false);
    expect(shouldShowLoginHint("user@example.com")).toBe(false);
  });
});
