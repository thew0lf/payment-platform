/**
 * Affiliate Links Controller
 *
 * Admin endpoints for managing affiliate tracking links.
 * Provides CRUD operations, stats, and duplicate functionality.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AffiliateLinksService, LinkFilters } from '../services/affiliate-links.service';
import {
  CreateLinkDto,
  UpdateLinkDto,
  LinkQueryDto,
  LinkStatsDto,
  DuplicateLinkDto,
} from '../dto/create-link.dto';

@Controller('affiliates/links')
@UseGuards(JwtAuthGuard)
export class AffiliateLinksController {
  private readonly logger = new Logger(AffiliateLinksController.name);

  constructor(private readonly linksService: AffiliateLinksService) {}

  /**
   * List affiliate links with filters
   * GET /api/affiliates/links
   */
  @Get()
  async listLinks(@Request() req, @Query() query: LinkQueryDto) {
    this.logger.debug(`Listing links with filters: companyId=${query.companyId || 'all'}, partnerId=${query.partnerId || 'all'}, isActive=${query.isActive}`);

    const filters: LinkFilters = {
      companyId: query.companyId,
      partnerId: query.partnerId,
      partnershipId: query.partnershipId,
      isActive: query.isActive,
      campaign: query.campaign,
      source: query.source,
      medium: query.medium,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: query.limit,
      offset: query.offset,
    };

    return this.linksService.findAll(req.user, filters);
  }

  /**
   * Get a single link by ID
   * GET /api/affiliates/links/:id
   */
  @Get(':id')
  async getLink(@Request() req, @Param('id') id: string) {
    this.logger.debug(`Getting link: ${id}`);
    return this.linksService.findById(req.user, id);
  }

  /**
   * Create a new tracking link
   * POST /api/affiliates/links
   */
  @Post()
  async createLink(@Request() req, @Body() dto: CreateLinkDto) {
    this.logger.debug(`Creating link for partner: ${dto.partnerId}`);
    return this.linksService.create(req.user, dto);
  }

  /**
   * Update a link
   * PATCH /api/affiliates/links/:id
   */
  @Patch(':id')
  async updateLink(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateLinkDto,
  ) {
    this.logger.debug(`Updating link: ${id}`);
    return this.linksService.update(req.user, id, dto);
  }

  /**
   * Soft delete a link
   * DELETE /api/affiliates/links/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLink(@Request() req, @Param('id') id: string) {
    this.logger.debug(`Deleting link: ${id}`);
    await this.linksService.delete(req.user, id);
  }

  /**
   * Get link performance stats
   * GET /api/affiliates/links/:id/stats
   */
  @Get(':id/stats')
  async getLinkStats(
    @Request() req,
    @Param('id') id: string,
    @Query() query: LinkStatsDto,
  ) {
    this.logger.debug(`Getting stats for link: ${id}`);
    return this.linksService.getStats(req.user, id, {
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  /**
   * Duplicate a link with new SubIDs
   * POST /api/affiliates/links/:id/duplicate
   */
  @Post(':id/duplicate')
  async duplicateLink(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: DuplicateLinkDto,
  ) {
    this.logger.debug(`Duplicating link: ${id}`);
    return this.linksService.duplicate(req.user, id, dto);
  }

  /**
   * Generate a new short code
   * POST /api/affiliates/links/generate-code
   */
  @Post('generate-code')
  async generateCode() {
    const shortCode = await this.linksService.generateShortCode();
    return { shortCode };
  }

  /**
   * Validate a custom short code
   * POST /api/affiliates/links/validate-code
   */
  @Post('validate-code')
  async validateCode(@Body('code') code: string) {
    try {
      await this.linksService.validateShortCode(code);
      return { valid: true, code };
    } catch (error) {
      return {
        valid: false,
        code,
        error: error instanceof Error ? error.message : 'Invalid code',
      };
    }
  }
}
