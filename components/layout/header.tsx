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
  const [imgSrc, setImgSrc] = useState("/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png");

  useEffect(() => {
    const img = new window.Image();
    img.src = "/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png";
    img.onerror = () => setImgSrc("/Asset_108x.png");
  }, []);

  return (
    <Image 
      src={imgSrc}
      alt="Tesslate Logo" 
      width={32} 
      height={32}
      priority
    />
  );
}

const SubMenu = ({ items }: { items: (string | {label: string, href?: string})[] }) => (
    <div className="absolute top-[-0.5rem] left-full ml-0.5 w-56 origin-top-left rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5">
        <div className="py-2">
            {items.map(item => {
                const label = typeof item === 'string' ? item : item.label;
                const href = typeof item === 'string' ? '#' : item.href || '#';
                return <a key={label} href={href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{label}</a>
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

  // FIX: Added state for mobile accordions
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg shadow-black/5' : 'bg-transparent'}`}>
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-24">
          <Link href="/" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#5E62FF]/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gradient-to-r from-[#5E62FF] to-purple-600 p-3 rounded-2xl shadow-lg shadow-[#5E62FF]/25">
                <HeaderTesslateLogo />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent tracking-tight">
                Designer
              </span>
              <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">
                By Tesslate
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
                <button className="nav-link group inline-flex items-center px-4 py-3 rounded-xl font-semibold text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200">
                  <span>Products</span>
                  <ChevronDown className="ml-2 h-4 w-4 transition-transform group-hover:rotate-180" />
                </button>
                {productsOpen && (
                    <div className="absolute top-full mt-2 w-80 origin-top-left rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 z-10 overflow-hidden">
                        <div className="p-6">
                            <div className="grid gap-1">
                                {productLinks.map(link => (
                                    link.comingSoon ? 
                                    <div key={link.label} className="flex items-center justify-between p-3 rounded-lg cursor-not-allowed bg-gray-50/50">
                                      <span className="font-medium text-gray-400">{link.label}</span>
                                      <span className="px-2 py-1 text-xs font-bold text-[#5E62FF] bg-[#5E62FF]/10 rounded-full">Coming Soon</span>
                                    </div> :
                                    <a key={link.label} href={link.href} target={link.external ? "_blank" : "_self"} rel="noopener noreferrer" 
                                       className="flex items-center p-3 rounded-lg font-medium text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200 group">
                                      <span>{link.label}</span>
                                      <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="relative" onMouseEnter={() => setSolutionsOpen(true)} onMouseLeave={() => {setSolutionsOpen(false); setSolutionsSubmenu(null)}}>
                <button className="nav-link group inline-flex items-center px-4 py-3 rounded-xl font-semibold text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200">
                  <span>Solutions</span>
                  <ChevronDown className="ml-2 h-4 w-4 transition-transform group-hover:rotate-180" />
                </button>
                {solutionsOpen && (
                     <div className="absolute top-full mt-2 w-80 origin-top-left rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 z-10 overflow-hidden">
                        <div className="p-6">
                            <div className="space-y-1">
                                <div className="relative" onMouseEnter={() => setSolutionsSubmenu('role')}>
                                    <a href="#" className="flex items-center justify-between p-3 rounded-lg font-medium text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200 group">
                                      <span>By Role</span>
                                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                    </a>
                                    {solutionsSubmenu === 'role' && <SubMenu items={solutionLinks.role} />}
                                </div>
                                <div className="relative" onMouseEnter={() => setSolutionsSubmenu('business')}>
                                    <a href="#" className="flex items-center justify-between p-3 rounded-lg font-medium text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200 group">
                                      <span>By Business Type</span>
                                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                    </a>
                                    {solutionsSubmenu === 'business' && <SubMenu items={solutionLinks.business} />}
                                </div>
                                <div className="relative" onMouseEnter={() => setSolutionsSubmenu('industry')}>
                                    <a href="#" className="flex items-center justify-between p-3 rounded-lg font-medium text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200 group">
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
              <Link key={link.href} href={link.href} className="nav-link px-4 py-3 rounded-xl font-semibold text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200">
                {link.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3">
                <a href="https://tesslate.com/waitlist" className="group relative overflow-hidden px-6 py-3 rounded-xl border-2 border-gray-300 bg-white hover:border-[#5E62FF] transition-all duration-300 font-semibold text-gray-800 hover:text-[#5E62FF]">
                    <div className="absolute inset-0 bg-[#5E62FF]/5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                    <div className="relative flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span>Join Waitlist</span>
                    </div>
                </a>
                <a href="/sign-in" className="px-6 py-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 transition-all duration-300 font-semibold text-gray-800 hover:border-gray-400">
                    Login
                </a>
                <a href="/chat" className="group relative overflow-hidden px-8 py-3 rounded-xl bg-gradient-to-r from-[#5E62FF] to-purple-600 text-white font-bold shadow-lg shadow-[#5E62FF]/25 hover:shadow-xl hover:shadow-[#5E62FF]/40 transition-all duration-300 transform hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-[#5E62FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center gap-2">
                        Try Designer
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </span>
                </a>
            </div>

            <div className="lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} type="button" className="relative p-3 rounded-xl bg-gradient-to-r from-[#5E62FF] to-purple-600 text-white shadow-lg shadow-[#5E62FF]/25 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
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
            <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-xl">
                <div className="px-6 pt-6 pb-8 space-y-6">
                    {/* Products Accordion */}
                    <div>
                        <button onClick={() => setMobileProductsOpen(!mobileProductsOpen)} className="flex items-center justify-between w-full py-4 px-4 text-lg font-bold text-gray-800 rounded-xl hover:bg-[#5E62FF]/5 transition-all duration-200">
                            Products
                            <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", mobileProductsOpen && "rotate-180")} />
                        </button>
                        {mobileProductsOpen && (
                            <div className="mt-3 space-y-2 pl-4">
                                {productLinks.map(link => (
                                    link.comingSoon ? 
                                    <div key={link.label} className="flex items-center justify-between w-full py-3 px-4 text-base font-medium text-gray-400 cursor-not-allowed rounded-lg bg-gray-50/50">
                                        {link.label}
                                        <span className="px-2 py-1 text-xs font-bold text-[#5E62FF] bg-[#5E62FF]/10 rounded-full">Coming Soon</span>
                                    </div> :
                                    <a key={link.label} href={link.href} target={link.external ? "_blank" : "_self"} rel="noopener noreferrer" className="block py-3 px-4 text-base font-semibold text-gray-700 rounded-lg hover:bg-[#5E62FF]/5 hover:text-[#5E62FF] transition-all duration-200">{link.label}</a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Solutions Accordion */}
                     <div>
                        <button onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)} className="flex items-center justify-between w-full py-4 px-4 text-lg font-bold text-gray-800 rounded-xl hover:bg-[#5E62FF]/5 transition-all duration-200">
                            Solutions
                            <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", mobileSolutionsOpen && "rotate-180")} />
                        </button>
                        {mobileSolutionsOpen && (
                            <div className="mt-3 space-y-3 pl-4">
                                {Object.entries(solutionLinks).map(([key, value]) => (
                                    <div key={key}>
                                        <span className="block py-2 px-4 text-sm font-black text-gray-500 uppercase tracking-wider">{key}</span>
                                        <div className="space-y-1">
                                            {value.map(item => {
                                                const label = typeof item === 'string' ? item : item.label;
                                                const href = typeof item === 'string' ? '#' : item.href || '#';
                                                return <a key={label} href={href} className="block py-2 px-4 text-base font-semibold text-gray-700 rounded-lg hover:bg-[#5E62FF]/5 hover:text-[#5E62FF] transition-all duration-200">{label}</a>
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
                             <Link key={link.href} href={link.href} className="block py-4 px-4 text-lg font-bold text-gray-800 rounded-xl hover:bg-[#5E62FF]/5 hover:text-[#5E62FF] transition-all duration-200">{link.label}</Link>
                        ))}
                    </div>
                    
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-6"></div>

                    {/* CTA Buttons */}
                    <div className="space-y-4">
                       <a href="https://tesslate.com/waitlist" className="block w-full text-center font-bold text-gray-800 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-[#5E62FF] transition-all duration-300 rounded-xl px-6 py-4 text-base">
                           Join the Waitlist
                       </a>
                       <a href="/sign-in" className="block w-full text-center font-bold text-gray-800 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 rounded-xl px-6 py-4 text-base">
                           Login
                       </a>
                       <a href="/chat" className="block w-full text-center font-bold text-white bg-gradient-to-r from-[#5E62FF] to-purple-600 hover:from-purple-600 hover:to-[#5E62FF] shadow-lg shadow-[#5E62FF]/25 hover:shadow-xl hover:shadow-[#5E62FF]/40 transition-all duration-300 rounded-xl px-6 py-4 text-base transform hover:scale-[1.02]">
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