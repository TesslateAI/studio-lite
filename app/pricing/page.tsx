'use client';

import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const plans = [
  {
    name: "Free",
    price: "$0",
    priceSuffix: " forever",
    description: "Perfect for trying out Tesslate Studio Lite",
    features: [
      "Basic AI models access",
      "20 requests per minute",
      "20,000 tokens per minute",
      "Core chat functionality",
      "Basic code generation"
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Plus",
    price: "$10",
    priceSuffix: " / month",
    description: "Best for individuals and small projects",
    features: [
      "All Free features",
      "Advanced AI models",
      "100 requests per minute", 
      "100,000 tokens per minute",
      "Priority support",
      "Enhanced code generation"
    ],
    cta: "Start Plus Plan",
    highlight: true,
    planType: "plus",
    priceId: "price_1RVZvwRH2pPtloF7SWUiOSG3"
  },
  {
    name: "Pro", 
    price: "$50",
    priceSuffix: " / month",
    description: "Perfect for professionals and teams",
    features: [
      "All Plus features",
      "All premium AI models",
      "500 requests per minute",
      "500,000 tokens per minute", 
      "Dedicated support",
      "Custom integrations",
      "Advanced analytics"
    ],
    cta: "Start Pro Plan",
    highlight: false,
    planType: "pro", 
    priceId: "price_1RVZwsRH2pPtloF7NmAWkBwV"
  }
];

export default function PublicPricingPage() {
  const router = useRouter();

  const handlePlanSelection = (plan: typeof plans[0]) => {
    if (plan.planType) {
      // Store the selected plan for after sign-up
      sessionStorage.setItem('selectedPlan', JSON.stringify({ 
        type: plan.planType, 
        priceId: plan.priceId 
      }));
    }
    // Always route to sign-up for public pricing page
    router.push('/sign-up');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Button asChild size="sm">
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Choose the perfect plan for your needs
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Start for free and scale as you grow. All plans include our core AI-powered features with different usage limits and model access.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl ${
                  plan.highlight 
                    ? "border-blue-500 ring-2 ring-blue-500/20 scale-105" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-sm font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-8">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.priceSuffix}</span>
                  </div>

                  <Button
                    onClick={() => handlePlanSelection(plan)}
                    size="lg"
                    className={`w-full mb-8 ${
                      plan.highlight
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        : ""
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </div>

                <div className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Everything you need to know about our pricing and plans.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards, PayPal, and other payment methods through Stripe.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600">Yes! Our Free plan lets you try the platform with no time limit and no credit card required.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">Absolutely. You can cancel your subscription at any time from your account settings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join thousands of developers already building with Tesslate Studio Lite.
          </p>
          <Button
            onClick={() => router.push('/sign-up')}
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            Start Building Today
          </Button>
        </div>
      </section>
    </div>
  );
}