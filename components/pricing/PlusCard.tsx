"use client";
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

export function PlusCard() {
    const router = useRouter();
    const { data: stripeData, isLoading } = useSWR('/api/stripe/user', (url) => fetch(url).then(res => res.json()));
    const plan = stripeData?.planName || 'Free';
    const isPlusOrHigher = plan === 'Plus' || plan === 'Pro' || stripeData?.subscriptionStatus === 'ending';

    return (
        <div className="pt-6 border-2 border-orange-500 rounded-xl p-8 bg-white relative flex flex-col h-full">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                </span>
            </div>

            <h2 className="text-2xl font-medium text-gray-900 mb-2">Plus</h2>
            <p className="text-sm text-gray-600 mb-4">Great for regular users</p>

            <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Everything in Free</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">400 messages per day</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Faster response speeds</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Enhanced export options</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Priority support</span>
                </li>
            </ul>

            <div className="mt-auto">
                <p className="text-4xl font-medium text-gray-900 mb-2">$7.99</p>
                <p className="text-sm text-gray-600 mb-6">Per month</p>

                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (isPlusOrHigher) return;
                    const res = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priceId: 'price_1RVZvwRH2pPtloF7SWUiOSG3' }),
                    });
                    const data = await res.json();
                    if (data.url) {
                        window.location.href = data.url;
                    }
                }}>
                    <button
                        type="submit"
                        className={`w-full rounded-full py-2 font-medium transition ${
                            isPlusOrHigher
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                        disabled={isPlusOrHigher}
                    >
                        {isPlusOrHigher ? 'Purchased' : 'Get Started'}
                    </button>
                </form>
            </div>
        </div>
    );
}
