// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google'; // Changed from Manrope to Inter
import { getUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import DarkModeProvider from '@/components/DarkModeProvider';

export const metadata: Metadata = {
  title: 'Designer',
  description: 'Experience what our models can do'
};

export const viewport: Viewport = {
  maximumScale: 1
};

// Initialize Inter font
const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Apply the Inter font class to the html element
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${inter.className}`}
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