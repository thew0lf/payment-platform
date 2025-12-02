import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type LandingPageTheme =
  | 'STARTER'
  | 'ARTISAN'
  | 'VELOCITY'
  | 'LUXE'
  | 'WELLNESS'
  | 'FOODIE'
  | 'PROFESSIONAL'
  | 'CREATOR'
  | 'MARKETPLACE';

export type LandingPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type LandingPageHosting = 'PLATFORM' | 'CLIENT';

export type DomainSslStatus = 'PENDING' | 'VALIDATING' | 'ACTIVE' | 'FAILED' | 'EXPIRED';

export type SectionType =
  | 'HERO'
  | 'FEATURES'
  | 'ABOUT'
  | 'TESTIMONIALS'
  | 'LOGOS'
  | 'STATS'
  | 'PRICING'
  | 'PRODUCTS'
  | 'CTA'
  | 'NEWSLETTER'
  | 'CONTACT_FORM'
  | 'FAQ'
  | 'GALLERY'
  | 'VIDEO'
  | 'HTML_BLOCK'
  | 'SPACER'
  | 'DIVIDER'
  | 'HEADER'
  | 'FOOTER';

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
  publishedAt?: string;
  sectionCount: number;
  domainCount: number;
  totalPageViews: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDetail {
  id: string;
  type: SectionType;
  name?: string;
  order: number;
  enabled: boolean;
  content: Record<string, any>;
  styles?: SectionStyles;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
}

