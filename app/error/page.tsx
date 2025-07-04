'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

// This new component contains the logic that depends on the client-side hook.
function ErrorContent() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('message') || "An unexpected error occurred.";

    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-200 max-w-md w-full">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
                Something went wrong
            </h1>
            <p className="mt-4 text-sm text-gray-600 bg-red-50 p-3 rounded-md">
                <strong>Error:</strong> {errorMessage}
            </p>
            <p className="mt-4 text-sm text-gray-500">
                We've logged this issue and our team will look into it. Please try again later or contact support if the problem persists.
            </p>
            <div className="mt-6">
                <Link href="/settings">
                    <Button className="w-full rounded-full bg-black text-white hover:bg-gray-800">
                        Back to Settings
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// The main page component now wraps the client-dependent component in <Suspense>.
export default function ErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
                    <p className="text-gray-600">Loading error details...</p>
                </div>
            }>
                <ErrorContent />
            </Suspense>
        </div>
    );
}