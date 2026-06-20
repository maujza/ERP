export type CheckoutErrors = Record<string, string>;

export type PaymentMethod = "transfer";

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  saveInfo: boolean;
};
