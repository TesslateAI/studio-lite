import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { STRIPE_PRICE_CONFIG } from '@/lib/payments/stripe-config';

export async function GET(request: NextRequest) {
  try {
    // Require authentication to access pricing config
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate that price IDs are configured
    if (!STRIPE_PRICE_CONFIG.plus.priceId || !STRIPE_PRICE_CONFIG.pro.priceId) {
      console.error('Stripe price IDs not configured');
      return NextResponse.json({ error: 'Pricing configuration error' }, { status: 500 });
    }

    // Return pricing configuration without exposing price IDs directly
    return NextResponse.json({
      plans: {
        plus: {
          planName: STRIPE_PRICE_CONFIG.plus.planName,
          price: STRIPE_PRICE_CONFIG.plus.price,
          features: STRIPE_PRICE_CONFIG.plus.features,
          available: true
        },
        pro: {
          planName: STRIPE_PRICE_CONFIG.pro.planName,
          price: STRIPE_PRICE_CONFIG.pro.price,
          features: STRIPE_PRICE_CONFIG.pro.features,
          available: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

