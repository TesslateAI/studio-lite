'use client';
import { Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProCard } from './ProCard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex flex-col items-center sm:items-start w-full">
        <Link href="/settings" passHref>
          <Button variant="outline" className="mb-4 w-full justify-start">
            ← Cancel
          </Button>
        </Link>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <ProCard />
        <EnterpriseCard />
      </div>
    </main>
  );
}

function EnterpriseCard() {
  return (
    <div className="pt-6 border rounded-xl p-8 bg-white">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">Enterprise</h2>
      <p className="text-sm text-gray-600 mb-4">Custom fine-tuned solutions for your organization</p>
      <ul className="space-y-4 mb-8">
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Host Tesslate's models on your own infrastructure</span></li>
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Private deployment & custom integrations</span></li>
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Designed for secure, scalable usage in enterprise settings</span></li>
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Dedicated support and SLAs</span></li>
        <li className="flex items-start"><Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" /><span className="text-gray-700">Custom model fine-tuning options</span></li>
      </ul>
      <Link href="https://calendly.com/team-tesslate" target="_blank" className="w-full block rounded-full bg-black text-white py-2 font-medium text-center hover:bg-gray-900 transition">Contact Us</Link>
    </div>
  );
}
