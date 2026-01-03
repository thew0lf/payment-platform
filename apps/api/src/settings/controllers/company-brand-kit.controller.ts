/**
 * Company Brand Kit Controller
 * API endpoints for managing company-level brand kit defaults.
 *
 * Endpoints:
 * - GET    /api/settings/brand-kit/capabilities  - Check tier capabilities
 * - GET    /api/settings/brand-kit               - Get company brand kit
 * - PATCH  /api/settings/brand-kit               - Update brand kit
 * - POST   /api/settings/brand-kit/preset        - Apply a preset
 * - GET    /api/settings/brand-kit/presets       - List available presets
 * - POST   /api/settings/brand-kit/upload-logo   - Upload logo file to S3
 * - POST   /api/settings/brand-kit/extract-colors - Extract colors from logo
 * - POST   /api/settings/brand-kit/generate-variants - Generate logo variants
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Body,
  BadRequestException,
  ForbiddenException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScopeType } from '@prisma/client';
import { IsString, IsOptional, IsIn, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import {
  CompanyBrandKitService,
  UpdateCompanyBrandKitRequest,
  ExtractedColors,
  LogoUploadResult,
} from '../services/company-brand-kit.service';
import { BrandKit, BrandKitCapabilities, BrandKitLogo } from '../../funnels/types/funnel.types';

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

export class RemoveBackgroundDto {
  @IsString()
  logoUrl!: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════

// LogoUploadResult is imported from the service
export { LogoUploadResult };

@Controller('settings/brand-kit')
@UseGuards(JwtAuthGuard)
export class CompanyBrandKitController {
  constructor(
    private readonly brandKitService: CompanyBrandKitService,
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
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKit> {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.brandKitService.getBrandKit(companyId);
  }

  @Patch()
  async updateBrandKit(
    @Body() dto: UpdateBrandKitDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKit> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    const request: UpdateCompanyBrandKitRequest = {
      logos: dto.logos,
      colors: dto.colors,
      typography: dto.typography,
      faviconUrl: dto.faviconUrl,
      preset: dto.preset,
    };

    return this.brandKitService.updateBrandKit(companyId, request);
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGO UPLOAD
  // ═══════════════════════════════════════════════════════════════

  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Query('companyId') queryCompanyId: string,
    @Query('type') logoType: 'full' | 'icon' | 'monochrome' | 'reversed' | 'favicon' = 'full',
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LogoUploadResult> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Please select an image file.',
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not supported. Please upload a JPG, PNG, WebP, SVG, or GIF image.`,
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File is too large. Maximum size is 5MB.',
      );
    }

    return this.brandKitService.uploadLogo(companyId, file, logoType);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESETS
  // ═══════════════════════════════════════════════════════════════

  @Get('presets')
  async getPresets(): Promise<Record<string, unknown>> {
    return this.brandKitService.getPresets();
  }

  @Post('preset')
  async applyPreset(
    @Body() dto: ApplyPresetDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandKit> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    if (!dto.preset) {
      throw new BadRequestException(
        'Please specify a preset: minimal, bold, elegant, or playful.',
      );
    }

    return this.brandKitService.applyPreset(companyId, dto.preset);
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
        'Logo URL is required. Please provide a valid image URL.',
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
        'Base logo URL is required. Please upload a logo first.',
      );
    }

    return this.brandKitService.generateLogoVariants(companyId, dto.baseLogoUrl);
  }

  // ═══════════════════════════════════════════════════════════════
  // BACKGROUND REMOVAL
  // ═══════════════════════════════════════════════════════════════

  @Post('remove-background')
  async removeBackground(
    @Body() dto: RemoveBackgroundDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LogoUploadResult> {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    if (!dto.logoUrl) {
      throw new BadRequestException(
        'Logo URL is required. Please upload a logo first.',
      );
    }

    return this.brandKitService.removeBackground(companyId, dto.logoUrl);
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

    // CLIENT/ORG users need to specify or have access
    if (queryCompanyId) {
      const canAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
          organizationId: user.organizationId,
        },
        queryCompanyId,
      );
      if (!canAccess) {
        throw new ForbiddenException("You don't have access to this company's brand kit.");
      }
      return queryCompanyId;
    }

    throw new BadRequestException(
      'Please select a company or provide a companyId parameter.',
    );
  }
}
