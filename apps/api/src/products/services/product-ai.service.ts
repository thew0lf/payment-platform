import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { BedrockService, BedrockCredentials } from '../../integrations/services/providers/bedrock.service';
import { LanguageToolService, LanguageToolCredentials, LanguageToolSettings } from '../../integrations/services/providers/languagetool.service';
import { IntegrationProvider } from '../../integrations/types/integration.types';
import {
  GenerateDescriptionDto,
  SuggestCategoryDto,
  GenerateAltTextDto,
  CheckGrammarDto,
  ImproveDescriptionDto,
  ApplyAIContentDto,
} from '../dto/product-ai.dto';

// Response types for AI operations
export interface GeneratedDescription {
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  suggestions?: string[];
}

export interface CategorySuggestion {
  category: string;
  subcategory?: string;
  tags: string[];
  confidence?: number;
}

export interface GrammarCheckResult {
  original: string;
  corrected: string;
  issues: Array<{
    message: string;
    offset: number;
    length: number;
    replacements: string[];
  }>;
  issueCount: number;
}

export interface ImprovedDescription {
  original: string;
  improved: string;
  changes: string[];
}

@Injectable()
export class ProductAIService {
  private readonly logger = new Logger(ProductAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly platformIntegrationService: PlatformIntegrationService,
    private readonly bedrockService: BedrockService,
    private readonly languageToolService: LanguageToolService,
  ) {}

  /**
   * Generate a product description using AI
   */
  async generateDescription(
    dto: GenerateDescriptionDto,
    user: UserContext,
  ): Promise<GeneratedDescription> {
    // Get organization ID from user context or resolve from company
    const organizationId = await this.getOrganizationId(user, dto.companyId);

    const credentials = await this.getBedrockCredentials(organizationId);

    const result = await this.bedrockService.generateProductDescription(
      credentials,
      {
        productName: dto.productName,
        category: dto.category,
        attributes: dto.attributes,
        tone: dto.tone || 'professional',
        length: dto.length || 'medium',
        targetAudience: dto.targetAudience,
        includeSEO: dto.includeSEO,
      },
    );

    this.logger.log(`Generated description for product: ${dto.productName}`);

    return {
      description: result.description,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription,
      suggestions: result.suggestedTags,
    };
  }

  /**
   * Suggest category and tags for a product
   */
  async suggestCategory(
    dto: SuggestCategoryDto,
    user: UserContext,
  ): Promise<CategorySuggestion> {
    const organizationId = await this.getOrganizationId(user, dto.companyId);
    const credentials = await this.getBedrockCredentials(organizationId);

    // Get existing categories and tags for context
    const companyId = dto.companyId || user.companyId;
    let existingCategories: string[] = [];
    let existingTags: string[] = [];

    if (companyId) {
      const categories = await this.prisma.category.findMany({
        where: { companyId },
        select: { name: true },
      });
      existingCategories = categories.map(c => c.name);

      const tags = await this.prisma.tag.findMany({
        where: { companyId },
        select: { name: true },
      });
      existingTags = tags.map(t => t.name);
    }

    const result = await this.bedrockService.suggestCategorization(
      credentials,
      dto.productName,
      dto.description || '',
      existingCategories,
      existingTags,
    );

    this.logger.log(`Suggested category for product: ${dto.productName}`);

    return {
      category: result.category,
      subcategory: result.subcategory,
      tags: result.tags,
    };
  }

  /**
   * Generate alt text for product images
   */
  async generateAltText(
    dto: GenerateAltTextDto,
    user: UserContext,
  ): Promise<string> {
    const organizationId = await this.getOrganizationId(user, dto.companyId);
    const credentials = await this.getBedrockCredentials(organizationId);

    const altText = await this.bedrockService.generateAltText(
      credentials,
      dto.productName,
      dto.imageDescription,
    );

    this.logger.log(`Generated alt text for product: ${dto.productName}`);

    return altText;
  }

  /**
   * Check grammar in text
   */
  async checkGrammar(
    dto: CheckGrammarDto,
    user: UserContext,
  ): Promise<GrammarCheckResult> {
    const organizationId = await this.getOrganizationIdFromUser(user);

    // LanguageTool may not require credentials (free tier available)
    let credentials: LanguageToolCredentials | undefined;
    try {
      credentials = await this.getLanguageToolCredentials(organizationId);
    } catch {
      // Use free tier if no credentials configured
      this.logger.debug('Using LanguageTool free tier');
    }

    const settings: LanguageToolSettings = {
      defaultLanguage: dto.language || 'en-US',
    };

    const result = await this.languageToolService.checkAndCorrect(
      dto.text,
      credentials,
      settings,
    );

    return {
      original: result.original,
      corrected: result.corrected,
      issues: result.issues.map(issue => ({
        message: issue.message,
        offset: issue.offset,
        length: issue.length,
        replacements: issue.replacements,
      })),
      issueCount: result.issueCount,
    };
  }

