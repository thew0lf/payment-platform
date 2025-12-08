import { Controller, Get, Param, Query } from '@nestjs/common';
import { FunnelTemplatesService, TemplateFilters } from './services/funnel-templates.service';
import { FunnelTemplateType } from '@prisma/client';

/**
 * Public controller for funnel templates - no auth required
 * Templates are public resources that can be browsed and previewed
 */
@Controller('funnel-templates')
export class FunnelTemplatesController {
  constructor(private readonly templatesService: FunnelTemplatesService) {}

  /**
   * List all templates with optional filtering
   * GET /api/funnel-templates
   */
  @Get()
  async findAll(
    @Query('type') templateType?: FunnelTemplateType,
    @Query('category') category?: string,
    @Query('featured') featured?: string,
    @Query('industry') industry?: string,
    @Query('search') search?: string,
  ) {
    const filters: TemplateFilters = {};

    if (templateType) {
      filters.templateType = templateType;
    }

    if (category) {
      filters.category = category;
    }

    if (featured !== undefined) {
      filters.featured = featured === 'true';
    }

    if (industry) {
      filters.industry = industry;
    }

    if (search) {
      filters.search = search;
    }

    return this.templatesService.findAll(filters);
  }

  /**
   * Get all unique categories
   * GET /api/funnel-templates/categories
   */
  @Get('categories')
  async getCategories() {
    return this.templatesService.getCategories();
  }

  /**
   * Get all unique industries
   * GET /api/funnel-templates/industries
   */
  @Get('industries')
  async getIndustries() {
    return this.templatesService.getIndustries();
  }

  /**
   * Get a single template by slug
   * GET /api/funnel-templates/:slug
   */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.templatesService.findBySlug(slug);
  }
}
