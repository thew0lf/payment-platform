import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { ContentGenerationService } from './content-generation.service';
import {
  ContentType,
  ContentPurpose,
  ContentStatus,
  GeneratedContent,
  ContentTemplate,
  GenerateContentDto,
  RenderTemplateDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  ImproveContentDto,
  AnalyzeContentDto,
  GetTemplatesDto,
  GetGeneratedContentDto,
  ContentAnalytics,
  ContentAnalyticsDto,
} from '../types/content.types';

@Controller('momentum/content')
@UseGuards(JwtAuthGuard)
export class ContentGenerationController {
  constructor(
    private readonly contentService: ContentGenerationService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async getCompanyId(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    // COMPANY scoped users use their own company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // Use companyId from user context if available
    if (user.companyId) {
      return user.companyId;
    }

    // CLIENT/ORG users need to specify or have access
    if (queryCompanyId) {
      const canAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!canAccess) {
        throw new ForbiddenException(
          "Hmm, you don't have access to that company. Double-check your permissions or try a different one.",
        );
      }
      return queryCompanyId;
    }

    throw new BadRequestException(
      'Company ID is required. Please select a company or provide companyId parameter.',
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTENT GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate content with AI
   */
  @Post('generate')
  async generateContent(
    @Body() dto: GenerateContentDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GeneratedContent> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.contentService.generateContent({ ...dto, companyId });
  }

  /**
   * Improve existing content
   */
  @Post('improve')
  async improveContent(
    @Body() dto: ImproveContentDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GeneratedContent> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentService.improveContent(dto);
  }

  /**
   * Analyze content quality
   */
  @Post('analyze')
  async analyzeContent(
    @Body() dto: AnalyzeContentDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    qualityScore: number;
    readabilityScore: number;
    sentimentScore: number;
    triggersDetected: string[];
    suggestions: string[];
    wordCount: number;
    estimatedReadTime: number;
  }> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentService.analyzeContent(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEMPLATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new template
   */
  @Post('templates')
  async createTemplate(
    @Body() dto: CreateTemplateDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentTemplate> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.contentService.createTemplate({ ...dto, companyId });
  }

  /**
   * Generate template using AI
   */
  @Post('templates/generate')
  async generateTemplate(
    @Body()
    dto: {
      companyId: string;
      name: string;
      type: ContentType;
      purpose: ContentPurpose;
      instructions: string;
      tone?: string;
    },
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentTemplate> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.contentService.generateTemplateFromAI({ ...dto, companyId });
  }

  /**
   * Update an existing template
   */
  @Put('templates/:templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: Omit<UpdateTemplateDto, 'templateId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentTemplate> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentService.updateTemplate({ templateId, ...dto });
  }

  /**
   * Get templates with filters
   */
  @Get('templates')
  async getTemplates(
    @Query() dto: GetTemplatesDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    templates: ContentTemplate[];
    total: number;
  }> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.contentService.getTemplates({ ...dto, companyId });
  }

  /**
   * Get a specific template
   */
  @Get('templates/:templateId')
  async getTemplate(
    @Param('templateId') templateId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentTemplate | null> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentService.getTemplate(templateId);
  }

  /**
   * Render a template with variables
   */
  @Post('templates/:templateId/render')
  async renderTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: Omit<RenderTemplateDto, 'templateId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    subject?: string;
    body: string;
    bodyHtml?: string;
  }> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentService.renderTemplate({ templateId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // GENERATED CONTENT QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get generated content with filters
   */
  @Get('generated')
  async getGeneratedContents(
    @Query() dto: GetGeneratedContentDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    contents: GeneratedContent[];
    total: number;
  }> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.contentService.getGeneratedContents({ ...dto, companyId });
  }

  /**
   * Get a specific generated content
   */
  @Get('generated/:contentId')
  async getGeneratedContent(
    @Param('contentId') contentId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GeneratedContent | null> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentService.getGeneratedContent(contentId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get content analytics
   */
  @Get('analytics/:companyId')
  async getAnalytics(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query() dto: Omit<ContentAnalyticsDto, 'companyId'>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentAnalytics> {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.contentService.getAnalytics({ companyId, ...dto });
  }
}
