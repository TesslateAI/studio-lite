'use client';

import Link from 'next/link';
import { useActionState, useState, useEffect} from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import Image from "next/image"
import { Header } from "@/components/layout/header"
import { FooterWithLogo } from "@/components/layout/footer-with-logo"

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const inviteId = searchParams.get('inviteId');
  const emailFromQuery = searchParams.get('email');

  //SelectedPlan only for signup mode
  const [selectedPlan, setSelectedPlan] = useState({
    type: 'free',
    priceId: ''
  })

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  useEffect(() => {
    const storedPlan = sessionStorage.getItem('selectedPlan');
    if (storedPlan) {
      try {
        const planData = JSON.parse(storedPlan);
        setSelectedPlan(planData);
        console.log('Selected plan from session storage:', planData);
        // Clear it so it doesn't persist
        sessionStorage.removeItem('selectedPlan');
      } catch (error) {
        console.error('Error parsing stored plan:', error);
      }
    }
  }, []);
  const getPlanDisplayName = (planType: string ) => {
    switch(planType) {
      case 'plus':
        return 'Plus ($8/month)';
      case 'pro':
        return 'Pro ($40/month)';
      default:
        return 'Free';
    }
  }
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 flex flex-col justify-start">
        <div className="flex flex-col justify-center py-2 px-4 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <Image src="/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png" alt="Tesslate Logo" width={40} height={40} />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {mode === 'signin'
                ? 'Sign in to your account'
                : 'Create your account'}
            </h2>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            {mode === 'signup' && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
                    {[
                      { type: 'free', label: 'Free', price: '$0', priceId: '' },
                      { type: 'plus', label: 'Plus', price: '$8/mo', priceId: 'price_1RVZvwRH2pPtloF7SWUiOSG3' },
                      { type: 'pro', label: 'Pro', price: '$40/mo', priceId: 'price_1RVZwsRH2pPtloF7NmAWkBwV' },
                    ].map(plan => (
                        <button
                            key={plan.type}
                            type="button"
                            className={`rounded-xl border p-4 transition-all duration-200
            ${selectedPlan.type === plan.type
                                ? 'border-orange-500 ring-2 ring-orange-500/70 scale-105 bg-orange-50'
                                : 'border-gray-300 hover:shadow-lg'}
          `}
                            onClick={() => setSelectedPlan({ type: plan.type, priceId: plan.priceId })}
                        >
                          <div className="text-lg font-semibold">{plan.label}</div>
                          <div className="text-2xl font-bold">{plan.price}</div>
                        </button>
                    ))}
                  </div>
            )}
            <form className="space-y-6" action={formAction}>
              <input type="hidden" name="redirect" value={redirect || ''} />
              <input
                  type="hidden"
                  name="priceId"
                  value={mode === 'signup' ? selectedPlan.priceId : ''}
              />
              <input type="hidden" name="plan" value={selectedPlan.type} />
              <input type="hidden" name="inviteId" value={inviteId || ''} />
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
                    defaultValue={emailFromQuery || state?.email}
                    required
                    maxLength={50}
                    className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </Label>
                <div className="mt-1">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    defaultValue={state?.password}
                    required
                    minLength={8}
                    maxLength={100}
                    className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {state?.error && (
                <div className="text-red-500 text-sm">{state.error}</div>
              )}

              <div>
                <Button
                  type="submit"
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-black hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Loading...
                    </>
                  ) : mode === 'signin' ? (
                      'Sign in'
                  ) : selectedPlan.priceId ? (
                      `Create Account & Subscribe`
                  ) : (
                      'Sign up'
                  )}
                </Button>
              </div>
            </form>
            {mode === 'signup' && selectedPlan.priceId && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> After creating your account, you'll be redirected to secure payment processing via Stripe.
                  </p>
                </div>
            )}
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
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
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
