import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {customerPortalAction} from "@/lib/payments/actions";
export function FreeCard({ isCurrent, isLower }: { isCurrent: boolean, isLower: boolean }) {
    return (
        <div
            className={`pt-6 border-2 rounded-xl p-8 bg-white flex flex-col h-full transition
        ${isCurrent ? "border-[#5E62FF] shadow-lg" : isLower ? "border-gray-200 opacity-60 grayscale" : "border-[#7A7DFF]"}
      `}
        >
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Free</h2>
            <p className="text-sm text-gray-600 mb-4">Perfect for getting started</p>
            <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Basic AI models</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">100 messages per day</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Standard response speed</span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Basic export options</span>
                </li>
            </ul>
            <div className="mt-auto">
                <p className="text-4xl font-medium text-gray-900 mb-2">$0</p>
                <p className="text-sm text-gray-600 mb-6">Forever</p>
            {isCurrent ? (
                <button className="w-full rounded-full py-2 font-medium mb-3 bg-gray-200 text-gray-500 cursor-default">
                    Current Plan
                </button>
            ) : isLower ? (
                <form action={customerPortalAction}>
                    <button
                        type="submit"
                        className="w-full rounded-full py-2 font-medium mb-3 bg-gray-100 text-gray-400 border border-gray-200 cursor-pointer hover:bg-gray-200"
                    >
                        Downgrade Here
                    </button>
                </form>
            ) : (
                <form action="/api/stripe/checkout" method="POST">
                    <button
                        type="submit"
                        className="w-full rounded-full py-2 font-medium mb-3 bg-[#5E62FF] text-white hover:bg-[#7A7DFF] transition"
                        disabled
                    >
                        Upgrade
                    </button>
                </form>
            )}
            </div>
        </div>
    );
}