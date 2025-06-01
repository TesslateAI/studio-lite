'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { stripe as stripeTable, User } from '@/lib/db/schema'; // Added User type
import { eq } from 'drizzle-orm';

export const checkoutAction = async (formData: FormData) => {
  const user = await getUser();
  if (!user) {
    // If redirecting to sign-up, ensure query params are handled correctly on the sign-up page
    const priceId = formData.get('priceId') as string | null;
    let signUpUrl = '/sign-up?redirect=checkout';
    if (priceId) {
      signUpUrl += `&priceId=${priceId}`;
    }
    redirect(signUpUrl);
  }

  // Find or create the user's stripe record
  let stripeRecordResults = await db
    .select()
    .from(stripeTable)
    .where(eq(stripeTable.userId, user.id))
    .limit(1);

  let userStripeRecord;

  if (stripeRecordResults.length === 0) {
    const [createdStripe] = await db.insert(stripeTable).values({
      userId: user.id,
      name: `${user.email || `User ${user.id}`}'s subscription`, // Fallback for name
      createdAt: new Date(),
      updatedAt: new Date(),
      // planName and subscriptionStatus will use their default values from the schema
    }).returning();
    userStripeRecord = createdStripe;
  } else {
    userStripeRecord = stripeRecordResults[0];
  }

  const priceId = formData.get('priceId') as string;
  if (!priceId) {
    // Handle missing priceId - perhaps redirect to pricing page with an error
    console.error("Checkout action called without a priceId.");
    redirect('/pricing?error=missing_price_id'); // Example redirect
    return;
  }
  // createCheckoutSession already handles the redirect internally
  await createCheckoutSession({ stripeRecord: userStripeRecord, priceId });
};

export const customerPortalAction = async () => {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Find the user's stripe record
  const stripeRecordResults = await db
    .select()
    .from(stripeTable)
    .where(eq(stripeTable.userId, user.id))
    .limit(1);

  if (stripeRecordResults.length === 0) {
    // This case should ideally not happen if a user tries to manage a subscription,
    // as they likely wouldn't have one. Redirect to settings or pricing.
    console.warn(`User ${user.id} tried to access customer portal without a stripe record.`);
    redirect('/settings');
    return;
  }
  
  const userStripeRecord = stripeRecordResults[0];

  // Optional: Add more robust checks if userStripeRecord.stripeCustomerId is null
  if (!userStripeRecord.stripeCustomerId) {
      console.warn(`User ${user.id} does not have a Stripe Customer ID. Cannot open portal.`);
      redirect('/settings?error=no_stripe_customer'); // Or to pricing
      return;
  }

  // createCustomerPortalSession now handles the redirect internally.
  // So, we just await its completion.
  await createCustomerPortalSession(userStripeRecord);

  // The line below is removed because createCustomerPortalSession handles the redirect:
  // redirect(portalSession.url); 
};