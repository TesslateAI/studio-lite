import Stripe from 'stripe';
import { handleSubscriptionChange, stripe } from '@/lib/payments/stripe'; // Assuming stripe instance is exported from here
import { NextRequest, NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) { // Catch as any to access err.message
    console.error('Webhook signature verification failed.', err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  // Explicitly define the type for the subscription object we expect
  // This type should include properties you know will be present for these events.
  interface WebhookSubscriptionObject extends Stripe.Subscription {
    current_period_end: number; // Add the field here
    // Add other fields you expect to be present and are using
  }

  switch (event.type) {
    case 'customer.subscription.created': // Good to handle creation too
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': // For deleted, status is key, period_end might be less relevant but usually there
    // case 'customer.subscription.resumed': // If you handle paused subscriptions
    // case 'customer.subscription.paused':
      // Cast to the more specific type
      const subscription = event.data.object as WebhookSubscriptionObject;
      await handleSubscriptionChange(subscription); // Pass the casted object
      break;
    // case 'checkout.session.completed': // If you need to handle this for initial subscription setup
    //   const session = event.data.object as Stripe.Checkout.Session;
    //   if (session.mode === 'subscription' && session.subscription) {
    //     const fullSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
    //     await handleSubscriptionChange(fullSubscription as WebhookSubscriptionObject); // Cast after retrieve
    //   }
    //   break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}