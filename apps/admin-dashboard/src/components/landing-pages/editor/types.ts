import { SectionDetail, LandingPageDetail, SectionType, LandingPageTheme } from '@/lib/api/landing-pages';

export type EditorMode = 'edit' | 'preview';
export type DevicePreview = 'desktop' | 'tablet' | 'mobile';

export interface EditorContextValue {
  page: LandingPageDetail;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  devicePreview: DevicePreview;
  setDevicePreview: (device: DevicePreview) => void;
  updateSection: (sectionId: string, data: Partial<SectionDetail>) => Promise<void>;
  addSection: (type: SectionType, afterSectionId?: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  moveSection: (sectionId: string, direction: 'up' | 'down') => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;
  updatePage: (data: Partial<LandingPageDetail>) => void;
  savePage: () => Promise<void>;
  deployPage: () => Promise<void>;
  hasChanges: boolean;
  saving: boolean;
  deploying: boolean;
}

export interface SectionEditorProps {
  section: SectionDetail;
  onUpdate: (data: Partial<SectionDetail['content']>) => void;
  onStyleUpdate?: (styles: Partial<SectionStyles>) => void;
}

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

// Content types for each section
export interface HeroContent {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  backgroundImage?: string;
  videoUrl?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface FeatureItem {
  id: string;
  icon?: string;
  title: string;
  description: string;
  image?: string;
}

export interface FeaturesContent {
  headline?: string;
  subheadline?: string;
  items: FeatureItem[];
  columns?: 2 | 3 | 4;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
  rating?: number;
}

export interface TestimonialsContent {
  headline?: string;
  subheadline?: string;
  items: TestimonialItem[];
  layout?: 'grid' | 'carousel' | 'wall';
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaText?: string;
  ctaUrl?: string;
  highlighted?: boolean;
}

export interface PricingContent {
  headline?: string;
  subheadline?: string;
  tiers: PricingTier[];
  showToggle?: boolean;
  monthlyLabel?: string;
  yearlyLabel?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQContent {
  headline?: string;
  subheadline?: string;
  items: FAQItem[];
  layout?: 'accordion' | 'grid';
}

export interface CTAContent {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  style?: 'banner' | 'split' | 'centered';
}

export interface LogoItem {
  id: string;
  name: string;
  imageUrl: string;
  link?: string;
}

export interface LogosContent {
  headline?: string;
  items: LogoItem[];
  grayscale?: boolean;
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface StatsContent {
  headline?: string;
  subheadline?: string;
  items: StatItem[];
  style?: 'default' | 'cards' | 'minimal';
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  caption?: string;
  alt?: string;
}

export interface GalleryContent {
  headline?: string;
  items: GalleryItem[];
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'masonry';
}

export interface VideoContent {
  headline?: string;
  subheadline?: string;
  videoUrl?: string;
  embedCode?: string;
  thumbnail?: string;
  autoplay?: boolean;
}

export interface NewsletterContent {
  headline?: string;
  subheadline?: string;
  placeholder?: string;
  buttonText?: string;
  successMessage?: string;
}

export interface ContactFormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select
}

export interface ContactFormContent {
  headline?: string;
  subheadline?: string;
  fields: ContactFormField[];
  submitText?: string;
  successMessage?: string;
}

export interface AboutContent {
  headline?: string;
  subheadline?: string;
  content?: string;
  image?: string;
  imagePosition?: 'left' | 'right';
  stats?: StatItem[];
}

export interface SpacerContent {
  height: number;
}

export interface DividerContent {
  style: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  color?: string;
}

export interface HeaderContent {
  logo?: string;
  logoText?: string;
  menuItems: { label: string; url: string }[];
  ctaText?: string;
  ctaUrl?: string;
  sticky?: boolean;
}

export interface FooterContent {
  logo?: string;
  logoText?: string;
  columns: {
    title: string;
    links: { label: string; url: string }[];
  }[];
  socialLinks?: { platform: string; url: string }[];
  copyright?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  ctaText?: string;
  ctaUrl?: string;
  badge?: string;
}

export interface ProductsContent {
  headline?: string;
  subheadline?: string;
  items: ProductItem[];
  columns?: 2 | 3 | 4;
}

// Helper to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
