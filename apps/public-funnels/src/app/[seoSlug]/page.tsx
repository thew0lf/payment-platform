import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFunnel } from '@/lib/api';
import { FunnelRenderer } from './funnel-renderer';

interface Props {
  params: Promise<{ seoSlug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seoSlug } = await params;

  try {
    const funnel = await getFunnel(seoSlug);
    const seo = funnel.settings?.seo || {};

    return {
      title: seo.title || funnel.name,
      description: seo.description || funnel.description || '',
      openGraph: {
        title: seo.title || funnel.name,
        description: seo.description || funnel.description || '',
        images: seo.ogImage ? [{ url: seo.ogImage }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.title || funnel.name,
        description: seo.description || funnel.description || '',
        images: seo.ogImage ? [seo.ogImage] : [],
      },
      robots: {
        index: true,
        follow: true,
      },
      // Canonical URL with SEO-friendly format
      alternates: {
        canonical: `/${funnel.seoUrl}`,
      },
    };
  } catch {
    return {
      title: 'Not Found',
      description: '',
    };
  }
}

export default async function FunnelPage({ params }: Props) {
  const { seoSlug } = await params;

  try {
    const funnel = await getFunnel(seoSlug);

    // Inject branding CSS variables
    const branding = funnel.settings?.branding || {};
    const cssVars = {
      '--primary-color': branding.primaryColor || '#000000',
    };

    return (
      <div style={cssVars as React.CSSProperties}>
        <FunnelRenderer funnel={funnel} />
      </div>
    );
  } catch {
    notFound();
  }
}
