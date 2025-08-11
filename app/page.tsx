"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { FooterWithLogo } from "@/components/layout/footer-with-logo";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Code,
  Zap,
  CheckCircle2,
  LayoutDashboard,
  Component as ComponentIcon,
  Rocket,
  Wand2,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

// -------------------------------------------------
// Reusable Cards — keep the same bindings & props
// -------------------------------------------------
export const FeatureCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.5 }}
    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300"
  >
    <div className="absolute inset-px rounded-[1rem] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5E62FF]/10 text-[#5E62FF] ring-1 ring-inset ring-[#5E62FF]/20">
      {icon}
    </div>
    <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
  </motion.div>
);

export const UseCaseCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.45 }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/60 via-background to-background p-6 ring-1 ring-border/60 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300"
  >
    <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-[#5E62FF]/10 blur-xl" />
    <div className="text-[#5E62FF] mb-3">{icon}</div>
    <h4 className="font-semibold text-lg text-foreground">{title}</h4>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
  </motion.div>
);

// -------------------------------------------------
// Visual helpers
// -------------------------------------------------
const Aurora = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute -top-24 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#5E62FF]/20 blur-3xl" />
    <div className="absolute top-1/3 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" />
    <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#5E62FF]/15 blur-3xl" />
  </div>
);


