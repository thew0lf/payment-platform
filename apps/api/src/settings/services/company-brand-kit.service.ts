/**
 * Company Brand Kit Service
 * Manages company-level brand kit defaults that apply to all funnels.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { S3StorageService, S3Credentials } from '../../integrations/services/providers/s3-storage.service';
import { CloudinaryService, CloudinaryCredentials } from '../../integrations/services/providers/cloudinary.service';
import { IntegrationProvider } from '../../integrations/types/integration.types';
import {
  BrandKit,
  BrandKitCapabilities,
  BrandKitLogo,
  BrandKitColors,
  BrandKitTypography,
} from '../../funnels/types/funnel.types';

// ═══════════════════════════════════════════════════════════════
// LOGO UPLOAD TYPES
// ═══════════════════════════════════════════════════════════════

export interface LogoUploadResult {
  url: string;
  cdnUrl?: string;
  size: number;
  contentType: string;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface UpdateCompanyBrandKitRequest {
  logos?: Partial<BrandKitLogo>;
  colors?: Partial<BrandKitColors>;
  typography?: Partial<BrandKitTypography>;
  faviconUrl?: string;
  preset?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'custom';
}

export interface ExtractedColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  palette: string[];
  suggestions: {
    success: string;
    warning: string;
    error: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// PRESETS - WCAG 2.1 AA Compliant Colors
// ═══════════════════════════════════════════════════════════════

const BRAND_KIT_PRESETS: Record<string, Omit<BrandKit, 'logos' | 'faviconUrl' | 'updatedAt'>> = {
  minimal: {
    colors: {
      primary: '#1a1a1a',
      secondary: '#666666',
      accent: '#0066cc',
      background: '#ffffff',
      text: '#1a1a1a',
      success: '#008a3e',
      warning: '#b38600',
      error: '#cc0029',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseFontSize: 16,
      headingScale: 1.25,
    },
    preset: 'minimal',
  },
  bold: {
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#c40044',
      background: '#f5f5f5',
      text: '#000000',
      success: '#00994d',
      warning: '#b38600',
      error: '#cc0029',
    },
    typography: {
      headingFont: 'Montserrat',
      bodyFont: 'Open Sans',
      baseFontSize: 18,
      headingScale: 1.5,
    },
    preset: 'bold',
  },
  elegant: {
    colors: {
      primary: '#2d3748',
      secondary: '#4a5568',
      accent: '#7c5c3e',
      background: '#faf9f7',
      text: '#2d3748',
      success: '#2e7d4a',
      warning: '#b38600',
      error: '#9b2c2c',
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Lora',
      baseFontSize: 17,
      headingScale: 1.333,
    },
    preset: 'elegant',
  },
  playful: {
    colors: {
      primary: '#6b21a8',
      secondary: '#9333ea',
      accent: '#db2777',
      background: '#faf5ff',
      text: '#1e1b4b',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
    },
    typography: {
      headingFont: 'Poppins',
      bodyFont: 'Nunito',
      baseFontSize: 16,
      headingScale: 1.25,
    },
    preset: 'playful',
  },
};

const DEFAULT_BRAND_KIT: BrandKit = {
  logos: {},
  colors: BRAND_KIT_PRESETS.minimal.colors,
  typography: BRAND_KIT_PRESETS.minimal.typography,
  preset: 'minimal',
};

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class CompanyBrandKitService {
  private readonly logger = new Logger(CompanyBrandKitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformIntegrationService: PlatformIntegrationService,
    private readonly s3StorageService: S3StorageService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════

  async getBrandKitCapabilities(companyId: string): Promise<BrandKitCapabilities> {
    // Check platform-level integrations (logo features use platform credentials)
    const s3Credentials = await this.getS3Credentials();
    const cloudinaryCredentials = await this.getCloudinaryCredentials();
    const hasS3 = s3Credentials !== null;
    const hasCloudinary = cloudinaryCredentials !== null;

    return {
      canManageBrandKit: true,
      canExtractColors: hasCloudinary,
      canGenerateVariants: hasCloudinary,
      hasAIColorSuggestions: hasCloudinary,
      features: [
        'logo_upload',
        'color_palette',
        'typography',
        'presets',
        ...(hasCloudinary ? ['color_extraction', 'logo_variants', 'ai_suggestions'] : []),
      ],
      message: hasCloudinary
        ? undefined
        : 'Connect Cloudinary integration to unlock advanced features like color extraction and logo variants.',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  async getBrandKit(companyId: string): Promise<BrandKit> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, status: 'ACTIVE' },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundException(
        "Hmm, we can't find that company. Double-check the ID?",
      );
    }

    const settings = (company.settings as Record<string, unknown>) || {};
    const brandKit = settings.brandKit as BrandKit | undefined;

    if (!brandKit) {
      return { ...DEFAULT_BRAND_KIT };
    }

    return brandKit;
  }

  async updateBrandKit(
    companyId: string,
    request: UpdateCompanyBrandKitRequest,
  ): Promise<BrandKit> {
    // Validate URLs if provided
    if (request.logos?.fullUrl) {
      this.validateUrl(request.logos.fullUrl, 'logo');
    }
    if (request.logos?.iconUrl) {
      this.validateUrl(request.logos.iconUrl, 'icon');
    }
    if (request.logos?.monochromeUrl) {
      this.validateUrl(request.logos.monochromeUrl, 'monochrome logo');
    }
    if (request.logos?.reversedUrl) {
      this.validateUrl(request.logos.reversedUrl, 'reversed logo');
    }
    if (request.faviconUrl) {
      this.validateUrl(request.faviconUrl, 'favicon');
    }

    // Validate hex colors
    this.validateColors(request.colors);

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, status: 'ACTIVE' },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundException(
        "Hmm, we can't find that company. Double-check the ID?",
      );
    }

    const settings = (company.settings as Record<string, unknown>) || {};
    const currentBrandKit = (settings.brandKit as BrandKit) || { ...DEFAULT_BRAND_KIT };

    // Merge updates
    const updatedBrandKit: BrandKit = {
      logos: {
        ...currentBrandKit.logos,
        ...request.logos,
      },
      colors: {
        ...currentBrandKit.colors,
        ...request.colors,
      },
      typography: {
        ...currentBrandKit.typography,
        ...request.typography,
      },
      faviconUrl: request.faviconUrl ?? currentBrandKit.faviconUrl,
      preset: request.preset ?? 'custom',
      updatedAt: new Date().toISOString(),
    };

    // Update company settings
    const updatedSettings = {
      ...settings,
      brandKit: updatedBrandKit,
    };
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        settings: updatedSettings as object,
      },
    });

    this.logger.log(`Updated brand kit for company ${companyId}`);
    return updatedBrandKit;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESETS
  // ═══════════════════════════════════════════════════════════════

  async applyPreset(
    companyId: string,
    preset: 'minimal' | 'bold' | 'elegant' | 'playful',
  ): Promise<BrandKit> {
    const presetConfig = BRAND_KIT_PRESETS[preset];
    if (!presetConfig) {
      throw new BadRequestException(
        `"${preset}" is not a valid preset. Choose from: minimal, bold, elegant, or playful.`,
      );
    }

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, status: 'ACTIVE' },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundException(
        "Hmm, we can't find that company. Double-check the ID?",
      );
    }

    const settings = (company.settings as Record<string, unknown>) || {};
    const currentBrandKit = (settings.brandKit as BrandKit) || { ...DEFAULT_BRAND_KIT };

    // Apply preset while keeping logos and favicon
    const updatedBrandKit: BrandKit = {
      logos: currentBrandKit.logos,
      colors: presetConfig.colors,
      typography: presetConfig.typography,
      faviconUrl: currentBrandKit.faviconUrl,
      preset: preset,
      updatedAt: new Date().toISOString(),
    };

    const updatedSettingsPreset = {
      ...settings,
      brandKit: updatedBrandKit,
    };
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        settings: updatedSettingsPreset as object,
      },
    });

    this.logger.log(`Applied ${preset} preset to brand kit for company ${companyId}`);
    return updatedBrandKit;
  }

  getPresets(): Record<string, Omit<BrandKit, 'logos' | 'faviconUrl' | 'updatedAt'>> {
    return BRAND_KIT_PRESETS;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGO UPLOAD (Uses Platform S3)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Upload a logo file to platform S3 storage
   */
  async uploadLogo(
    companyId: string,
    file: Express.Multer.File,
    logoType: 'full' | 'icon' | 'monochrome' | 'reversed' | 'favicon',
  ): Promise<LogoUploadResult> {
    // Get platform S3 credentials
    const s3Credentials = await this.getS3Credentials();
    if (!s3Credentials) {
      throw new BadRequestException(
        'Logo upload is temporarily unavailable. Please try again later.',
      );
    }

    // Generate safe filename
    const ext = this.getFileExtension(file.originalname);
    const timestamp = Date.now();
    const safeCompanyId = companyId.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${logoType}_${safeCompanyId}_${timestamp}${ext}`;

    // Upload to S3
    const result = await this.s3StorageService.uploadFile(
      s3Credentials,
      file.buffer,
      filename,
      {
        companyId,
        folder: `companies/${safeCompanyId}/brand-kit`,
        contentType: file.mimetype,
      },
    );

    this.logger.log(`Uploaded ${logoType} logo for company ${companyId}: ${result.key}`);

    return {
      url: result.url,
      cdnUrl: result.cdnUrl,
      size: file.size,
      contentType: file.mimetype,
    };
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.substring(lastDot) : '.png';
  }

  // ═══════════════════════════════════════════════════════════════
  // COLOR EXTRACTION (Requires Cloudinary)
  // ═══════════════════════════════════════════════════════════════

  async extractColorsFromLogo(companyId: string, logoUrl: string): Promise<ExtractedColors> {
    this.validateUrl(logoUrl, 'logo');

    const cloudinaryCredentials = await this.getCloudinaryCredentials();
    if (!cloudinaryCredentials) {
      throw new BadRequestException(
        'Color extraction is temporarily unavailable. Please try again later.',
      );
    }

    // For now, return mock extracted colors
    // In production, this would call Cloudinary's color extraction API
    this.logger.log(`Extracting colors from logo for company ${companyId}: ${logoUrl}`);

    return {
      primary: '#2563eb',
      secondary: '#3b82f6',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937',
      palette: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#f59e0b'],
      suggestions: {
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGO VARIANTS (Requires Cloudinary)
  // ═══════════════════════════════════════════════════════════════

  async generateLogoVariants(companyId: string, baseLogoUrl: string): Promise<BrandKitLogo> {
    this.validateUrl(baseLogoUrl, 'logo');

    const cloudinaryCredentials = await this.getCloudinaryCredentials();
    if (!cloudinaryCredentials) {
      throw new BadRequestException(
        'Logo variant generation requires Cloudinary integration. Please contact support.',
      );
    }

    const s3Credentials = await this.getS3Credentials();
    if (!s3Credentials) {
      throw new BadRequestException(
        'Storage is temporarily unavailable. Please try again later.',
      );
    }

    this.logger.log(`Generating logo variants for company ${companyId} from: ${baseLogoUrl}`);

    const safeCompanyId = companyId.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = Date.now();
    const variants: BrandKitLogo = {
      fullUrl: baseLogoUrl,
    };

    // Generate variants in parallel for better performance
    const [iconResult, monochromeResult] = await Promise.allSettled([
      // Icon variant (square crop)
      this.generateIconVariant(cloudinaryCredentials, s3Credentials, baseLogoUrl, companyId, safeCompanyId, timestamp),
      // Monochrome variant (grayscale)
      this.generateMonochromeVariant(cloudinaryCredentials, s3Credentials, baseLogoUrl, companyId, safeCompanyId, timestamp),
    ]);

    // Process icon result
    if (iconResult.status === 'fulfilled' && iconResult.value) {
      variants.iconUrl = iconResult.value;
      this.logger.log(`Generated icon variant: ${variants.iconUrl}`);
    } else if (iconResult.status === 'rejected') {
      this.logger.warn(`Failed to generate icon variant: ${iconResult.reason}`);
    }

    // Process monochrome result
    if (monochromeResult.status === 'fulfilled' && monochromeResult.value) {
      variants.monochromeUrl = monochromeResult.value;
      this.logger.log(`Generated monochrome variant: ${variants.monochromeUrl}`);
    } else if (monochromeResult.status === 'rejected') {
      this.logger.warn(`Failed to generate monochrome variant: ${monochromeResult.reason}`);
    }

    this.logger.log(`Logo variants generated for company ${companyId}`);
    return variants;
  }

  /**
   * Generate icon variant (square crop)
   */
  private async generateIconVariant(
    cloudinaryCredentials: CloudinaryCredentials,
    s3Credentials: S3Credentials,
    baseLogoUrl: string,
    companyId: string,
    safeCompanyId: string,
    timestamp: number,
  ): Promise<string> {
    const iconResult = await this.cloudinaryService.smartCrop(
      cloudinaryCredentials,
      baseLogoUrl,
      { aspectRatio: '1:1', gravity: 'auto:subject' },
    );
    const iconUpload = await this.s3StorageService.uploadFile(
      s3Credentials,
      iconResult.buffer,
      `icon_${safeCompanyId}_${timestamp}.webp`,
      {
        companyId,
        folder: `companies/${safeCompanyId}/brand-kit`,
        contentType: 'image/webp',
      },
    );
    return iconUpload.cdnUrl || iconUpload.url;
  }

  /**
   * Generate monochrome variant (grayscale)
   */
  private async generateMonochromeVariant(
    cloudinaryCredentials: CloudinaryCredentials,
    s3Credentials: S3Credentials,
    baseLogoUrl: string,
    companyId: string,
    safeCompanyId: string,
    timestamp: number,
  ): Promise<string> {
    const monochromeResult = await this.cloudinaryService.processImage(
      cloudinaryCredentials,
      {
        sourceUrl: baseLogoUrl,
        operation: 'grayscale',
      },
    );
    const monochromeUpload = await this.s3StorageService.uploadFile(
      s3Credentials,
      monochromeResult.buffer,
      `monochrome_${safeCompanyId}_${timestamp}.webp`,
      {
        companyId,
        folder: `companies/${safeCompanyId}/brand-kit`,
        contentType: 'image/webp',
      },
    );
    return monochromeUpload.cdnUrl || monochromeUpload.url;
  }

  // ═══════════════════════════════════════════════════════════════
  // BACKGROUND REMOVAL (Requires Cloudinary)
  // ═══════════════════════════════════════════════════════════════

  async removeBackground(companyId: string, logoUrl: string): Promise<LogoUploadResult> {
    this.validateUrl(logoUrl, 'logo');

    const cloudinaryCredentials = await this.getCloudinaryCredentials();
    if (!cloudinaryCredentials) {
      throw new BadRequestException(
        'Background removal requires Cloudinary integration. Please contact support.',
      );
    }

    const s3Credentials = await this.getS3Credentials();
    if (!s3Credentials) {
      throw new BadRequestException(
        'Storage is temporarily unavailable. Please try again later.',
      );
    }

    this.logger.log(`Removing background from logo for company ${companyId}: ${logoUrl}`);

    try {
      // Process with Cloudinary to remove background
      const result = await this.cloudinaryService.removeBackground(
        cloudinaryCredentials,
        logoUrl,
      );

      // Upload processed image to S3
      const safeCompanyId = companyId.replace(/[^a-zA-Z0-9]/g, '');
      const timestamp = Date.now();
      const filename = `nobg_${safeCompanyId}_${timestamp}.png`;

      const uploadResult = await this.s3StorageService.uploadFile(
        s3Credentials,
        result.buffer,
        filename,
        {
          companyId,
          folder: `companies/${safeCompanyId}/brand-kit`,
          contentType: 'image/png', // PNG for transparency
        },
      );

      this.logger.log(`Background removed and uploaded: ${uploadResult.key}`);

      return {
        url: uploadResult.url,
        cdnUrl: uploadResult.cdnUrl,
        size: result.buffer.length,
        contentType: 'image/png',
      };
    } catch (error: any) {
      this.logger.error(`Failed to remove background: ${error.message}`, error.stack);

      // Check for specific Cloudinary errors
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('400') || errorMessage.includes('background_removal')) {
        throw new BadRequestException(
          'Background removal requires the Cloudinary AI Background Removal add-on. Please contact your administrator to enable this feature.',
        );
      }

      throw new BadRequestException(
        'Failed to remove background. Please try with a different image or try again later.',
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS - Platform Integration Credentials
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get S3 credentials from platform integration
   */
  private async getS3Credentials(): Promise<S3Credentials | null> {
    try {
      const organizationId = await this.platformIntegrationService.getDefaultOrganizationId();
      if (!organizationId) return null;

      const result = await this.platformIntegrationService.getCredentialsByProvider<S3Credentials>(
        organizationId,
        IntegrationProvider.AWS_S3,
      );

      return result?.credentials || null;
    } catch (error) {
      this.logger.warn(`Failed to get S3 credentials: ${error}`);
      return null;
    }
  }

  /**
   * Get Cloudinary credentials from platform integration
   */
  private async getCloudinaryCredentials(): Promise<CloudinaryCredentials | null> {
    try {
      const organizationId = await this.platformIntegrationService.getDefaultOrganizationId();
      if (!organizationId) return null;

      const result = await this.platformIntegrationService.getCredentialsByProvider<{
        cloudName: string;
        apiKey: string;
        apiSecret: string;
      }>(
        organizationId,
        IntegrationProvider.CLOUDINARY,
      );

      if (!result?.credentials) return null;

      return {
        cloudName: result.credentials.cloudName,
        apiKey: result.credentials.apiKey,
        apiSecret: result.credentials.apiSecret,
      };
    } catch (error) {
      this.logger.warn(`Failed to get Cloudinary credentials: ${error}`);
      return null;
    }
  }

  /**
   * Validates hex color format (#RGB, #RRGGBB, or #RRGGBBAA)
   */
  private validateHexColor(color: string | undefined, fieldName: string): void {
    if (!color) return;

    // Support #RGB, #RRGGBB, #RRGGBBAA formats
    const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

    if (!hexColorRegex.test(color)) {
      throw new BadRequestException(
        `The ${fieldName} color "${color}" isn't valid. Use hex format like #FF5500 or #F50.`,
      );
    }
  }

  /**
   * Validates all colors in a color update
   */
  private validateColors(colors: Partial<BrandKitColors> | undefined): void {
    if (!colors) return;

    const colorFields: (keyof BrandKitColors)[] = [
      'primary',
      'secondary',
      'accent',
      'background',
      'text',
      'success',
      'warning',
      'error',
    ];

    for (const field of colorFields) {
      if (colors[field]) {
        this.validateHexColor(colors[field], field);
      }
    }
  }

  private validateUrl(url: string, fieldName: string): void {
    if (!url) return;

    const urlLower = url.toLowerCase();

    // Block dangerous URL schemes (XSS prevention)
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const scheme of dangerousSchemes) {
      if (urlLower.startsWith(scheme)) {
        throw new BadRequestException(
          `The ${fieldName} URL uses an unsafe scheme. Please use https:// URLs only.`,
        );
      }
    }

    if (!urlLower.startsWith('http://') && !urlLower.startsWith('https://')) {
      throw new BadRequestException(
        `The ${fieldName} URL must start with https://`,
      );
    }

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Block internal/private addresses (SSRF protection)
      const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^::1$/,
        /^fc[0-9a-f]{2}:/i,
        /^fe80:/i,
        /\.local$/i,
        /\.internal$/i,
        /\.corp$/i,
        /\.lan$/i,
      ];

      for (const pattern of blockedPatterns) {
        if (pattern.test(hostname)) {
          throw new BadRequestException(
            `The ${fieldName} URL isn't publicly accessible. Please use a URL reachable from the internet.`,
          );
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `The ${fieldName} URL format is invalid. Please check and try again.`,
      );
    }
  }
}
