import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFunnelBySeoSlug } from '@/lib/api';
import { FunnelRenderer } from '@/components/funnel/funnel-renderer';
import { getFaviconFromFunnel } from '@/lib/favicon-utils';

interface Props {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const funnel = await getFunnelBySeoSlug(params.slug);
    const faviconUrl = getFaviconFromFunnel(funnel);

    return {
      title: funnel.settings.seo.title || funnel.name,
      description: funnel.settings.seo.description,
      openGraph: funnel.settings.seo.ogImage
        ? { images: [funnel.settings.seo.ogImage] }
        : undefined,
      icons: faviconUrl
        ? {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
          }
        : undefined,
    };
  } catch {
    return {
      title: 'Page Not Found',
    };
  }
}

export default async function FunnelPage({ params }: Props) {
  let funnel;
  try {
    funnel = await getFunnelBySeoSlug(params.slug);
  } catch {
    notFound();
  }

  if (!funnel || funnel.status !== 'PUBLISHED') {
    notFound();
  }

  return <FunnelRenderer funnel={funnel} />;
}
