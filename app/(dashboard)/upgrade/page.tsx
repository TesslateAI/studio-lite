'use client';
import { PlusCard } from '@/components/pricing/PlusCard';
import { ProCard } from '@/components/pricing/ProCard';
import { EnterpriseCard } from "@/components/pricing/EnterpriseCard";
import { FreeCard } from "@/components/pricing/FreeCard";
import { PageLayout } from '@/components/layout/page-layout';
import useSWR from 'swr';
import { Stripe } from '@/lib/db/schema';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PricingPageContent() {
    const { data: stripeData, isLoading } = useSWR<Stripe>('/api/stripe/user', (url: string) => fetch(url).then(res => res.json()));
    const plan = stripeData?.planName || 'Free';
    const searchParams = useSearchParams();
    const creatorCode = searchParams.get('creator');
    const referralCode = searchParams.get('ref');
    
    console.log('URL Parameters:', {
        creator: creatorCode,
        ref: referralCode,
        allParams: Object.fromEntries(searchParams.entries())
    });

    // For highlighting/dimming logic
    const planOrder = ['Free', 'Plus', 'Pro', 'Enterprise'];
    const currentPlanIndex = planOrder.indexOf(plan);

    const cards = [
        <FreeCard key="free" isCurrent={plan === 'Free'} isLower={currentPlanIndex > 0} />,
        <PlusCard key="plus" isCurrent={plan === 'Plus'} isLower={currentPlanIndex > 1} creatorCode={creatorCode} referralCode={referralCode} />,
        <ProCard key="pro" isCurrent={plan === 'Pro'} isLower={currentPlanIndex > 2} creatorCode={creatorCode} referralCode={referralCode} />,
        <EnterpriseCard key="enterprise" isCurrent={plan === 'Enterprise'} isLower={false} />,
    ];

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-96 bg-slate-200 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-slate-600">Current plan: <span className="font-medium text-slate-900">{plan}</span></p>
                    {creatorCode && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">
                                🎉 Creator code <span className="font-mono font-bold">{creatorCode}</span> will be applied to your subscription!
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
                {cards}
            </div>
        </div>
    );
}

export default function PricingPage() {
    return (
        <PageLayout 
            title="Upgrade Plan" 
            description="Choose the plan that works best for you"
        >
            <Suspense fallback={
                <div className="animate-pulse">
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-96 bg-slate-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            }>
                <PricingPageContent />
            </Suspense>
        </PageLayout>
    );
}