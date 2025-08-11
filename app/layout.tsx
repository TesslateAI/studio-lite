// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight, Playfair_Display } from 'next/font/google';
import { getUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import DarkModeProvider from '@/components/DarkModeProvider';

export const metadata: Metadata = {
  title: 'Designer - A New Way to Build for the Web',
  description: 'Instant access to specialized AI models that turn your ideas into high-fidelity, interactive UIs.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

// Initialize new fonts
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-heading' });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], style: ['italic'], variable: '--font-serif' });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning // FIX: Added to prevent hydration warnings from browser extensions.
    >
      <body className="min-h-[100dvh] bg-[#FFFFFF]">
        <SWRConfig
          value={{
            fallback: {
              '/api/user': getUser()
            }
          }}
        >
          <DarkModeProvider>
            {children}
          </DarkModeProvider>
        </SWRConfig>
      </body>
    </html>
  );
}