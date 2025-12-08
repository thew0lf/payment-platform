import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://founders.avnz.io'),
  title: 'Join the Founders | avnz.io',
  description: 'Be among the first to shape the future of intelligent commerce. Claim your founder number and join the avnz.io community.',
  keywords: ['founders', 'startup', 'commerce', 'AI', 'payments', 'avnz'],
  authors: [{ name: 'avnz.io' }],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Join the Founders | avnz.io',
    description: 'Be among the first to shape the future of intelligent commerce.',
    url: 'https://founders.avnz.io',
    siteName: 'avnz.io Founders',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'avnz.io Founders',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join the Founders | avnz.io',
    description: 'Be among the first to shape the future of intelligent commerce.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: 'dark:bg-zinc-900 dark:text-white dark:border-zinc-800',
            }}
          />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
