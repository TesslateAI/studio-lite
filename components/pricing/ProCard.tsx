"use client";
import { Check } from "lucide-react";

export function ProCard({ isCurrent, isLower }: { isCurrent: boolean; isLower: boolean }) {
    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCurrent) return;
        const res = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceId: "price_1RVZwsRH2pPtloF7NmAWkBwV" }),
        });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        }
    };

    return (
        <div
            className={`pt-6 border-2 rounded-xl p-8 bg-white relative flex flex-col h-full transition
        ${isCurrent ? "border-orange-500 shadow-lg" : isLower ? "border-gray-200 opacity-60 grayscale" : "border-orange-300"}
      `}
        >
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
                {isCurrent ? (
                    <button className="w-full rounded-full py-2 font-medium mb-3 bg-gray-200 text-gray-500 cursor-default">
                        Current Plan
                    </button>
                ) : isLower ? (
                    <form action="/api/stripe/portal" method="POST">
                        <button
                            type="submit"
                            className="w-full rounded-full py-2 font-medium mb-3 bg-gray-100 text-gray-400 border border-gray-200 cursor-pointer hover:bg-gray-200"
                        >
                            Downgrade Here
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleCheckout}>
                        <button
                            type="submit"
                            className="w-full rounded-full py-2 font-medium mb-3 bg-orange-500 text-white hover:bg-orange-600 transition"
                        >
                            Upgrade
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
