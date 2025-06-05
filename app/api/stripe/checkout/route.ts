import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, stripe as stripeTable } from '@/lib/db/schema';
import { setSession, getSession } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    console.log('Stripe session retrieved in GET:', session);

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });

    const plan = subscription.items.data[0]?.price;

    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const productId = (plan.product as Stripe.Product).id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found in database.');
    }

    // Upsert the user's subscription in the stripe table
    const existingStripe = await db
      .select()
      .from(stripeTable)
      .where(eq(stripeTable.userId, user[0].id))
      .limit(1);

    if (existingStripe.length === 0) {
      // Insert new subscription record
      await db.insert(stripeTable).values({
        userId: user[0].id,
        name: `${user[0].email} subscription`,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planName: (plan.product as Stripe.Product).name,
        subscriptionStatus: subscription.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Update existing subscription record
      await db
        .update(stripeTable)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripeProductId: productId,
          planName: (plan.product as Stripe.Product).name,
          subscriptionStatus: subscription.status,
          updatedAt: new Date(),
        })
        .where(eq(stripeTable.userId, user[0].id));
    }

    await setSession(user[0]);
    return NextResponse.redirect(new URL('/settings', request.url));
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

export async function POST(req: NextRequest) {
  const { priceId } = await req.json();
  if (!priceId) {
    return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
  }
  // Get the current session and user ID
  const session = await getSession();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }
  try {
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      client_reference_id: String(session.user.id),
      success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/pricing/cancel`,
    });
    console.log('Stripe session created in POST:', stripeSession);
    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Stripe checkout failed' }, { status: 500 });
  }
}
