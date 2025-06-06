// src/components/pricing-section.tsx
"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation" // For button actions

const plans = [
  {
    name: "Free",
    price: "$0",
    priceSuffix: "forever",
    description: "Get started with our core features, completely free.",
    features: [
      "Basic model access",
      "Limited daily queries",
      "Community support",
      "Standard UI components",
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Plus",
    price: "$8",
    priceSuffix: "/ month",
    description: "More power and features for individuals and small projects.",
    features: [
      "Full model access",
      "Increased query limits",
      "Priority email support",
      "Advanced UI components",
      "Early access to new features",
    ],
    cta: "Choose Plus",
    planType: "plus",
    priceId: "price_1RVZvwRH2pPtloF7SWUiOSG3",
    highlight: true, // Highlight this plan
  },
  {
    name: "Pro",
    price: "$40",
    priceSuffix: "/ month",
    description: "The ultimate toolkit for professionals and teams.",
    features: [
      "Unlimited model access",
      "Highest query limits",
      "Dedicated support channel",
      "All UI components & themes",
      "Team collaboration features",
      "API access (coming soon)",
    ],
    cta: "Choose Pro",
    planType: "pro",
    priceId: "price_1RVZwsRH2pPtloF7NmAWkBwV",
    highlight: false,
  },
]

export default function PricingSection() {
  const router = useRouter()

  const handlePlanSelection = (plan: typeof plans[0]) => {
    if (plan.planType === "free") {
      // For free plan, just redirect to sign-up
      router.push("/sign-up")
    } else {
      sessionStorage.setItem('selectedPlan', JSON.stringify({
        type: plan.planType,
        priceId: plan.priceId
      }));
      router.push("/sign-up")
    }
  }
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6 items-stretch">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`flex flex-col rounded-xl border bg-card p-6 shadow-lg transition-all duration-300
                      ${plan.highlight ? "border-orange-500 ring-2 ring-orange-500/70 scale-[1.02] lg:scale-105 dark:bg-zinc-800/30" : "border-border hover:shadow-xl dark:bg-card/50"}`}
        >
          {plan.highlight && (
            <div className="mb-4 text-center">
              <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                Most Popular
              </span>
            </div>
          )}
          <h3 className="text-2xl font-semibold text-foreground">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-bold text-foreground">{plan.price}</span>
            <span className="ml-1 text-sm font-medium text-muted-foreground">{plan.priceSuffix}</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground flex-grow">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 flex-shrink-0 text-orange-500" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => handlePlanSelection(plan)}
            size="lg"
            className={`mt-8 w-full ${plan.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
          >
            {plan.cta}
          </Button>
        </div>
      ))}
    </div>
  )
}