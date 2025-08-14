// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight, Playfair_Display } from 'next/font/google';
import { getUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import DarkModeProvider from '@/components/DarkModeProvider';

export const metadata: Metadata = {
  title: 'Designer by Tesslate - AI-Powered UI Design on Infinite Canvas',
  description: 'Transform your ideas into production-ready React components with AI. Design, prototype, and ship beautiful interfaces on an infinite canvas. No code required.',
  keywords: 'AI design, UI generator, React components, Tailwind CSS, web design tool, AI UI builder, no-code design, visual development, Tesslate Designer',
  authors: [{ name: 'Tesslate', url: 'https://tesslate.com' }],
  creator: 'Tesslate',
  publisher: 'Tesslate',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Designer by Tesslate - AI-Powered UI Design',
    description: 'Transform ideas into production-ready React components. Design on an infinite canvas with AI.',
    url: 'https://designer.tesslate.com',
    siteName: 'Tesslate Designer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Tesslate Designer - AI UI Design Tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Designer by Tesslate - AI-Powered UI Design',
    description: 'Transform ideas into production-ready React components with AI.',
    images: ['/og-image.png'],
    creator: '@tesslate',
  },
  alternates: {
    canonical: 'https://designer.tesslate.com',
  },
  category: 'technology',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tesslate Designer',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  };

  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning // FIX: Added to prevent hydration warnings from browser extensions.
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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