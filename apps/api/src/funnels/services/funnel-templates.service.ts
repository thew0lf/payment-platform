import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FunnelTemplateType } from '@prisma/client';

export interface TemplateFilters {
  templateType?: FunnelTemplateType;
  category?: string;
  featured?: boolean;
  industry?: string;
  search?: string;
}

@Injectable()
export class FunnelTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all templates with optional filtering
   */
  async findAll(filters: TemplateFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.templateType) {
      where.templateType = filters.templateType;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.featured !== undefined) {
      where.featured = filters.featured;
    }

    if (filters.industry) {
      where.industry = { has: filters.industry };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { hasSome: [filters.search.toLowerCase()] } },
      ];
    }

    const templates = await this.prisma.funnelTemplate.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }],
    });

    return templates;
  }

  /**
   * Get a single template by slug
   */
  async findBySlug(slug: string) {
    const template = await this.prisma.funnelTemplate.findUnique({
      where: { slug },
    });

    if (!template) {
      throw new NotFoundException(`Template with slug "${slug}" not found`);
    }

    return template;
  }

  /**
   * Get a single template by ID
   */
  async findById(id: string) {
    const template = await this.prisma.funnelTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with id "${id}" not found`);
    }

    return template;
  }

  /**
   * Get all unique categories
   */
  async getCategories() {
    const templates = await this.prisma.funnelTemplate.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    return templates.map((t) => t.category);
  }

  /**
   * Get all unique industries
   */
  async getIndustries() {
    const templates = await this.prisma.funnelTemplate.findMany({
      select: { industry: true },
    });

    const industries = new Set<string>();
    templates.forEach((t) => t.industry.forEach((i) => industries.add(i)));

    return Array.from(industries).sort();
  }

  /**
   * Increment usage count when a template is used
   */
  async incrementUsage(id: string) {
    await this.prisma.funnelTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
