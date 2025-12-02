import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coffee Explorer - Discover Premium Coffee Subscriptions',
  description:
    'Join Coffee Explorer and discover exceptional coffee from around the world. Curated subscriptions delivered fresh to your door.',
  keywords: [
    'coffee',
    'subscription',
    'premium coffee',
    'specialty coffee',
    'coffee delivery',
  ],
  openGraph: {
    title: 'Coffee Explorer - Discover Premium Coffee Subscriptions',
    description:
      'Join Coffee Explorer and discover exceptional coffee from around the world.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
