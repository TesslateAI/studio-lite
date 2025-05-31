"use client";
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProCard() {
  const router = useRouter();
  return (
    <div className="pt-6 border rounded-xl p-8 bg-white">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">Professional</h2>
      <p className="text-sm text-gray-600 mb-4">For power users and designers</p>
      <ul className="space-y-4 mb-8">
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Everything in Free</span></li>
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Higher message limits & Faster response speeds</span></li>
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Export directly to Figma, Framer, etc.</span></li>
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Access to our premium models</span></li>
      </ul>
      <p className="text-4xl font-medium text-gray-900 mb-2">$9.99</p>
      <p className="text-sm text-gray-600 mb-6">Per month</p>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId: 'price_1RRpOoRMsaCdUAXFdg3UVVrF' }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }}>
        <button type="submit" className="w-full rounded-full bg-orange-500 text-white py-2 font-medium hover:bg-orange-600 transition mb-3">Get Started</button>
      </form>
    </div>
  );
} 