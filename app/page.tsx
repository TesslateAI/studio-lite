"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { FooterWithLogo } from '@/components/layout/footer-with-logo';
import { ArrowRight, Bot, Code, Zap, Users, CheckCircle2, LayoutDashboard, Component, Rocket } from 'lucide-react';

// --- Reusable Feature Card Component ---
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="bg-card/50 dark:bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:border-orange-500/30">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-500/10 text-orange-500 mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground">{children}</p>
    </div>
);

// --- Reusable Use Case Card Component ---
const UseCaseCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-secondary/50 to-background transition-all duration-300 hover:scale-105 hover:shadow-2xl">
        <div className="text-orange-500 mb-3">{icon}</div>
        <h4 className="font-semibold text-lg mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
    </div>
);

// --- Page Sections as Components ---

const HeroSection = () => {
    const router = useRouter();
    return (
        <section className="relative overflow-hidden pt-28 md:pt-36 pb-20 md:pb-24">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
                <div
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-orange-400/40 to-primary/30 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                    style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
                />
            </div>
            <div className="container mx-auto px-6 text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                    Design at the Speed of Thought
                </h1>
                <p className="max-w-3xl mx-auto text-lg sm:text-xl text-muted-foreground mb-10">
                    Tesslate Designer gives you instant access to specialized AI models that turn your ideas into high-fidelity, interactive UIs.
                </p>
                <div className="flex justify-center items-center gap-4">
                    <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" onClick={() => router.push('/chat')}>
                        Try Live Demo <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button size="lg" variant="outline" className="shadow-sm hover:shadow-md" onClick={() => router.push('/sign-up')}>
                        Get Started for Free
                    </Button>
                </div>

                {/* Visual Demo of the Product */}
                <div className="mt-16 max-w-4xl mx-auto">
                     <div className="bg-card/70 dark:bg-card/50 backdrop-blur-lg border border-border p-1 sm:p-2 rounded-xl shadow-2xl dark:shadow-primary/20 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/25 focus-within:scale-[1.02] focus-within:shadow-primary/25">
                        <div className="bg-card p-4 sm:p-6 rounded-lg overflow-hidden">
                            {/* Re-using the DemoSection from your original codebase as it's a great visual */}
                             <div className="border border-black rounded-lg overflow-hidden">
                                <div className="flex items-start gap-3 p-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">👤</div>
                                    <div className="bg-gray-100 rounded-lg p-3 flex-1">
                                    <p>Tesslate Designer, generate a UI for my coffee shop business.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm">✨</div>
                                    <div className="flex-1">
                                    <p className="mb-2">Generating <span className="font-mono bg-zinc-100 px-2 py-1 rounded text-xs">index.html</span>...</p>
                                    <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-3 flex flex-col items-center">
                                        <div className="w-full flex justify-between items-center mb-2">
                                        <span className="font-mono text-xs text-zinc-500">index.html</span>
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Ready</span>
                                        </div>
                                        <pre className="bg-zinc-50 rounded-lg p-4 w-full text-xs text-left overflow-x-auto font-mono">
                                            {`<!DOCTYPE html>\n<html>\n  <head>\n    <title>Sample UI</title>\n  </head>\n  <body>\n    <h1>Hello, world!</h1>\n    <!-- ... -->\n  </body>\n</html>`}
                                        </pre>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FeaturesSection = () => (
    <section id="features" className="py-20 md:py-28 bg-secondary/30 dark:bg-muted/10">
        <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">A New Way to Build for the Web</h2>
                <p className="text-lg text-muted-foreground">
                    Tesslate Designer isn't just another AI wrapper. It's an integrated environment built on three core principles.
                </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FeatureCard icon={<Zap className="w-6 h-6" />} title="Instant Generation">
                    Go from a text prompt to a fully interactive preview in seconds. Our optimized models deliver results fast, so you can iterate without waiting.
                </FeatureCard>
                <FeatureCard icon={<Bot className="w-6 h-6" />} title="Specialized UI Models">
                    Access models fine-tuned for React, Tailwind, and modern web standards. They understand components, layouts, and design systems for higher-quality output.
                </FeatureCard>
                <FeatureCard icon={<Code className="w-6 h-6" />} title="Developer-First Sandbox">
                    Inspect, edit, and download the clean, production-ready code for every generation. No black boxes, no walled gardens.
                </FeatureCard>
            </div>
        </div>
    </section>
);

const UseCasesSection = () => (
    <section id="use-cases" className="py-20 md:py-28">
        <div className="container mx-auto px-6">
             <div className="max-w-3xl mx-auto text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">What will you build?</h2>
                <p className="text-lg text-muted-foreground">
                    Whether you're prototyping, building components, or scaffolding entire pages, Designer accelerates your workflow.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <UseCaseCard icon={<LayoutDashboard size={28} />} title="Dashboards & Internal Tools" description="Quickly generate complex layouts with charts, tables, and forms for your next internal tool or admin panel." />
                <UseCaseCard icon={<Rocket size={28} />} title="Landing Pages" description="Describe your product or service and get a complete, responsive landing page with sections for features, pricing, and CTAs." />
                <UseCaseCard icon={<Component size={28} />} title="Component Libraries" description="Build individual components like buttons, cards, and navigation bars. Perfect for populating your design system." />
            </div>
        </div>
    </section>
);

const PricingSection = () => {
  const router = useRouter();
  const plans = [
    { name: "Free", price: "$0", priceSuffix: "forever", description: "Get started with our core features, completely free.", features: ["Basic model access", "Limited daily queries", "Community support"], cta: "Get Started Free", highlight: false, },
    { name: "Plus", price: "$8", priceSuffix: "/ month", description: "More power and features for individuals.", features: ["Full model access", "Increased query limits", "Priority email support", "Advanced UI components"], cta: "Choose Plus", planType: "plus", priceId: "price_1RVZvwRH2pPtloF7SWUiOSG3", highlight: true, },
    { name: "Pro", price: "$40", priceSuffix: "/ month", description: "The ultimate toolkit for professionals.", features: ["Unlimited model access", "Highest query limits", "Dedicated support channel", "Team collaboration features"], cta: "Choose Pro", planType: "pro", priceId: "price_1RVZwsRH2pPtloF7NmAWkBwV", highlight: false, },
  ];

  const handlePlanSelection = (plan: typeof plans[0]) => {
    if (plan.planType) {
      sessionStorage.setItem('selectedPlan', JSON.stringify({ type: plan.planType, priceId: plan.priceId }));
    }
    router.push('/sign-up');
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-secondary/30 dark:bg-muted/10">
        <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Pricing for Every Stage</h2>
                <p className="text-lg text-muted-foreground">Start for free and scale as you grow. No credit card required to get started.</p>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6 items-stretch">
                {plans.map((plan) => (
                    <div key={plan.name} className={`flex flex-col rounded-xl border bg-card p-6 shadow-lg transition-all duration-300 ${plan.highlight ? "border-orange-500 ring-2 ring-orange-500/70 scale-[1.02] lg:scale-105" : "border-border hover:shadow-xl"}`}>
                        {plan.highlight && (
                            <div className="mb-4 text-center">
                                <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">Most Popular</span>
                            </div>
                        )}
                        <h3 className="text-2xl font-semibold text-foreground">{plan.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                        <div className="mt-4 mb-6"><span className="text-4xl font-bold text-foreground">{plan.price}</span><span className="ml-1 text-sm font-medium text-muted-foreground">{plan.priceSuffix}</span></div>
                        <ul className="space-y-2 text-sm text-muted-foreground flex-grow">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 flex-shrink-0 text-orange-500" />{feature}</li>
                            ))}
                        </ul>
                        <Button onClick={() => handlePlanSelection(plan)} size="lg" className={`mt-8 w-full ${plan.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>{plan.cta}</Button>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
};

const FinalCTASection = () => {
    const router = useRouter();
    return (
        <section className="py-20 md:py-28">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Ready to build faster?</h2>
                <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-8">Sign up and start generating your first UI in minutes. The future of web development is here.</p>
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" onClick={() => router.push('/sign-up')}>
                    Start Building Now for Free
                </Button>
            </div>
        </section>
    );
};


// --- Main Page Component ---

export default function Home() {
    useEffect(() => {
        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Optional: unobserve after revealing to save resources
                    // revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        revealElements.forEach(el => revealObserver.observe(el));

        // Cleanup observer on component unmount
        return () => revealElements.forEach(el => revealObserver.unobserve(el));
    }, []);

    return (
        <div className="bg-background text-foreground antialiased selection:bg-orange-500 selection:text-white">
            <Header />
            <main>
                <HeroSection />
                <FeaturesSection />
                <UseCasesSection />
                <PricingSection />
                <FinalCTASection />
            </main>
            <FooterWithLogo />
        </div>
    );
}