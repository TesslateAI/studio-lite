import Link from "next/link"
import { ExternalLink } from "lucide-react"

interface FooterProps {
  TesslateLogo?: React.ReactNode
}

export default function Footer({ TesslateLogo }: FooterProps) {
  return (
    <footer className="bg-zinc-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-orange-500">
                {TesslateLogo}
              </div>
              <span className="text-xl font-medium">Tesslate</span>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              Empowering developers with advanced AI tools and frameworks. TFrameX is our flagship orchestration library
              for building sophisticated agentive systems.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-white">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://tesslate.com/" className="text-zinc-400 hover:text-white text-sm flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                  About Us <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
              <li>
                <Link href="https://calendly.com/team-tesslate" className="text-zinc-400 hover:text-white text-sm flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                  Contact <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-white">Products</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://github.com/TesslateAI/TFrameX" className="text-zinc-400 hover:text-white text-sm" target="_blank" rel="noopener noreferrer">
                  TFrameX
                </Link>
              </li>
              <li>
                <Link href="https://github.com/TesslateAI/Studio" className="text-zinc-400 hover:text-white text-sm" target="_blank" rel="noopener noreferrer">
                  Tesslate Designer
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-white">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://huggingface.co/Tesslate" className="text-zinc-400 hover:text-white text-sm" target="_blank" rel="noopener noreferrer">
                  Find us on Hugging Face
                </Link>
              </li>
              <li>
                <Link href="https://discord.com/invite/DkzMzwBTaw" className="text-zinc-400 hover:text-white text-sm" target="_blank" rel="noopener noreferrer">
                  Discord
                </Link>
              </li>
              <li>
                <Link href="https://tesslate.com/blog" className="text-zinc-400 hover:text-white text-sm" target="_blank" rel="noopener noreferrer">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <p className="text-zinc-400 text-sm">© 2025 Tesslate. All rights reserved.</p>
            <span className=" inline-block bg-zinc-800 text-orange-400 text-xs font-semibold rounded-full px-3 py-1 shadow-sm border border-zinc-700 tracking-wide ml-0 md:ml-2"
                aria-label="Version 1.0.0"
            >
              v1.0.0
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 md:mt-0">
            <a href="https://x.com/tesslateai" className="text-zinc-400 hover:text-white" target="_blank" rel="noopener noreferrer" aria-label="X">
              <img src="/twitter.png" alt="X" width={24} height={24} />
            </a>
            <a href="https://linkedin.com/company/tesslate" className="text-zinc-400 hover:text-white" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <img src="/linkedin.png" alt="LinkedIn" width={24} height={24} />
            </a>
            <a href="https://github.com/TesslateAI" className="text-zinc-400 hover:text-white" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <img src="/github.png" alt="GitHub" width={24} height={24} />
            </a>
            <a href="https://huggingface.co/Tesslate" className="text-zinc-400 hover:text-white" target="_blank" rel="noopener noreferrer" aria-label="Hugging Face">
              <img src="/hf-logo.png" alt="Hugging Face" width={24} height={24} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
} 