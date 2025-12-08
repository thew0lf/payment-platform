import { apiClient } from '../api';

// ═══════════════════════════════════════════════════════════════
// AI FUNNEL GENERATOR TYPES
// ═══════════════════════════════════════════════════════════════

export type MarketingMethodology =
  | 'NCI'
  | 'AIDA'
  | 'PAS'
  | 'BAB'
  | 'STORYBRAND'
  | 'FOUR_PS'
  | 'PASTOR'
  | 'QUEST'
  | 'FAB'
  | 'CUSTOM';

export type GenerationStatus =
  | 'PENDING'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SAVED'
  | 'DISCARDED';

export interface MethodologySummary {
  id: MarketingMethodology;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
}

export interface DiscoveryQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helpText?: string;
}

export interface MethodologyDetail {
  methodology: {
    id: MarketingMethodology;
    name: string;
    tagline: string;
    description: string;
  };
  questions: DiscoveryQuestion[];
}

export interface GenerationProgress {
  stage: 'landing' | 'products' | 'emails' | 'leadCapture' | 'checkout' | 'success';
  status: 'pending' | 'generating' | 'complete' | 'error';
  message?: string;
}

export interface HeroSection {
  headline: string;
  subheadline: string;
  ctaText: string;
  backgroundType: 'image' | 'video' | 'gradient';
  suggestedImageKeywords: string[];
}

export interface BenefitItem {
  title: string;
  description: string;
  iconSuggestion: string;
}

export interface LandingContent {
  hero: HeroSection;
  benefits: {
    sectionTitle: string;
    benefits: BenefitItem[];
  };
  socialProof: {
    sectionTitle: string;
    testimonialPrompts: string[];
    statsToHighlight: string[];
  };
  cta: {
    headline: string;
    subheadline?: string;
    buttonText: string;
    urgencyText?: string;
  };
  faqItems?: Array<{ question: string; answer: string }>;
}

export interface ProductContent {
  productId: string;
  enhancedDescription: string;
  bulletPoints: string[];
  socialProofLine: string;
  valueProposition: string;
}

export interface EmailContent {
  type: 'welcome' | 'value' | 'social_proof' | 'urgency' | 'final';
  subject: string;
  previewText: string;
  body: string;
  ctaText: string;
  sendDelayHours: number;
}

export interface GeneratedFunnelContent {
  landing: LandingContent;
  products: ProductContent[];
  emails: EmailContent[];
  leadCapture: {
    headline: string;
    description: string;
    leadMagnetTitle?: string;
    formFields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
    }>;
    buttonText: string;
    privacyText: string;
  };
  checkout: {
    trustBadgeTexts: string[];
    guaranteeText: string;
    urgencyText: string;
    orderSummaryTitle: string;
    orderConfirmationHeadline: string;
  };
  success: {
    headline: string;
    message: string;
    nextSteps: string[];
    socialShareText: string;
    upsellTeaser?: string;
  };
}

export interface GenerationResult {
  generationId: string;
  status: GenerationStatus;
  progress: GenerationProgress[];
  content?: GeneratedFunnelContent;
  metrics?: {
    totalTokensUsed: number;
    generationTimeMs: number;
    stageTimings: Record<string, number>;
  };
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export async function getMethodologies(): Promise<{ methodologies: MethodologySummary[] }> {
  return apiClient.get<{ methodologies: MethodologySummary[] }>('/api/ai-funnel/methodologies');
}

export async function getMethodologyQuestions(
  methodologyId: MarketingMethodology
): Promise<MethodologyDetail> {
  return apiClient.get<MethodologyDetail>(`/api/ai-funnel/methodologies/${methodologyId}/questions`);
}

export async function startGeneration(
  data: {
    productIds: string[];
    primaryProductId?: string;
    methodology: MarketingMethodology;
    discoveryAnswers: Record<string, string>;
  },
  companyId?: string
): Promise<{ generationId: string }> {
  const query = companyId ? `?companyId=${companyId}` : '';
  return apiClient.post<{ generationId: string }>(`/api/ai-funnel/generate${query}`, data);
}

export async function getGeneration(
  generationId: string,
  companyId?: string
): Promise<GenerationResult> {
  const query = companyId ? `?companyId=${companyId}` : '';
  return apiClient.get<GenerationResult>(`/api/ai-funnel/generations/${generationId}${query}`);
}

export async function regenerateSection(
  generationId: string,
  section: 'landing' | 'products' | 'emails' | 'leadCapture' | 'checkout' | 'success',
  companyId?: string
): Promise<{ section: string; content: unknown }> {
  const query = companyId ? `?companyId=${companyId}` : '';
  return apiClient.post<{ section: string; content: unknown }>(
    `/api/ai-funnel/generations/${generationId}/regenerate${query}`,
    { section }
  );
}

export async function saveAsFunnel(
  generationId: string,
  name: string,
  content?: Partial<GeneratedFunnelContent>,
  companyId?: string
): Promise<{ funnelId: string }> {
  const query = companyId ? `?companyId=${companyId}` : '';
  return apiClient.post<{ funnelId: string }>(
    `/api/ai-funnel/generations/${generationId}/save${query}`,
    { name, content }
  );
}

export async function discardGeneration(
  generationId: string,
  companyId?: string
): Promise<{ success: boolean }> {
  const query = companyId ? `?companyId=${companyId}` : '';
  return apiClient.delete<{ success: boolean }>(`/api/ai-funnel/generations/${generationId}${query}`);
}
