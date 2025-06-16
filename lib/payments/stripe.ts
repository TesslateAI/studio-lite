// lib/payments/stripe.ts

import Stripe from 'stripe';
import { getStripeByCustomerId, updateStripeSubscription } from '@/lib/db/queries';
import { updateUserKeyForPlan } from '@/lib/litellm/management';
import { PlanName } from '@/lib/litellm/plans';

// Note: createCheckoutSession and createCustomerPortalSession have been moved to actions.ts
// to prevent server-only code from being imported into client components.

interface WebhookSubscriptionObject extends Stripe.Subscription {
  current_period_end: number; // Unix timestamp in seconds
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function handleSubscriptionChange(
  subscription: WebhookSubscriptionObject
) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;
  const currentPeriodEnd = subscription.current_period_end * 1000;
  const now = Date.now();

  const stripeRecord = await getStripeByCustomerId(customerId);
  if (!stripeRecord) {
    console.error(`Stripe record not found for Stripe customer ID: ${customerId}.`);
    return;
  }
  const userId = stripeRecord.userId;

  function getProductInfo(sub: WebhookSubscriptionObject): { productId: string | null; productName: string } {
    const item = sub.items.data[0];
    if (!item) return { productId: null, productName: 'Free' };
    const productData = (item.price?.product && typeof item.price.product === 'object') ? item.price.product as Stripe.Product : null;
    return {
        productId: productData?.id || (typeof item.price.product === 'string' ? item.price.product : null),
        productName: productData?.name || 'Pro'
    };
  }

  const { productId: stripeProductId, productName } = getProductInfo(subscription);

  let effectivePlan = productName;
  if (status === 'canceled' || (status === 'active' && cancelAtPeriodEnd && currentPeriodEnd < now) || status === 'incomplete_expired') {
      effectivePlan = 'Free';
  }

  const newPlanName: PlanName = (effectivePlan.toLowerCase() as PlanName) || 'free';
  
  try {
      await updateUserKeyForPlan(userId, newPlanName);
  } catch(error) {
      console.error(`CRITICAL: Stripe plan for user ${userId} updated to ${newPlanName}, but LiteLLM key update failed.`, error);
  }

  if (status === 'active' && cancelAtPeriodEnd) {
    await updateStripeSubscription(userId, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: stripeProductId,
      planName: productName,
      subscriptionStatus: 'ending'
    });
  } else if (status === 'canceled' || (status === 'active' && cancelAtPeriodEnd && currentPeriodEnd < now)) {
    await updateStripeSubscription(userId, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: 'Free',
      subscriptionStatus: 'inactive'
    });
  } else if (status === 'active' || status === 'trialing') {
    await updateStripeSubscription(userId, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: stripeProductId,
      planName: productName,
      subscriptionStatus: status
    });
  } else if (status === 'incomplete_expired') {
    await updateStripeSubscription(userId, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: 'Free',
      subscriptionStatus: 'expired'
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
    productName: (price.product as Stripe.Product)?.name ?? 'Unknown Product',
  }));
}