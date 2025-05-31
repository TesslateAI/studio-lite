import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-semibold mb-4">Checkout Cancelled</h1>
      <p className="mb-8 text-gray-600">You have cancelled the checkout process. You can manage your subscription or return to your settings.</p>
      <Link href="/settings">
        <Button className="rounded-full bg-black text-white hover:bg-orange-500">Back to Settings</Button>
      </Link>
    </div>
  );
} 