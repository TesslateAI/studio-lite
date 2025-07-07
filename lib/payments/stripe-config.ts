// Server-side Stripe price configuration
export const STRIPE_PRICE_CONFIG = {
  plus: {
    priceId: process.env.STRIPE_PLUS_PRICE_ID!,
    planName: 'Plus',
    price: '$10',
    features: [
      'All Free features',
      'Advanced AI models',
      '100 requests per minute',
      '100,000 tokens per minute',
      'Priority support',
      'Enhanced code generation'
    ]
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    planName: 'Pro',
    price: '$50',
    features: [
      'All Plus features',
      'All premium AI models',
      '500 requests per minute',
      '500,000 tokens per minute',
      'Dedicated support',
      'Custom integrations',
      'Advanced analytics'
    ]
  }
} as const;

// Export function to get price ID server-side only
export function getStripePriceId(planName: string): string {
  switch (planName.toLowerCase()) {
    case 'plus':
      return STRIPE_PRICE_CONFIG.plus.priceId;
    case 'pro':
      return STRIPE_PRICE_CONFIG.pro.priceId;
    default:
      throw new Error(`Invalid plan name: ${planName}`);
  }
}