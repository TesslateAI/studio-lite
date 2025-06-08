// lib/payments/stripe.ts

import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Stripe as StripeTypeSchema } from '@/lib/db/schema';
import {
  getStripeByCustomerId,
  getUser,
  updateStripeSubscription
} from '@/lib/db/queries';
import { updateUserKeyForPlan } from '@/lib/litellm/management';
import { PlanName } from '@/lib/litellm/plans';

// Define the expected shape for the subscription object from webhooks
// This ensures TypeScript knows about current_period_end
interface WebhookSubscriptionObject extends Stripe.Subscription {
  current_period_end: number; // Unix timestamp in seconds
  // Add any other fields you rely on that might not be in the base Stripe.Subscription
}


export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil'
});

export async function createCheckoutSession({
  stripeRecord,
  priceId
}: {
  stripeRecord: StripeTypeSchema | null;
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
    cancel_url: `${process.env.BASE_URL}/pricing/cancel`,
    customer: stripeRecord?.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true
  });

  if (!session.url) {
    throw new Error("Stripe session URL is null.");
  }
  redirect(session.url);
}

export async function createCustomerPortalSession(stripeRecord: StripeTypeSchema): Promise<void> {
  if (!stripeRecord.stripeCustomerId) {
    console.warn(`User ${stripeRecord.userId} does not have a Stripe Customer ID. Redirecting to settings.`);
    redirect('/settings?error=no_stripe_customer');
    return;
  }

  let configuration: Stripe.BillingPortal.Configuration;

  const existingConfigs = await stripe.billingPortal.configurations.list({
    active: true,
    is_default: true,
    limit: 1
  });

  if (existingConfigs.data.length > 0) {
    configuration = existingConfigs.data[0];
    console.log(`Using existing default billing portal configuration: ${configuration.id}`);
  } else {
    const anyActiveConfigs = await stripe.billingPortal.configurations.list({
        active: true,
        limit: 1
    });
    if (anyActiveConfigs.data.length > 0) {
        configuration = anyActiveConfigs.data[0];
        console.log(`Using existing active (but not marked default) billing portal configuration: ${configuration.id}`);
    } else {
      console.log("No active billing portal configuration found, creating a new one.");

      const products = await stripe.products.list({ active: true, limit: 10 });
      const proProduct = products.data.find(p => p.name.toLowerCase().includes('pro'));

      let createParams: Stripe.BillingPortal.ConfigurationCreateParams = {
        business_profile: {
          headline: 'Manage your Tesslate Designer subscription'
        },
        features: {
          invoice_history: { enabled: true },
          customer_update: { enabled: true, allowed_updates: ['email', 'address', 'phone', 'tax_id'] },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true, mode: 'at_period_end', proration_behavior: 'none' },
          subscription_update: { enabled: false }
        },
      };

      if (proProduct) {
        const prices = await stripe.prices.list({ product: proProduct.id, active: true });
        if (prices.data.length > 0) {
          createParams.features.subscription_update = {
            enabled: true,
            default_allowed_updates: ['price'],
            proration_behavior: 'create_prorations',
            products: [{ product: proProduct.id, prices: prices.data.map(p => p.id) }]
          };
        } else {
          console.warn(`Pro product ${proProduct.id} found, but it has no active prices. Subscription updates will be limited.`);
        }
      } else {
        console.warn("No 'Pro' product found for billing portal configuration. Subscription updates via portal might be limited.");
      }
      
      try {
        configuration = await stripe.billingPortal.configurations.create(createParams);
        console.log(`Created new billing portal configuration: ${configuration.id}.`);
      } catch (error) {
          console.error("Error creating new billing portal configuration:", error);
          redirect('/settings?error=portal_config_failure');
          return;
      }
    }
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeRecord.stripeCustomerId!,
    return_url: `${process.env.BASE_URL}/settings`,
    configuration: configuration.id
  });

  if (!portalSession.url) {
    console.error("Failed to create customer portal session: URL is null.");
    redirect('/settings?error=portal_session_failure');
    return;
  }
  redirect(portalSession.url);
}