export interface DomainDetail {
  id: string;
  domain: string;
  isPrimary: boolean;
  sslStatus: DomainSslStatus;
  sslExpiresAt?: string;
  monthlyFee: number;
  createdAt: string;
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

export interface CreateLandingPageInput {
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

export interface UpdateLandingPageInput extends Partial<CreateLandingPageInput> {
  status?: LandingPageStatus;
}

export interface CreateSectionInput {
  type: SectionType;
  name?: string;
  order: number;
  content: Record<string, any>;
  styles?: SectionStyles;
  enabled?: boolean;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

export interface UpdateSectionInput {
  name?: string;
  order?: number;
  content?: Record<string, any>;
  styles?: SectionStyles;
  enabled?: boolean;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

export interface DeploymentResult {
  success: boolean;
  url: string;
  distributionId?: string;
  deployedAt: string;
  message?: string;
}

export interface ThemeOption {
  theme: LandingPageTheme;
  name: string;
  description: string;
}

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  preview?: string;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE GALLERY TYPES
// ═══════════════════════════════════════════════════════════════

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templateIds: string[];
}

export interface TemplateGalleryItem {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  previewUrl?: string;
  theme: LandingPageTheme;
  category: string;
  tags: string[];
  sectionCount: number;
  sectionTypes: SectionType[];
  features: string[];
  popularity: number;
  isNew: boolean;
  isPremium: boolean;
}

export interface TemplateGalleryResponse {
  templates: TemplateGalleryItem[];
  categories: TemplateCategory[];
  total: number;
}

export interface TemplateGalleryOptions {
  category?: string;
  search?: string;
  tags?: string[];
  sortBy?: 'popularity' | 'name' | 'newest';
}

// ═══════════════════════════════════════════════════════════════
// AI CONTENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface AIUsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  usageByFeature: Record<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

export interface GeneratePageBriefRequest {
  businessName: string;
  industry: string;
  targetAudience: string;
  mainGoal: 'lead_generation' | 'sales' | 'awareness' | 'signup';
  keyBenefits?: string[];
  tone?: 'professional' | 'casual' | 'luxury' | 'friendly' | 'bold';
  additionalContext?: string;
}

export interface GeneratedPageContent {
  headline: string;
  subheadline: string;
  ctaText: string;
  sections: {
    type: SectionType;
    name: string;
    content: Record<string, any>;
  }[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

export interface RewriteSectionRequest {
  sectionType: SectionType;
  currentContent: Record<string, any>;
  instruction: string;
  tone?: string;
}

export interface GenerateABVariantsRequest {
  originalText: string;
  elementType: 'headline' | 'subheadline' | 'cta' | 'description';
  variantCount?: number;
  focusAreas?: ('urgency' | 'benefits' | 'emotion' | 'social_proof')[];
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all landing pages for the current company
 */
export async function getLandingPages(): Promise<LandingPageSummary[]> {
  return apiRequest<LandingPageSummary[]>('/api/landing-pages');
}

/**
 * Get a single landing page by ID
 */
export async function getLandingPage(id: string): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>(`/api/landing-pages/${id}`);
}

/**
 * Create a new landing page
 */
export async function createLandingPage(data: CreateLandingPageInput): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>('/api/landing-pages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Create a landing page from a template
 * @param data.templateId - Template ID: 'blank', 'starter', 'artisan', 'velocity', 'luxe', etc.
 */
export async function createFromTemplate(data: {
  templateId: string;
  name: string;
  slug: string;
  theme?: LandingPageTheme;
}): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>('/api/landing-pages/from-template', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a landing page
 */
export async function updateLandingPage(
  id: string,
  data: UpdateLandingPageInput
): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>(`/api/landing-pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a landing page
 */
export async function deleteLandingPage(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/landing-pages/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Duplicate a landing page
 */
export async function duplicateLandingPage(
  id: string,
  newName: string
): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>(`/api/landing-pages/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name: newName }),
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Add a section to a landing page
 */
export async function addSection(
  pageId: string,
  data: CreateSectionInput
): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>(`/api/landing-pages/${pageId}/sections`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a section
 */
export async function updateSection(
  pageId: string,
  sectionId: string,
  data: UpdateSectionInput
): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>(`/api/landing-pages/${pageId}/sections/${sectionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a section
 */
export async function deleteSection(
  pageId: string,
  sectionId: string
): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>(`/api/landing-pages/${pageId}/sections/${sectionId}`, {
    method: 'DELETE',
  });
}

/**
 * Reorder sections
 */
export async function reorderSections(
  pageId: string,
  sectionIds: string[]
): Promise<LandingPageDetail> {
  return apiRequest<LandingPageDetail>(`/api/landing-pages/${pageId}/sections/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ sectionIds }),
  });
}

// ═══════════════════════════════════════════════════════════════
// DEPLOYMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Deploy a landing page
 */
export async function deployLandingPage(
  pageId: string,
  html: string,
  assets?: { key: string; content: string; contentType: string }[]
): Promise<DeploymentResult> {
  return apiRequest<DeploymentResult>(`/api/landing-pages/${pageId}/deploy`, {
    method: 'POST',
    body: JSON.stringify({ html, assets }),
  });
}

/**
 * Unpublish a landing page
 */
export async function unpublishLandingPage(pageId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/landing-pages/${pageId}/unpublish`, {
    method: 'POST',
  });
}

// ═══════════════════════════════════════════════════════════════
// DOMAINS
// ═══════════════════════════════════════════════════════════════

/**
 * Request a subdomain for a landing page
 */
export async function requestSubdomain(
  pageId: string,
  subdomain: string
): Promise<{ subdomain: string; fullDomain: string }> {
  return apiRequest<{ subdomain: string; fullDomain: string }>(
    `/api/landing-pages/${pageId}/subdomain`,
    {
      method: 'POST',
      body: JSON.stringify({ subdomain }),
    }
  );
}

/**
 * Add a custom domain to a landing page
 */
export async function addCustomDomain(
  pageId: string,
  domain: string
): Promise<{ domain: string; validationRecords: { name: string; type: string; value: string }[] }> {
  return apiRequest<{
    domain: string;
    validationRecords: { name: string; type: string; value: string }[];
  }>(`/api/landing-pages/${pageId}/domains`, {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });
}

/**
 * Check SSL status for a domain
 */
export async function checkDomainStatus(
  pageId: string,
  domainId: string
): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/landing-pages/${pageId}/domains/${domainId}/status`);
}

/**
 * Remove a custom domain
 */
export async function removeCustomDomain(
  pageId: string,
  domainId: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/landing-pages/${pageId}/domains/${domainId}`, {
    method: 'DELETE',
  });
}

// ═══════════════════════════════════════════════════════════════
// META
// ═══════════════════════════════════════════════════════════════

/**
 * Get available themes
 */
export async function getThemes(): Promise<ThemeOption[]> {
  return apiRequest<ThemeOption[]>('/api/landing-pages/meta/themes');
}

/**
 * Get available templates
 */
export async function getTemplates(): Promise<TemplateOption[]> {
  return apiRequest<TemplateOption[]>('/api/landing-pages/meta/templates');
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE GALLERY
// ═══════════════════════════════════════════════════════════════

/**
 * Get template gallery with filtering and sorting
 */
export async function getTemplateGallery(
  options?: TemplateGalleryOptions
): Promise<TemplateGalleryResponse> {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.search) params.set('search', options.search);
  if (options?.tags?.length) params.set('tags', options.tags.join(','));
  if (options?.sortBy) params.set('sortBy', options.sortBy);

  const query = params.toString();
  return apiRequest<TemplateGalleryResponse>(
    `/api/landing-pages/gallery/templates${query ? `?${query}` : ''}`
  );
}

/**
 * Get popular templates for featured section
 */
export async function getPopularTemplates(limit?: number): Promise<TemplateGalleryItem[]> {
  const params = limit ? `?limit=${limit}` : '';
  return apiRequest<TemplateGalleryItem[]>(`/api/landing-pages/gallery/templates/popular${params}`);
}

/**
 * Get template details by ID
 */
export async function getTemplateDetail(templateId: string): Promise<TemplateGalleryItem | null> {
  return apiRequest<TemplateGalleryItem | null>(`/api/landing-pages/gallery/templates/${templateId}`);
}

// ═══════════════════════════════════════════════════════════════
// AI CONTENT GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate complete landing page content from a business brief using AI
 */
export async function generatePageFromBrief(
  request: GeneratePageBriefRequest,
  landingPageId?: string
): Promise<GeneratedPageContent> {
  return apiRequest<GeneratedPageContent>('/api/landing-pages/ai/generate-page', {
    method: 'POST',
    body: JSON.stringify({ ...request, landingPageId }),
  });
}

/**
 * Rewrite/improve a section's content using AI
 */
export async function rewriteSection(
  request: RewriteSectionRequest,
  landingPageId?: string
): Promise<Record<string, any>> {
  return apiRequest<Record<string, any>>('/api/landing-pages/ai/rewrite-section', {
    method: 'POST',
    body: JSON.stringify({ ...request, landingPageId }),
  });
}

/**
 * Generate A/B test copy variants using AI
 */
export async function generateABVariants(
  request: GenerateABVariantsRequest,
  landingPageId?: string
): Promise<string[]> {
  return apiRequest<string[]>('/api/landing-pages/ai/generate-variants', {
    method: 'POST',
    body: JSON.stringify({ ...request, landingPageId }),
  });
}

/**
 * Get AI usage summary for billing
 */
export async function getAIUsage(): Promise<AIUsageSummary> {
  return apiRequest<AIUsageSummary>('/api/landing-pages/ai/usage');
}
