/**
 * Landing Page Types
 * DTOs and interfaces for the landing page builder
 */

import {
  LandingPageTheme,
  SectionType,
  LandingPageStatus,
  LandingPageHosting,
  DomainSslStatus,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// COLOR SCHEME & TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface Typography {
  headingFont: string;
  bodyFont: string;
  baseFontSize: number;
  headingSizes: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION CONTENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface HeroContent {
  headline: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  backgroundImage?: string;
  videoUrl?: string;
  slides?: { image: string; headline?: string }[];
}

export interface FeatureItem {
  icon?: string;
  title: string;
  description: string;
  image?: string;
}

export interface FeaturesContent {
  headline?: string;
  subheadline?: string;
  items: FeatureItem[];
}

export interface TeamMember {
  name: string;
  role: string;
  image?: string;
  bio?: string;
  social?: { platform: string; url: string }[];
}

export interface AboutContent {
  headline?: string;
  story?: string;
  mission?: string;
  values?: string[];
  teamMembers?: TeamMember[];
  milestones?: { year: string; title: string; description?: string }[];
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  image?: string;
  rating?: number;
}

export interface TestimonialsContent {
  headline?: string;
  items: TestimonialItem[];
}

export interface LogoItem {
  name: string;
  image: string;
  url?: string;
}

export interface LogosContent {
  headline?: string;
  items: LogoItem[];
}

export interface StatItem {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface StatsContent {
  headline?: string;
  items: StatItem[];
}

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
  highlighted?: boolean;
}

export interface PricingContent {
  headline?: string;
  subheadline?: string;
  tiers: PricingTier[];
}

export interface ProductItem {
  id: string;
  name: string;
  price: string;
  image?: string;
  description?: string;
  url?: string;
}

export interface ProductsContent {
  headline?: string;
  subheadline?: string;
  items: ProductItem[];
}

export interface CtaContent {
  headline: string;
  subheadline?: string;
  ctaText: string;
  ctaUrl: string;
  backgroundImage?: string;
}

export interface NewsletterContent {
  headline?: string;
  subheadline?: string;
  placeholderText?: string;
  buttonText?: string;
  successMessage?: string;
}

export interface ContactFormContent {
  headline?: string;
  subheadline?: string;
  fields: { name: string; type: string; required: boolean; placeholder?: string }[];
  submitText?: string;
  successMessage?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  headline?: string;
  items: FaqItem[];
}

export interface GalleryItem {
  image: string;
  alt?: string;
  caption?: string;
}

export interface GalleryContent {
  headline?: string;
  items: GalleryItem[];
}

export interface VideoContent {
  headline?: string;
  videoUrl: string;
  autoplay?: boolean;
  muted?: boolean;
}

export interface HtmlBlockContent {
  html: string;
}

export interface SpacerContent {
  height: number;
  mobileHeight?: number;
}

export interface DividerContent {
  style: 'solid' | 'dashed' | 'dotted' | 'gradient';
  color?: string;
  thickness?: number;
}

export interface HeaderContent {
  logo?: string;
  logoText?: string;
  navLinks?: { text: string; url: string }[];
  ctaText?: string;
  ctaUrl?: string;
  sticky?: boolean;
}

export interface FooterContent {
  logo?: string;
  logoText?: string;
  columns?: { title: string; links: { text: string; url: string }[] }[];
  social?: { platform: string; url: string }[];
  copyright?: string;
  legal?: { text: string; url: string }[];
}

export type SectionContent =
  | HeroContent
  | FeaturesContent
  | AboutContent
  | TestimonialsContent
  | LogosContent
  | StatsContent
  | PricingContent
  | ProductsContent
  | CtaContent
  | NewsletterContent
  | ContactFormContent
  | FaqContent
  | GalleryContent
  | VideoContent
  | HtmlBlockContent
  | SpacerContent
  | DividerContent
  | HeaderContent
  | FooterContent;

// ═══════════════════════════════════════════════════════════════
// SECTION STYLES
// ═══════════════════════════════════════════════════════════════

export interface SectionStyles {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlay?: string;
  paddingTop?: string;
  paddingBottom?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animation?: 'fade' | 'slide' | 'zoom' | 'none';
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface CreateLandingPageDto {
  name: string;
  slug: string;
  theme?: LandingPageTheme;
  colorScheme?: ColorScheme;
  typography?: Typography;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  favicon?: string;
  customCss?: string;
  customJs?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

export interface UpdateLandingPageDto {
  name?: string;
  slug?: string;
  theme?: LandingPageTheme;
  colorScheme?: ColorScheme;
  typography?: Typography;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  favicon?: string;
  customCss?: string;
  customJs?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  status?: LandingPageStatus;
}

export interface CreateSectionDto {
  type: SectionType;
  name?: string;
  order: number;
  content: SectionContent;
  styles?: SectionStyles;
  enabled?: boolean;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

export interface UpdateSectionDto {
  name?: string;
  order?: number;
  content?: SectionContent;
  styles?: SectionStyles;
  enabled?: boolean;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

export interface ReorderSectionsDto {
  sectionIds: string[];
}

export interface AddCustomDomainDto {
  domain: string;
}

export interface RequestSubdomainDto {
  subdomain: string;
}

export interface DeployPageDto {
  publishToPlatform?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface LandingPageSummary {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  subdomain?: string;
  theme: LandingPageTheme;
  status: LandingPageStatus;
  hostingType: LandingPageHosting;
  platformUrl?: string;
  clientUrl?: string;
  publishedAt?: Date;
  sectionCount: number;
  domainCount: number;
  totalPageViews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageDetail extends LandingPageSummary {
  colorScheme: ColorScheme;
  typography: Typography;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  favicon?: string;
  customCss?: string;
  customJs?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  sections: SectionDetail[];
  domains: DomainDetail[];
  billingEnabled: boolean;
  monthlyFee: number;
}

export interface SectionDetail {
  id: string;
  type: SectionType;
  name?: string;
  order: number;
  enabled: boolean;
  content: SectionContent;
  styles?: SectionStyles;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
}

export interface DomainDetail {
  id: string;
  domain: string;
  isPrimary: boolean;
  sslStatus: DomainSslStatus;
  sslExpiresAt?: Date;
  monthlyFee: number;
  createdAt: Date;
}

export interface DeploymentResult {
  success: boolean;
  url: string;
  distributionId?: string;
  deployedAt: Date;
  message?: string;
}

export interface UsageStats {
  pageViews: number;
  bandwidthMb: number;
  deploys: number;
  currentMonthFees: {
    base: number;
    bandwidth: number;
    customDomain: number;
    total: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// THEME DEFAULTS
// ═══════════════════════════════════════════════════════════════

export const THEME_DEFAULTS: Record<LandingPageTheme, { colorScheme: ColorScheme; typography: Typography }> = {
  STARTER: {
    colorScheme: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#F59E0B',
      background: '#FFFFFF',
      surface: '#F3F4F6',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseFontSize: 16,
      headingSizes: { h1: '3rem', h2: '2.25rem', h3: '1.5rem', h4: '1.25rem' },
    },
  },
  ARTISAN: {
    colorScheme: {
      primary: '#92400E',
      secondary: '#78350F',
      accent: '#D97706',
      background: '#FFFBEB',
      surface: '#FEF3C7',
      text: '#451A03',
      textMuted: '#78350F',
      border: '#FCD34D',
      success: '#065F46',
      warning: '#D97706',
      error: '#B91C1C',
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Lora',
      baseFontSize: 17,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.375rem' },
    },
  },
  VELOCITY: {
    colorScheme: {
      primary: '#EF4444',
      secondary: '#B91C1C',
      accent: '#FBBF24',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      border: '#334155',
      success: '#22C55E',
      warning: '#FBBF24',
      error: '#F87171',
    },
    typography: {
      headingFont: 'Rajdhani',
      bodyFont: 'Space Grotesk',
      baseFontSize: 16,
      headingSizes: { h1: '4rem', h2: '2.75rem', h3: '1.875rem', h4: '1.25rem' },
    },
  },
  LUXE: {
    colorScheme: {
      primary: '#A78BFA',
      secondary: '#7C3AED',
      accent: '#F472B6',
      background: '#18181B',
      surface: '#27272A',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      border: '#3F3F46',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
    },
    typography: {
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Montserrat',
      baseFontSize: 16,
      headingSizes: { h1: '3.75rem', h2: '2.5rem', h3: '1.5rem', h4: '1.25rem' },
    },
  },
  WELLNESS: {
    colorScheme: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#F97316',
      background: '#F0FDF4',
      surface: '#DCFCE7',
      text: '#14532D',
      textMuted: '#166534',
      border: '#86EFAC',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#DC2626',
    },
    typography: {
      headingFont: 'Nunito',
      bodyFont: 'Open Sans',
      baseFontSize: 16,
      headingSizes: { h1: '3rem', h2: '2.25rem', h3: '1.5rem', h4: '1.25rem' },
    },
  },
  FOODIE: {
    colorScheme: {
      primary: '#DC2626',
      secondary: '#B91C1C',
      accent: '#16A34A',
      background: '#FFFBEB',
      surface: '#FEF3C7',
      text: '#1C1917',
      textMuted: '#57534E',
      border: '#D6D3D1',
      success: '#16A34A',
      warning: '#F59E0B',
      error: '#DC2626',
    },
    typography: {
      headingFont: 'Abril Fatface',
      bodyFont: 'Poppins',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
  PROFESSIONAL: {
    colorScheme: {
      primary: '#2563EB',
      secondary: '#1D4ED8',
      accent: '#0EA5E9',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#E2E8F0',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      baseFontSize: 16,
      headingSizes: { h1: '2.75rem', h2: '2rem', h3: '1.5rem', h4: '1.125rem' },
    },
  },
  CREATOR: {
    colorScheme: {
      primary: '#EC4899',
      secondary: '#DB2777',
      accent: '#8B5CF6',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#171717',
      textMuted: '#737373',
      border: '#E5E5E5',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'DM Sans',
      bodyFont: 'DM Sans',
      baseFontSize: 16,
      headingSizes: { h1: '3.25rem', h2: '2.25rem', h3: '1.5rem', h4: '1.25rem' },
    },
  },
  MARKETPLACE: {
    colorScheme: {
      primary: '#0891B2',
      secondary: '#0E7490',
      accent: '#F97316',
      background: '#FFFFFF',
      surface: '#F1F5F9',
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#CBD5E1',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Outfit',
      bodyFont: 'Source Sans Pro',
      baseFontSize: 15,
      headingSizes: { h1: '2.5rem', h2: '2rem', h3: '1.5rem', h4: '1.125rem' },
    },
  },
};
