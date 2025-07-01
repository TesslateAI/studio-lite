'use server';

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { stripe as stripeTable, Stripe as StripeTypeSchema } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from './stripe'; // Import the initialized stripe instance
import Stripe from 'stripe';

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
  const priceId = formData.get('priceId') as string | null;
  const creatorCode = formData.get('creatorCode') as string | null;
  const referralCode = formData.get('referralCode') as string | null;
  
  console.log('Checkout action called with:', {
    priceId,
    creatorCode,
    referralCode,
    userId: user?.id
  });
  
  if (!user) {
    const params = new URLSearchParams({
      redirect: 'checkout',
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

  if (!priceId) {
    redirect('/pricing?error=missing_price_id');
    return;
  }
  
  await createCheckoutSession({ 
    stripeRecord: userStripeRecord, 
    priceId,
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