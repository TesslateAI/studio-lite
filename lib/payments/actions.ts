'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { stripe as stripeTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const checkoutAction = async (formData: FormData) => {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }
  // Find or create the user's stripe record
  let stripeRecord = await db
    .select()
    .from(stripeTable)
    .where(eq(stripeTable.userId, user.id))
    .limit(1);

  if (stripeRecord.length === 0) {
    const [createdStripe] = await db.insert(stripeTable).values({
      userId: user.id,
      name: `${user.email} subscription`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    stripeRecord = [createdStripe];
  }

  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ stripeRecord: stripeRecord[0], priceId });
};

export const customerPortalAction = async () => {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }
  // Find the user's stripe record
  const stripeRecord = await db
    .select()
    .from(stripeTable)
    .where(eq(stripeTable.userId, user.id))
    .limit(1);

  if (
    stripeRecord.length === 0 ||
    (stripeRecord[0].planName !== 'Pro' && stripeRecord[0].subscriptionStatus !== 'ending')
  ) {
    // Only allow access to the portal if the user is subscribed to Pro or ending
    redirect('/settings'); // Or show an error message
  }

  const portalSession = await createCustomerPortalSession(stripeRecord[0]);
  redirect(portalSession.url);
};
