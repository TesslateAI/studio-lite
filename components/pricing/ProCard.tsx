"use client";
import { Check } from 'lucide-react';
import useSWR from 'swr';

export function ProCard() {
    const { data: stripeData } = useSWR('/api/stripe/user', (url) => fetch(url).then(res => res.json()));
    const plan = stripeData?.planName || 'Free';
    const isProOrEnding = plan === 'Pro' || stripeData?.subscriptionStatus === 'ending';

    return (
        <div className="pt-6 border-2 border-orange-500 rounded-xl p-8 bg-white relative flex flex-col h-full">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Pro Features
                </span>
            </div>

            <h2 className="text-2xl font-medium text-gray-900 mb-2">Professional</h2>
            <p className="text-sm text-gray-600 mb-4">For power users and designers</p>

            <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Unlimited messages</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Premium AI models</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Direct platform exports</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Advanced analytics</span>
                </li>
            </ul>

            <div className="mt-auto">
                <p className="text-4xl font-medium text-gray-900 mb-2">$39.99</p>
                <p className="text-sm text-gray-600 mb-6">Per month</p>

                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (isProOrEnding) return;
                    const res = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priceId: 'price_1RVZwsRH2pPtloF7NmAWkBwV' }),
                    });
                    const data = await res.json();
                    if (data.url) {
                        window.location.href = data.url;
                    }
                }}>
                    <button
                        type="submit"
                        className={`w-full rounded-full py-2 font-medium transition ${
                            isProOrEnding
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                        disabled={isProOrEnding}
                    >
                        {isProOrEnding ? 'Purchased' : 'Get Started'}
                    </button>
                </form>
            </div>
        </div>
    );
}
