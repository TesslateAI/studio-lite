'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { customerPortalAction, checkoutAction } from '@/lib/payments/actions';
import { Suspense } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Stripe } from '@/lib/db/schema';

function SubscriptionSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const { data: stripeData, isLoading } = useSWR<Stripe>('/api/stripe/user', (url: string) =>
    fetch(url).then((res) => res.json())
  );

  const plan = stripeData?.planName || 'Free';
  const status =
    plan === 'Free'
      ? 'No active subscription'
      : stripeData?.subscriptionStatus === 'active'
      ? 'Billed monthly'
      : stripeData?.subscriptionStatus === 'trialing'
      ? 'Trial period'
      : stripeData?.subscriptionStatus === 'ending'
      ? 'Subscription ending soon'
      : (stripeData?.subscriptionStatus === 'canceled' || stripeData?.subscriptionStatus === 'cancelled')
      ? 'Ending...'
      : 'No active subscription';



  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                Current Plan: {isLoading ? (
                  <span className="inline-block h-5 w-24 bg-gray-200 rounded animate-pulse align-middle" />
                ) : plan}
              </p>
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block h-4 w-32 bg-gray-200 rounded animate-pulse align-middle" />
                ) : status}
              </p>
            </div>
            {plan !== 'Free' ? (
              <form action={customerPortalAction}>
                <Button type="submit" variant="outline" disabled={isLoading}>
                  Manage Subscription
                </Button>
              </form>
            ) : (
              <Link href="/pricing" passHref legacyBehavior>
                <a>
                  <Button variant="outline" disabled={isLoading}>
                    Upgrade
                  </Button>
                </a>
              </Link>
            ) }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Subscription Settings</h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>
    </section>
  );
}