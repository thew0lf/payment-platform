import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BedrockService, BedrockCredentials } from '../../integrations/services/providers/bedrock.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { EncryptedCredentials } from '../../integrations/types/integration.types';
import { PromptBuilderService } from './prompt-builder.service';
import { METHODOLOGIES, getMethodology, isMethodologyAvailable } from '../methodologies';
import {
  MarketingMethodology,
  GenerationStatus,
  FunnelPromptContext,
  ProductContext,
  CompanyContext,
  GeneratedFunnelContent,
  LandingContent,
  ProductContent,
  EmailContent,
  LeadCaptureContent,
  CheckoutContent,
  SuccessPageContent,
  AIFunnelGenerationResult,
  GenerationProgress,
  MethodologyDefinition,
} from '../types/funnel-generator.types';

export interface GenerateFunnelRequest {
  companyId: string;
  productIds: string[];
  primaryProductId?: string;
  methodology: MarketingMethodology;
  discoveryAnswers: Record<string, string>;
  userId: string;
}

@Injectable()
export class FunnelGeneratorService {
  private readonly logger = new Logger(FunnelGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bedrockService: BedrockService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  /**
   * Get all available methodologies for the wizard
   */
  getMethodologies(): MethodologyDefinition[] {
    return Object.values(METHODOLOGIES).filter(m => isMethodologyAvailable(m.id));
  }

  /**
   * Get a specific methodology with questions
   */
  getMethodologyQuestions(methodologyId: MarketingMethodology) {
    const methodology = getMethodology(methodologyId);
    if (!methodology || !isMethodologyAvailable(methodologyId)) {
      throw new NotFoundException(`Methodology ${methodologyId} not found or not available`);
    }

    return {
      methodology: {
        id: methodology.id,
        name: methodology.name,
        tagline: methodology.tagline,
        description: methodology.description,
      },
      questions: methodology.discoveryQuestions,
    };
  }

  /**
   * Start funnel generation process
   */
  async startGeneration(request: GenerateFunnelRequest): Promise<{ generationId: string }> {
    const { companyId, productIds, primaryProductId, methodology, discoveryAnswers, userId } = request;

    // Validate methodology
    if (!isMethodologyAvailable(methodology)) {
      throw new BadRequestException(`Methodology ${methodology} is not available`);
    }

    // Validate products
    if (productIds.length === 0) {
      throw new BadRequestException('At least one product is required');
    }

    // Create generation record
    const generation = await this.prisma.aIFunnelGeneration.create({
      data: {
        companyId,
        methodology,
        productIds,
        discoveryAnswers,
        aiProvider: 'bedrock',
        aiModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        status: 'PENDING',
        generatedContent: {},
        createdBy: userId,
      },
    });

    // Start async generation (don't await)
    this.runGeneration(generation.id, primaryProductId).catch(error => {
      this.logger.error(`Generation ${generation.id} failed: ${error.message}`);
    });

    return { generationId: generation.id };
  }

  /**
   * Get generation status and content
   */
  async getGeneration(generationId: string, companyId: string): Promise<AIFunnelGenerationResult> {
    const generation = await this.prisma.aIFunnelGeneration.findFirst({
      where: { id: generationId, companyId },
    });

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    const progress: GenerationProgress[] = this.extractProgress(generation.generatedContent as any);

    return {
      generationId: generation.id,
      status: generation.status as GenerationStatus,
      progress,
      content: generation.status === 'COMPLETED' ? (generation.generatedContent as unknown as GeneratedFunnelContent) : undefined,
      metrics: generation.tokensUsed
        ? {
            totalTokensUsed: generation.tokensUsed,
            generationTimeMs: generation.generationTimeMs || 0,
            stageTimings: {},
          }
        : undefined,
      error: generation.errorMessage || undefined,
    };
  }

  /**
   * Save generation as a funnel
   */
  async saveAsFunnel(
    generationId: string,
    companyId: string,
    funnelName: string,
    userId: string,
    content?: Partial<GeneratedFunnelContent>,
  ): Promise<{ funnelId: string }> {
    const generation = await this.prisma.aIFunnelGeneration.findFirst({
      where: { id: generationId, companyId, status: 'COMPLETED' },
    });

    if (!generation) {
      throw new NotFoundException('Completed generation not found');
    }

    // Merge edited content with generated content
    const finalContent = content
      ? { ...(generation.generatedContent as object), ...content }
      : generation.generatedContent;

    // Create the funnel with stages based on generated content
    const funnel = await this.prisma.funnel.create({
      data: {
        company: { connect: { id: companyId } },
        name: funnelName,
        slug: this.generateSlug(funnelName),
        shortId: this.generateShortId(),
        type: 'FULL_FUNNEL',
        status: 'DRAFT',
        createdBy: userId,
        settings: this.buildDefaultSettings(),
        stages: {
          create: this.buildFunnelStages(finalContent as unknown as GeneratedFunnelContent),
        },
      },
    });

    // Update generation record
    await this.prisma.aIFunnelGeneration.update({
      where: { id: generationId },
      data: {
        status: 'SAVED',
        funnelId: funnel.id,
        savedAt: new Date(),
      },
    });

    return { funnelId: funnel.id };
  }

  /**
   * Discard a generation
   */
  async discardGeneration(generationId: string, companyId: string): Promise<void> {
    const generation = await this.prisma.aIFunnelGeneration.findFirst({
      where: { id: generationId, companyId },
    });

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    await this.prisma.aIFunnelGeneration.update({
      where: { id: generationId },
      data: { status: 'DISCARDED' },
    });
  }

  /**
   * Regenerate a specific section
   */
  async regenerateSection(
    generationId: string,
    companyId: string,
    section: 'landing' | 'products' | 'emails' | 'leadCapture' | 'checkout' | 'success',
  ): Promise<any> {
    const generation = await this.prisma.aIFunnelGeneration.findFirst({
      where: { id: generationId, companyId, status: 'COMPLETED' },
      include: { company: true },
    });

    if (!generation) {
      throw new NotFoundException('Completed generation not found');
    }

    const credentials = await this.getBedrockCredentials();
    const context = await this.buildPromptContext(generation);
    const methodology = getMethodology(generation.methodology as MarketingMethodology)!;

    let newContent: any;

    switch (section) {
      case 'landing':
        newContent = await this.generateLandingContent(credentials, context, methodology);
        break;
      case 'emails':
        newContent = await this.generateEmailContent(credentials, context, methodology);
        break;
      case 'checkout':
        newContent = await this.generateCheckoutContent(credentials, context, methodology);
        break;
      case 'leadCapture':
        newContent = await this.generateLeadCaptureContent(credentials, context, methodology);
        break;
      case 'success':
        newContent = await this.generateSuccessContent(credentials, context, methodology);
        break;
      default:
        throw new BadRequestException(`Invalid section: ${section}`);
    }

    // Update the generation with new content for this section
    const currentContent = generation.generatedContent as any;
    currentContent[section] = newContent;

    await this.prisma.aIFunnelGeneration.update({
      where: { id: generationId },
      data: {
        generatedContent: currentContent,
        editCount: { increment: 1 },
      },
    });

    return newContent;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Run the full generation process
   */
  private async runGeneration(generationId: string, primaryProductId?: string): Promise<void> {
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      // Update status to generating
      await this.prisma.aIFunnelGeneration.update({
        where: { id: generationId },
        data: { status: 'GENERATING' },
      });

      const generation = await this.prisma.aIFunnelGeneration.findUnique({
        where: { id: generationId },
        include: { company: true },
      });

      if (!generation) {
        throw new Error('Generation not found');
      }

      const credentials = await this.getBedrockCredentials();
      const methodology = getMethodology(generation.methodology as MarketingMethodology)!;
      const context = await this.buildPromptContext(generation, primaryProductId);

      const generatedContent: Partial<GeneratedFunnelContent> = {};

      // Generate landing page
      this.logger.log(`[${generationId}] Generating landing page...`);
      generatedContent.landing = await this.generateLandingContent(credentials, context, methodology);

      // Generate product content
      this.logger.log(`[${generationId}] Generating product content...`);
      generatedContent.products = await this.generateProductContent(credentials, context, methodology);

      // Generate email sequence
      this.logger.log(`[${generationId}] Generating email sequence...`);
      generatedContent.emails = await this.generateEmailContent(credentials, context, methodology);

      // Generate lead capture
      this.logger.log(`[${generationId}] Generating lead capture...`);
      generatedContent.leadCapture = await this.generateLeadCaptureContent(credentials, context, methodology);

      // Generate checkout content
      this.logger.log(`[${generationId}] Generating checkout content...`);
      generatedContent.checkout = await this.generateCheckoutContent(credentials, context, methodology);

      // Generate success page
      this.logger.log(`[${generationId}] Generating success page...`);
      generatedContent.success = await this.generateSuccessContent(credentials, context, methodology);

      // Update with completed content
      await this.prisma.aIFunnelGeneration.update({
        where: { id: generationId },
        data: {
          status: 'COMPLETED',
          generatedContent: generatedContent as any,
          completedAt: new Date(),
          generationTimeMs: Date.now() - startTime,
          tokensUsed: totalTokens,
        },
      });

      this.logger.log(`[${generationId}] Generation completed in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      this.logger.error(`[${generationId}] Generation failed: ${error.message}`);

      await this.prisma.aIFunnelGeneration.update({
        where: { id: generationId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * Build prompt context from generation record
   */
  private async buildPromptContext(
    generation: any,
    primaryProductId?: string,
  ): Promise<FunnelPromptContext> {
    // Fetch products
    const products = await this.prisma.product.findMany({
      where: { id: { in: generation.productIds } },
    });

    const productContexts: ProductContext[] = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      shortDescription: undefined, // Product model doesn't have this field
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
      currency: p.currency,
      sku: p.sku,
      attributes: (p.attributes as Record<string, unknown>) || {},
      isPrimary: p.id === (primaryProductId || generation.productIds[0]),
    }));

    const methodology = getMethodology(generation.methodology as MarketingMethodology)!;

    const companyContext: CompanyContext | undefined = generation.company
      ? {
          name: generation.company.name,
          industry: generation.company.industry || undefined,
          brandVoice: undefined,
        }
      : undefined;

    return {
      products: productContexts,
      methodology,
      discoveryAnswers: generation.discoveryAnswers as Record<string, string>,
      companyContext,
    };
  }

  /**
   * Generate landing page content
   */
  private async generateLandingContent(
    credentials: BedrockCredentials,
    context: FunnelPromptContext,
    methodology: MethodologyDefinition,
  ): Promise<LandingContent> {
    const prompt = this.promptBuilder.buildLandingPagePrompt(context);
    const response = await this.bedrockService.generateContent(credentials, {
      prompt,
      systemPrompt: this.promptBuilder.buildSystemPrompt(methodology),
      maxTokens: 2000,
      temperature: 0.7,
    });

    return this.promptBuilder.parseAIResponse<LandingContent>(response.content);
  }

  /**
   * Generate product content
   */
  private async generateProductContent(
    credentials: BedrockCredentials,
    context: FunnelPromptContext,
    methodology: MethodologyDefinition,
  ): Promise<ProductContent[]> {
    const results: ProductContent[] = [];

    for (const product of context.products) {
      const prompt = this.promptBuilder.buildProductPrompt(context, product);
      const response = await this.bedrockService.generateContent(credentials, {
        prompt,
        systemPrompt: this.promptBuilder.buildSystemPrompt(methodology),
        maxTokens: 1000,
        temperature: 0.7,
      });

      results.push(this.promptBuilder.parseAIResponse<ProductContent>(response.content));
    }

    return results;
  }

  /**
   * Generate email sequence content
   */
  private async generateEmailContent(
    credentials: BedrockCredentials,
    context: FunnelPromptContext,
    methodology: MethodologyDefinition,
  ): Promise<EmailContent[]> {
    const prompt = this.promptBuilder.buildEmailSequencePrompt(context);
    const response = await this.bedrockService.generateContent(credentials, {
      prompt,
      systemPrompt: this.promptBuilder.buildSystemPrompt(methodology),
      maxTokens: 3000,
      temperature: 0.7,
    });

    const parsed = this.promptBuilder.parseAIResponse<{ emails: EmailContent[] }>(response.content);
    return parsed.emails;
  }

  /**
   * Generate lead capture content
   */
  private async generateLeadCaptureContent(
    credentials: BedrockCredentials,
    context: FunnelPromptContext,
    methodology: MethodologyDefinition,
  ): Promise<LeadCaptureContent> {
    const prompt = this.promptBuilder.buildLeadCapturePrompt(context);
    const response = await this.bedrockService.generateContent(credentials, {
      prompt,
      systemPrompt: this.promptBuilder.buildSystemPrompt(methodology),
      maxTokens: 500,
      temperature: 0.7,
    });

    return this.promptBuilder.parseAIResponse<LeadCaptureContent>(response.content);
  }

  /**
   * Generate checkout content
   */
  private async generateCheckoutContent(
    credentials: BedrockCredentials,
    context: FunnelPromptContext,
    methodology: MethodologyDefinition,
  ): Promise<CheckoutContent> {
    const prompt = this.promptBuilder.buildCheckoutPrompt(context);
    const response = await this.bedrockService.generateContent(credentials, {
      prompt,
      systemPrompt: this.promptBuilder.buildSystemPrompt(methodology),
      maxTokens: 500,
      temperature: 0.7,
    });

    return this.promptBuilder.parseAIResponse<CheckoutContent>(response.content);
  }

  /**
   * Generate success page content
   */
  private async generateSuccessContent(
    credentials: BedrockCredentials,
    context: FunnelPromptContext,
    methodology: MethodologyDefinition,
  ): Promise<SuccessPageContent> {
    const prompt = this.promptBuilder.buildSuccessPagePrompt(context);
    const response = await this.bedrockService.generateContent(credentials, {
      prompt,
      systemPrompt: this.promptBuilder.buildSystemPrompt(methodology),
      maxTokens: 500,
      temperature: 0.7,
    });

    return this.promptBuilder.parseAIResponse<SuccessPageContent>(response.content);
  }

  /**
   * Get Bedrock credentials from platform integration
   */
  private async getBedrockCredentials(): Promise<BedrockCredentials> {
    // Get the platform Bedrock integration
    const integration = await this.prisma.platformIntegration.findFirst({
      where: {
        provider: 'AWS_BEDROCK',
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      throw new Error('AWS Bedrock integration not configured');
    }

    // Decrypt the stored credentials
    const decrypted = this.encryptionService.decrypt(
      integration.credentials as unknown as EncryptedCredentials
    );
    const credentials = decrypted as Record<string, unknown>;

    return {
      region: (credentials.region as string) || 'us-east-1',
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      modelId: (credentials.modelId as string) || 'anthropic.claude-3-sonnet-20240229-v1:0',
    };
  }

  /**
   * Extract progress from generation content
   */
  private extractProgress(content: any): GenerationProgress[] {
    const stages: GenerationProgress[] = [
      { stage: 'landing', status: content?.landing ? 'complete' : 'pending' },
      { stage: 'products', status: content?.products ? 'complete' : 'pending' },
      { stage: 'emails', status: content?.emails ? 'complete' : 'pending' },
      { stage: 'leadCapture', status: content?.leadCapture ? 'complete' : 'pending' },
      { stage: 'checkout', status: content?.checkout ? 'complete' : 'pending' },
      { stage: 'success', status: content?.success ? 'complete' : 'pending' },
    ];

    return stages;
  }

  /**
   * Generate URL-safe slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate a short ID for public funnel URLs
   */
  private generateShortId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Build default funnel settings
   */
  private buildDefaultSettings(): any {
    return {
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
      },
      urls: {},
      behavior: {
        allowBackNavigation: true,
        showProgressBar: true,
        autoSaveProgress: true,
        sessionTimeout: 3600,
        abandonmentEmail: true,
      },
      seo: {},
    };
  }

  /**
   * Build funnel stages from generated content
   */
  private buildFunnelStages(content: GeneratedFunnelContent): any[] {
    return [
      {
        name: 'Landing',
        type: 'LANDING',
        order: 0,
        config: {
          layout: 'hero-cta',
          sections: [
            { id: 'hero', type: 'hero', config: content.landing?.hero || {} },
            { id: 'benefits', type: 'features', config: content.landing?.benefits || {} },
            { id: 'social', type: 'testimonials', config: content.landing?.socialProof || {} },
            { id: 'faq', type: 'faq', config: { items: content.landing?.faqItems || [] } },
            { id: 'cta', type: 'cta', config: content.landing?.cta || {} },
          ],
          cta: {
            text: content.landing?.hero?.ctaText || 'Get Started',
            style: 'solid',
          },
        },
      },
      {
        name: 'Product Selection',
        type: 'PRODUCT_SELECTION',
        order: 1,
        config: {
          layout: 'grid',
          source: { type: 'manual' },
          display: {
            showPrices: true,
            showDescription: true,
            showVariants: true,
            showQuantity: false,
            showFilters: false,
            showSearch: false,
            itemsPerPage: 12,
          },
          selection: { mode: 'single', allowQuantity: false },
          cta: { text: 'Continue', position: 'fixed-bottom' },
        },
      },
      {
        name: 'Checkout',
        type: 'CHECKOUT',
        order: 2,
        config: {
          layout: 'two-column',
          fields: {
            customer: {
              email: { enabled: true, required: true },
              firstName: { enabled: true, required: true },
              lastName: { enabled: true, required: true },
              phone: { enabled: true, required: false },
            },
            shipping: { enabled: true, required: true },
            billing: { enabled: true, sameAsShipping: true },
          },
          payment: {
            methods: [{ type: 'card', enabled: true }],
            showOrderSummary: true,
            allowCoupons: false,
          },
          trust: {
            showSecurityBadges: true,
            showGuarantee: true,
            guaranteeText: content.checkout?.guaranteeText,
          },
        },
      },
    ];
  }
}
