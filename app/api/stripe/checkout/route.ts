import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, stripe as stripeTable } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import Stripe from 'stripe';
import { updateUserKeyForPlan } from '@/lib/litellm/management';
import { PlanName } from '@/lib/litellm/plans';
import { validatePlanName, stripeCheckoutSchema } from '@/lib/validation/stripe';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/upgrade', request.url));
  }

  try {
    // Validate session ID format
    if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      throw new Error('Invalid session ID format');
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Get the user ID from the checkout session
    const userId = checkoutSession.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }
    
    // Validate user ID format (Firebase UID)
    if (!/^[a-zA-Z0-9]{28}$/.test(userId)) {
      throw new Error('Invalid user ID format');
    }
    
    // Get the subscription ID
    const subscriptionId = checkoutSession.subscription;
    if (typeof subscriptionId !== 'string') {
        throw new Error('Subscription ID not found in checkout session.');
    }
    
    // Validate subscription ID format
    if (!/^sub_[a-zA-Z0-9_]+$/.test(subscriptionId)) {
      throw new Error('Invalid subscription ID format');
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

    // Validate and update LiteLLM key immediately
    let newPlanName: PlanName;
    try {
      newPlanName = validatePlanName(productName) as PlanName;
    } catch (error) {
      console.error('Invalid plan name in checkout:', { productName, error });
      newPlanName = 'free';
    }
    
    try {
        await updateUserKeyForPlan(user.id, newPlanName);
    } catch(e) {
        console.error('CRITICAL: Checkout succeeded but LiteLLM key update failed', {
          userId: user.id,
          planName: newPlanName,
          timestamp: new Date().toISOString()
        });
    }

    // Update Stripe customer metadata with userId for future webhook processing
    try {
      await stripe.customers.update(subscription.customer as string, {
        metadata: {
          userId: user.id,
        },
      });
    } catch (error) {
      console.error('Failed to update Stripe customer metadata:', error);
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
    console.error('Checkout processing failed', {
      timestamp: new Date().toISOString(),
      sessionId: sessionId ? 'present' : 'missing',
      hasError: !!error
    });
    
    const url = new URL('/error', request.url);
    const errorMessage = 'Payment processing failed. Please contact support if this persists.';
    url.searchParams.set('message', errorMessage);
    return NextResponse.redirect(url);
  }
}