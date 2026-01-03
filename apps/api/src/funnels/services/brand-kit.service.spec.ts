/**
 * Brand Kit Service Unit Tests
 *
 * Tests for brand kit management including:
 * - Capabilities detection
 * - Brand kit CRUD operations
 * - Preset application
 * - Color extraction
 * - Logo variant generation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BrandKitService, UpdateBrandKitRequest } from './brand-kit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CloudinaryService } from '../../integrations/services/providers/cloudinary.service';
import { ClientIntegrationService } from '../../integrations/services/client-integration.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import {
  IntegrationProvider,
  IntegrationStatus,
  IntegrationCategory,
  IntegrationMode,
} from '../../integrations/types/integration.types';
import { ScopeType } from '@prisma/client';

describe('BrandKitService', () => {
  let service: BrandKitService;
  let prisma: {
    funnel: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    clientIntegration: {
      findFirst: jest.Mock;
    };
    company: {
      findFirst: jest.Mock;
    };
  };
  let auditLogsService: { log: jest.Mock };
  let clientIntegrationService: { list: jest.Mock };
  let encryptionService: { decrypt: jest.Mock };

  const mockCompanyId = 'cmig1fuhb002cp2gjyysfq6gw';
  const mockFunnelId = 'cmig1fuhb003cp2gjyysfq6gx';

  const mockFunnel = {
    id: mockFunnelId,
    companyId: mockCompanyId,
    name: 'Test Funnel',
    settings: {
      branding: {
        primaryColor: '#6366f1',
      },
    },
  };

  const mockCloudinaryIntegration = {
    id: 'int-1',
    clientId: mockCompanyId,
    provider: IntegrationProvider.CLOUDINARY,
    category: IntegrationCategory.IMAGE_PROCESSING,
    name: 'Cloudinary',
    mode: IntegrationMode.OWN,
    status: IntegrationStatus.ACTIVE,
    credentials: { encrypted: 'data' },
    isDefault: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBedrockIntegration = {
    id: 'int-2',
    clientId: mockCompanyId,
    provider: IntegrationProvider.AWS_BEDROCK,
    category: IntegrationCategory.AI_ML,
    name: 'AWS Bedrock',
    mode: IntegrationMode.OWN,
    status: IntegrationStatus.ACTIVE,
    credentials: { encrypted: 'data' },
    isDefault: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClientId = 'cmig1fuhb001cp2gjyysfq6gv';

  beforeEach(async () => {
    prisma = {
      funnel: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      clientIntegration: {
        findFirst: jest.fn(),
      },
      company: {
        findFirst: jest.fn().mockResolvedValue({ clientId: mockClientId }),
      },
    };

    auditLogsService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockCloudinaryService = {};

    clientIntegrationService = {
      list: jest.fn(),
    };

    encryptionService = {
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandKitService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
        { provide: ClientIntegrationService, useValue: clientIntegrationService },
        { provide: CredentialEncryptionService, useValue: encryptionService },
      ],
    }).compile();

    service = module.get<BrandKitService>(BrandKitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════

  describe('getBrandKitCapabilities', () => {
    it('should return basic capabilities when no integrations exist', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.canManageBrandKit).toBe(true);
      expect(result.canExtractColors).toBe(false);
      expect(result.canGenerateVariants).toBe(false);
      expect(result.hasAIColorSuggestions).toBe(false);
      expect(result.features).toContain('Brand kit management');
      expect(result.message).toContain('Want AI-powered branding');
    });

    it('should detect Cloudinary capabilities', async () => {
      clientIntegrationService.list.mockResolvedValue([mockCloudinaryIntegration]);

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.canExtractColors).toBe(true);
      expect(result.canGenerateVariants).toBe(true);
      expect(result.hasAIColorSuggestions).toBe(false);
      expect(result.features).toContain('AI color extraction from logo');
      expect(result.features).toContain('Logo variant generation');
    });

    it('should detect Bedrock capabilities', async () => {
      clientIntegrationService.list.mockResolvedValue([mockBedrockIntegration]);

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.hasAIColorSuggestions).toBe(true);
      expect(result.features).toContain('AI color palette suggestions');
    });

    it('should detect full capabilities with both integrations', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockCloudinaryIntegration,
        mockBedrockIntegration,
      ]);

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.canManageBrandKit).toBe(true);
      expect(result.canExtractColors).toBe(true);
      expect(result.canGenerateVariants).toBe(true);
      expect(result.hasAIColorSuggestions).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should ignore inactive integrations', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          ...mockCloudinaryIntegration,
          status: IntegrationStatus.INACTIVE,
        },
      ]);

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.canExtractColors).toBe(false);
      expect(result.canGenerateVariants).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      clientIntegrationService.list.mockRejectedValue(new Error('DB error'));

      const result = await service.getBrandKitCapabilities(mockCompanyId);

      expect(result.canManageBrandKit).toBe(true);
      expect(result.canExtractColors).toBe(false);
      expect(result.message).toContain("Couldn't check your advanced features");
    });

    it('should reject invalid company ID', async () => {
      await expect(service.getBrandKitCapabilities('')).rejects.toThrow(BadRequestException);
      await expect(service.getBrandKitCapabilities('invalid')).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET BRAND KIT
  // ═══════════════════════════════════════════════════════════════

  describe('getBrandKit', () => {
    it('should return null when no brand kit exists', async () => {
      prisma.funnel.findFirst.mockResolvedValue({
        ...mockFunnel,
        settings: {},
      });

      const result = await service.getBrandKit(mockCompanyId, mockFunnelId);

      expect(result).toBeNull();
    });

    it('should return existing brand kit', async () => {
      const brandKit = {
        logos: { fullUrl: 'https://example.com/logo.png' },
        colors: { primary: '#ff0000' },
        typography: { headingFont: 'Inter' },
      };

      prisma.funnel.findFirst.mockResolvedValue({
        ...mockFunnel,
        settings: { brandKit },
      });

      const result = await service.getBrandKit(mockCompanyId, mockFunnelId);

      expect(result).toEqual(brandKit);
    });

    it('should throw when funnel not found', async () => {
      prisma.funnel.findFirst.mockResolvedValue(null);

      await expect(service.getBrandKit(mockCompanyId, mockFunnelId)).rejects.toThrow(
        "couldn't find that funnel",
      );
    });

    it('should reject invalid company ID', async () => {
      await expect(service.getBrandKit('invalid', mockFunnelId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UPDATE BRAND KIT
  // ═══════════════════════════════════════════════════════════════

  describe('updateBrandKit', () => {
    beforeEach(() => {
      prisma.funnel.findFirst.mockResolvedValue(mockFunnel);
      prisma.funnel.update.mockResolvedValue({});
    });

    it('should create default brand kit if none exists', async () => {
      prisma.funnel.findFirst.mockResolvedValue({
        ...mockFunnel,
        settings: {},
      });

      const request: UpdateBrandKitRequest = {
        colors: { primary: '#ff0000' },
      };

      const result = await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(result.colors.primary).toBe('#ff0000');
      expect(result.typography.headingFont).toBe('Inter'); // Default
    });

    it('should merge colors with existing brand kit', async () => {
      const existingBrandKit = {
        logos: {},
        colors: { primary: '#000000', secondary: '#111111' },
        typography: { headingFont: 'Arial' },
      };

      prisma.funnel.findFirst.mockResolvedValue({
        ...mockFunnel,
        settings: { brandKit: existingBrandKit },
      });

      const request: UpdateBrandKitRequest = {
        colors: { primary: '#ff0000' },
      };

      const result = await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(result.colors.primary).toBe('#ff0000');
      expect(result.colors.secondary).toBe('#111111'); // Preserved
    });

    it('should update logos', async () => {
      const request: UpdateBrandKitRequest = {
        logos: {
          fullUrl: 'https://example.com/new-logo.png',
          iconUrl: 'https://example.com/icon.png',
        },
      };

      const result = await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(result.logos.fullUrl).toBe('https://example.com/new-logo.png');
      expect(result.logos.iconUrl).toBe('https://example.com/icon.png');
    });

    it('should update typography', async () => {
      const request: UpdateBrandKitRequest = {
        typography: {
          headingFont: 'Poppins',
          baseFontSize: 18,
        },
      };

      const result = await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(result.typography.headingFont).toBe('Poppins');
      expect(result.typography.baseFontSize).toBe(18);
    });

    it('should update faviconUrl', async () => {
      const request: UpdateBrandKitRequest = {
        faviconUrl: 'https://example.com/favicon.ico',
      };

      const result = await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(result.faviconUrl).toBe('https://example.com/favicon.ico');
    });

    it('should also update backward-compatible branding settings', async () => {
      const request: UpdateBrandKitRequest = {
        logos: { fullUrl: 'https://example.com/logo.png' },
        colors: { primary: '#ff0000', secondary: '#00ff00' },
        typography: { headingFont: 'Poppins' },
        faviconUrl: 'https://example.com/favicon.ico',
      };

      await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(prisma.funnel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              branding: expect.objectContaining({
                primaryColor: '#ff0000',
                secondaryColor: '#00ff00',
                logoUrl: 'https://example.com/logo.png',
                faviconUrl: 'https://example.com/favicon.ico',
                fontFamily: 'Poppins',
              }),
            }),
          }),
        }),
      );
    });

    it('should set updatedAt timestamp', async () => {
      const before = Date.now();
      const result = await service.updateBrandKit(mockCompanyId, mockFunnelId, {});
      const after = Date.now();

      const updatedAt = new Date(result.updatedAt!).getTime();
      expect(updatedAt).toBeGreaterThanOrEqual(before);
      expect(updatedAt).toBeLessThanOrEqual(after);
    });

    it('should log audit event', async () => {
      const request: UpdateBrandKitRequest = {
        colors: { primary: '#ff0000' },
        preset: 'bold',
      };

      await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(auditLogsService.log).toHaveBeenCalledWith(
        'UPDATE',
        'Funnel',
        mockFunnelId,
        expect.objectContaining({
          scopeType: ScopeType.COMPANY,
          scopeId: mockCompanyId,
          metadata: expect.objectContaining({
            action: 'brand_kit_updated',
            preset: 'bold',
            colorsChanged: true,
          }),
        }),
      );
    });

    it('should reject invalid color format', async () => {
      const request: UpdateBrandKitRequest = {
        colors: { primary: 'not-a-color' },
      };

      await expect(
        service.updateBrandKit(mockCompanyId, mockFunnelId, request),
      ).rejects.toThrow("doesn't look like a valid color");
    });

    it('should reject invalid hex color', async () => {
      const request: UpdateBrandKitRequest = {
        colors: { primary: '#GGG' },
      };

      await expect(
        service.updateBrandKit(mockCompanyId, mockFunnelId, request),
      ).rejects.toThrow("doesn't look like a valid color");
    });

    it('should accept 3-character hex colors', async () => {
      const request: UpdateBrandKitRequest = {
        colors: { primary: '#FFF' },
      };

      const result = await service.updateBrandKit(mockCompanyId, mockFunnelId, request);

      expect(result.colors.primary).toBe('#FFF');
    });

    it('should throw when funnel not found', async () => {
      prisma.funnel.findFirst.mockResolvedValue(null);

      await expect(service.updateBrandKit(mockCompanyId, mockFunnelId, {})).rejects.toThrow(
        "couldn't find that funnel",
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PRESETS
  // ═══════════════════════════════════════════════════════════════

  describe('applyPreset', () => {
    beforeEach(() => {
      prisma.funnel.findFirst.mockResolvedValue(mockFunnel);
      prisma.funnel.update.mockResolvedValue({});
    });

    it('should apply minimal preset', async () => {
      const result = await service.applyPreset(mockCompanyId, mockFunnelId, 'minimal');

      expect(result.colors.primary).toBe('#1a1a1a');
      expect(result.typography.headingFont).toBe('Inter');
      expect(result.preset).toBe('minimal');
    });

    it('should apply bold preset', async () => {
      const result = await service.applyPreset(mockCompanyId, mockFunnelId, 'bold');

      expect(result.colors.primary).toBe('#000000');
      expect(result.colors.accent).toBe('#c40044'); // WCAG AA compliant
      expect(result.typography.headingFont).toBe('Montserrat');
      expect(result.typography.baseFontSize).toBe(18);
    });

    it('should apply elegant preset', async () => {
      const result = await service.applyPreset(mockCompanyId, mockFunnelId, 'elegant');

      expect(result.colors.primary).toBe('#2c3e50');
      expect(result.colors.accent).toBe('#8a7318'); // WCAG AA compliant
      expect(result.typography.headingFont).toBe('Playfair Display');
    });

    it('should apply playful preset', async () => {
      const result = await service.applyPreset(mockCompanyId, mockFunnelId, 'playful');

      expect(result.colors.primary).toBe('#4f46e5'); // WCAG AA compliant
      expect(result.colors.accent).toBe('#c2410c'); // WCAG AA compliant
      expect(result.typography.headingFont).toBe('Poppins');
    });

    it('should preserve logos when applying preset', async () => {
      const existingBrandKit = {
        logos: { fullUrl: 'https://example.com/logo.png' },
        colors: { primary: '#000' },
        typography: {},
      };

      prisma.funnel.findFirst.mockResolvedValue({
        ...mockFunnel,
        settings: { brandKit: existingBrandKit },
      });

      const result = await service.applyPreset(mockCompanyId, mockFunnelId, 'bold');

      expect(result.logos.fullUrl).toBe('https://example.com/logo.png');
    });

    it('should reject unknown preset', async () => {
      await expect(
        service.applyPreset(mockCompanyId, mockFunnelId, 'unknown' as never),
      ).rejects.toThrow("don't have a");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COLOR EXTRACTION
  // ═══════════════════════════════════════════════════════════════

  describe('extractColorsFromLogo', () => {
    beforeEach(() => {
      clientIntegrationService.list.mockResolvedValue([mockCloudinaryIntegration]);
      prisma.clientIntegration.findFirst.mockResolvedValue(mockCloudinaryIntegration);
      encryptionService.decrypt.mockReturnValue({
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });
    });

    it('should extract colors from logo', async () => {
      const logoUrl = 'https://example.com/logo.png';

      const result = await service.extractColorsFromLogo(mockCompanyId, logoUrl);

      expect(result.dominant).toBeDefined();
      expect(result.dominant).toMatch(/^#[A-Fa-f0-9]{6}$/);
      expect(result.palette).toHaveLength(5);
      expect(result.suggested.primary).toBeDefined();
      expect(result.suggested.secondary).toBeDefined();
      expect(result.suggested.accent).toBeDefined();
      expect(result.suggested.text).toBe('#1f2937');
      expect(result.suggested.background).toBe('#ffffff');
    });

    it('should generate consistent colors for same URL', async () => {
      const logoUrl = 'https://example.com/logo.png';

      const result1 = await service.extractColorsFromLogo(mockCompanyId, logoUrl);
      const result2 = await service.extractColorsFromLogo(mockCompanyId, logoUrl);

      expect(result1.dominant).toBe(result2.dominant);
      expect(result1.palette).toEqual(result2.palette);
    });

    it('should generate different colors for different URLs', async () => {
      const result1 = await service.extractColorsFromLogo(
        mockCompanyId,
        'https://example.com/logo1.png',
      );
      const result2 = await service.extractColorsFromLogo(
        mockCompanyId,
        'https://example.com/logo2.png',
      );

      expect(result1.dominant).not.toBe(result2.dominant);
    });

    it('should throw when Cloudinary not available', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://example.com/logo.png'),
      ).rejects.toThrow('Color extraction is a Pro feature');
    });

    it('should throw when Cloudinary credentials not found', async () => {
      prisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://example.com/logo.png'),
      ).rejects.toThrow("Cloudinary isn't configured yet");
    });

    it('should reject invalid company ID', async () => {
      await expect(
        service.extractColorsFromLogo('invalid', 'https://example.com/logo.png'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOGO VARIANT GENERATION
  // ═══════════════════════════════════════════════════════════════

  describe('generateLogoVariants', () => {
    const cloudCredentials = {
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    };

    beforeEach(() => {
      clientIntegrationService.list.mockResolvedValue([mockCloudinaryIntegration]);
      prisma.clientIntegration.findFirst.mockResolvedValue(mockCloudinaryIntegration);
      encryptionService.decrypt.mockReturnValue(cloudCredentials);
    });

    it('should generate all logo variants', async () => {
      const baseUrl = 'https://example.com/logo.png';

      const result = await service.generateLogoVariants(mockCompanyId, baseUrl);

      expect(result.fullUrl).toBe(baseUrl);
      expect(result.iconUrl).toContain('res.cloudinary.com');
      expect(result.iconUrl).toContain('c_fill,w_200,h_200');
      expect(result.monochromeUrl).toContain('e_grayscale');
      expect(result.reversedUrl).toContain('e_negate');
    });

    it('should URL-encode the base logo URL', async () => {
      const baseUrl = 'https://example.com/my logo.png?v=1';

      const result = await service.generateLogoVariants(mockCompanyId, baseUrl);

      expect(result.iconUrl).toContain(encodeURIComponent(baseUrl));
    });

    it('should throw when Cloudinary not available', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      await expect(
        service.generateLogoVariants(mockCompanyId, 'https://example.com/logo.png'),
      ).rejects.toThrow('Logo variants are a Pro feature');
    });

    it('should throw when Cloudinary credentials not found', async () => {
      prisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.generateLogoVariants(mockCompanyId, 'https://example.com/logo.png'),
      ).rejects.toThrow("Cloudinary isn't configured yet");
    });

    it('should reject invalid company ID', async () => {
      await expect(
        service.generateLogoVariants('invalid', 'https://example.com/logo.png'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('validation', () => {
    it('should reject empty company ID', async () => {
      await expect(service.getBrandKitCapabilities('')).rejects.toThrow('We need a company ID');
    });

    it('should reject non-CUID company ID', async () => {
      await expect(service.getBrandKitCapabilities('abc123')).rejects.toThrow(
        "doesn't look quite right",
      );
    });

    it('should accept valid CUID format', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      // Should not throw
      await expect(service.getBrandKitCapabilities(mockCompanyId)).resolves.toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // URL VALIDATION (SSRF PROTECTION)
  // ═══════════════════════════════════════════════════════════════

  describe('URL validation (SSRF protection)', () => {
    beforeEach(() => {
      clientIntegrationService.list.mockResolvedValue([mockCloudinaryIntegration]);
      prisma.company.findFirst.mockResolvedValue({ clientId: mockClientId });
      prisma.clientIntegration.findFirst.mockResolvedValue(mockCloudinaryIntegration);
      encryptionService.decrypt.mockReturnValue({
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });
    });

    it('should reject localhost URLs', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://localhost/logo.png'),
      ).rejects.toThrow('internal address');
    });

    it('should reject 127.0.0.1 URLs', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://127.0.0.1/logo.png'),
      ).rejects.toThrow('internal address');
    });

    it('should reject private IP ranges (10.x)', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://10.0.0.1/logo.png'),
      ).rejects.toThrow('internal address');
    });

    it('should reject private IP ranges (172.16-31.x)', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://172.16.0.1/logo.png'),
      ).rejects.toThrow('internal address');
    });

    it('should reject private IP ranges (192.168.x)', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://192.168.1.1/logo.png'),
      ).rejects.toThrow('internal address');
    });

    it('should reject .local domains', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://server.local/logo.png'),
      ).rejects.toThrow('internal address');
    });

    it('should reject .internal domains', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'https://api.internal/logo.png'),
      ).rejects.toThrow('internal address');
    });

    it('should reject non-HTTP/HTTPS protocols', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'file:///etc/passwd'),
      ).rejects.toThrow('starts with https');
    });

    it('should reject FTP URLs', async () => {
      await expect(
        service.extractColorsFromLogo(mockCompanyId, 'ftp://example.com/logo.png'),
      ).rejects.toThrow('starts with https');
    });

    it('should accept valid public HTTPS URLs', async () => {
      const result = await service.extractColorsFromLogo(
        mockCompanyId,
        'https://example.com/logo.png',
      );
      expect(result.dominant).toBeDefined();
    });

    it('should accept valid public HTTP URLs', async () => {
      const result = await service.extractColorsFromLogo(
        mockCompanyId,
        'http://example.com/logo.png',
      );
      expect(result.dominant).toBeDefined();
    });
  });
});
