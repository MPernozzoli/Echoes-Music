export const STRIPE_PLANS = {
  premium_monthly: {
    price_id: "price_1TJbaSLDyBUZjAjaEESklylw",
    product_id: "prod_UIBycXCJF3PNRB",
    name: "Premium Monthly",
    price: "€9.99/mo",
    priceAmount: 9.99,
    features: ["Unlimited searches", "100 tokens/month", "Priority support"],
  },
  premium_annual: {
    price_id: "price_1TJbajLDyBUZjAjaEWAcXTHX",
    product_id: "prod_UIByOkXl3FXIIZ",
    name: "Premium Annual",
    price: "€89.99/yr",
    priceAmount: 89.99,
    features: ["Unlimited searches", "100 tokens/month", "Priority support", "Save 25%"],
  },
  tokens_50: {
    price_id: "price_1TJbb7LDyBUZjAjaSnbhOqxp",
    product_id: "prod_UIBzdydTivyNco",
    name: "50 Tokens",
    price: "€4.99",
    priceAmount: 4.99,
    tokens: 50,
  },
  tokens_120: {
    price_id: "price_1TJbbPLDyBUZjAja6Ug6CRRx",
    product_id: "prod_UIBzM97S90Mchr",
    name: "120 Tokens",
    price: "€8.99",
    priceAmount: 8.99,
    tokens: 120,
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;
