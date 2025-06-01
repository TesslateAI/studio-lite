"use client"
import LoginForm from "@/components/login-form"
import DemoSection from "@/components/demo-section"
import FeatureSection from "@/components/feature-section"
import PricingSection from "@/components/pricing-section"
import { Header } from "@/components/layout/header"
import { FooterWithLogo } from "@/components/layout/footer-with-logo"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto py-12 md:py-24 px-4 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-medium mb-6">Experience what our models can do</h1>
            <p className="text-lg text-zinc-700 mb-8">Engineered intelligence, effortless design.</p>
            <div className="max-w-md">
              <LoginForm />
            </div>
          </div>
          <div className="bg-zinc-50 p-8 rounded-lg">
            <DemoSection />
          </div>
        </section>

        <section id="features" className="container mx-auto py-16 px-4">
          <h2 className="text-3xl md:text-4xl font-medium text-center mb-12">Meet Tesslate Studio Lite</h2>
          <p className="text-lg text-center max-w-3xl mx-auto mb-16">
          Tesslate Studio Lite is a platform to explore our most powerful, fine-tuned UI models—specialized, fast, and built to show what's possible.
          </p>
          <FeatureSection />
        </section>

        <section id="pricing" className="container mx-auto py-16 px-4">
          <h2 className="text-3xl md:text-4xl font-medium text-center mb-12">Explore plans</h2>
          <PricingSection />
        </section>
      </main>
      <FooterWithLogo />
    </div>
  )
} 