import Link from "next/link"
import Image from "next/image"

interface FooterProps {
  TesslateLogo?: React.ReactNode
}

export default function Footer({ TesslateLogo }: FooterProps) {
  return (
    <footer className="bg-[var(--color-bg-dark)] text-[var(--color-text-inverted)]">
      <div className="max-w-screen-xl mx-auto py-16 md:py-24 px-4 md:px-8 lg:px-10">
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
              <div className="md:col-span-1 space-y-4">
                  <h4 className="font-heading text-3xl font-medium text-gradient-tesslate">Tesslate</h4>
                  <p className="text-sm text-[var(--color-text-muted)]">The Unified AI Development Platform for the Future. Supercharging product teams.<br /> Proud to be from Raleigh, NC</p>
                  <p className="text-sm text-[var(--color-text-muted)]"><a href="mailto:support@tesslate.com" className="hover:text-gray-500">support@tesslate.com</a></p>
              </div>
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
                  <div>
                      <h5 className="font-medium mb-3 text-gray-900">Products</h5>
                      <ul className="space-y-4 text-sm">
                          <li className="flex flex-col"><span className="text-[var(--color-text-muted)] cursor-not-allowed">Tesslate Studio</span><span className="text-[#5E62FF] text-xs mt-1">Coming Soon</span></li>
                          <li className="flex flex-col"><span className="text-[var(--color-text-muted)] cursor-not-allowed">Tesslate Forge</span><span className="text-[#5E62FF] text-xs mt-1">Coming Soon</span></li>
                          <li><a href="https://tframex.tesslate.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-muted)] hover:text-gray-500">TframeX Agents</a></li>
                          <li><a href="https://uigeneval.tesslate.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-muted)] hover:text-gray-500">UIGen Eval</a></li>
                          <li className="flex flex-col"><span className="text-[var(--color-text-muted)] cursor-not-allowed">Designer</span><span className="text-[#5E62FF] text-xs mt-1">Coming Soon</span></li>
                      </ul>
                  </div>
                  <div>
                      <h5 className="font-medium mb-3 text-gray-900">Resources</h5>
                      <ul className="space-y-2 text-sm">
                          <li><a href="https://github.com/TesslateAI" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-muted)] hover:text-gray-500">Research & Open Source</a></li>
                            <li><a href="mailto:support@tesslate.com" className="text-[var(--color-text-muted)] hover:text-gray-500">Contact Us</a></li>
                      </ul>
                  </div>
                  <div>
                      <h5 className="font-medium mb-3 text-gray-900">Company</h5>
                      <ul className="space-y-4 text-sm">
                          <li><span className="text-[var(--color-text-muted)] cursor-not-allowed">About Us</span></li>
                          <li><span className="text-[var(--color-text-muted)] cursor-not-allowed">Privacy Policy</span></li>
                          <li><span className="text-[var(--color-text-muted)] cursor-not-allowed">Terms of Service</span></li>
                      </ul>
                  </div>
              </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/20 flex flex-col md:flex-row items-center text-xs text-[var(--color-text-muted)] space-y-4 md:space-y-0">
              <p>© 2025 Tesslate AI. All rights reserved.</p>
              <a href="https://tesslate.com" target="_blank" rel="noopener noreferrer" className="mx-auto text-[var(--color-text-muted)]hover:gray-500 transition-colors">This website was crafted with Tesslate Models and developer tools.</a>
              <div className="flex space-x-4 items-center">
                  <a href="https://huggingface.co/tesslate" target="_blank" rel="noopener noreferrer" aria-label="Tesslate on Hugging Face" className="text-gray-600 hover:text-gray-400"><img src="/hf-logo.png" alt="Hugging Face Logo" className="h-6 w-6" /></a>
                  <a href="https://x.com/tesslateai" target="_blank" rel="noopener noreferrer" aria-label="Tesslate on Twitter" className="text-gray-600 hover:text-gray-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></a>
                  <a href="https://www.linkedin.com/company/tesslate-ai/" target="_blank" rel="noopener noreferrer" aria-label="Tesslate on LinkedIn" className="text-gray-600 hover:text-gray-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg></a>
                  <a href="https://github.com/TesslateAI" target="_blank" rel="noopener noreferrer" aria-label="Tesslate on GitHub" className="text-gray-600 hover:text-gray-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg></a>
                  <a href="https://www.youtube.com/@TesslateAI" target="_blank" rel="noopener" aria-label="Tesslate on YouTube" className="text-gray-600 hover:text-gray-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg></a>
              </div>
          </div>
      </div>
    </footer>
  )
}