  /**
   * Improve an existing product description
   */
  async improveDescription(
    dto: ImproveDescriptionDto,
    user: UserContext,
  ): Promise<ImprovedDescription> {
    const organizationId = await this.getOrganizationId(user, dto.companyId);
    const credentials = await this.getBedrockCredentials(organizationId);

    // Build improvement prompt
    const focusAreasText = dto.focusAreas?.length
      ? `Focus on these areas: ${dto.focusAreas.join(', ')}.`
      : '';
    const toneText = dto.tone ? `Use a ${dto.tone} tone.` : '';

    const result = await this.bedrockService.generateContent(
      credentials,
      {
        prompt: `Improve this product description while maintaining its core message. ${toneText} ${focusAreasText}

Original description:
${dto.description}

Provide the improved description and list the key changes made.`,
        maxTokens: 1000,
        temperature: 0.7,
      },
    );

    // Parse the response to extract improved text and changes
    const content = result.content;
    const improved = this.extractImprovedDescription(content, dto.description);

    this.logger.log('Improved product description');

    return {
      original: dto.description,
      improved: improved.text,
      changes: improved.changes,
    };
  }

  /**
   * Apply AI-generated content to a product
   */
  async applyAIContent(
    productId: string,
    dto: ApplyAIContentDto,
    user: UserContext,
  ): Promise<void> {
    // Get product and validate access
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate user has access to this company
    const hasAccess = await this.hierarchyService.canAccessCompany(user, product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this product');
    }

    // Build update data
    const updateData: Record<string, string> = {};
    if (dto.description) {
      updateData.description = dto.description;
    }
    if (dto.metaTitle) {
      updateData.metaTitle = dto.metaTitle;
    }
    if (dto.metaDescription) {
      updateData.metaDescription = dto.metaDescription;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No content to apply');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    this.logger.log(`Applied AI content to product ${productId}`);
  }

  /**
   * Get organization ID from user context or resolve from company
   */
  private async getOrganizationId(user: UserContext, companyId?: string): Promise<string> {
    // First check if user context has organizationId
    if (user.organizationId) {
      return user.organizationId;
    }

    // Resolve from companyId if provided
    const resolveCompanyId = companyId || user.companyId;
    if (resolveCompanyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: resolveCompanyId },
        select: {
          client: {
            select: { organizationId: true },
          },
        },
      });

      if (company?.client?.organizationId) {
        return company.client.organizationId;
      }
    }

    // Resolve from clientId
    if (user.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: user.clientId },
        select: { organizationId: true },
      });

      if (client?.organizationId) {
        return client.organizationId;
      }
    }

    throw new BadRequestException('Could not determine organization for integration lookup');
  }

  /**
   * Get organization ID from user context only (for operations that don't have companyId)
   */
  private async getOrganizationIdFromUser(user: UserContext): Promise<string> {
    return this.getOrganizationId(user, undefined);
  }

  /**
   * Get Bedrock credentials from platform integration
   */
  private async getBedrockCredentials(organizationId: string): Promise<BedrockCredentials> {
    const integration = await this.platformIntegrationService.getByProvider(
      organizationId,
      IntegrationProvider.AWS_BEDROCK,
    );

    if (!integration) {
      throw new BadRequestException(
        'AWS Bedrock integration not configured. Please set up AWS Bedrock integration first.'
      );
    }

    const credentials = await this.platformIntegrationService.getDecryptedCredentials(integration.id);

    return {
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      modelId: credentials.modelId,
    };
  }

  /**
   * Get LanguageTool credentials from platform integration
   */
  private async getLanguageToolCredentials(organizationId: string): Promise<LanguageToolCredentials> {
    const integration = await this.platformIntegrationService.getByProvider(
      organizationId,
      IntegrationProvider.LANGUAGETOOL,
    );

    if (!integration) {
      throw new BadRequestException(
        'LanguageTool integration not configured. Using free tier with limitations.'
      );
    }

    const credentials = await this.platformIntegrationService.getDecryptedCredentials(integration.id);

    return {
      apiKey: credentials.apiKey,
      username: credentials.username,
      baseUrl: credentials.baseUrl,
    };
  }

  /**
   * Extract improved description and changes from AI response
   */
  private extractImprovedDescription(
    content: string,
    original: string,
  ): { text: string; changes: string[] } {
    // Try to parse structured response
    const lines = content.split('\n').filter(l => l.trim());
    const changes: string[] = [];
    let improvedText = '';

    let inChanges = false;
    let inDescription = true;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('changes:') || lowerLine.includes('key changes:') || lowerLine.includes('improvements:')) {
        inChanges = true;
        inDescription = false;
        continue;
      }

      if (inChanges && line.trim().startsWith('-')) {
        changes.push(line.trim().substring(1).trim());
      } else if (inDescription && !lowerLine.startsWith('improved')) {
        improvedText += (improvedText ? '\n' : '') + line;
      }
    }

    // Fallback: if no structured changes found, return whole content as improved text
    if (!improvedText.trim()) {
      improvedText = content;
    }

    // If no changes detected, provide generic feedback
    if (changes.length === 0) {
      changes.push('Enhanced clarity and readability');
      changes.push('Optimized for product presentation');
    }

    return {
      text: improvedText.trim(),
      changes,
    };
  }
}