// -------------------------------------------------
// Sections
// -------------------------------------------------
const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="relative min-h-screen flex items-start justify-center overflow-hidden bg-black pt-32 md:pt-40">
      {/* Cosmic background with parallax */}
      <div className="absolute inset-0 w-full h-full">
        <div className="parallax-bg absolute inset-0 -top-20 -bottom-20">
          <Image
            src="/cosmic-background.png"
            alt=""
            fill
            className="object-cover opacity-90"
            priority
            quality={100}
          />
        </div>
      </div>
      
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Main content with fade-in animation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            {/* Headline with mixed typography */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-normal text-white leading-[1.1] tracking-tight mb-6">
              <span style={{ fontFamily: 'var(--font-body)' }}>Design your</span>{' '}
              <span 
                className="italic text-white" 
                style={{ 
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 400,
                  letterSpacing: '0.02em'
                }}
              >
                universe
              </span>{' '}
              <span style={{ fontFamily: 'var(--font-body)' }}>on an infinite canvas.</span>
            </h1>

            {/* Sub-headline */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-lg sm:text-xl md:text-[22px] text-white/90 mb-10 max-w-2xl mx-auto leading-[1.5] tracking-tight"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Tesslate Designer gives you limitless space to bring your most ambitious ideas to life.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <button
                onClick={() => router.push("/chat")}
                className="px-10 py-4 text-lg font-medium text-white bg-black/50 backdrop-blur-sm border border-white/20 rounded-full hover:bg-black/60 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Start Creating for Free
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => (
  <section id="features" className="py-20 md:py-28 bg-secondary/30 dark:bg-muted/10">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight">A new way to build for the web</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          Not just another wrapper. Designer is a focused environment for creating real, production‑ready UI.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={<Zap className="h-6 w-6" />} title="Instant generation">
          Go from prompt to interactive preview in seconds. Iterate freely without waiting.
        </FeatureCard>
        <FeatureCard icon={<Bot className="h-6 w-6" />} title="Specialized UI models">
          Models tuned for React, Tailwind and modern semantics. They understand layout, components, and design tokens.
        </FeatureCard>
        <FeatureCard icon={<Code className="h-6 w-6" />} title="Developer‑first sandbox">
          Inspect, edit, and export clean code. No lock‑in, no black boxes—ship with confidence.
        </FeatureCard>
        <FeatureCard icon={<Palette className="h-6 w-6" />} title="Design‑system aware">
          Respect your tokens, grids, spacing and typography. Generate on‑brand components by default.
        </FeatureCard>
        <FeatureCard icon={<Wand2 className="h-6 w-6" />} title="Smart refactors">
          Change copy, swap layouts, or upgrade components—Designer safely updates related parts.
        </FeatureCard>
        <FeatureCard icon={<ShieldCheck className="h-6 w-6" />} title="Enterprise‑ready">
          Auditable outputs, predictable diffs, and collaboration controls your team can trust.
        </FeatureCard>
      </div>
    </div>
  </section>
);

const HowItWorksSection = () => (
  <section className="py-20 md:py-28">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight">How it works</h2>
        <p className="mt-3 text-lg text-muted-foreground">Three simple steps from idea to code.</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[{
          title: "Describe",
          desc: "Write what you want—components, pages, or full flows. Bring your tokens if you have them.",
          icon: <Sparkles className="h-5 w-5" />,
        },{
          title: "Preview",
          desc: "Designer composes accurate, responsive layouts you can tweak in place.",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },{
          title: "Export",
          desc: "Download clean React + Tailwind or copy to your repo. No proprietary runtimes.",
          icon: <Code className="h-5 w-5" />,
        }].map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card/60 p-6">
            <div className="flex items-center gap-2 text-[#5E62FF]">{s.icon}<span className="text-sm font-medium">{s.title}</span></div>
            <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const UseCasesSection = () => (
  <section id="use-cases" className="py-20 md:py-28">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight">What will you build?</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          Prototype faster, ship components, or scaffold entire pages—Designer accelerates every step.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <UseCaseCard icon={<LayoutDashboard size={28} />} title="Dashboards & internal tools" description="Generate complex layouts with charts, tables, and forms for admin panels in minutes." />
        <UseCaseCard icon={<Rocket size={28} />} title="Marketing pages" description="Describe your product and get a complete, responsive landing page with CTAs and sections." />
        <UseCaseCard icon={<ComponentIcon size={28} />} title="Component libraries" description="Buttons, cards, navbars—populate your system with accessible, on‑brand pieces." />
      </div>
    </div>
  </section>
);

const PricingSection = () => {
  const router = useRouter();
  const plans = [
    {
      name: "Free",
      price: "$0",
      priceSuffix: "forever",
      description: "Get started with our core features, completely free.",
      features: ["Basic model access", "Limited daily queries", "Community support"],
      cta: "Get Started Free",
      highlight: false,
    },
    {
      name: "Plus",
      price: "$8",
      priceSuffix: "/ month",
      description: "More power and features for individuals.",
      features: [
        "Full model access",
        "Increased query limits",
        "Priority email support",
        "Advanced UI components",
      ],
      cta: "Choose Plus",
      planType: "plus",
      priceId: "price_1RVZvwRH2pPtloF7SWUiOSG3",
      highlight: true,
    },
    {
      name: "Pro",
      price: "$40",
      priceSuffix: "/ month",
      description: "The ultimate toolkit for professionals.",
      features: [
        "Unlimited model access",
        "Highest query limits",
        "Dedicated support channel",
        "Team collaboration features",
      ],
      cta: "Choose Pro",
      planType: "pro",
      priceId: "price_1RVZwsRH2pPtloF7NmAWkBwV",
      highlight: false,
    },
  ] as const;

  const handlePlanSelection = (plan: typeof plans[number]) => {
    if ((plan as any).planType) {
      sessionStorage.setItem(
        "selectedPlan",
        JSON.stringify({ type: (plan as any).planType, priceId: (plan as any).priceId })
      );
    }
    router.push("/sign-up");
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-secondary/30 dark:bg-muted/10">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight">Pricing for every stage</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free and scale as you grow. No credit card required.
          </p>
        </div>

        <div className="mt-10 grid items-stretch grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border bg-card p-6 shadow-md transition-all duration-300 ${
                plan.highlight
                  ? "border-[#5E62FF] ring-2 ring-[#5E62FF]/60 scale-[1.02] lg:scale-105"
                  : "border-border hover:shadow-xl"
              }`}
            >
              {plan.highlight && (
                <div className="mb-4 text-center">
                  <span className="inline-block rounded-full bg-[#5E62FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
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
              <ul className="flex-grow space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <CheckCircle2 className="mr-2 h-4 w-4 shrink-0 text-[#5E62FF]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handlePlanSelection(plan)}
                size="lg"
                className={`mt-8 w-full ${
                  plan.highlight
                    ? "bg-[#5E62FF] hover:bg-[#7A7DFF] text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQSection = () => (
  <section id="faq" className="py-20 md:py-28">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight">Questions, answered</h2>
        <p className="mt-3 text-lg text-muted-foreground">A few things teams ask before they switch.</p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card/60">
        {[
          {
            q: "What frameworks are supported?",
            a: "React and Tailwind out of the box. Next.js and Vite compatible. More targets on the way.",
          },
          {
            q: "Can I export code?",
            a: "Yes—copy, download, or push to your repo. The output is readable, typed where expected, and easy to review.",
          },
          {
            q: "Does Designer follow our design system?",
            a: "Import tokens and components to generate on‑brand UI. Designer respects your spacing, color, and type scales.",
          },
          { q: "Is this safe for enterprise?", a: "We prioritize privacy and auditability. Self‑hosted options and SSO are available for larger teams." },
        ].map((item) => (
          <details key={item.q} className="group">
            <summary className="cursor-pointer list-none select-none p-5 text-left font-medium text-foreground">
              {item.q}
            </summary>
            <div className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const FinalCTASection = () => {
  const router = useRouter();
  return (
    <section className="relative py-20 md:py-28">
      <Aurora />
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight">Ready to build faster?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
          Sign up and generate your first UI in minutes. The future of web design is here.
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            className="bg-[#5E62FF] hover:bg-[#7A7DFF] text-white shadow-lg hover:shadow-2xl"
            onClick={() => router.push("/sign-up")}
          >
            Start Building Now for Free
          </Button>
        </div>
      </div>
    </section>
  );
};

// -------------------------------------------------
// Main Page
// -------------------------------------------------
export default function Home() {
  useEffect(() => {
    // Optional observer for any elements that keep the .reveal-on-scroll class
    const revealElements = document.querySelectorAll(".reveal-on-scroll");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
    return () => revealElements.forEach((el) => revealObserver.unobserve(el));
  }, []);

  return (
    <div className="bg-background text-foreground antialiased selection:bg-[#5E62FF] selection:text-white">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <UseCasesSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <FooterWithLogo />
    </div>
  );
}