export async function handleSubscriptionChange(
  subscription: WebhookSubscriptionObject // Use the more specific type here
) {
  console.log('Stripe webhook subscription object (first 500 chars):', JSON.stringify(subscription, null, 2).substring(0,500)); // Log only part for brevity
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  const currentPeriodEndTimestamp = subscription.current_period_end;
  const currentPeriodEnd = currentPeriodEndTimestamp * 1000; // Convert to ms
  
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

    let productId: string | null = null;
    let productName: string = 'Free';

    const productFromPrice = (item.price?.product && typeof item.price.product === 'object') ? item.price.product as Stripe.Product : null;
    const productFromPlan = (item.plan?.product && typeof item.plan.product === 'object') ? item.plan.product as Stripe.Product : null;
    
    const productData = productFromPrice || productFromPlan;

    if (productData) {
        productId = productData.id;
        productName = productData.name || 'Pro';
    } else {
        if (item.price?.product && typeof item.price.product === 'string') {
            productId = item.price.product;
        } else if (item.plan?.product && typeof item.plan.product === 'string') {
            productId = item.plan.product;
        }
        if (productId && (productName === 'Free') && (sub.status === 'active' || sub.status === 'trialing')) {
            productName = 'Pro';
        }
    }
    return { productId, productName };
  }

  const { productId: stripeProductId, productName } = getProductInfo(subscription);

  // -- START: ADDED THIS SECTION --
  // Determine the new plan name for LiteLLM and update the key
  let effectivePlan = productName;
  if (status === 'canceled' || (status === 'active' && cancelAtPeriodEnd && currentPeriodEnd < now) || status === 'incomplete_expired') {
      effectivePlan = 'Free';
  }

  const newPlanName: PlanName = (effectivePlan.toLowerCase() as PlanName) || 'free';
  
  try {
      await updateUserKeyForPlan(userId, newPlanName);
  } catch(error) {
      console.error(`CRITICAL: Stripe plan for user ${userId} updated to ${newPlanName}, but LiteLLM key update failed.`, error);
      // Log this error for manual intervention.
  }
  // -- END: ADDED THIS SECTION --


  if (status === 'active' && cancelAtPeriodEnd) {
    await updateStripeSubscription(stripeRecord.userId, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: stripeProductId,
      planName: productName || 'Pro',
      subscriptionStatus: 'ending'
    });
  } else if (status === 'canceled' || (status === 'active' && cancelAtPeriodEnd && currentPeriodEnd < now)) {
    await updateStripeSubscription(stripeRecord.userId, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: 'Free',
      subscriptionStatus: 'inactive'
    });
  } else if (status === 'active' || status === 'trialing') {
    await updateStripeSubscription(stripeRecord.userId, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: stripeProductId,
      planName: productName || 'Pro', // Ensure planName is a string
      subscriptionStatus: status
    });
  } else if (status === 'incomplete' && subscription.latest_invoice) {
    console.log(`Subscription ${subscriptionId} for customer ${customerId} is incomplete. Latest invoice: ${subscription.latest_invoice}`);
    await updateStripeSubscription(stripeRecord.userId, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: stripeProductId,
      planName: productName || 'Pro',
      subscriptionStatus: 'incomplete'
    });
  } else if (status === 'incomplete_expired') {
    console.log(`Subscription ${subscriptionId} for customer ${customerId} has expired due to incomplete payment.`);
    await updateStripeSubscription(stripeRecord.userId, {
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
    productId:
      typeof price.product === 'string' ? price.product : (price.product as Stripe.Product).id,
    productName: (typeof price.product === 'object' && (price.product as Stripe.Product).name) ? (price.product as Stripe.Product).name : 'Unknown Product',
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
        : (product.default_price as Stripe.Price)?.id || null
  }));
}