export const STRIPE_PLANS = {
  premium_monthly: {
    price_id: "price_1TS1cGLvrRMVmRrQ4Sqamye3",
    product_id: "prod_UQtOkhToUuJFAA",
    name: "Premium Monthly",
    price: "€9.99/mo",
    priceAmount: 9.99,
    features: ["Unlimited app tokens", "Unlimited searches", "Priority support"],
  },
  premium_annual: {
    price_id: "price_1TS1cJLvrRMVmRrQkwagAU0b",
    product_id: "prod_UQtOvEkrSURxiY",
    name: "Premium Annual",
    price: "€89.99/yr",
    priceAmount: 89.99,
    features: ["Unlimited app tokens", "Unlimited searches", "Priority support", "Save 25%"],
  },
  tokens_50: {
    price_id: "price_1TS1cMLvrRMVmRrQPehHnS2o",
    product_id: "prod_UQtOxKrJQtBKc8",
    name: "65 Token",
    price: "€4.99",
    priceAmount: 4.99,
    tokens: 65,
  },
  tokens_120: {
    price_id: "price_1TS1cQLvrRMVmRrQgba4cATx",
    product_id: "prod_UQtOrUFUpiWOaq",
    name: "160 Token",
    price: "€8.99",
    priceAmount: 8.99,
    tokens: 160,
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;
