"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"

const HeaderTesslateLogo = () => (
  <Image src="/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png" alt="Tesslate Logo" width={24} height={24} />
)

export function Header() {
  const router = useRouter()
  return (
    <header className="container mx-auto py-6 px-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <HeaderTesslateLogo />
        <Link href="/" className="text-xl font-medium hover:text-zinc-700">Studio Lite</Link>
      </div>
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
        <Button className="bg-orange-500 text-white hover:bg-orange-600 -ml-4 " onClick={() => router.push("/chat")}>Try now</Button>
      </nav>
    </header>
  )
} 