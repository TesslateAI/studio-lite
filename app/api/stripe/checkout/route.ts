import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, stripe as stripeTable } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import Stripe from 'stripe';
import { updateUserKeyForPlan } from '@/lib/litellm/management';
import { PlanName } from '@/lib/litellm/plans';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Get the user ID from the checkout session
    const userId = checkoutSession.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }
    
    // Get the subscription ID
    const subscriptionId = checkoutSession.subscription;
    if (typeof subscriptionId !== 'string') {
        throw new Error('Subscription ID not found in checkout session.');
    }

    // --- START: THE FIX ---
    // Use the subscription ID to retrieve the full subscription object,
    // explicitly expanding the product data.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product']
    });
    // --- END: THE FIX ---

    const plan = subscription.items.data[0]?.price;
    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const product = plan.product as Stripe.Product;
    const productId = product.id;
    const productName = product.name;

    if (!productId || !productName) {
      throw new Error('Product details could not be determined from the subscription.');
    }

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length === 0) {
      throw new Error(`User with ID ${userId} not found in database.`);
    }
    const user = userResult[0];

    // Update LiteLLM key immediately
    const newPlanName = (productName.toLowerCase() as PlanName) || 'free';
    try {
        await updateUserKeyForPlan(user.id, newPlanName);
    } catch(e) {
        console.error(`CRITICAL: Checkout for user ${user.id} succeeded, but immediate LiteLLM key update failed.`, e);
    }

    // Update our local database
    const subscriptionData = {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripeProductId: productId,
      planName: productName,
      subscriptionStatus: subscription.status,
      updatedAt: new Date(),
    };

    const existingStripe = await db.select().from(stripeTable).where(eq(stripeTable.userId, user.id)).limit(1);
    if (existingStripe.length === 0) {
      await db.insert(stripeTable).values({
        userId: user.id,
        name: `${user.email} subscription`,
        ...subscriptionData
      });
    } else {
      await db.update(stripeTable).set(subscriptionData).where(eq(stripeTable.userId, user.id));
    }

    return NextResponse.redirect(new URL('/settings', request.url));
    
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    const url = new URL('/error', request.url);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    url.searchParams.set('message', errorMessage);
    return NextResponse.redirect(url);
  }
}