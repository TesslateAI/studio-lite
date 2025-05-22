"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export default function PricingSection() {
  const [plan, setPlan] = useState("individual")

  return (
    <div className="max-w-5xl mx-auto">
      <Tabs defaultValue="individual" className="mb-8" onValueChange={setPlan}>
        <div className="flex justify-center">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="enterprise">Team & Enterprise</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {plan === "individual" ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free (Hobbyist) Plan */}
          <div className="border border-zinc-200 rounded-lg p-6">
            <h3 className="text-2xl font-medium mb-2">Free</h3>
            <p className="text-zinc-600 mb-6">Try Tesslate Studio with rate-limited access</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Chat with AI on web, iOS, and Android</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Generate and visualize code and data (slower speed)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Limited to 100 messages per month</span>
              </li>
            </ul>

            <div className="mt-auto">
              <div className="text-3xl font-bold mb-1">$0</div>
              <div className="text-sm text-zinc-600">Free for everyone, forever.</div>
            </div>
          </div>

          {/* Professional / Designer Plan */}
          <div className="border border-zinc-200 rounded-lg p-6 bg-zinc-50">
            <h3 className="text-2xl font-medium mb-2">Professional</h3>
            <p className="text-zinc-600 mb-6">For power users and designers</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Everything in Free</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Higher message limits</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Export directly to Figma, Framer, etc.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Faster response speeds</span>
              </li>
            </ul>

            <div className="mt-auto">
              <div className="text-3xl font-bold mb-1">$9.99</div>
              <div className="text-sm text-zinc-600">Per month</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {/* Enterprise Tier */}
          <div className="border border-zinc-200 rounded-lg p-8 bg-zinc-50">
            <h3 className="text-2xl font-medium mb-2">Enterprise</h3>
            <p className="text-zinc-600 mb-6">Custom solutions for your organization</p>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Host Tesslate's models on your own infrastructure</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Private deployment & custom integrations</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Designed for secure, scalable usage in enterprise settings</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Dedicated support and SLAs</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span>Custom model fine-tuning options</span>
              </li>
            </ul>

            <div className="text-center">
              <Button className="bg-zinc-900 text-white hover:bg-zinc-800 px-8 py-6 text-lg">
                Contact us to get started
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-4 text-center">
        Prices shown do not include applicable tax. *Usage limits apply.
      </p>
    </div>
  )
} 