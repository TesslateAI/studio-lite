"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useDarkMode } from "@/components/DarkModeProvider"
import { Sun, Moon, Menu as MenuIcon, X, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

const HeaderTesslateLogo = ({ isScrolled }: { isScrolled?: boolean }) => {
  return (
    <div className="relative w-8 h-8">
      <Image 
        src="/tesslate-logo.svg"
        alt="Tesslate Logo" 
        width={32} 
        height={32}
        priority
        className={`transition-all duration-200 ${!isScrolled ? 'brightness-0 invert' : ''}`}
      />
    </div>
  );
}

const SubMenu = ({ items }: { items: (string | {label: string, href?: string})[] }) => (
    <div className="absolute top-[-0.5rem] left-full ml-0.5 w-56 origin-top-left rounded-md bg-white shadow-lg border border-slate-200">
        <div className="py-1">
            {items.map(item => {
                const label = typeof item === 'string' ? item : item.label;
                const href = typeof item === 'string' ? '#' : item.href || '#';
                return <a key={label} href={href} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{label}</a>
            })}
        </div>
    </div>
);


export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { darkMode, setDarkMode } = useDarkMode()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const isHomePage = pathname === '/'
  
  // State for desktop dropdowns
  const [productsOpen, setProductsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [solutionsSubmenu, setSolutionsSubmenu] = useState<string | null>(null);
  
  // Timers for dropdown delays
  const [productsTimer, setProductsTimer] = useState<NodeJS.Timeout | null>(null);
  const [solutionsTimer, setSolutionsTimer] = useState<NodeJS.Timeout | null>(null);

  // FIX: Added state for mobile accordions
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);

  // Dropdown handlers with delays
  const handleProductsEnter = () => {
    if (productsTimer) clearTimeout(productsTimer);
    setProductsOpen(true);
  };
  
  const handleProductsLeave = () => {
    const timer = setTimeout(() => setProductsOpen(false), 150);
    setProductsTimer(timer);
  };
  
  const handleSolutionsEnter = () => {
    if (solutionsTimer) clearTimeout(solutionsTimer);
    setSolutionsOpen(true);
  };
  
  const handleSolutionsLeave = () => {
    const timer = setTimeout(() => {
      setSolutionsOpen(false);
      setSolutionsSubmenu(null);
    }, 150);
    setSolutionsTimer(timer);
  };
  const [mobileSolutionsSub, setMobileSolutionsSub] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (productsTimer) clearTimeout(productsTimer);
      if (solutionsTimer) clearTimeout(solutionsTimer);
    };
  }, [productsTimer, solutionsTimer])

  const navLinks = [
    { href: "#developers", label: "Developers", comingSoon: true },
    { href: "#research", label: "Research", comingSoon: true },
    { href: "https://huggingface.co/Tesslate", label: "Open Source Models", external: true },
    { href: "https://tesslate.com", label: "About Us", external: true },
  ]
  
  const productLinks = [
      { 
        label: "TFrameX", 
        description: "Enterprise grade multi-agent orchestration Python library",
        href: "https://tframex.tesslate.com/", 
        external: true,
        links: [
          { label: "Docs", href: "https://tframex.tesslate.com/" },
          { label: "GitHub", href: "https://github.com/TesslateAI/TFrameX" }
        ]
      },
      { 
        label: "Agent Builder", 
        description: "Enterprise-grade visual agent builder for TFrameX - Create, deploy, and manage sophisticated multi-agent LLM workflows with a powerful drag-and-drop interface",
        comingSoonNote: "Coming soon: Build web apps from your agent workflows and share them",
        href: "https://github.com/TesslateAI/Agent-Builder",
        external: true,
        links: [
          { label: "GitHub", href: "https://github.com/TesslateAI/Agent-Builder" }
        ]
      },
      { 
        label: "Wise", 
        description: "The context engine for coding agents",
        href: "https://wise.tesslate.com",
        external: true
      },
      { label: "Studio", comingSoon: true },
      { label: "Forge", comingSoon: true },
      { label: "Designer", comingSoon: true },
      { href: "https://uigeneval.tesslate.com/", label: "UIGen Eval", external: true },
  ];

  const solutionLinks = {
      role: ["Product Managers", "Designers", "Engineers", "Founders/CEOs"],
      business: [
          { label: "Enterprise", href: "#for-enterprises" },
          { label: "Startups", href: "#for-startups" },
          { label: "Medium Enterprises" }
      ],
      industry: ["Education", "Healthcare", "Fintech"],
  };
  
  // State for full-page products dropdown
  const [fullPageProductsOpen, setFullPageProductsOpen] = useState(false);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled || isMobileMenuOpen ? 'bg-white/95 backdrop-blur-sm border-b border-slate-200' : 'bg-transparent'}`}>
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-24">
          <Link href="/" className="flex items-center gap-3 group transition-colors">
            <div className={`relative p-2 rounded-lg shadow-sm transition-all duration-200 ${isScrolled ? 'bg-white border border-slate-200' : 'bg-white/20 backdrop-blur border border-white/30'}`}>
              <HeaderTesslateLogo isScrolled={isScrolled} />
            </div>
            <div className="flex flex-col">
              <span className={`text-xl font-bold tracking-tight transition-colors duration-200 ${isScrolled ? 'text-slate-900' : 'text-white'}`}>
                Designer
              </span>
              <span className={`text-xs font-bold tracking-wider uppercase transition-colors duration-200 ${isScrolled ? 'text-slate-500' : 'text-white/80'}`}>
                By Tesslate
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            <div className="relative" onMouseEnter={handleProductsEnter} onMouseLeave={handleProductsLeave}>
                <button className={`nav-link group inline-flex items-center px-3 py-2 text-sm font-bold transition-colors duration-200 ${isHomePage ? (isScrolled ? 'text-slate-700 hover:text-slate-900' : 'text-white hover:text-white/80') : 'text-slate-700 hover:text-slate-900'}`}>
                  <span>Products</span>
                  <ChevronDown className="ml-1 h-4 w-4 transition-transform group-hover:rotate-180" />
                </button>
            </div>
            
            <div className="relative">
                <div className={`nav-link px-3 py-2 text-sm font-bold transition-colors duration-200 cursor-not-allowed ${isHomePage ? (isScrolled ? 'text-slate-400' : 'text-white/50') : 'text-slate-400'}`}>
                  Solutions
                </div>
            </div>
            
            {navLinks.map((link) => (
              link.comingSoon ? (
                <div key={link.label} className={`nav-link px-3 py-2 text-sm font-bold transition-colors duration-200 cursor-not-allowed ${isScrolled ? 'text-slate-400' : 'text-white/50'}`}>
                  {link.label}
                </div>
              ) : (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  target={link.external ? "_blank" : "_self"}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={`nav-link px-3 py-2 text-sm font-bold transition-colors duration-200 ${isScrolled ? 'text-slate-700 hover:text-slate-900' : 'text-white hover:text-white/80'}`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3">
                <a href="https://tesslate.com/waitlist" className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${isScrolled ? 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400' : 'text-white bg-white/10 border border-white/30 backdrop-blur hover:bg-white/20'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span>Join Waitlist</span>
                </a>
                <a href="/sign-in" className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${isScrolled ? 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400' : 'text-white bg-white/10 border border-white/30 backdrop-blur hover:bg-white/20'}`}>
                    Login
                </a>
                <a href="/chat" className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${isScrolled ? 'text-white bg-slate-900 hover:bg-slate-800' : 'text-white bg-[#5E62FF] hover:bg-[#7A7DFF]'}`}>
                    Try Designer
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </a>
            </div>

            <div className="lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} type="button" className="relative p-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                <span className="sr-only">Open main menu</span>
                <div className="relative">
                  {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 bg-white">
                <div className="px-6 pt-6 pb-8 space-y-6">
                    {/* Products Accordion */}
                    <div>
                        <button onClick={() => setMobileProductsOpen(!mobileProductsOpen)} className="flex items-center justify-between w-full py-3 px-4 text-base font-semibold text-slate-900 rounded-md hover:bg-slate-50 transition-colors">
                            Products
                            <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", mobileProductsOpen && "rotate-180")} />
                        </button>
                        {mobileProductsOpen && (
                            <div className="mt-3 space-y-3 pl-2">
                                {/* TFrameX */}
                                <div className="border border-slate-200 rounded-lg p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                                            <Image src="/TframeXLogo@8x.svg" alt="TFrameX" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex-1">
                                            <a href="https://tframex.tesslate.com/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900">TFrameX</a>
                                            <p className="text-xs text-slate-600 mt-1">Enterprise grade multi-agent orchestration Python library</p>
                                            <div className="flex gap-3 mt-2">
                                                <a href="https://tframex.tesslate.com/" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF]">Docs</a>
                                                <a href="https://github.com/TesslateAI/TFrameX" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF]">GitHub</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Agent Builder */}
                                <div className="border border-slate-200 rounded-lg p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                                            <Image src="/GentBuilderLogo@8x.svg" alt="Agent Builder" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex-1">
                                            <a href="https://github.com/TesslateAI/Agent-Builder" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900">Agent Builder</a>
                                            <p className="text-xs text-slate-600 mt-1">Visual agent builder for TFrameX</p>
                                            <div className="mt-2">
                                                <a href="https://github.com/TesslateAI/Agent-Builder" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF]">GitHub</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Wise */}
                                <div className="border border-slate-200 rounded-lg p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                                            <Image src="/WiseLogo@8x.svg" alt="Wise" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex-1">
                                            <a href="https://wise.tesslate.com" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900">Wise</a>
                                            <p className="text-xs text-slate-600 mt-1">The context engine for coding agents</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Studio */}
                                <div className="border border-slate-200 rounded-lg p-3 opacity-75">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                                            <Image src="/StudioLogo@8x.svg" alt="Studio" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">Tesslate Studio</span>
                                                <a href="https://tesslate.com" target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-[#5E62FF] hover:bg-[#5E62FF] hover:text-white rounded-full transition-colors">
                                                  Get on waitlist
                                                </a>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1">Generate and deploy full-stack apps from a single prompt</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Forge */}
                                <div className="border border-slate-200 rounded-lg p-3 opacity-75">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                                            <Image src="/ForgeLogo@8x.svg" alt="Forge" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">Tesslate Forge</span>
                                                <a href="https://tesslate.com" target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-[#5E62FF] hover:bg-[#5E62FF] hover:text-white rounded-full transition-colors">
                                                  Get on waitlist
                                                </a>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1">Fine-tune and optimize AI models and agents</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* UIGenEval */}
                                <div className="border border-slate-200 rounded-lg p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                                            <div className="text-white font-bold text-[8px]">UIGen</div>
                                        </div>
                                        <div className="flex-1">
                                            <a href="https://uigeneval.tesslate.com/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900">UIGenEval</a>
                                            <p className="text-xs text-slate-600 mt-1">Benchmark framework for AI-generated UIs</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Solutions - Coming Soon */}
                    <div className="flex items-center justify-between py-3 px-4 text-base font-semibold text-slate-400 rounded-md cursor-not-allowed">
                        Solutions
                        <span className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">Coming Soon</span>
                    </div>

                    {/* Other Links */}
                    <div className="space-y-2">
                        {navLinks.map(link => (
                            link.comingSoon ? (
                                <div key={link.label} className="flex items-center justify-between py-3 px-4 text-base font-semibold text-slate-400 rounded-md cursor-not-allowed">
                                    {link.label}
                                    <span className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">Coming Soon</span>
                                </div>
                            ) : (
                                <Link 
                                    key={link.href} 
                                    href={link.href} 
                                    target={link.external ? "_blank" : "_self"}
                                    rel={link.external ? "noopener noreferrer" : undefined}
                                    className="block py-3 px-4 text-base font-semibold text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
                                >
                                    {link.label}
                                </Link>
                            )
                        ))}
                    </div>
                    
                    <div className="h-px bg-slate-200 my-6"></div>

                    {/* CTA Buttons */}
                    <div className="space-y-4">
                       <a href="https://tesslate.com/waitlist" className="block w-full text-center font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 transition-colors rounded-md px-4 py-3 text-sm">
                           Join the Waitlist
                       </a>
                       <a href="/sign-in" className="block w-full text-center font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 transition-colors rounded-md px-4 py-3 text-sm">
                           Login
                       </a>
                       <a href="/chat" className="block w-full text-center font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors rounded-md px-4 py-3 text-sm">
                           Try Designer
                       </a>
                    </div>
                </div>
            </div>
        )}
      </div>
      
      {/* Full-width Products Mega Menu */}
      {productsOpen && (
        <div 
          className="absolute left-0 right-0 top-full bg-white border-b border-slate-200 shadow-xl z-50"
          onMouseEnter={handleProductsEnter}
          onMouseLeave={handleProductsLeave}
        >
          <div className="max-w-screen-2xl mx-auto px-6 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* TFrameX */}
              <div className="group">
                <div className="block p-6 rounded-xl border border-slate-200 hover:border-[#5E62FF]/30 hover:bg-gradient-to-br hover:from-slate-50 hover:to-[#5E62FF]/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                      <Image src="/TframeXLogo@8x.svg" alt="TFrameX" width={28} height={28} className="brightness-0 invert" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#5E62FF] transition-colors">TFrameX</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">Enterprise grade multi-agent orchestration Python library</p>
                      <div className="flex gap-3">
                        <a href="https://tframex.tesslate.com/" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF] hover:text-[#7A7DFF] transition-colors flex items-center gap-1 relative z-10">
                          Docs <ExternalLink className="w-3 h-3" />
                        </a>
                        <a href="https://github.com/TesslateAI/TFrameX" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF] hover:text-[#7A7DFF] transition-colors flex items-center gap-1 relative z-10">
                          GitHub <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Agent Builder */}
              <div className="group">
                <div className="block p-6 rounded-xl border border-slate-200 hover:border-[#5E62FF]/30 hover:bg-gradient-to-br hover:from-slate-50 hover:to-[#5E62FF]/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                      <Image src="/GentBuilderLogo@8x.svg" alt="Agent Builder" width={28} height={28} className="brightness-0 invert" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#5E62FF] transition-colors">Agent Builder</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">Visual agent builder for TFrameX - Create and manage multi-agent LLM workflows</p>
                      <div className="flex gap-3">
                        <a href="https://github.com/TesslateAI/Agent-Builder" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF] hover:text-[#7A7DFF] transition-colors flex items-center gap-1 relative z-10">
                          GitHub <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Wise */}
              <div className="group">
                <div className="block p-6 rounded-xl border border-slate-200 hover:border-[#5E62FF]/30 hover:bg-gradient-to-br hover:from-slate-50 hover:to-[#5E62FF]/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                      <Image src="/WiseLogo@8x.svg" alt="Wise" width={28} height={28} className="brightness-0 invert" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#5E62FF] transition-colors">Wise</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">The context engine for coding agents</p>
                      <div className="flex gap-3">
                        <a href="https://wise.tesslate.com" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF] hover:text-[#7A7DFF] transition-colors flex items-center gap-1 relative z-10">
                          Learn More <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Studio */}
              <div className="group">
                <div className="block p-6 rounded-xl border border-slate-200 hover:border-[#5E62FF]/30 hover:bg-gradient-to-br hover:from-slate-50 hover:to-[#5E62FF]/5 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                      <Image src="/StudioLogo@8x.svg" alt="Studio" width={28} height={28} className="brightness-0 invert" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#5E62FF] transition-colors">Tesslate Studio</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">Generate and deploy full-stack apps from a single prompt with swappable frontends, backends, and databases</p>
                      <div className="flex gap-3">
                        <a href="https://tesslate.com" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF] hover:text-[#7A7DFF] transition-colors flex items-center gap-1">
                          Get on the waitlist <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Forge */}
              <div className="group">
                <div className="block p-6 rounded-xl border border-slate-200 hover:border-[#5E62FF]/30 hover:bg-gradient-to-br hover:from-slate-50 hover:to-[#5E62FF]/5 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                      <Image src="/ForgeLogo@8x.svg" alt="Forge" width={28} height={28} className="brightness-0 invert" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#5E62FF] transition-colors">Tesslate Forge</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">Fine-tune, evaluate, and optimize AI models and agents with an integrated training and benchmarking pipeline</p>
                      <div className="flex gap-3">
                        <a href="https://tesslate.com" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF] hover:text-[#7A7DFF] transition-colors flex items-center gap-1">
                          Get on the waitlist <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* UIGenEval */}
              <div className="group">
                <div className="block p-6 rounded-xl border border-slate-200 hover:border-[#5E62FF]/30 hover:bg-gradient-to-br hover:from-slate-50 hover:to-[#5E62FF]/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center flex-shrink-0">
                      <div className="text-white font-bold text-xs">UIGen</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#5E62FF] transition-colors">UIGenEval</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">A benchmark framework that scores AI-generated UIs across technical quality, design fidelity, interactivity, and responsiveness</p>
                      <div className="flex gap-3">
                        <a href="https://uigeneval.tesslate.com/" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#5E62FF] hover:text-[#7A7DFF] transition-colors flex items-center gap-1 relative z-10">
                          Visit Site <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Current Product Highlight */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5E62FF] to-[#7A7DFF] p-2 flex items-center justify-center">
                    <Image src="/DesignerLogo@8x.svg" alt="Designer" width={24} height={24} className="brightness-0 invert" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">You're currently using</p>
                    <h4 className="text-lg font-bold text-slate-900">Tesslate Designer</h4>
                  </div>
                </div>
                <a href="/chat" className="px-4 py-2 bg-[#5E62FF] hover:bg-[#7A7DFF] text-white text-sm font-medium rounded-lg transition-colors">
                  Open Designer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}