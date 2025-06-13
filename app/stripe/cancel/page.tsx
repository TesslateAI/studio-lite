'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelSignupPage() {
    const router = useRouter();

    useEffect(() => {
        // Call the API to delete user and then redirect
        fetch('/api/stripe/cancel-signup', { method: 'POST' })
            .then(() => {
                router.replace('/');
            });
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5E62FF] mb-4"></div>
            <p className="text-lg text-gray-700">Cancelling sign up and cleaning up your account…</p>
        </div>
    );
}
