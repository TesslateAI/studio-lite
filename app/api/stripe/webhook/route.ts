import Stripe from 'stripe';
import { handleSubscriptionChange, stripe } from '@/lib/payments/stripe'; // Assuming stripe instance is exported from here
import { NextRequest, NextResponse } from 'next/server';
import { trackCodeRedemption, convertReferral } from '@/lib/payments/creator-codes';
import { db } from '@/lib/db/drizzle';
import { creatorEarnings, codeRedemptions, userShareCodes, creatorProfiles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  interface WebhookSubscriptionObject extends Stripe.Subscription {
    current_period_end: number;
  }

  switch (event.type) {
    case 'customer.subscription.created':
      const newSubscription = event.data.object as WebhookSubscriptionObject;
      await handleSubscriptionChange(newSubscription);
      
      // Track creator code redemption if applicable
      if (newSubscription.metadata?.creatorCode) {
        try {
          const priceId = newSubscription.items.data[0]?.price.id;
          const planName = newSubscription.items.data[0]?.price.metadata?.planName || 'Plus';
          
          await trackCodeRedemption({
            creatorCode: newSubscription.metadata.creatorCode,
            userId: newSubscription.metadata.userId,
            subscriptionId: newSubscription.id,
            priceId: priceId || '',
            planName: planName,
          });
        } catch (error) {
          console.error('Failed to track creator code redemption:', error);
        }
      }
      
      // Convert user referral if applicable
      if (newSubscription.metadata?.type === 'user_referral' && newSubscription.metadata?.userId) {
        try {
          const result = await convertReferral(newSubscription.metadata.userId);
          if (result?.freeMonthGranted) {
            // TODO: Apply free month credit to referrer's subscription
            console.log(`Free month granted to referrer for user ${newSubscription.metadata.userId}`);
          }
        } catch (error) {
          console.error('Failed to convert referral:', error);
        }
      }
      break;
      
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as WebhookSubscriptionObject;
      await handleSubscriptionChange(subscription);
      
      // Update redemption status if subscription is cancelled
      if (event.type === 'customer.subscription.deleted' && subscription.id) {
        await db.update(codeRedemptions)
          .set({ status: 'cancelled' })
          .where(eq(codeRedemptions.stripeSubscriptionId, subscription.id));
      }
      break;
      
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      
      // Calculate and track creator earnings
      if (invoice.subscription && typeof invoice.subscription === 'string') {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        
        if (subscription.metadata?.creatorCode) {
          try {
            // Find the redemption
            const [redemption] = await db.select()
              .from(codeRedemptions)
              .where(eq(codeRedemptions.stripeSubscriptionId, subscription.id))
              .limit(1);
            
            if (redemption && invoice.amount_paid > 0) {
              // Calculate commission based on plan
              const commissionPercent = redemption.planName === 'Pro' ? 15 : 5;
              const commissionAmount = Math.floor(invoice.amount_paid * commissionPercent / 100);
              
              // Track earning
              await db.insert(creatorEarnings).values({
                creatorProfileId: redemption.creatorProfileId,
                redemptionId: redemption.id,
                amount: commissionAmount,
                commissionPercent: commissionPercent.toString(),
                stripeInvoiceId: invoice.id,
              });
              
              // Update creator total earnings
              await db.update(creatorProfiles)
                .set({ 
                  totalEarnings: sql`${creatorProfiles.totalEarnings} + ${commissionAmount}`,
                  updatedAt: new Date()
                })
                .where(eq(creatorProfiles.id, redemption.creatorProfileId));
            }
          } catch (error) {
            console.error('Failed to calculate creator earnings:', error);
          }
        }
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}