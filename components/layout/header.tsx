"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useDarkMode } from "@/components/DarkModeProvider"
import { Sun, Moon, Menu as MenuIcon, X } from "lucide-react"
import { useState, useEffect } from "react"

const HeaderTesslateLogo = () => (
  <Image src="/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png" alt="Tesslate Logo" width={28} height={28} className="transition-transform duration-300 group-hover:scale-110" />
)

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { darkMode, setDarkMode } = useDarkMode()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

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

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "https://huggingface.co/Tesslate", label: "Find us on HF", external: true },
    { href: "/#pricing", label: "Pricing" },
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ease-out
                  ${isScrolled || isMobileMenuOpen
                    ? "border-b border-border/40 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60"
                    : "bg-transparent border-b border-transparent"
                  }`}
    >
      <div className="container mx-auto h-16 md:h-20 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setIsMobileMenuOpen(false)}>
          <HeaderTesslateLogo />
          <span className="text-xl font-semibold tracking-tight">
            Studio<span className="animate-gradient-x">Lite</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </Link>
              )
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/sign-up")}
              className="text-sm font-medium text-foreground hover:bg-accent"
            >
              Get started
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 text-white hover:bg-orange-600 shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => router.push("/chat")}
            >
              Try now
            </Button>
          </nav>

          <button
            aria-label="Toggle dark mode"
            className="p-2.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors duration-200"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <button
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            className="p-2.5 rounded-md md:hidden hover:bg-accent text-muted-foreground hover:text-foreground transition-colors duration-200"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md shadow-xl border-t border-border/40 z-40 pb-4"
          // For animation with tailwindcss-animate:
          // data-state={isMobileMenuOpen ? "open" : "closed"}
          // className="... data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-4 duration-300"
        >
          <nav className="flex flex-col gap-1 px-4 pt-2">
            {navLinks.map((link) => (
              <LinkOrAnchor key={link.href} {...link} onClick={toggleMobileMenu} isMobile />
            ))}
            <div className="pt-4 mt-3 border-t border-border/60 flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => { router.push("/sign-up"); toggleMobileMenu(); }}
              >
                Get started
              </Button>
              <Button
                className="w-full justify-center bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => { router.push("/chat"); toggleMobileMenu(); }}
              >
                Try now
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

// Helper component for mobile menu links
const LinkOrAnchor = ({ href, label, external, onClick, isMobile }: { href: string, label: string, external?: boolean, onClick: () => void, isMobile?: boolean }) => {
  const commonClasses = "block py-2.5 px-3 rounded-md text-base font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={commonClasses} onClick={onClick}>
        {label}
      </a>
    )
  }
  return (
    <Link href={href} className={commonClasses} onClick={onClick}>
      {label}
    </Link>
  )
}