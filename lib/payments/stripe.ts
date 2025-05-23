import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Stripe as StripeType } from '@/lib/db/schema';
import {
  getStripeByCustomerId,
  getUser,
  updateStripeSubscription
} from '@/lib/db/queries';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil'
});

export async function createCheckoutSession({
  stripeRecord,
  priceId
}: {
  stripeRecord: StripeType | null;
  priceId: string;
}) {
  const user = await getUser();

  if (!user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: stripeRecord?.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true
  });

  redirect(session.url!);
}

export async function createCustomerPortalSession(stripeRecord: StripeType) {
  if (!stripeRecord.stripeCustomerId || !stripeRecord.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(stripeRecord.stripeProductId);
    if (!product.active) {
      throw new Error("Product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

  return stripe.billingPortal.sessions.create({
    customer: stripeRecord.stripeCustomerId!,
    return_url: `${process.env.BASE_URL}/settings`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  console.log('Stripe webhook subscription object:', JSON.stringify(subscription, null, 2));
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;
  const currentPeriodEnd = ((subscription as any).current_period_end || 0) * 1000; // Stripe gives seconds, JS wants ms
  const now = Date.now();

  const stripeRecord = await getStripeByCustomerId(customerId);

  if (!stripeRecord) {
    console.error('Stripe record not found for Stripe customer:', customerId);
    return;
  }

  // Helper to get productId from plan or price
  function getProductId(subscription: Stripe.Subscription) {
    const item = subscription.items.data[0];
    if (!item) return null;
    // Try plan.product first
    if (item.plan && item.plan.product) return item.plan.product as string;
    // Fallback: try price.product
    if ((item as any).price && (item as any).price.product) return (item as any).price.product as string;
    return null;
  }

  if (status === 'active' && cancelAtPeriodEnd) {
    // User canceled, but still in paid period
    const productId = getProductId(subscription);
    await updateStripeSubscription(stripeRecord.userId, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: productId,
      planName: 'Pro',
      subscriptionStatus: 'ending'
    });
  } else if (status === 'canceled' && currentPeriodEnd < now) {
    // Subscription fully ended, revert to Free
    await updateStripeSubscription(stripeRecord.userId, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: 'Free',
      subscriptionStatus: 'inactive'
    });
  } else if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan;
    const productId = getProductId(subscription);
    await updateStripeSubscription(stripeRecord.userId, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: productId,
      planName: (plan?.product as Stripe.Product).name || 'Pro',
      subscriptionStatus: status
    });
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
