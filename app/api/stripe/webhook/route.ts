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
  // Secure logging - no sensitive data
  console.log('Stripe webhook received', {
    timestamp: new Date().toISOString(),
    method: request.method,
    hasSignature: !!request.headers.get('stripe-signature')
  });
  
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('Webhook validation', {
    payloadLength: payload.length,
    hasSignature: !!signature,
    secretConfigured: !!webhookSecret
  });

  if (!signature) {
    console.error('Webhook authentication failed: Missing signature');
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: unknown) {
    console.error('Webhook signature verification failed', {
      timestamp: new Date().toISOString(),
      hasSecret: !!webhookSecret
    });
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    );
  }

  interface WebhookSubscriptionObject extends Stripe.Subscription {
    current_period_end: number;
  }

  console.log('Processing webhook event', {
    type: event.type,
    timestamp: new Date().toISOString()
  });
  
  switch (event.type) {
    case 'customer.subscription.created':
      const newSubscription = event.data.object as WebhookSubscriptionObject;
      console.log('Processing subscription created', {
        hasDiscount: !!newSubscription.discounts?.length,
        hasMetadata: !!newSubscription.metadata,
        status: newSubscription.status
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
          
          console.log('Tracking creator code redemption', {
            hasCreatorCode: !!creatorCode,
            hasUserId: !!userId
          });
          await trackCodeRedemption({
            creatorCode: creatorCode,
            userId: userId,
            subscriptionId: newSubscription.id,
            priceId: priceId || '',
            planName: planName,
          });
          console.log('Creator code redemption tracked successfully');
        } catch (error) {
          console.error('Failed to track creator code redemption:', error);
        }
      } else {
        console.log('Creator code tracking skipped', {
          hasCreatorCode: !!creatorCode,
          hasUserId: !!userId,
          hasDiscount: !!newSubscription.discounts?.length
        });
      }
      
      // Convert user referral if applicable
      if (newSubscription.metadata?.type === 'user_referral' && newSubscription.metadata?.userId) {
        try {
          const result = await convertReferral(newSubscription.metadata.userId);
          if (result?.freeMonthGranted) {
            // TODO: Apply free month credit to referrer's subscription
            console.log('Free month granted to referrer');
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
              // Validate subscription details against Stripe data to prevent manipulation
              const subscriptionDetails = await stripe.subscriptions.retrieve(subscription.id);
              const actualPlanName = subscriptionDetails.items.data[0]?.price.metadata?.planName || 
                                   (subscriptionDetails.items.data[0]?.price.product as any)?.name;
              
              // Use validated plan name instead of client-provided data
              const validatedPlan = actualPlanName || redemption.planName;
              
              // Secure commission rate lookup with immutable configuration
              const COMMISSION_RATES: Record<string, number> = Object.freeze({
                'pro': 15,
                'professional': 15,
                'plus': 5,
              });
              
              // Additional security: Validate against subscription price to prevent manipulation
              const subscriptionPrice = subscriptionDetails.items.data[0]?.price;
              const expectedAmount = subscriptionPrice?.unit_amount || 0;
              
              // Declare commission percent variable
              let commissionPercent: number;
              
              // Security check: Ensure invoice amount matches subscription price
              if (Math.abs(invoice.amount_paid - expectedAmount) > 100) { // Allow 1% variance for tax/fees
                console.error('Invoice amount mismatch detected - potential manipulation', {
                  invoiceAmount: invoice.amount_paid,
                  expectedAmount,
                  subscriptionId: subscription.id,
                  invoiceId: invoice.id,
                  timestamp: new Date().toISOString()
                });
                commissionPercent = 0;
              } else {
                // Calculate commission based on validated plan with secure rate lookup
                const planKey = validatedPlan.toLowerCase();
                commissionPercent = COMMISSION_RATES[planKey] || 0;
                
                // Additional safeguard: Hard cap at 20% regardless of configuration
                if (commissionPercent > 20) {
                  console.error('Commission rate exceeds maximum allowed', {
                    planName: validatedPlan,
                    commissionPercent,
                    timestamp: new Date().toISOString()
                  });
                  commissionPercent = 0;
                }
                
                // Log all commission calculations for audit trail
                console.log('Commission calculation', {
                  planName: validatedPlan,
                  commissionPercent,
                  invoiceAmount: invoice.amount_paid,
                  subscriptionId: subscription.id,
                  timestamp: new Date().toISOString()
                });
              }
              
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
      console.log('Processing discount created', {
        hasCreatorCode: !!discount.coupon.metadata?.creator_code,
        hasSubscription: !!discount.subscription
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
            
            console.log('Tracking creator code redemption from discount');
            await trackCodeRedemption({
              creatorCode: discount.coupon.metadata.creator_code,
              userId: userId,
              subscriptionId: discount.subscription as string,
              priceId: priceId || '',
              planName: planName,
            });
            console.log('Creator code redemption from discount tracked successfully');
          } else {
            console.log('Could not find userId for customer - redemption skipped');
          }
        } catch (error) {
          console.error('Failed to track creator code redemption from discount:', error);
        }
      }
      break;
      
    default:
      console.log('Unhandled webhook event', { type: event.type });
  }

  console.log('Webhook processing completed', {
    type: event.type,
    timestamp: new Date().toISOString()
  });
  return NextResponse.json({ received: true });
}