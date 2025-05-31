"use client"

import Image from "next/image"
import Footer from "@/components/footer"

const FooterTesslateLogo = () => (
  <Image src="/Asset_108x.png" alt="Tesslate Logo" width={24} height={24} />
)

export function FooterWithLogo() {
  return <Footer TesslateLogo={<FooterTesslateLogo />} />
} 