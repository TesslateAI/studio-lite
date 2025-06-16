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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'bg-[#F3F2F1]/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <HeaderTesslateLogo />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
                <button className="navbar-item inline-flex items-center">Products <ChevronDown className="ml-1 h-4 w-4" /></button>
                {productsOpen && (
                    <div className="absolute top-full pt-2 w-64 origin-top-left rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-2">
                            {productLinks.map(link => (
                                link.comingSoon ? 
                                <span key={link.label} className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed flex items-center justify-between">{link.label}<span className="text-[#5E62FF] text-xs font-medium">Coming Soon</span></span> :
                                <a key={link.label} href={link.href} target={link.external ? "_blank" : "_self"} rel="noopener noreferrer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{link.label}</a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="relative" onMouseEnter={() => setSolutionsOpen(true)} onMouseLeave={() => {setSolutionsOpen(false); setSolutionsSubmenu(null)}}>
                <button className="navbar-item inline-flex items-center">Solutions <ChevronDown className="ml-1 h-4 w-4" /></button>
                {solutionsOpen && (
                     <div className="absolute top-full pt-2 w-64 origin-top-left rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-2">
                            <div className="relative" onMouseEnter={() => setSolutionsSubmenu('role')}>
                                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"><span>By Role</span><ChevronRight className="h-4 w-4 text-gray-400"/></a>
                                {solutionsSubmenu === 'role' && <SubMenu items={solutionLinks.role} />}
                            </div>
                            <div className="relative" onMouseEnter={() => setSolutionsSubmenu('business')}>
                                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"><span>By Business Type</span><ChevronRight className="h-4 w-4 text-gray-400"/></a>
                                {solutionsSubmenu === 'business' && <SubMenu items={solutionLinks.business} />}
                            </div>
                            <div className="relative" onMouseEnter={() => setSolutionsSubmenu('industry')}>
                                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"><span>By Industry</span><ChevronRight className="h-4 w-4 text-gray-400"/></a>
                                {solutionsSubmenu === 'industry' && <SubMenu items={solutionLinks.industry} />}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="navbar-item">{link.label}</Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-3">
                <a href="https://tesslate.com/waitlist" className="font-medium text-gray-800 bg-white hover:bg-gray-200 border border-gray-300 transition-colors rounded-xl px-4 py-2 text-sm flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    <span>Join the Waitlist</span>
                </a>
                <a href="/sign-in" className="font-medium text-gray-800 bg-white hover:bg-gray-200 border border-gray-300 transition-colors rounded-xl px-4 py-2 text-sm flex items-center justify-center gap-2">
                    Login
                </a>
            </div>

            <div className="lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} type="button" className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 focus:outline-none transition-colors">
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* FIX: Populated the mobile menu with content */}
        {isMobileMenuOpen && (
            <div className="lg:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {/* Products Accordion */}
                    <div>
                        <button onClick={() => setMobileProductsOpen(!mobileProductsOpen)} className="flex items-center justify-between w-full py-2 px-3 text-base font-medium text-gray-700 rounded-md hover:bg-gray-200">
                            Products
                            <ChevronDown className={cn("transition-transform", mobileProductsOpen && "rotate-180")} />
                        </button>
                        {mobileProductsOpen && (
                            <div className="mt-2 space-y-1 pl-4">
                                {productLinks.map(link => (
                                    link.comingSoon ? 
                                    <span key={link.label} className="flex items-center justify-between w-full py-2 px-3 text-base font-medium text-gray-400 cursor-not-allowed rounded-md">
                                        {link.label}
                                        <span className="text-[#5E62FF] text-xs font-medium">Coming Soon</span>
                                    </span> :
                                    <a key={link.label} href={link.href} target={link.external ? "_blank" : "_self"} rel="noopener noreferrer" className="block py-2 px-3 text-base font-medium text-gray-600 rounded-md hover:bg-gray-200">{link.label}</a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Solutions Accordion */}
                     <div>
                        <button onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)} className="flex items-center justify-between w-full py-2 px-3 text-base font-medium text-gray-700 rounded-md hover:bg-gray-200">
                            Solutions
                            <ChevronDown className={cn("transition-transform", mobileSolutionsOpen && "rotate-180")} />
                        </button>
                        {mobileSolutionsOpen && (
                            <div className="mt-2 space-y-1 pl-4">
                                {Object.entries(solutionLinks).map(([key, value]) => (
                                    <div key={key}>
                                        <span className="block py-2 px-3 text-sm font-semibold text-gray-400 uppercase">{key}</span>
                                        {value.map(item => {
                                            const label = typeof item === 'string' ? item : item.label;
                                            const href = typeof item === 'string' ? '#' : item.href || '#';
                                            return <a key={label} href={href} className="block py-2 px-3 text-base font-medium text-gray-600 rounded-md hover:bg-gray-200">{label}</a>
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Other Links */}
                    {navLinks.map(link => (
                         <Link key={link.href} href={link.href} className="block py-2 px-3 text-base font-medium text-gray-700 rounded-md hover:bg-gray-200">{link.label}</Link>
                    ))}
                    
                    <hr className="my-4 border-gray-300"/>

                    {/* CTA Buttons */}
                    <div className="space-y-2 pt-2">
                       <a href="https://tesslate.com/waitlist" className="block w-full text-center font-medium text-gray-800 bg-white hover:bg-gray-200 border border-gray-300 transition-colors rounded-xl px-4 py-2 text-sm">
                           Join the Waitlist
                       </a>
                       <a href="/sign-in" className="block w-full text-center font-medium text-gray-800 bg-white hover:bg-gray-200 border border-gray-300 transition-colors rounded-xl px-4 py-2 text-sm">
                           Login
                       </a>
                    </div>
                </div>
            </div>
        )}
      </div>
    </header>
  )
}