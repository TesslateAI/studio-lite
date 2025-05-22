"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import LoginForm from "@/components/login-form"
import DemoSection from "@/components/demo-section"
import FeatureSection from "@/components/feature-section"
import PricingSection from "@/components/pricing-section"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import Image from "next/image"

const HeaderTesslateLogo = () => (
  <Image src="/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png" alt="Tesslate Logo" width={24} height={24} />
)

const FooterTesslateLogo = () => (
  <Image src="/Asset_108x.png" alt="Tesslate Logo" width={24} height={24} />
)

function Header() {
  const router = useRouter()
  return (
    <header className="container mx-auto py-6 px-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <HeaderTesslateLogo />
        <Link href="/" className="text-xl font-medium hover:text-zinc-700">Studio Lite</Link>
      </div>
      <nav className="hidden md:flex items-center gap-8">
        <Link href="/#features" className="text-sm font-medium">
          Features
        </Link>
        <Link href="/#pricing" className="text-sm font-medium">
          Pricing
        </Link>
        <Button className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => router.push("/sign-up")}>Get started</Button>
      </nav>
    </header>
  )
}

function FooterWithLogo() {
  return <Footer TesslateLogo={<FooterTesslateLogo />} />
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto py-12 md:py-24 px-4 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-medium mb-6">Experience what our models can do</h1>
            <p className="text-lg text-zinc-700 mb-8">Engineered intelligence, effortless design.</p>
            <div className="max-w-md">
              <LoginForm />
            </div>
          </div>
          <div className="bg-zinc-50 p-8 rounded-lg">
            <DemoSection />
          </div>
        </section>

        <section id="features" className="container mx-auto py-16 px-4">
          <h2 className="text-3xl md:text-4xl font-medium text-center mb-12">Meet Tesslate Studio Lite</h2>
          <p className="text-lg text-center max-w-3xl mx-auto mb-16">
          Tesslate Studio Lite is a platform to explore our most powerful, fine-tuned AI models—specialized, fast, and built to show what's possible.
          </p>
          <FeatureSection />
        </section>

        <section id="pricing" className="container mx-auto py-16 px-4">
          <h2 className="text-3xl md:text-4xl font-medium text-center mb-12">Explore plans</h2>
          <PricingSection />
        </section>
      </main>
      <FooterWithLogo />
    </div>
  )
}

export { Header, FooterWithLogo }; 