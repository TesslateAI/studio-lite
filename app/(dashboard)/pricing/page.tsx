'use client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PlusCard } from '@/components/pricing/PlusCard';
import { ProCard } from '@/components/pricing/ProCard';
import { EnterpriseCard } from "@/components/pricing/EnterpriseCard";
import { FreeCard } from "@/components/pricing/FreeCard";
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { Stripe } from '@/lib/db/schema';

export default function PricingPage() {
    const { data: stripeData, isLoading } = useSWR<Stripe>('/api/stripe/user', (url: string) => fetch(url).then(res => res.json()));
    const plan = stripeData?.planName || 'Free';

    // For highlighting/dimming logic
    const planOrder = ['Free', 'Plus', 'Pro', 'Enterprise'];
    const currentPlanIndex = planOrder.indexOf(plan);

    const cards = [
        <FreeCard key="free" isCurrent={plan === 'Free'} isLower={currentPlanIndex > 0} />,
        <PlusCard key="plus" isCurrent={plan === 'Plus'} isLower={currentPlanIndex > 1} />,
        <ProCard key="pro" isCurrent={plan === 'Pro'} isLower={currentPlanIndex > 2} />,
        <EnterpriseCard key="enterprise" isCurrent={plan === 'Enterprise'} isLower={false} />,
    ];

    if (isLoading) {
        return (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-32 mb-8"></div>
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 h-screen overflow-y-auto overflow-hidden">
            <div className="mb-8 flex flex-col items-center sm:items-start w-full">
                <Link href="/settings" passHref>
                    <Button variant="outline" className="mb-4 w-full sm:w-auto justify-start gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Cancel
                    </Button>
                </Link>
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Your Plan</h1>
                    <p className="text-gray-600">Current plan: <span className="font-semibold text-orange-600">{plan}</span></p>
                </div>
            </div>

            <div className="grid gap-8 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-4">
                {cards}
            </div>
        </main>
    );
}