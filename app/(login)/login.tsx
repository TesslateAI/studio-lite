'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Image from "next/image"
import { Header } from "@/components/layout/header"
import { FooterWithLogo } from "@/components/layout/footer-with-logo"
import { getClientAuth } from '@/lib/firebase/client';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email');

  const [email, setEmail] = useState(emailFromQuery || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);


  const handleAuth = async (isSignUp: boolean) => {
    setPending(true);
    setError('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password should be at least 8 characters.');
      setPending(false);
      return;
    }

    const auth = getClientAuth();
    let idToken;

    try {
        if (isSignUp) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            idToken = await userCredential.user.getIdToken();
        } else {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            idToken = await userCredential.user.getIdToken();
        }

        const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, isGuest: false }),
        });

        if (!res.ok) {
            const { error } = await res.json();
            throw new Error(error || 'Failed to create server session.');
        }

        // FIX: Instead of pushing to a new route, we refresh the current one.
        // The middleware will see the new session and automatically redirect
        // the user to the chat page, which is the correct behavior.
        router.refresh();

    } catch (err: any) {
        // Map common Firebase auth errors to user-friendly messages
        switch (err.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                setError('Invalid email or password.');
                break;
            case 'auth/email-already-in-use':
                setError('An account with this email already exists.');
                break;
            case 'auth/weak-password':
                setError('Password should be at least 8 characters.');
                break;
            default:
                setError(err.message || 'An unexpected error occurred.');
        }
    } finally {
        setPending(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 flex flex-col justify-center pt-30">
        <div className="flex flex-col justify-center py-2 px-4 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <Image
                src="/tesslate-logo.svg"
                alt="Tesslate Logo"
                width={40}
                height={40}
                priority
              />
            </div>
            <h2 className="mt-6 text-center text-3xl font-medium text-gray-900">
              {mode === 'signin'
                ? 'Sign in to your account'
                : 'Create your account'}
            </h2>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleAuth(mode === 'signup'); }}>
              <div>
                <Label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </Label>
                <div className="mt-1">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={50}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#5E62FF] focus:border-[#5E62FF] focus:z-10 sm:text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                    <Label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </Label>
                    {mode === 'signin' && (
                         <Link href="/forgot-password"
                           className="text-sm font-medium text-[#5E62FF] hover:text-[#7A7DFF]">
                           Forgot password?
                         </Link>
                    )}
                </div>
                <div className="mt-1">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={100}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#5E62FF] focus:border-[#5E62FF] focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <div>
                <Button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#5E62FF] hover:bg-[#7A7DFF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E62FF]"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Loading...
                    </>
                  ) : (
                    mode === 'signin' ? 'Sign in' : 'Sign up'
                  )}
                </Button>
              </div>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">
                    {mode === 'signin'
                      ? 'New to our platform?'
                      : 'Already have an account?'}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={mode === 'signin' ? '/sign-up' : '/sign-in'}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E62FF]"
                >
                  {mode === 'signin'
                    ? 'Create an account'
                    : 'Sign in to existing account'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterWithLogo />
    </div>
  );
}