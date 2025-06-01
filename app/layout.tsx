import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import DarkModeProvider from '@/components/DarkModeProvider';

export const metadata: Metadata = {
  title: 'Studio Lite',
  description: 'Experience what our models can do'
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
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
