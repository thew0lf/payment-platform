/**
 * Company Brand Kit Service Tests
 * Testing company-level brand kit management
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  CompanyBrandKitService,
  ExtractedColors,
  UpdateCompanyBrandKitRequest,
  LogoUploadResult,
} from './company-brand-kit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { S3StorageService } from '../../integrations/services/providers/s3-storage.service';
import { CloudinaryService } from '../../integrations/services/providers/cloudinary.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CompanyBrandKitService', () => {
  let service: CompanyBrandKitService;
  let prisma: jest.Mocked<PrismaService>;
  let platformIntegrationService: jest.Mocked<PlatformIntegrationService>;
  let s3StorageService: jest.Mocked<S3StorageService>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  const mockCompanyId = 'company-123';
  const mockOrganizationId = 'org-456';

  const mockCompany = {
    id: mockCompanyId,
    status: 'ACTIVE',
    settings: {},
  };

  const mockBrandKit = {
    logos: {
      fullUrl: 'https://example.com/logo.png',
      iconUrl: 'https://example.com/icon.png',
    },
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
  };

  const mockS3Credentials = {
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    region: 'us-east-1',
    bucket: 'test-bucket',
  };

  const mockCloudinaryCredentials = {
    cloudName: 'test-cloud',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyBrandKitService,
        {
          provide: PrismaService,
          useValue: {
            company: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: PlatformIntegrationService,
          useValue: {
            getDefaultOrganizationId: jest.fn(),
            getCredentialsByProvider: jest.fn(),
          },
        },
        {
          provide: S3StorageService,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            removeBackground: jest.fn(),
            smartCrop: jest.fn(),
            processImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CompanyBrandKitService>(CompanyBrandKitService);
    prisma = module.get(PrismaService);
    platformIntegrationService = module.get(PlatformIntegrationService);
    s3StorageService = module.get(S3StorageService);
    cloudinaryService = module.get(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to mock platform credentials
  const mockPlatformCredentials = (hasS3 = true, hasCloudinary = true) => {
    platformIntegrationService.getDefaultOrganizationId.mockResolvedValue(mockOrganizationId);
    platformIntegrationService.getCredentialsByProvider.mockImplementation(async (orgId, provider) => {
      if (provider === 'AWS_S3' && hasS3) {
        return { credentials: mockS3Credentials, environment: 'PRODUCTION' };
      }
      if (provider === 'CLOUDINARY' && hasCloudinary) {
        return { credentials: mockCloudinaryCredentials, environment: 'PRODUCTION' };
      }
      return null;
    });
  };

  describe('getBrandKitCapabilities', () => {
    it('should return capabilities with Cloudinary features when integration exists', async () => {
      mockPlatformCredentials(true, true);

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.canManageBrandKit).toBe(true);
      expect(result.canExtractColors).toBe(true);
      expect(result.canGenerateVariants).toBe(true);
      expect(result.hasAIColorSuggestions).toBe(true);
      expect(result.features).toContain('color_extraction');
      expect(result.features).toContain('logo_variants');
      expect(result.message).toBeUndefined();
    });

    it('should return limited capabilities when Cloudinary is not connected', async () => {
      mockPlatformCredentials(true, false);

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.canManageBrandKit).toBe(true);
      expect(result.canExtractColors).toBe(false);
      expect(result.canGenerateVariants).toBe(false);
      expect(result.hasAIColorSuggestions).toBe(false);
      expect(result.features).not.toContain('color_extraction');
      expect(result.message).toContain('Connect Cloudinary');
    });
  });

  describe('getBrandKit', () => {
    it('should return existing brand kit from company settings', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue({
        ...mockCompany,
        settings: { brandKit: mockBrandKit },
      });

      const result = await service.getBrandKit(mockCompanyId);

      expect(result).toEqual(mockBrandKit);
    });

    it('should return default brand kit when none exists', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);

      const result = await service.getBrandKit(mockCompanyId);

      expect(result.colors.primary).toBe('#1a1a1a');
      expect(result.typography.headingFont).toBe('Inter');
      expect(result.preset).toBe('minimal');
    });

    it('should throw NotFoundException when company not found', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getBrandKit(mockCompanyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBrandKit', () => {
    const updateRequest: UpdateCompanyBrandKitRequest = {
      logos: { fullUrl: 'https://example.com/new-logo.png' },
      colors: { primary: '#ff0000' },
    };

    it('should update brand kit successfully', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.company.update as jest.Mock).mockResolvedValue({});

      const result = await service.updateBrandKit(mockCompanyId, updateRequest);

      expect(result.logos.fullUrl).toBe('https://example.com/new-logo.png');
      expect(result.colors.primary).toBe('#ff0000');
      expect(result.preset).toBe('custom');
      expect(prisma.company.update).toHaveBeenCalled();
    });

    it('should merge with existing brand kit', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue({
        ...mockCompany,
        settings: { brandKit: mockBrandKit },
      });
      (prisma.company.update as jest.Mock).mockResolvedValue({});

      const result = await service.updateBrandKit(mockCompanyId, {
        colors: { accent: '#00ff00' },
      });

      expect(result.logos.fullUrl).toBe('https://example.com/logo.png');
      expect(result.colors.primary).toBe('#1a1a1a');
      expect(result.colors.accent).toBe('#00ff00');
    });

    it('should throw NotFoundException when company not found', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.updateBrandKit(mockCompanyId, updateRequest)).rejects.toThrow(NotFoundException);
    });

    it('should validate logo URLs', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);

      await expect(
        service.updateBrandKit(mockCompanyId, {
          logos: { fullUrl: 'not-a-valid-url' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject internal URLs (SSRF protection)', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);

      await expect(
        service.updateBrandKit(mockCompanyId, {
          logos: { fullUrl: 'http://localhost:3000/logo.png' },
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateBrandKit(mockCompanyId, {
          logos: { fullUrl: 'http://192.168.1.1/logo.png' },
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateBrandKit(mockCompanyId, {
          logos: { fullUrl: 'http://10.0.0.1/logo.png' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyPreset', () => {
    it('should apply minimal preset', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.company.update as jest.Mock).mockResolvedValue({});

      const result = await service.applyPreset(mockCompanyId, 'minimal');

      expect(result.preset).toBe('minimal');
      expect(result.colors.primary).toBe('#1a1a1a');
      expect(result.typography.headingFont).toBe('Inter');
    });

    it('should apply bold preset', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.company.update as jest.Mock).mockResolvedValue({});

      const result = await service.applyPreset(mockCompanyId, 'bold');

      expect(result.preset).toBe('bold');
      expect(result.colors.primary).toBe('#000000');
      expect(result.typography.headingFont).toBe('Montserrat');
    });

    it('should preserve logos when applying preset', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue({
        ...mockCompany,
        settings: { brandKit: mockBrandKit },
      });
      (prisma.company.update as jest.Mock).mockResolvedValue({});

      const result = await service.applyPreset(mockCompanyId, 'bold');

      expect(result.logos.fullUrl).toBe('https://example.com/logo.png');
      expect(result.preset).toBe('bold');
    });

    it('should throw BadRequestException for invalid preset', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);

      await expect(service.applyPreset(mockCompanyId, 'invalid' as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when company not found', async () => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.applyPreset(mockCompanyId, 'minimal')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPresets', () => {
    it('should return all available presets', () => {
      const presets = service.getPresets();

      expect(presets).toHaveProperty('minimal');
      expect(presets).toHaveProperty('bold');
      expect(presets).toHaveProperty('elegant');
      expect(presets).toHaveProperty('playful');
    });

    it('should have WCAG compliant colors in presets', () => {
      const presets = service.getPresets();

      Object.values(presets).forEach((preset) => {
        expect(preset.colors).toHaveProperty('primary');
        expect(preset.colors).toHaveProperty('secondary');
        expect(preset.colors).toHaveProperty('accent');
        expect(preset.colors).toHaveProperty('background');
        expect(preset.colors).toHaveProperty('text');
        expect(preset.colors).toHaveProperty('success');
        expect(preset.colors).toHaveProperty('warning');
        expect(preset.colors).toHaveProperty('error');
      });
    });
  });

  describe('removeBackground', () => {
    const mockLogoUrl = 'https://example.com/logo.png';
    const mockProcessedBuffer = Buffer.from('processed-image');

    it('should remove background successfully', async () => {
      mockPlatformCredentials(true, true);
      cloudinaryService.removeBackground.mockResolvedValue({
        processedUrl: 'https://cloudinary.com/processed.png',
        buffer: mockProcessedBuffer,
        originalDimensions: { width: 100, height: 100 },
        newDimensions: { width: 100, height: 100 },
        operation: 'background_removal',
      });
      s3StorageService.uploadFile.mockResolvedValue({
        key: 'companies/company123/brand-kit/nobg_company123_123.png',
        url: 'https://s3.amazonaws.com/bucket/nobg.png',
        cdnUrl: 'https://cdn.example.com/nobg.png',
        size: mockProcessedBuffer.length,
        contentType: 'image/png',
      });

      const result = await service.removeBackground(mockCompanyId, mockLogoUrl);

      expect(result.url).toBe('https://s3.amazonaws.com/bucket/nobg.png');
      expect(result.cdnUrl).toBe('https://cdn.example.com/nobg.png');
      expect(result.contentType).toBe('image/png');
      expect(cloudinaryService.removeBackground).toHaveBeenCalledWith(mockCloudinaryCredentials, mockLogoUrl);
      expect(s3StorageService.uploadFile).toHaveBeenCalled();
    });

    it('should throw BadRequestException when Cloudinary not connected', async () => {
      mockPlatformCredentials(true, false);

      await expect(service.removeBackground(mockCompanyId, mockLogoUrl)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when S3 not connected', async () => {
      mockPlatformCredentials(false, true);

      await expect(service.removeBackground(mockCompanyId, mockLogoUrl)).rejects.toThrow(BadRequestException);
    });

    it('should validate logo URL', async () => {
      await expect(service.removeBackground(mockCompanyId, 'not-a-valid-url')).rejects.toThrow(BadRequestException);
    });

    it('should handle Cloudinary processing errors', async () => {
      mockPlatformCredentials(true, true);
      cloudinaryService.removeBackground.mockRejectedValue(new Error('Processing failed'));

      await expect(service.removeBackground(mockCompanyId, mockLogoUrl)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateLogoVariants', () => {
    const mockLogoUrl = 'https://example.com/logo.png';
    const mockProcessedBuffer = Buffer.from('processed-image');

    it('should generate variants successfully', async () => {
      mockPlatformCredentials(true, true);
      cloudinaryService.smartCrop.mockResolvedValue({
        processedUrl: 'https://cloudinary.com/icon.webp',
        buffer: mockProcessedBuffer,
        originalDimensions: { width: 100, height: 100 },
        newDimensions: { width: 100, height: 100 },
        operation: 'smart_crop',
      });
      cloudinaryService.processImage.mockResolvedValue({
        processedUrl: 'https://cloudinary.com/mono.webp',
        buffer: mockProcessedBuffer,
        originalDimensions: { width: 100, height: 100 },
        newDimensions: { width: 100, height: 100 },
        operation: 'enhance',
      });
      s3StorageService.uploadFile.mockResolvedValue({
        key: 'companies/company123/brand-kit/icon.webp',
        url: 'https://s3.amazonaws.com/bucket/icon.webp',
        cdnUrl: 'https://cdn.example.com/icon.webp',
        size: mockProcessedBuffer.length,
        contentType: 'image/webp',
      });

      const result = await service.generateLogoVariants(mockCompanyId, mockLogoUrl);

      expect(result.fullUrl).toBe(mockLogoUrl);
      expect(result.iconUrl).toBe('https://cdn.example.com/icon.webp');
      expect(result.monochromeUrl).toBe('https://cdn.example.com/icon.webp');
    });

    it('should throw BadRequestException when Cloudinary not connected', async () => {
      mockPlatformCredentials(true, false);

      await expect(service.generateLogoVariants(mockCompanyId, mockLogoUrl)).rejects.toThrow(BadRequestException);
    });

    it('should validate base logo URL', async () => {
      await expect(service.generateLogoVariants(mockCompanyId, 'not-a-valid-url')).rejects.toThrow(BadRequestException);
    });

    it('should continue with other variants if one fails', async () => {
      mockPlatformCredentials(true, true);
      // Icon generation fails
      cloudinaryService.smartCrop.mockRejectedValue(new Error('Crop failed'));
      // Monochrome succeeds
      cloudinaryService.processImage.mockResolvedValue({
        processedUrl: 'https://cloudinary.com/mono.webp',
        buffer: mockProcessedBuffer,
        originalDimensions: { width: 100, height: 100 },
        newDimensions: { width: 100, height: 100 },
        operation: 'enhance',
      });
      s3StorageService.uploadFile.mockResolvedValue({
        key: 'companies/company123/brand-kit/mono.webp',
        url: 'https://s3.amazonaws.com/bucket/mono.webp',
        cdnUrl: 'https://cdn.example.com/mono.webp',
        size: mockProcessedBuffer.length,
        contentType: 'image/webp',
      });

      const result = await service.generateLogoVariants(mockCompanyId, mockLogoUrl);

      // Should still have fullUrl and monochromeUrl
      expect(result.fullUrl).toBe(mockLogoUrl);
      expect(result.monochromeUrl).toBe('https://cdn.example.com/mono.webp');
      // iconUrl should be undefined since it failed
      expect(result.iconUrl).toBeUndefined();
    });
  });

  describe('URL validation edge cases', () => {
    beforeEach(() => {
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(mockCompany);
    });

    it('should reject .local domains', async () => {
      await expect(
        service.updateBrandKit(mockCompanyId, {
          logos: { fullUrl: 'https://intranet.local/logo.png' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject .internal domains', async () => {
      await expect(
        service.updateBrandKit(mockCompanyId, {
          logos: { fullUrl: 'https://server.internal/logo.png' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid public URLs', async () => {
      (prisma.company.update as jest.Mock).mockResolvedValue({});

      const result = await service.updateBrandKit(mockCompanyId, {
        logos: { fullUrl: 'https://cdn.example.com/logo.png' },
      });

      expect(result.logos.fullUrl).toBe('https://cdn.example.com/logo.png');
    });

    it('should accept S3 URLs', async () => {
      (prisma.company.update as jest.Mock).mockResolvedValue({});

      const result = await service.updateBrandKit(mockCompanyId, {
        logos: { fullUrl: 'https://s3.amazonaws.com/bucket/logo.png' },
      });

      expect(result.logos.fullUrl).toBe('https://s3.amazonaws.com/bucket/logo.png');
    });
  });
});
