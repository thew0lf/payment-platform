import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CONTENT GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate content with AI
   */
  @Post('generate')
  async generateContent(
    @Body() dto: GenerateContentDto,
  ): Promise<GeneratedContent> {
    return this.contentService.generateContent(dto);
  }

  /**
   * Improve existing content
   */
  @Post('improve')
  async improveContent(
    @Body() dto: ImproveContentDto,
  ): Promise<GeneratedContent> {
    return this.contentService.improveContent(dto);
  }

  /**
   * Analyze content quality
   */
  @Post('analyze')
  async analyzeContent(@Body() dto: AnalyzeContentDto): Promise<{
    qualityScore: number;
    readabilityScore: number;
    sentimentScore: number;
    triggersDetected: string[];
    suggestions: string[];
    wordCount: number;
    estimatedReadTime: number;
  }> {
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
  ): Promise<ContentTemplate> {
    return this.contentService.createTemplate(dto);
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
  ): Promise<ContentTemplate> {
    return this.contentService.generateTemplateFromAI(dto);
  }

  /**
   * Update an existing template
   */
  @Put('templates/:templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: Omit<UpdateTemplateDto, 'templateId'>,
  ): Promise<ContentTemplate> {
    return this.contentService.updateTemplate({ templateId, ...dto });
  }

  /**
   * Get templates with filters
   */
  @Get('templates')
  async getTemplates(@Query() dto: GetTemplatesDto): Promise<{
    templates: ContentTemplate[];
    total: number;
  }> {
    return this.contentService.getTemplates(dto);
  }

  /**
   * Get a specific template
   */
  @Get('templates/:templateId')
  async getTemplate(
    @Param('templateId') templateId: string,
  ): Promise<ContentTemplate | null> {
    return this.contentService.getTemplate(templateId);
  }

  /**
   * Render a template with variables
   */
  @Post('templates/:templateId/render')
  async renderTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: Omit<RenderTemplateDto, 'templateId'>,
  ): Promise<{
    subject?: string;
    body: string;
    bodyHtml?: string;
  }> {
    return this.contentService.renderTemplate({ templateId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // GENERATED CONTENT QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get generated content with filters
   */
  @Get('generated')
  async getGeneratedContents(@Query() dto: GetGeneratedContentDto): Promise<{
    contents: GeneratedContent[];
    total: number;
  }> {
    return this.contentService.getGeneratedContents(dto);
  }

  /**
   * Get a specific generated content
   */
  @Get('generated/:contentId')
  async getGeneratedContent(
    @Param('contentId') contentId: string,
  ): Promise<GeneratedContent | null> {
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
    @Param('companyId') companyId: string,
    @Query() dto: Omit<ContentAnalyticsDto, 'companyId'>,
  ): Promise<ContentAnalytics> {
    return this.contentService.getAnalytics({ companyId, ...dto });
  }
}
