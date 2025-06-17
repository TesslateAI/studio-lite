'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelSignupPage() {
    const router = useRouter();

    useEffect(() => {
        console.log('Canceling signup...');
        fetch('/api/stripe/cancel-signup', { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Cancel signup failed');
                }
                return response.json();
            })
            .then(data => {
                if (data.ok) {
                    router.replace('/');
                } else {
                    console.error('Cancel signup failed:', data.error);
                    // Handle error appropriately
                }
            })
            .catch(error => {
                console.error('Cancel signup request failed:', error);
                // Handle network or other errors
            });
    }, [router]);


    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5E62FF] mb-4"></div>
            <p className="text-lg text-gray-700">Cancelling sign up and cleaning up your account…</p>
        </div>
    );
}
