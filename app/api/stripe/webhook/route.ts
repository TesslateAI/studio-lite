import Stripe from 'stripe';
import { handleSubscriptionChange, stripe } from '@/lib/payments/stripe'; // Assuming stripe instance is exported from here
import { NextRequest, NextResponse } from 'next/server';
import { trackCodeRedemption, convertReferral } from '@/lib/payments/creator-codes';
import { db } from '@/lib/db/drizzle';
import { creatorEarnings, codeRedemptions, userShareCodes, creatorProfiles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function GET() {
  return NextResponse.json({ 
    message: 'Stripe webhook endpoint is active',
    webhookSecretConfigured: !!webhookSecret,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  // Multiple logging methods to ensure we see this
  console.log('=== STRIPE WEBHOOK CALLED ===');
  console.error('=== STRIPE WEBHOOK CALLED (ERROR LOG) ===');
  process.stdout.write('=== STRIPE WEBHOOK CALLED (STDOUT) ===\n');
  
  console.log('Request method:', request.method);
  console.log('Request URL:', request.url);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  console.log('Timestamp:', new Date().toISOString());
  
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('Webhook payload length:', payload.length);
  console.log('Webhook signature present:', !!signature);
  console.log('Webhook secret configured:', !!webhookSecret);

  if (!signature) {
    console.log('ERROR: Missing stripe-signature header');
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

  console.log(`Webhook received: ${event.type}`);
  
  switch (event.type) {
    case 'customer.subscription.created':
      const newSubscription = event.data.object as WebhookSubscriptionObject;
      console.log('Processing subscription created:', {
        id: newSubscription.id,
        customer: newSubscription.customer,
        hasDiscount: !!newSubscription.discounts?.length,
        discountCoupon: (typeof newSubscription.discounts?.[0] === 'object' && newSubscription.discounts[0]?.coupon) ? newSubscription.discounts[0].coupon.id : undefined,
        couponMetadata: (typeof newSubscription.discounts?.[0] === 'object' && newSubscription.discounts[0]?.coupon) ? newSubscription.discounts[0].coupon.metadata : undefined,
        subscriptionMetadata: newSubscription.metadata,
      });
      await handleSubscriptionChange(newSubscription);
      
      // Track creator code redemption if applicable
      let creatorCode: string | null = null;
      let userId: string | null = null;
      
      // Check if creator code is in subscription metadata (URL-based flow)
      if (newSubscription.metadata?.creatorCode) {
        creatorCode = newSubscription.metadata.creatorCode;
        userId = newSubscription.metadata.userId;
      }
      // Check if creator code is from a promo code discount (manual entry flow)
      else if (typeof newSubscription.discounts?.[0] === 'object' && newSubscription.discounts[0]?.coupon?.metadata?.creator_code) {
        creatorCode = newSubscription.discounts[0].coupon.metadata.creator_code;
        
        // Try to get userId from customer metadata first
        const customer = await stripe.customers.retrieve(newSubscription.customer as string);
        if (customer && !customer.deleted && customer.metadata?.userId) {
          userId = customer.metadata.userId;
        } else {
          // Fallback: get userId from our database using Stripe customer ID
          const { getStripeByCustomerId } = await import('@/lib/db/queries');
          const stripeRecord = await getStripeByCustomerId(newSubscription.customer as string);
          if (stripeRecord) {
            userId = stripeRecord.userId;
          }
        }
      }
      
      if (creatorCode && userId) {
        try {
          const priceId = newSubscription.items.data[0]?.price.id;
          const planName = newSubscription.items.data[0]?.price.metadata?.planName || 'Plus';
          
          console.log(`Tracking creator code redemption: ${creatorCode} for user ${userId}`);
          await trackCodeRedemption({
            creatorCode: creatorCode,
            userId: userId,
            subscriptionId: newSubscription.id,
            priceId: priceId || '',
            planName: planName,
          });
          console.log(`Successfully tracked creator code redemption: ${creatorCode}`);
        } catch (error) {
          console.error('Failed to track creator code redemption:', error);
        }
      } else {
        console.log(`Creator code tracking skipped - creatorCode: ${creatorCode}, userId: ${userId}`);
        if (typeof newSubscription.discounts?.[0] === 'object' && newSubscription.discounts[0]?.coupon) {
          console.log('Discount info:', {
            coupon: newSubscription.discounts[0].coupon.id,
            metadata: newSubscription.discounts[0].coupon.metadata,
          });
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
      if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
        const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription);
        
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
      
    case 'customer.discount.created':
      const discount = event.data.object as Stripe.Discount;
      console.log('Processing discount created:', {
        discountId: discount.id,
        customer: discount.customer,
        couponId: discount.coupon.id,
        couponMetadata: discount.coupon.metadata,
        subscription: discount.subscription,
      });
      
      // Track creator code redemption from discount
      if (discount.coupon.metadata?.creator_code && discount.subscription) {
        try {
          let userId: string | null = null;
          
          // Get userId from customer metadata or database
          const customer = await stripe.customers.retrieve(discount.customer as string);
          if (customer && !customer.deleted && customer.metadata?.userId) {
            userId = customer.metadata.userId;
          } else {
            // Fallback: get userId from our database using Stripe customer ID
            const { getStripeByCustomerId } = await import('@/lib/db/queries');
            const stripeRecord = await getStripeByCustomerId(discount.customer as string);
            if (stripeRecord) {
              userId = stripeRecord.userId;
            }
          }
          
          if (userId) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(discount.subscription as string);
            const priceId = subscription.items.data[0]?.price.id;
            const planName = subscription.items.data[0]?.price.metadata?.planName || 'Plus';
            
            console.log(`Tracking creator code redemption from discount: ${discount.coupon.metadata.creator_code} for user ${userId}`);
            await trackCodeRedemption({
              creatorCode: discount.coupon.metadata.creator_code,
              userId: userId,
              subscriptionId: discount.subscription as string,
              priceId: priceId || '',
              planName: planName,
            });
            console.log(`Successfully tracked creator code redemption from discount: ${discount.coupon.metadata.creator_code}`);
          } else {
            console.log(`Could not find userId for customer ${discount.customer}`);
          }
        } catch (error) {
          console.error('Failed to track creator code redemption from discount:', error);
        }
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  console.log('=== WEBHOOK PROCESSING COMPLETE ===');
  return NextResponse.json({ received: true });
}