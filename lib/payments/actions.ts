'use server';

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { stripe as stripeTable, Stripe as StripeTypeSchema } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from './stripe'; // Import the initialized stripe instance
import Stripe from 'stripe';

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
    return; // Add return to satisfy TypeScript
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/stripe/cancel`,
    customer: stripeRecord?.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true
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

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeRecord.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/settings`
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
  if (!user) {
    const priceId = formData.get('priceId') as string | null;
    redirect(`/sign-up?redirect=checkout${priceId ? `&priceId=${priceId}`: ''}`);
  }

  let stripeRecordResults = await db.select().from(stripeTable).where(eq(stripeTable.userId, user.id)).limit(1);
  let userStripeRecord = stripeRecordResults[0];

  if (!userStripeRecord) {
    [userStripeRecord] = await db.insert(stripeTable).values({
      userId: user.id,
      name: `${user.email || `User ${user.id}`}'s subscription`,
    }).returning();
  }

  const priceId = formData.get('priceId') as string;
  if (!priceId) {
    redirect('/pricing?error=missing_price_id');
    return;
  }
  
  await createCheckoutSession({ stripeRecord: userStripeRecord, priceId });
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