'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MailCheck, AlertCircle } from 'lucide-react';
import { getClientAuth } from '@/lib/firebase/client';
import { sendPasswordResetEmail } from 'firebase/auth';
import Image from "next/image";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [imgSrc, setImgSrc] = useState("/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png");

    useState(() => {
        const img = new window.Image();
        img.src = "/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png";
        img.onerror = () => setImgSrc("/Asset_108x.png");
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const auth = getClientAuth();
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (err: any) {
            const errorCode = err.code;
            if (errorCode === 'auth/user-not-found') {
                setError('No user found with this email address.');
            } else {
                setError('Failed to send reset email. Please try again.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <main className="flex-1 flex flex-col justify-center">
                <div className="flex flex-col justify-center py-2 px-4 sm:px-6 lg:px-8">
                    <div className="sm:mx-auto sm:w-full sm:max-w-md">
                         <div className="flex justify-center">
                            <Image
                                src={imgSrc}
                                alt="Tesslate Logo"
                                width={40}
                                height={40}
                                priority
                            />
                        </div>
                        <h2 className="mt-6 text-center text-3xl font-medium text-gray-900">
                            Reset your password
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Or{' '}
                            <Link href="/sign-in" className="font-medium text-[#5E62FF] hover:text-[#7A7DFF]">
                                return to sign in
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                        {success ? (
                            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
                                <MailCheck className="mx-auto h-12 w-12 text-green-500" />
                                <h3 className="mt-2 text-lg font-medium text-green-800">Check your email</h3>
                                <p className="mt-2 text-sm text-green-700">
                                    We have sent a password reset link to <span className="font-semibold">{email}</span>.
                                </p>
                            </div>
                        ) : (
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Email address
                                    </Label>
                                    <div className="mt-1">
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#5E62FF] focus:border-[#5E62FF] sm:text-sm"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center text-red-600 text-sm">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <Button
                                        type="submit"
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#5E62FF] hover:bg-[#7A7DFF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E62FF]"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                                Sending...
                                            </>
                                        ) : 'Send Reset Link'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}