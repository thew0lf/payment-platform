// ═══════════════════════════════════════════════════════════════
// AI FUNNEL GENERATOR TYPES
// ═══════════════════════════════════════════════════════════════

export enum MarketingMethodology {
  NCI = 'NCI',           // Non-Verbal Communication Influence (Proprietary)
  AIDA = 'AIDA',         // Attention, Interest, Desire, Action
  PAS = 'PAS',           // Problem, Agitation, Solution
  BAB = 'BAB',           // Before, After, Bridge
  FOUR_PS = 'FOUR_PS',   // Promise, Picture, Proof, Push
  STORYBRAND = 'STORYBRAND', // Donald Miller's Hero Journey
  PASTOR = 'PASTOR',     // Problem, Amplify, Story, Transform, Offer, Response
  QUEST = 'QUEST',       // Qualify, Understand, Educate, Stimulate, Transition
  FAB = 'FAB',           // Features, Advantages, Benefits
  CUSTOM = 'CUSTOM',     // User-defined methodology
}

export enum GenerationStatus {
  PENDING = 'PENDING',       // Waiting to start
  GENERATING = 'GENERATING', // AI is generating content
  COMPLETED = 'COMPLETED',   // Successfully generated
  FAILED = 'FAILED',         // Generation failed
  SAVED = 'SAVED',           // User saved as funnel
  DISCARDED = 'DISCARDED',   // User discarded
}

// ═══════════════════════════════════════════════════════════════
// METHODOLOGY DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface MethodologyStage {
  goal: string;
  elements: string[];
  copyTone: string;
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

export interface MethodologyDefinition {
  id: MarketingMethodology;
  name: string;
  tagline: string;
  description: string;
  philosophy: string;
  bestFor: string[];
  stages: Record<string, MethodologyStage>;
  discoveryQuestions: DiscoveryQuestion[];
  systemPrompt: string;
  toneGuidelines: string;
}

// ═══════════════════════════════════════════════════════════════
// PROMPT CONTEXT
// ═══════════════════════════════════════════════════════════════

export interface ProductContext {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  sku: string;
  attributes: Record<string, unknown>;
  isPrimary: boolean;
}

export interface CompanyContext {
  name: string;
  industry?: string;
  brandVoice?: string;
  targetAudience?: string;
}

export interface FunnelPromptContext {
  products: ProductContext[];
  methodology: MethodologyDefinition;
  discoveryAnswers: Record<string, string>;
  companyContext?: CompanyContext;
}

// ═══════════════════════════════════════════════════════════════
// GENERATED CONTENT
// ═══════════════════════════════════════════════════════════════

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

export interface BenefitSection {
  sectionTitle: string;
  benefits: BenefitItem[];
}

export interface SocialProofSection {
  sectionTitle: string;
  testimonialPrompts: string[];
  statsToHighlight: string[];
}

export interface CTASection {
  headline: string;
  subheadline?: string;
  buttonText: string;
  urgencyText?: string;
}

export interface LandingContent {
  hero: HeroSection;
  benefits: BenefitSection;
  socialProof: SocialProofSection;
  cta: CTASection;
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

export interface LeadCaptureContent {
  headline: string;
  description: string;
  leadMagnetTitle?: string;
  formFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'select';
    required: boolean;
  }>;
  buttonText: string;
  privacyText: string;
}

export interface CheckoutContent {
  trustBadgeTexts: string[];
  guaranteeText: string;
  urgencyText: string;
  orderSummaryTitle: string;
  orderConfirmationHeadline: string;
}

export interface SuccessPageContent {
  headline: string;
  message: string;
  nextSteps: string[];
  socialShareText: string;
  upsellTeaser?: string;
}

export interface GeneratedFunnelContent {
  landing: LandingContent;
  products: ProductContent[];
  emails: EmailContent[];
  leadCapture: LeadCaptureContent;
  checkout: CheckoutContent;
  success: SuccessPageContent;
}

// ═══════════════════════════════════════════════════════════════
// GENERATION TRACKING
// ═══════════════════════════════════════════════════════════════

export interface GenerationProgress {
  stage: 'landing' | 'products' | 'emails' | 'leadCapture' | 'checkout' | 'success';
  status: 'pending' | 'generating' | 'complete' | 'error';
  message?: string;
}

export interface GenerationMetrics {
  totalTokensUsed: number;
  generationTimeMs: number;
  stageTimings: Record<string, number>;
}

export interface AIFunnelGenerationResult {
  generationId: string;
  status: GenerationStatus;
  progress: GenerationProgress[];
  content?: GeneratedFunnelContent;
  metrics?: GenerationMetrics;
  error?: string;
}
