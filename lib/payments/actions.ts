'use server';

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { stripe as stripeTable, Stripe as StripeTypeSchema } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from './stripe';
import Stripe from 'stripe';
import { validatePlanName } from '@/lib/validation/stripe';

// Server-side price ID mapping
const PLAN_PRICE_MAP: Record<string, string> = {
  plus: process.env.STRIPE_PLUS_PRICE_ID!,
  pro: process.env.STRIPE_PRO_PRICE_ID!
};

function getPriceIdForPlan(planName: string): string {
  const validatedPlan = validatePlanName(planName);
  const priceId = PLAN_PRICE_MAP[validatedPlan];
  
  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${validatedPlan}`);
  }
  
  return priceId;
}

async function createCheckoutSession({
  stripeRecord,
  priceId,
  creatorCode,
  referralCode
}: {
  stripeRecord: StripeTypeSchema | null;
  priceId: string;
  creatorCode?: string;
  referralCode?: string;
}) {
  const user = await getUser();

  if (!user) {
    const params = new URLSearchParams({
      redirect: 'checkout',
      priceId: priceId,
      ...(creatorCode && { creator: creatorCode }),
      ...(referralCode && { ref: referralCode })
    });
    redirect(`/sign-up?${params.toString()}`);
    return; // Add return to satisfy TypeScript
  }

  const baseUrl = process.env.BASE_URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
  
  const metadata: Record<string, string> = {
    userId: user.id
  };
  
  if (creatorCode) {
    metadata.creatorCode = creatorCode;
    metadata.type = 'creator_referral';
  } else if (referralCode) {
    metadata.referralCode = referralCode;
    metadata.type = 'user_referral';
  }
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/stripe/cancel`,
    customer: stripeRecord?.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true,
    metadata,
    subscription_data: {
      metadata
    },
    ui_mode: 'hosted',
    locale: 'auto',
    custom_text: {
      submit: {
        message: 'Complete your subscription upgrade'
      }
    },
    // Light theme styling
    payment_method_configuration: undefined,
  });

  if (!session.url) {
    throw new Error("Stripe session URL is null.");
  }
  redirect(session.url);
}

async function createCustomerPortalSession(stripeRecord: StripeTypeSchema): Promise<void> {
  if (!stripeRecord.stripeCustomerId) {
    console.warn(`User ${stripeRecord.userId} does not have a Stripe Customer ID.`);
    redirect('/settings?error=no_stripe_customer');
    return;
  }

  const baseUrl = process.env.BASE_URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeRecord.stripeCustomerId,
    return_url: `${baseUrl}/settings`
  });

  if (!portalSession.url) {
    console.error("Failed to create customer portal session: URL is null.");
    redirect('/settings?error=portal_session_failure');
    return;
  }
  redirect(portalSession.url);
}


export const checkoutAction = async (formData: FormData) => {
  const user = await getUser();
  const planName = formData.get('planName') as string | null;
  const priceId = formData.get('priceId') as string | null; // Legacy support
  const creatorCode = formData.get('creatorCode') as string | null;
  const referralCode = formData.get('referralCode') as string | null;
  
  console.log('Checkout action initiated', {
    hasPlanName: !!planName,
    hasPriceId: !!priceId,
    hasCreatorCode: !!creatorCode,
    hasReferralCode: !!referralCode,
    hasUser: !!user
  });
  
  if (!user) {
    const params = new URLSearchParams({
      redirect: 'checkout',
      ...(planName && { planName }),
      ...(priceId && { priceId }),
      ...(creatorCode && { creator: creatorCode }),
      ...(referralCode && { ref: referralCode })
    });
    redirect(`/sign-up?${params.toString()}`);
  }

  let stripeRecordResults = await db.select().from(stripeTable).where(eq(stripeTable.userId, user.id)).limit(1);
  let userStripeRecord = stripeRecordResults[0];

  if (!userStripeRecord) {
    [userStripeRecord] = await db.insert(stripeTable).values({
      userId: user.id,
      name: `${user.email || `User ${user.id}`}'s subscription`,
    }).returning();
  }

  // Get price ID from plan name (preferred) or use legacy priceId
  let finalPriceId: string;
  try {
    if (planName) {
      finalPriceId = getPriceIdForPlan(planName);
    } else if (priceId) {
      // Legacy support - validate the price ID format
      if (!/^price_[a-zA-Z0-9_]+$/.test(priceId)) {
        throw new Error('Invalid price ID format');
      }
      finalPriceId = priceId;
    } else {
      throw new Error('Neither plan name nor price ID provided');
    }
  } catch (error) {
    console.error('Invalid pricing configuration:', error);
    redirect('/pricing?error=invalid_plan');
    return;
  }
  
  await createCheckoutSession({ 
    stripeRecord: userStripeRecord, 
    priceId: finalPriceId,
    creatorCode: creatorCode || undefined,
    referralCode: referralCode || undefined
  });
};

export const customerPortalAction = async () => {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
    return;
  }

  const stripeRecordResults = await db.select().from(stripeTable).where(eq(stripeTable.userId, user.id)).limit(1);
  if (stripeRecordResults.length === 0) {
    redirect('/settings');
    return;
  }
  
  await createCustomerPortalSession(stripeRecordResults[0]);
};