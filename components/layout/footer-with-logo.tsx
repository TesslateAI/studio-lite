"use client"

import Image from "next/image"
import Footer from "@/components/footer"

// This component is no longer used directly but kept for structure.
// The new footer handles the logo internally.
const FooterTesslateLogo = () => (
  <Image src="/tesslate-logo.svg" alt="Tesslate Logo" width={24} height={24} />
)

export function FooterWithLogo() {
  return <Footer TesslateLogo={<FooterTesslateLogo />} />
}