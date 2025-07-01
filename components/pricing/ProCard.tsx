"use client";
import { Check } from "lucide-react";
import { checkoutAction } from "@/lib/payments/actions";

export function ProCard({ isCurrent, isLower, creatorCode, referralCode }: { isCurrent: boolean; isLower: boolean; creatorCode?: string | null; referralCode?: string | null }) {
    // The old handleCheckout function is no longer needed.

    return (
        <div
            className={`pt-6 border-2 rounded-xl p-8 bg-white relative flex flex-col h-full transition
        ${isCurrent ? "border-[#5E62FF] shadow-lg" : isLower ? "border-gray-200 opacity-60 grayscale" : "border-[#7A7DFF]"}
      `}
        >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <span className="bg-[#5E62FF] text-white px-3 py-1 rounded-full text-xs font-medium">
          Pro Features
        </span>
            </div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Professional</h2>
            <p className="text-sm text-gray-600 mb-4">For power users and designers</p>
            <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#5E62FF] mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Unlimited messages</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#5E62FF] mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Premium AI models</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#5E62FF] mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Direct platform exports</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#5E62FF] mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#5E62FF] mr-2 mt-0.5 flex-shrink-0" />
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
                    // FIX: Use the server action directly in the form
                    <form action={checkoutAction}>
                        {/* Add a hidden input to pass the priceId to the server action */}
                        <input type="hidden" name="priceId" value="price_1Rfqs0Qq2HLPJlKDfgnNdWXW" />
                        {creatorCode && <input type="hidden" name="creatorCode" value={creatorCode} />}
                        {referralCode && <input type="hidden" name="referralCode" value={referralCode} />}
                        <button
                            type="submit"
                            className="w-full rounded-full py-2 font-medium mb-3 bg-[#5E62FF] text-white hover:bg-[#7A7DFF] transition"
                        >
                            Upgrade
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}