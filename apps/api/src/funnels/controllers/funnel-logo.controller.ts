/**
 * Funnel Logo Controller
 * API endpoints for logo upload, processing, and AI generation.
 *
 * Endpoints:
 * - GET  /api/funnels/logo/capabilities - Check tier capabilities
 * - POST /api/funnels/:id/logo          - Upload logo
 * - DELETE /api/funnels/:id/logo        - Remove logo
 * - POST /api/funnels/:id/logo/process  - Process logo (Pro tier)
 * - POST /api/funnels/logo/generate     - Generate logo with AI (Enterprise)
 * - GET  /api/funnels/logo/generate/:jobId - Check generation status
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsOptional, IsIn, IsArray } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import {
  FunnelLogoService,
  LogoCapabilities,
  UploadedLogo,
  LogoProcessingOptions,
  LogoGenerationRequest,
  LogoGenerationResult,
} from '../services/funnel-logo.service';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export class UploadLogoDto {
  /** Base64 encoded file data */
  fileData?: string;
  /** Original filename */
  filename?: string;
  /** MIME type */
  mimeType?: string;
  /** Apply processing after upload */
  process?: LogoProcessingOptions;
}

export class ProcessLogoDto {
  /** Logo URL to process */
  logoUrl: string;
  /** Processing options */
  options: LogoProcessingOptions;
}

export class GenerateLogoDto implements LogoGenerationRequest {
  @IsString()
  brandName: string;

  @IsString()
  industry: string;

  @IsString()
  @IsIn(['modern', 'classic', 'playful', 'elegant', 'minimal', 'bold'])
  style: 'modern' | 'classic' | 'playful' | 'elegant' | 'minimal' | 'bold';

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsArray()
  @IsIn(['icon', 'text', 'abstract'], { each: true })
  elements?: ('icon' | 'text' | 'abstract')[];

  @IsOptional()
  @IsString()
  description?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════

@Controller('funnels')
@UseGuards(JwtAuthGuard)
export class FunnelLogoController {
  constructor(
    private readonly logoService: FunnelLogoService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CAPABILITIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Get logo capabilities for current company
   * GET /api/funnels/logo/capabilities
   */
  @Get('logo/capabilities')
  async getCapabilities(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LogoCapabilities> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }
    return this.logoService.getLogoCapabilities(companyId);
  }

  // ─────────────────────────────────────────────────────────────
  // UPLOAD (All Tiers)
  // ─────────────────────────────────────────────────────────────

  /**
   * Upload a logo for a funnel
   * POST /api/funnels/:id/logo
   *
   * Supports both:
   * - Multipart form-data with file upload
   * - JSON body with base64 encoded file
   */
  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadLogo(
    @Param('id') funnelId: string,
    @Body() dto: UploadLogoDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadedLogo> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);

    // Handle multipart file upload
    if (file) {
      return this.logoService.uploadLogo(companyId, funnelId, {
        fileData: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        process: dto.process,
      });
    }

    // Handle base64 JSON upload
    if (dto.fileData && dto.filename && dto.mimeType) {
      return this.logoService.uploadLogo(companyId, funnelId, {
        fileData: dto.fileData,
        filename: dto.filename,
        mimeType: dto.mimeType,
        process: dto.process,
      });
    }

    throw new BadRequestException(
      'Please select a logo file to upload.',
    );
  }

  /**
   * Remove logo from a funnel
   * DELETE /api/funnels/:id/logo
   */
  @Delete(':id/logo')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLogo(
    @Param('id') funnelId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    await this.logoService.removeLogo(companyId, funnelId);
  }

  // ─────────────────────────────────────────────────────────────
  // PROCESSING (Pro Tier)
  // ─────────────────────────────────────────────────────────────

  /**
   * Process an existing logo (background removal, resize, etc.)
   * POST /api/funnels/:id/logo/process
   */
  @Post(':id/logo/process')
  async processLogo(
    @Param('id') funnelId: string,
    @Body() dto: ProcessLogoDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ url: string }> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);

    if (!dto.logoUrl) {
      throw new BadRequestException('Logo URL is required');
    }

    if (!dto.options || Object.keys(dto.options).length === 0) {
      throw new BadRequestException(
        'Pick at least one way to enhance your logo: background removal, resize, format change, or optimization.',
      );
    }

    return this.logoService.processLogo(companyId, dto.logoUrl, dto.options);
  }

  // ─────────────────────────────────────────────────────────────
  // AI GENERATION (Enterprise Tier) - Placeholder for Phase 3
  // ─────────────────────────────────────────────────────────────

  /**
   * Generate logo options with AI
   * POST /api/funnels/logo/generate
   */
  @Post('logo/generate')
  async generateLogo(
    @Body() dto: GenerateLogoDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LogoGenerationResult> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);

    // Validate required fields
    if (!dto.brandName || dto.brandName.trim().length === 0) {
      throw new BadRequestException("What's your brand name? We need it to generate the perfect logo.");
    }
    if (!dto.industry || dto.industry.trim().length === 0) {
      throw new BadRequestException('Tell us your industry so we can nail the style.');
    }
    if (!dto.style) {
      throw new BadRequestException('Pick a style that fits your vibe: modern, classic, playful, elegant, minimal, or bold.');
    }

    return this.logoService.generateLogo(companyId, dto);
  }

  /**
   * Check AI generation job status
   * GET /api/funnels/logo/generate/:jobId
   */
  @Get('logo/generate/:jobId')
  async getGenerationStatus(
    @Param('jobId') jobId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LogoGenerationResult> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }
    return this.logoService.getGenerationStatus(companyId, jobId);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get companyId for write operations (upload/delete).
   */
  private async getCompanyIdForWrite(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    if (user.companyId) {
      return user.companyId;
    }

    if ((user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') && queryCompanyId) {
      const hasAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as 'ORGANIZATION' | 'CLIENT' | 'COMPANY',
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException("Hmm, you don't have access to that company. Double-check your permissions or try a different one.");
      }
      return queryCompanyId;
    }

    throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
  }

  /**
   * Get companyId for query operations.
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    if (user.companyId) {
      return user.companyId;
    }

    if ((user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') && queryCompanyId) {
      const hasAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as 'ORGANIZATION' | 'CLIENT' | 'COMPANY',
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException("Hmm, you don't have access to that company. Double-check your permissions or try a different one.");
      }
      return queryCompanyId;
    }

    return undefined;
  }
}
