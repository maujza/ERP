export type CheckoutErrors = Record<string, string>;

export type ShippingMethod = {
  id: string;
  label: string;
  amount: number;
  eta: string;
};

export type PaymentMethod = "mp" | "wpp" | "cash" | "transfer";

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  saveInfo: boolean;
};

export type PaymentState = {
  useShippingAsBilling: boolean;
  billingAddress: string;
  billingCity: string;
};
