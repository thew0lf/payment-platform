import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIFeature, AIUsageStatus, SectionType } from '@prisma/client';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { BedrockService, BedrockCredentials } from '../../integrations/services/providers/bedrock.service';
import { AIUsageService } from './ai-usage.service';
import { SectionContent } from '../types/landing-page.types';
import { EncryptedCredentials, IntegrationStatus } from '../../integrations/types/integration.types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

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
    content: Partial<SectionContent>;
  }[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

export interface RewriteSectionRequest {
  sectionType: SectionType;
  currentContent: Partial<SectionContent>;
  instruction: string; // "Make it more concise", "Add urgency", etc.
  tone?: string;
}

export interface GenerateABVariantsRequest {
  originalText: string;
  elementType: 'headline' | 'subheadline' | 'cta' | 'description';
  variantCount?: number; // 2-4
  focusAreas?: ('urgency' | 'benefits' | 'emotion' | 'social_proof')[];
}

export interface GenerateSectionRequest {
  sectionType: SectionType;
  businessContext: {
    name: string;
    industry: string;
    description?: string;
  };
  specificInstructions?: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class AIContentService {
  private readonly logger = new Logger(AIContentService.name);
  private readonly DEFAULT_MODEL = 'anthropic.claude-3-sonnet-20240229-v1:0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly bedrockService: BedrockService,
    private readonly aiUsageService: AIUsageService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // MAIN API METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate complete landing page content from a business brief
   */
  async generatePageFromBrief(
    companyId: string,
    userId: string,
    request: GeneratePageBriefRequest,
    landingPageId?: string,
  ): Promise<GeneratedPageContent> {
    const credentials = await this.getBedrockCredentials(companyId);

    const systemPrompt = `You are an expert landing page copywriter specializing in high-conversion content.
Your copy is clear, compelling, and drives action. You understand persuasion principles and write
benefit-focused content that resonates with target audiences.

Guidelines:
- Write in ${request.tone || 'professional'} tone
- Focus on benefits over features
- Use power words that drive action
- Keep headlines punchy (under 10 words)
- Subheadlines expand on the value proposition
- CTAs are action-oriented and specific`;

    const prompt = `Create landing page content for a ${request.industry} business.

Business Details:
- Name: ${request.businessName}
- Target Audience: ${request.targetAudience}
- Main Goal: ${request.mainGoal}
${request.keyBenefits?.length ? `- Key Benefits: ${request.keyBenefits.join(', ')}` : ''}
${request.additionalContext ? `- Additional Context: ${request.additionalContext}` : ''}

Generate complete landing page content with:
1. A compelling hero section (headline, subheadline, CTA)
2. 3 key features/benefits
3. Social proof elements (testimonials format)
4. A strong closing CTA

Respond with valid JSON only (no markdown code blocks):
{
  "headline": "Main headline text",
  "subheadline": "Supporting subheadline text",
  "ctaText": "Call to action button text",
  "sections": [
    {
      "type": "FEATURES_GRID",
      "name": "Features",
      "content": {
        "headline": "Section headline",
        "subheadline": "Section subheadline",
        "items": [
          { "icon": "emoji", "title": "Feature title", "description": "Feature description" }
        ]
      }
    }
  ],
  "seo": {
    "metaTitle": "SEO title under 60 chars",
    "metaDescription": "SEO description under 160 chars",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}`;

    try {
      const response = await this.bedrockService.generateContent(credentials, {
        prompt,
        systemPrompt,
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Track usage
      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.LANDING_PAGE_CONTENT,
        operation: 'generate_page_from_brief',
        modelId: this.DEFAULT_MODEL,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        landingPageId,
        metadata: {
          industry: request.industry,
          goal: request.mainGoal,
          tone: request.tone,
        },
      });

      // Parse response
      const content = this.parseJsonResponse<GeneratedPageContent>(response.content);
      return content;
    } catch (error: any) {
      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.LANDING_PAGE_CONTENT,
        operation: 'generate_page_from_brief',
        modelId: this.DEFAULT_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        landingPageId,
        status: AIUsageStatus.FAILED,
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * Rewrite/improve a section's content based on instructions
   */
  async rewriteSection(
    companyId: string,
    userId: string,
    request: RewriteSectionRequest,
    landingPageId?: string,
  ): Promise<Partial<SectionContent>> {
    const credentials = await this.getBedrockCredentials(companyId);

    const systemPrompt = `You are an expert copywriter improving landing page content.
Keep the structure intact but improve the copy based on the instruction.
Maintain the same JSON structure in your response.`;

    const prompt = `Improve this ${request.sectionType} section content.

Current content:
${JSON.stringify(request.currentContent, null, 2)}

Instruction: ${request.instruction}
${request.tone ? `Tone: ${request.tone}` : ''}

Respond with the improved content as valid JSON only (same structure as input, no markdown):`;

    try {
      const response = await this.bedrockService.generateContent(credentials, {
        prompt,
        systemPrompt,
        maxTokens: 1500,
        temperature: 0.6,
      });

      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.LANDING_PAGE_CONTENT,
        operation: 'rewrite_section',
        modelId: this.DEFAULT_MODEL,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        landingPageId,
        metadata: {
          sectionType: request.sectionType,
          instruction: request.instruction,
        },
      });

      return this.parseJsonResponse<Partial<SectionContent>>(response.content);
    } catch (error: any) {
      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.LANDING_PAGE_CONTENT,
        operation: 'rewrite_section',
        modelId: this.DEFAULT_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        landingPageId,
        status: AIUsageStatus.FAILED,
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate A/B test copy variants
   */
  async generateABVariants(
    companyId: string,
    userId: string,
    request: GenerateABVariantsRequest,
    landingPageId?: string,
  ): Promise<string[]> {
    const credentials = await this.getBedrockCredentials(companyId);

    const variantCount = Math.min(Math.max(request.variantCount || 3, 2), 4);
    const focusAreas = request.focusAreas?.length
      ? request.focusAreas
      : ['benefits', 'urgency'];

    const systemPrompt = `You are an A/B testing expert creating copy variants for conversion optimization.
Each variant should be distinct but stay true to the core message.
Focus on different psychological triggers for each variant.`;

    const prompt = `Create ${variantCount} A/B test variants for this ${request.elementType}.

Original: "${request.originalText}"

Focus areas: ${focusAreas.join(', ')}

Guidelines by element type:
- headline: Under 10 words, punchy, attention-grabbing
- subheadline: Under 25 words, expand on value proposition
- cta: Under 5 words, action-oriented, specific
- description: 1-3 sentences, benefit-focused

Respond with valid JSON only (no markdown):
{
  "variants": ["Variant 1 text", "Variant 2 text", "Variant 3 text"]
}`;

    try {
      const response = await this.bedrockService.generateContent(credentials, {
        prompt,
        systemPrompt,
        maxTokens: 500,
        temperature: 0.8, // Higher temperature for creative variants
      });

      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.AB_TEST_VARIANTS,
        operation: 'generate_variants',
        modelId: this.DEFAULT_MODEL,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        landingPageId,
        metadata: {
          elementType: request.elementType,
          variantCount,
          focusAreas,
        },
      });

      const parsed = this.parseJsonResponse<{ variants: string[] }>(response.content);
      return parsed.variants;
    } catch (error: any) {
      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.AB_TEST_VARIANTS,
        operation: 'generate_variants',
        modelId: this.DEFAULT_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        landingPageId,
        status: AIUsageStatus.FAILED,
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate content for a specific section type
   */
  async generateSection(
    companyId: string,
    userId: string,
    request: GenerateSectionRequest,
    landingPageId?: string,
  ): Promise<Partial<SectionContent>> {
    const credentials = await this.getBedrockCredentials(companyId);

    const sectionPrompts = this.getSectionPrompt(request.sectionType);

    const systemPrompt = `You are an expert landing page copywriter.
Generate compelling content for the specified section type.
Focus on conversion and clarity.`;

    const prompt = `Generate content for a ${request.sectionType} section.

Business:
- Name: ${request.businessContext.name}
- Industry: ${request.businessContext.industry}
${request.businessContext.description ? `- Description: ${request.businessContext.description}` : ''}

${request.specificInstructions ? `Instructions: ${request.specificInstructions}` : ''}

${sectionPrompts.structure}

Respond with valid JSON only (no markdown):`;

    try {
      const response = await this.bedrockService.generateContent(credentials, {
        prompt,
        systemPrompt,
        maxTokens: 1200,
        temperature: 0.7,
      });

      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.LANDING_PAGE_SECTION,
        operation: `generate_${request.sectionType.toLowerCase()}`,
        modelId: this.DEFAULT_MODEL,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        landingPageId,
        metadata: {
          sectionType: request.sectionType,
          industry: request.businessContext.industry,
        },
      });

      return this.parseJsonResponse<Partial<SectionContent>>(response.content);
    } catch (error: any) {
      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.LANDING_PAGE_SECTION,
        operation: `generate_${request.sectionType.toLowerCase()}`,
        modelId: this.DEFAULT_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        landingPageId,
        status: AIUsageStatus.FAILED,
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate SEO metadata for a landing page
   */
  async generateSEO(
    companyId: string,
    userId: string,
    pageContent: { headline: string; subheadline?: string; businessName: string },
    landingPageId?: string,
  ): Promise<{ metaTitle: string; metaDescription: string; keywords: string[] }> {
    const credentials = await this.getBedrockCredentials(companyId);

    const prompt = `Generate SEO metadata for this landing page.

Business: ${pageContent.businessName}
Headline: ${pageContent.headline}
${pageContent.subheadline ? `Subheadline: ${pageContent.subheadline}` : ''}

Requirements:
- metaTitle: Under 60 characters, include brand name
- metaDescription: Under 160 characters, compelling and action-oriented
- keywords: 5-8 relevant keywords

Respond with valid JSON only (no markdown):
{
  "metaTitle": "Title here",
  "metaDescription": "Description here",
  "keywords": ["keyword1", "keyword2"]
}`;

    try {
      const response = await this.bedrockService.generateContent(credentials, {
        prompt,
        maxTokens: 300,
        temperature: 0.5,
      });

      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.SEO_OPTIMIZATION,
        operation: 'generate_seo',
        modelId: this.DEFAULT_MODEL,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        landingPageId,
      });

      return this.parseJsonResponse<{
        metaTitle: string;
        metaDescription: string;
        keywords: string[];
      }>(response.content);
    } catch (error: any) {
      await this.aiUsageService.trackUsage({
        companyId,
        userId,
        feature: AIFeature.SEO_OPTIMIZATION,
        operation: 'generate_seo',
        modelId: this.DEFAULT_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        landingPageId,
        status: AIUsageStatus.FAILED,
        errorMsg: error.message,
      });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private async getBedrockCredentials(companyId: string): Promise<BedrockCredentials> {
    // Get the company to find its client
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    // Get Bedrock integration for the client
    const integration = await this.prisma.clientIntegration.findFirst({
      where: {
        clientId: company.clientId,
        provider: 'AWS_BEDROCK',
        status: IntegrationStatus.ACTIVE,
      },
    });

    if (!integration) {
      throw new BadRequestException(
        'AWS Bedrock integration not configured. Please set up Bedrock in Integrations.'
      );
    }

    // Decrypt the credentials
    const decrypted = this.encryptionService.decrypt(
      integration.credentials as unknown as EncryptedCredentials
    );
    const credentials = decrypted as Record<string, unknown>;

    return {
      region: (credentials.region as string) || 'us-east-1',
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      modelId: (credentials.modelId as string) || this.DEFAULT_MODEL,
    };
  }

  private parseJsonResponse<T>(content: string): T {
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      return JSON.parse(cleanContent);
    } catch (error) {
      this.logger.error('Failed to parse AI response as JSON', { content });
      throw new BadRequestException('Failed to parse AI response. Please try again.');
    }
  }

  private getSectionPrompt(sectionType: SectionType): { structure: string } {
    const prompts: Record<string, { structure: string }> = {
      FEATURES_GRID: {
        structure: `Generate 3-4 features with:
{
  "headline": "Section headline",
  "subheadline": "Supporting text",
  "items": [
    { "icon": "appropriate emoji", "title": "Feature name", "description": "1-2 sentence description" }
  ]
}`,
      },
      TESTIMONIALS_CARDS: {
        structure: `Generate 2-3 testimonials with:
{
  "headline": "Section headline",
  "items": [
    { "quote": "Customer testimonial", "author": "Full Name", "role": "Job Title", "company": "Company Name", "rating": 5 }
  ]
}`,
      },
      FAQ_ACCORDION: {
        structure: `Generate 4-5 FAQs with:
{
  "headline": "Section headline",
  "items": [
    { "question": "Common question?", "answer": "Helpful answer" }
  ]
}`,
      },
      PRICING_TABLE: {
        structure: `Generate 3 pricing tiers with:
{
  "headline": "Section headline",
  "subheadline": "Supporting text",
  "tiers": [
    { "name": "Tier name", "price": "$X", "period": "month", "description": "Who it's for", "features": ["Feature 1", "Feature 2"], "ctaText": "CTA button", "highlighted": false }
  ]
}`,
      },
      CTA_BANNER: {
        structure: `Generate a call-to-action section with:
{
  "headline": "Compelling headline",
  "subheadline": "Supporting text that drives action",
  "ctaText": "Button text"
}`,
      },
      STATS_COUNTER: {
        structure: `Generate 3-4 impressive statistics with:
{
  "headline": "Section headline",
  "items": [
    { "value": "10K", "suffix": "+", "label": "What this represents" }
  ]
}`,
      },
    };

    return prompts[sectionType] || {
      structure: `Generate appropriate content for this section type in JSON format.`,
    };
  }
}
