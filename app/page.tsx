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
  ChevronDown,
} from "lucide-react";

// -------------------------------------------------
// Reusable Cards — keep the same bindings & props
// -------------------------------------------------
const FeatureCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.5 }}
    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-card/50 p-6 border border-border/50 hover:border-[#5E62FF]/50 hover:shadow-2xl hover:shadow-[#5E62FF]/10 transition-all duration-300"
    role="listitem"
  >
    {/* Hover gradient effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#5E62FF]/0 via-[#5E62FF]/0 to-[#5E62FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    {/* Content */}
    <div className="relative z-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] text-white shadow-lg shadow-[#5E62FF]/25 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground group-hover:text-[#5E62FF] transition-colors">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>
      
      {/* Arrow indicator */}
      <div className="mt-4 flex items-center text-[#5E62FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-sm font-medium">Learn more</span>
        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  </motion.article>
);

const UseCaseCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.45 }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/60 via-background to-background p-4 sm:p-6 ring-1 ring-border/60 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary"
    role="listitem"
  >
    <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-[#5E62FF]/10 blur-xl" />
    <div className="text-[#5E62FF] mb-3">{icon}</div>
    <h4 className="font-semibold text-base sm:text-lg text-foreground">{title}</h4>
    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">{description}</p>
  </motion.article>
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
  const [prompt, setPrompt] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const prompts = [
    "a modern SaaS landing page with pricing cards",
    "an e-commerce product page with reviews",
    "a dashboard with charts and analytics",
    "a social media feed with infinite scroll",
    "a portfolio site with project gallery",
    "a blog with dark mode toggle",
    "a team page with member cards",
    "a contact form with validation"
  ];

  const luckyPrompts = [
    "Create a stunning portfolio website with smooth animations",
    "Build a modern dashboard with real-time data visualization",
    "Design an elegant e-commerce site with product filters",
    "Make a beautiful blog with markdown support",
    "Generate a SaaS landing page with interactive pricing"
  ];

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentPrompt = prompts[placeholderIndex];
    
    if (isTyping) {
      if (displayedPlaceholder.length < currentPrompt.length) {
        timeout = setTimeout(() => {
          setDisplayedPlaceholder(currentPrompt.slice(0, displayedPlaceholder.length + 1));
        }, 50);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      if (displayedPlaceholder.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedPlaceholder(displayedPlaceholder.slice(0, -1));
        }, 30);
      } else {
        setPlaceholderIndex((prev) => (prev + 1) % prompts.length);
        setIsTyping(true);
      }
    }
    
    return () => clearTimeout(timeout);
  }, [displayedPlaceholder, isTyping, placeholderIndex, prompts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      const encodedPrompt = encodeURIComponent(prompt.trim());
      router.push(`/chat?prompt=${encodedPrompt}`);
    }
  };

  const handleFeelingLucky = () => {
    const randomPrompt = luckyPrompts[Math.floor(Math.random() * luckyPrompts.length)];
    const encodedPrompt = encodeURIComponent(randomPrompt);
    router.push(`/chat?prompt=${encodedPrompt}`);
  };

  return (
    <div className="relative min-h-screen flex items-start justify-center overflow-hidden bg-black pt-32 md:pt-40">
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
      
      {/* Enhanced gradient overlays for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-transparent pointer-events-none" />

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
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] font-normal text-white leading-[1.1] tracking-tight mb-6">
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
              className="text-base sm:text-lg md:text-xl lg:text-[22px] text-white/90 mb-10 max-w-2xl mx-auto leading-[1.5] tracking-tight"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Tesslate Designer gives you limitless space to bring your most ambitious ideas to life.
            </motion.p>

            {/* Prompt Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="w-full max-w-2xl mx-auto"
            >
              <form onSubmit={handleSubmit} className="relative" role="search" aria-label="Design prompt input">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={displayedPlaceholder}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-32 sm:pr-40 text-base sm:text-lg text-white bg-white/10 backdrop-blur-md border border-white/30 rounded-full placeholder:text-white/60 focus:outline-none focus:bg-white/15 focus:border-white/50 transition-all duration-300"
                  style={{ fontFamily: 'var(--font-body)' }}
                  aria-label="Enter your design idea"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base font-semibold text-black bg-white rounded-full hover:bg-white/95 hover:scale-105 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 group"
                  style={{ fontFamily: 'var(--font-body)' }}
                  aria-label="Start building with your design idea"
                >
                  <span className="hidden sm:inline">Start Building</span>
                  <span className="sm:hidden">Start</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </form>
              
              {/* I'm Feeling Lucky Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                className="mt-4 flex justify-center"
              >
                <button
                  onClick={handleFeelingLucky}
                  className="px-6 py-2 text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-full backdrop-blur-sm transition-all duration-200 hover:bg-white/10 flex items-center gap-2 group"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" aria-hidden="true" />
                  I'm Feeling Lucky
                </button>
              </motion.div>
            </motion.div>
          </motion.div>

        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <a
          href="#features"
          className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors group"
          aria-label="Scroll to features section"
        >
          <span className="text-xs sm:text-sm font-medium tracking-widest uppercase">Explore</span>
          <ChevronDown className="w-6 h-6 animate-bounce" aria-hidden="true" />
        </a>
      </motion.div>
    </div>
  );
};

const ShowcaseSection = () => {
  const router = useRouter();
  const [selectedSample, setSelectedSample] = useState(0);
  const [viewMode, setViewMode] = useState<'preview' | 'grid'>('grid');
  const [iframeError, setIframeError] = useState(false);
  
  const samples = [
    {
      title: "Modern Dashboard",
      description: "Analytics dashboard with charts and metrics",
      url: "https://uigenoutput.tesslate.com/responses/uigen-x-4b-0729_response_498",
      image: "/showcase-dashboard.png",
      tags: ["Dashboard", "Analytics", "Charts"]
    },
    {
      title: "E-commerce Layout",
      description: "Product page with reviews and recommendations",
      url: "https://uigenoutput.tesslate.com/responses/uigen-x-4b-0729_response_156",
      image: "/showcase-ecommerce.png",
      tags: ["E-commerce", "Product", "Reviews"]
    },
    {
      title: "SaaS Landing",
      description: "Modern landing page with pricing tiers",
      url: "https://uigenoutput.tesslate.com/responses/uigen-x-4b-0729_response_263",
      image: "/showcase-saas.png",
      tags: ["Landing", "SaaS", "Marketing"]
    },
    {
      title: "Portfolio Site",
      description: "Creative portfolio with project showcase",
      url: "https://uigenoutput.tesslate.com/responses/uigen-x-4b-0729_response_266",
      image: "/showcase-portfolio.png",
      tags: ["Portfolio", "Gallery", "Creative"]
    }
  ];
  
  useEffect(() => {
    setIframeError(false);
  }, [selectedSample]);

  return (
    <div className="py-20 md:py-32 bg-gradient-to-b from-background via-secondary/5 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-center opacity-[0.02] pointer-events-none" />
      <div className="absolute top-20 left-0 w-96 h-96 bg-[#5E62FF]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold tracking-wider uppercase text-[#5E62FF] bg-[#5E62FF]/10 rounded-full">
            Live Examples
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            See What's Possible
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real interfaces generated by our AI in seconds. Click any example to view the live demo.
          </p>
        </motion.div>

        {/* View mode toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 p-1 bg-muted/50 rounded-full">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'grid' 
                  ? 'bg-white text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Grid View
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'preview' 
                  ? 'bg-white text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="w-4 h-4" />
              Live Preview
            </button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {samples.map((sample, index) => (
              <motion.a
                key={index}
                href={sample.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-card rounded-2xl overflow-hidden border border-border hover:border-[#5E62FF]/50 hover:shadow-2xl transition-all duration-300"
              >
                {/* Card header */}
                <div className="p-6 border-b border-border bg-muted/30">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-[#5E62FF] transition-colors">
                      {sample.title}
                    </h3>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[#5E62FF] rotate-[-45deg] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {sample.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sample.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Preview area */}
                <div className="relative h-64 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-3 p-4 rounded-full bg-[#5E62FF]/10 inline-block group-hover:scale-110 transition-transform">
                      <Code className="w-8 h-8 text-[#5E62FF]" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Click to View Demo</p>
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        ) : (
          /* Preview mode with sample selector and iframe */
          <>
            {/* Sample selector for preview mode */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {samples.map((sample, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedSample(index)}
                  className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                    selectedSample === index
                      ? 'bg-[#5E62FF] text-white shadow-lg shadow-[#5E62FF]/25'
                      : 'bg-card hover:bg-card/80 text-foreground border border-border'
                  }`}
                >
                  {sample.title}
                </motion.button>
              ))}
            </div>
            
            {/* Preview window */}
            <motion.div
              key={selectedSample}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-7xl mx-auto"
            >
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-muted/50 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {samples[selectedSample].tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {samples[selectedSample].description}
                  </span>
                  <a
                    href={samples[selectedSample].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                    aria-label="Open in new tab"
                  >
                    <ArrowRight className="w-4 h-4 rotate-[-45deg]" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Preview container */}
            <div className="relative bg-gradient-to-br from-slate-50 to-slate-100" style={{ height: '600px' }}>
              {/* Click to view overlay */}
              <a
                href={samples[selectedSample].url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
              >
                <div className="text-center text-white">
                  <div className="mb-4 p-4 rounded-full bg-white/20 backdrop-blur">
                    <ArrowRight className="w-8 h-8 rotate-[-45deg]" />
                  </div>
                  <p className="text-lg font-semibold mb-2">View Live Demo</p>
                  <p className="text-sm text-white/80">Click to explore this interactive example</p>
                </div>
              </a>
              
              {/* Try iframe with error handling */}
              {!iframeError ? (
                <iframe
                  src={samples[selectedSample].url}
                  className="w-full h-full"
                  title={samples[selectedSample].title}
                  loading="lazy"
                  onError={() => setIframeError(true)}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              ) : (
                /* Fallback: Beautiful placeholder */
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  <div className="max-w-md text-center">
                    <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-[#5E62FF]/10 to-[#7A7DFF]/10">
                      <Code className="w-12 h-12 text-[#5E62FF] mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-slate-900">{samples[selectedSample].title}</h3>
                    <p className="text-slate-600 mb-6">{samples[selectedSample].description}</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      {samples[selectedSample].tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 text-xs font-medium bg-[#5E62FF]/10 text-[#5E62FF] rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href={samples[selectedSample].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#5E62FF] text-white rounded-full font-medium hover:bg-[#7A7DFF] transition-colors"
                    >
                      View Live Example
                      <ArrowRight className="w-4 h-4 rotate-[-45deg]" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
            </motion.div>
          </>
        )}
        
        {/* Stats and CTA below showcase */}
        <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mb-12 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#5E62FF] mb-1">10s</div>
                <div className="text-sm text-muted-foreground">Generation Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#5E62FF] mb-1">100%</div>
                <div className="text-sm text-muted-foreground">Code Ownership</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#5E62FF] mb-1">0</div>
                <div className="text-sm text-muted-foreground">Dependencies</div>
              </div>
            </div>
            
            {/* CTA */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={() => router.push('/chat')}
                className="bg-[#5E62FF] hover:bg-[#7A7DFF] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Start Building Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required • Free tier available
              </p>
            </div>
          </motion.div>
      </div>
    </div>
  );
};

const FeaturesSection = () => (
  <div id="features" className="py-20 md:py-32 relative overflow-hidden" aria-labelledby="features-heading">
    {/* Gradient background */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#5E62FF]/5 via-transparent to-primary/5" />
    
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl text-center mb-16"
      >
        <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold tracking-wider uppercase text-[#5E62FF] bg-[#5E62FF]/10 rounded-full">
          Features
        </span>
        <h2 id="features-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Everything you need to ship faster
        </h2>
        <p className="text-lg text-muted-foreground">
          Designer combines the speed of AI with the precision of professional development tools.
        </p>
      </motion.div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" role="list">
        <FeatureCard icon={<Zap className="h-7 w-7" />} title="Lightning Fast">
          Generate complete UIs in under 10 seconds. Our optimized models deliver instant results without compromising quality.
        </FeatureCard>
        <FeatureCard icon={<Bot className="h-7 w-7" />} title="AI That Understands">
          Purpose-built for modern web development. Knows React patterns, Tailwind utilities, and component best practices.
        </FeatureCard>
        <FeatureCard icon={<Code className="h-7 w-7" />} title="Production Ready">
          Clean, maintainable code that follows industry standards. TypeScript support, proper semantics, and zero vendor lock-in.
        </FeatureCard>
        <FeatureCard icon={<Palette className="h-7 w-7" />} title="Pixel Perfect">
          Maintains design consistency across components. Respects your design system, spacing, and brand guidelines.
        </FeatureCard>
        <FeatureCard icon={<Wand2 className="h-7 w-7" />} title="Smart Iterations">
          Make changes without starting over. Our AI understands context and preserves your work while applying updates.
        </FeatureCard>
        <FeatureCard icon={<ShieldCheck className="h-7 w-7" />} title="Enterprise Grade">
          SOC2 compliant, GDPR ready. Your code stays yours with full IP ownership and audit trails.
        </FeatureCard>
      </div>
    </div>
  </div>
);

const HowItWorksSection = () => (
  <div className="py-16 sm:py-20 md:py-28" aria-labelledby="how-it-works-heading">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight">How it works</h2>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground">Three simple steps from idea to code.</p>
      </div>

      <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3" role="list">
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
        }].map((s, index) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6" role="listitem">
            <div className="flex items-center gap-2 text-[#5E62FF]" aria-hidden="true">{s.icon}<span className="text-sm font-medium">Step {index + 1}: {s.title}</span></div>
            <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const UseCasesSection = () => (
  <div id="use-cases" className="py-16 sm:py-20 md:py-28" aria-labelledby="use-cases-heading">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="use-cases-heading" className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight">What will you build?</h2>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground">
          Prototype faster, ship components, or scaffold entire pages—Designer accelerates every step.
        </p>
      </div>

      <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
        <UseCaseCard icon={<LayoutDashboard size={28} />} title="Dashboards & internal tools" description="Generate complex layouts with charts, tables, and forms for admin panels in minutes." />
        <UseCaseCard icon={<Rocket size={28} />} title="Marketing pages" description="Describe your product and get a complete, responsive landing page with CTAs and sections." />
        <UseCaseCard icon={<ComponentIcon size={28} />} title="Component libraries" description="Buttons, cards, navbars—populate your system with accessible, on‑brand pieces." />
      </div>
    </div>
  </div>
);

const PricingSection = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
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
    <div id="pricing" className="py-20 md:py-32 relative overflow-hidden" aria-labelledby="pricing-heading">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#5E62FF]/5 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#5E62FF]/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold tracking-wider uppercase text-[#5E62FF] bg-[#5E62FF]/10 rounded-full">
            Pricing
          </span>
          <h2 id="pricing-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Start building for free
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            No credit card required. Upgrade when you need more.
          </p>
          
          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted/50 rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                billingCycle === 'monthly' 
                  ? 'bg-white text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                billingCycle === 'yearly' 
                  ? 'bg-white text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-[#5E62FF] font-bold">Save 20%</span>
            </button>
          </div>
        </motion.div>

        <div className="mt-8 sm:mt-10 grid items-stretch grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3" role="list">
          {plans.map((plan) => (
            <motion.article
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: plans.indexOf(plan) * 0.1 }}
              className={`relative flex flex-col rounded-3xl p-8 transition-all duration-300 ${
                plan.highlight
                  ? "bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] text-white shadow-2xl shadow-[#5E62FF]/25 lg:scale-105"
                  : "bg-card border border-border hover:border-[#5E62FF]/50 hover:shadow-xl"
              }`}
              role="listitem"
              aria-labelledby={`plan-${plan.name.toLowerCase()}`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-white text-[#5E62FF] px-4 py-1 text-xs font-bold uppercase tracking-wide shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              <h3 id={`plan-${plan.name.toLowerCase()}`} className={`text-2xl font-bold ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                {plan.name}
              </h3>
              <p className={`mt-2 text-sm ${plan.highlight ? 'text-white/90' : 'text-muted-foreground'}`}>
                {plan.description}
              </p>
              <div className="mt-6 mb-8">
                <span className={`text-5xl font-bold ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                  {billingCycle === 'yearly' && plan.price !== '$0' 
                    ? `$${Math.floor(parseInt(plan.price.slice(1)) * 0.8)}`
                    : plan.price
                  }
                </span>
                <span className={`ml-2 text-sm font-medium ${plan.highlight ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {plan.priceSuffix}
                </span>
              </div>
              <ul className="flex-grow space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckCircle2 className={`mr-3 h-5 w-5 shrink-0 mt-0.5 ${plan.highlight ? 'text-white' : 'text-[#5E62FF]'}`} />
                    <span className={`text-sm ${plan.highlight ? 'text-white/90' : 'text-muted-foreground'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => {
                  setSelectedPlan(plan.name);
                  handlePlanSelection(plan);
                }}
                size="lg"
                className={`mt-8 w-full font-semibold transition-all duration-200 ${
                  plan.highlight
                    ? "bg-white text-[#5E62FF] hover:bg-white/90 shadow-lg"
                    : "bg-[#5E62FF] text-white hover:bg-[#7A7DFF] hover:shadow-lg hover:shadow-[#5E62FF]/25"
                }`}
              >
                {plan.cta}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
};

const FAQSection = () => (
  <div id="faq" className="py-16 sm:py-20 md:py-28" aria-labelledby="faq-heading">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="faq-heading" className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight">Questions, answered</h2>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground">A few things teams ask before they switch.</p>
      </div>

      <div className="mx-auto mt-8 sm:mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card/60" role="region" aria-label="Frequently asked questions">
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
            <summary className="cursor-pointer list-none select-none p-4 sm:p-5 text-left font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset transition-colors" tabIndex={0}>
              {item.q}
            </summary>
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  </div>
);

const FinalCTASection = () => {
  const router = useRouter();
  return (
    <div className="relative py-16 sm:py-20 md:py-28" aria-labelledby="cta-heading">
      <Aurora />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 id="cta-heading" className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight">Ready to build faster?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground">
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
    </div>
  );
};

// -------------------------------------------------
// Main Page
// -------------------------------------------------
export default function Home() {
  // Skip links for keyboard navigation
  const [isSkipLinkFocused, setIsSkipLinkFocused] = useState(false);
  
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
    <>
      {/* Skip to content link for accessibility */}
      <a 
        href="#main-content" 
        className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none ${isSkipLinkFocused ? 'not-sr-only' : ''}`}
        onFocus={() => setIsSkipLinkFocused(true)}
        onBlur={() => setIsSkipLinkFocused(false)}
      >
        Skip to main content
      </a>
      <div className="bg-background text-foreground antialiased selection:bg-[#5E62FF] selection:text-white">
        <Header />
        <main id="main-content" role="main">
        <HeroSection />
        <ShowcaseSection />
        <FeaturesSection />
        <HowItWorksSection />
        <UseCasesSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
        </main>
        <FooterWithLogo />
      </div>
    </>
  );
}
