import { Metadata } from 'next';
import { LandingPageProvider } from '@/contexts/landing-page-context';
import { LandingPageRenderer } from '@/components/landing-page/landing-page-renderer';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/lp/${params.slug}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const lp = await res.json();
      return {
        title: lp.metaTitle || lp.name,
        description: lp.metaDescription,
        openGraph: lp.ogImage ? { images: [lp.ogImage] } : undefined,
      };
    }
  } catch {
    // Fallback to default
  }
  return { title: 'Landing Page' };
}

export default function LandingPagePage({ params }: PageProps) {
  return (
    <LandingPageProvider>
      <LandingPageRenderer slug={params.slug} />
    </LandingPageProvider>
  );
}
