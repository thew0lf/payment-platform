/**
 * Brand Kit Controller
 * API endpoints for managing funnel brand kits.
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { IsString, IsOptional, IsIn, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { BrandKitService, UpdateBrandKitRequest, ExtractedColors } from '../services/brand-kit.service';
import { BrandKit, BrandKitCapabilities, BrandKitLogo } from '../types/funnel.types';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

class BrandKitLogosDto {
  @IsOptional()
  @IsString()
  fullUrl?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  monochromeUrl?: string;

  @IsOptional()
  @IsString()
  reversedUrl?: string;
}

class BrandKitColorsDto {
  @IsOptional()
  @IsString()
  primary?: string;

  @IsOptional()
  @IsString()
  secondary?: string;

  @IsOptional()
  @IsString()
  accent?: string;

  @IsOptional()
  @IsString()
  background?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  success?: string;

  @IsOptional()
  @IsString()
  warning?: string;

  @IsOptional()
  @IsString()
  error?: string;
}

class BrandKitTypographyDto {
  @IsOptional()
  @IsString()
  headingFont?: string;

  @IsOptional()
  @IsString()
  bodyFont?: string;

  @IsOptional()
  @IsNumber()
  baseFontSize?: number;

  @IsOptional()
  @IsNumber()
  headingScale?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customFonts?: string[];
}

export class UpdateBrandKitDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandKitLogosDto)
  logos?: BrandKitLogosDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandKitColorsDto)
  colors?: BrandKitColorsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandKitTypographyDto)
  typography?: BrandKitTypographyDto;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['minimal', 'bold', 'elegant', 'playful', 'custom'])
  preset?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'custom';
}

export class ApplyPresetDto {
  @IsString()
  @IsIn(['minimal', 'bold', 'elegant', 'playful'])
  preset!: 'minimal' | 'bold' | 'elegant' | 'playful';
}

export class ExtractColorsDto {
  @IsString()
  logoUrl!: string;
}

export class GenerateVariantsDto {
  @IsString()
  baseLogoUrl!: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════

@Controller('funnels/:funnelId/brand-kit')
@UseGuards(JwtAuthGuard)
export class BrandKitController {
  constructor(
    private readonly brandKitService: BrandKitService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════

  @Get('capabilities')
  async getCapabilities(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKitCapabilities> {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.brandKitService.getBrandKitCapabilities(companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // BRAND KIT CRUD
  // ═══════════════════════════════════════════════════════════════

  @Get()
  async getBrandKit(
    @Param('funnelId') funnelId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKit | null> {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.brandKitService.getBrandKit(companyId, funnelId);
  }

  @Patch()
  async updateBrandKit(
    @Param('funnelId') funnelId: string,
    @Body() dto: UpdateBrandKitDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKit> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    const request: UpdateBrandKitRequest = {
      logos: dto.logos,
      colors: dto.colors,
      typography: dto.typography,
      faviconUrl: dto.faviconUrl,
      preset: dto.preset,
    };

    return this.brandKitService.updateBrandKit(companyId, funnelId, request);
  }

  @Post('preset')
  async applyPreset(
    @Param('funnelId') funnelId: string,
    @Body() dto: ApplyPresetDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKit> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    if (!dto.preset) {
      throw new BadRequestException(
        'Preset is required. Choose from: minimal, bold, elegant, or playful.',
      );
    }

    return this.brandKitService.applyPreset(companyId, funnelId, dto.preset);
  }

  @Delete()
  async resetBrandKit(
    @Param('funnelId') funnelId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    await this.brandKitService.resetBrandKit(companyId, funnelId);
  }

  // ═══════════════════════════════════════════════════════════════
  // COLOR EXTRACTION
  // ═══════════════════════════════════════════════════════════════

  @Post('extract-colors')
  async extractColors(
    @Body() dto: ExtractColorsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExtractedColors> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    if (!dto.logoUrl) {
      throw new BadRequestException(
        'Logo URL is required. Provide the URL of the logo to extract colors from.',
      );
    }

    return this.brandKitService.extractColorsFromLogo(companyId, dto.logoUrl);
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGO VARIANTS
  // ═══════════════════════════════════════════════════════════════

  @Post('generate-variants')
  async generateVariants(
    @Body() dto: GenerateVariantsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKitLogo> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    if (!dto.baseLogoUrl) {
      throw new BadRequestException(
        'Base logo URL is required. Provide the URL of the logo to generate variants from.',
      );
    }

    return this.brandKitService.generateLogoVariants(companyId, dto.baseLogoUrl);
  }

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

    // CLIENT users need to specify or have access
    if (queryCompanyId) {
      const canAccess = await this.hierarchyService.canAccessCompany(
        { sub: user.id, scopeType: user.scopeType as ScopeType, scopeId: user.scopeId },
        queryCompanyId,
      );
      if (!canAccess) {
        throw new ForbiddenException('Access denied to this company');
      }
      return queryCompanyId;
    }

    throw new BadRequestException(
      'Company ID is required. Please select a company or provide companyId parameter.',
    );
  }
}
