"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useDarkMode } from "@/components/DarkModeProvider"
import { Sun, Moon, Menu as MenuIcon, X, ChevronDown, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

const HeaderTesslateLogo = () => {
  return (
    <Image 
      src="/tesslate-logo.svg"
      alt="Tesslate Logo" 
      width={32} 
      height={32}
      priority
    />
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
    { href: "#developers", label: "Developers" },
    { href: "#research", label: "Research" },
    { href: "#about-us", label: "About Us" },
    { href: "/chat", label: "Try Now" },
  ]
  
  const productLinks = [
      { label: "Studio", comingSoon: true },
      { label: "Forge", comingSoon: true },
      { href: "https://tframex.tesslate.com/", label: "TframeX", external: true },
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

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled || isMobileMenuOpen ? 'bg-white/95 backdrop-blur-sm border-b border-slate-200' : 'bg-transparent'}`}>
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-24">
          <Link href="/" className="flex items-center gap-3 group transition-colors">
            <div className="relative bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <HeaderTesslateLogo />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-slate-900 tracking-tight">
                Designer
              </span>
              <span className="text-xs font-medium text-slate-500 tracking-wider uppercase">
                By Tesslate
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            <div className="relative" onMouseEnter={handleProductsEnter} onMouseLeave={handleProductsLeave}>
                <button className="nav-link group inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                  <span>Products</span>
                  <ChevronDown className="ml-1 h-4 w-4 transition-transform group-hover:rotate-180" />
                </button>
                {productsOpen && (
                    <div className="absolute top-full mt-1 w-72 origin-top-left rounded-md bg-white shadow-lg border border-slate-200 z-10">
                        <div className="py-1">
                            <div className="space-y-0">
                                {productLinks.map(link => (
                                    link.comingSoon ? 
                                    <div key={link.label} className="flex items-center justify-between px-3 py-2 cursor-not-allowed">
                                      <span className="text-sm font-medium text-slate-400">{link.label}</span>
                                      <span className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">Coming Soon</span>
                                    </div> :
                                    <a key={link.label} href={link.href} target={link.external ? "_blank" : "_self"} rel="noopener noreferrer" 
                                       className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors group">
                                      <span>{link.label}</span>
                                      <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="relative" onMouseEnter={handleSolutionsEnter} onMouseLeave={handleSolutionsLeave}>
                <button className="nav-link group inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                  <span>Solutions</span>
                  <ChevronDown className="ml-1 h-4 w-4 transition-transform group-hover:rotate-180" />
                </button>
                {solutionsOpen && (
                     <div className="absolute top-full mt-1 w-72 origin-top-left rounded-md bg-white shadow-lg border border-slate-200 z-10">
                        <div className="py-1">
                            <div className="space-y-0">
                                <div className="relative" onMouseEnter={() => setSolutionsSubmenu('role')}>
                                    <a href="#" className="flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors group">
                                      <span>By Role</span>
                                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                    </a>
                                    {solutionsSubmenu === 'role' && <SubMenu items={solutionLinks.role} />}
                                </div>
                                <div className="relative" onMouseEnter={() => setSolutionsSubmenu('business')}>
                                    <a href="#" className="flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors group">
                                      <span>By Business Type</span>
                                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                    </a>
                                    {solutionsSubmenu === 'business' && <SubMenu items={solutionLinks.business} />}
                                </div>
                                <div className="relative" onMouseEnter={() => setSolutionsSubmenu('industry')}>
                                    <a href="#" className="flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors group">
                                      <span>By Industry</span>
                                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                    </a>
                                    {solutionsSubmenu === 'industry' && <SubMenu items={solutionLinks.industry} />}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3">
                <a href="https://tesslate.com/waitlist" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span>Join Waitlist</span>
                </a>
                <a href="/sign-in" className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors">
                    Login
                </a>
                <a href="/chat" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors">
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
                            <div className="mt-3 space-y-2 pl-4">
                                {productLinks.map(link => (
                                    link.comingSoon ? 
                                    <div key={link.label} className="flex items-center justify-between w-full py-2 px-4 text-sm font-medium text-slate-400 cursor-not-allowed rounded-md bg-slate-50">
                                        {link.label}
                                        <span className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">Coming Soon</span>
                                    </div> :
                                    <a key={link.label} href={link.href} target={link.external ? "_blank" : "_self"} rel="noopener noreferrer" className="block py-2 px-4 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors">{link.label}</a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Solutions Accordion */}
                     <div>
                        <button onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)} className="flex items-center justify-between w-full py-3 px-4 text-base font-semibold text-slate-900 rounded-md hover:bg-slate-50 transition-colors">
                            Solutions
                            <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", mobileSolutionsOpen && "rotate-180")} />
                        </button>
                        {mobileSolutionsOpen && (
                            <div className="mt-3 space-y-3 pl-4">
                                {Object.entries(solutionLinks).map(([key, value]) => (
                                    <div key={key}>
                                        <span className="block py-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{key}</span>
                                        <div className="space-y-1">
                                            {value.map(item => {
                                                const label = typeof item === 'string' ? item : item.label;
                                                const href = typeof item === 'string' ? '#' : item.href || '#';
                                                return <a key={label} href={href} className="block py-2 px-4 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors">{label}</a>
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Other Links */}
                    <div className="space-y-2">
                        {navLinks.map(link => (
                             <Link key={link.href} href={link.href} className="block py-3 px-4 text-base font-semibold text-slate-900 rounded-md hover:bg-slate-50 transition-colors">{link.label}</Link>
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
    </header>
  )
}