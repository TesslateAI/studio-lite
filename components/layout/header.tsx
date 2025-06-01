"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useDarkMode } from "@/components/DarkModeProvider"
import { Sun, Moon } from "lucide-react"

const HeaderTesslateLogo = () => (
  <Image src="/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png" alt="Tesslate Logo" width={24} height={24} />
)

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { darkMode, setDarkMode } = useDarkMode()
  return (
    <header className="container mx-auto py-6 px-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <HeaderTesslateLogo />
        <Link href="/" className="text-xl font-medium hover:text-zinc-700">Studio Lite</Link>
      </div>
      <button
        aria-label="Toggle dark mode"
        className="ml-200 p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
        onClick={() => setDarkMode(!darkMode)}
      >
        {darkMode ? (
          <Sun className="h-5 w-5 text-white-400" />
        ) : (
          <Moon className="h-5 w-5 text-black-800" />
        )}
      </button>
      <nav className="hidden md:flex items-center gap-8">
        <Link href="/#features" className="text-sm font-medium hover:text-orange-500">
          Features
        </Link>
        <a href="https://huggingface.co/Tesslate" target="_blank" rel="noopener noreferrer" className="text-sm font-medium no-underline hover:text-orange-500 ml-2">
          Find us on HF
        </a>
        <Link href="/#pricing" className="text-sm font-medium hover:text-orange-500">
          Pricing
        </Link>
        <Button className="bg-zinc-900 text-white hover:bg-zinc-800 -ml-1 " onClick={() => router.push("/sign-up")}>Get started</Button>
        <Button className="bg-orange-500 text-white hover:bg-orange-600 -ml-4 " onClick={() => {
          if (pathname === "/chat") {
            window.location.href = "/chat?new=1"
          } else {
            router.push("/chat?new=1")
          }
        }}>Try now</Button>
      </nav>
    </header>
  )
} 