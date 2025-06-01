"use client"
import LoginForm from "@/components/login-form" // Assuming this component is well-styled
import DemoSection from "@/components/demo-section"
import FeatureSection from "@/components/feature-section"
import PricingSection from "@/components/pricing-section" // Updated import
import { Header } from "@/components/layout/header"
import { FooterWithLogo } from "@/components/layout/footer-with-logo"
import { Button } from "@/components/ui/button" // Import Button
import { useRouter } from "next/navigation" // Import useRouter for the button

export default function Home() {
  const router = useRouter() // Initialize router

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground antialiased selection:bg-orange-500 selection:text-white">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Subtle Decorative Gradient Background */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-orange-400/40 to-primary/30 opacity-50 dark:opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>

          <div className="container mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 md:pt-32 md:pb-36 relative z-0">
            <div className="grid md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center">
              {/* Text Content Column */}
              <div className="text-center md:text-left">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                  Experience Models <br className="hidden xs:inline sm:hidden md:inline" />That <span className="text-orange-500">Understand UI</span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground mb-8 md:mb-10 max-w-xl mx-auto md:mx-0">
                  Engineered intelligence, effortless design. Tesslate Studio Lite provides access to specialized, fast UI models built to showcase the future of interaction.
                </p>
                {/* Stronger Buttons & Form Area */}
                <div className="space-y-6 max-w-md mx-auto md:mx-0">
                  {/* Assuming LoginForm contains a prominent primary button like "Sign Up" or "Get Started" */}
                  <LoginForm />

                  {/* "Or" divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-background text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Stronger "Try Live Demo" Button */}
                  <Button
                    variant="outline"
                    size="lg" // Larger button
                    className="w-full font-semibold border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors duration-200 focus-visible:ring-orange-500 dark:hover:bg-orange-500 dark:hover:text-background"
                    onClick={() => router.push('/chat')}
                  >
                    Try Live Demo
                  </Button>
                </div>
              </div>

              {/* Demo Section Column */}
              <div className="mt-10 md:mt-0 mx-auto max-w-2xl md:max-w-none w-full"> {/* Added mx-auto and max-w for mobile centering of demo if needed */}
                <div className="bg-card/70 dark:bg-card/50 backdrop-blur-lg border border-border p-1 sm:p-2 rounded-xl shadow-2xl dark:shadow-primary/20 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/25 focus-within:scale-[1.02] focus-within:shadow-primary/25">
                  <div className="bg-card p-4 sm:p-6 rounded-lg overflow-hidden">
                    <DemoSection />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-secondary/30 dark:bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Meet Tesslate Studio Lite
              </h2>
              <p className="text-lg text-muted-foreground">
                A platform to explore our most powerful, fine-tuned UI models—specialized, fast, and built to show what's possible.
              </p>
            </div>
            <FeatureSection />
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Explore Our Plans
              </h2>
              <p className="text-lg text-muted-foreground">
                Choose the plan that best fits your needs to get started with Tesslate Studio Lite.
              </p>
            </div>
            <PricingSection /> {/* Use the new PricingSection component */}
          </div>
        </section>
      </main>
      <FooterWithLogo />
    </div>
  )
}