/**
 * Funnel Brand Kit Controller Tests
 * Testing API endpoints for funnel-level brand kit management
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BrandKitController,
  UpdateBrandKitDto,
  ApplyPresetDto,
  ExtractColorsDto,
  GenerateVariantsDto,
} from './brand-kit.controller';
import { BrandKitService } from '../services/brand-kit.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ScopeType } from '@prisma/client';

describe('BrandKitController (Funnel Level)', () => {
  let controller: BrandKitController;
  let brandKitService: jest.Mocked<BrandKitService>;
  let hierarchyService: jest.Mocked<HierarchyService>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockFunnelId = 'funnel-789';

  const mockCompanyUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: mockCompanyId,
    companyId: mockCompanyId,
    clientId: mockClientId,
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  const mockClientUser = {
    id: 'user-2',
    sub: 'user-2',
    email: 'user@client.com',
    scopeType: 'CLIENT' as ScopeType,
    scopeId: mockClientId,
    companyId: undefined,
    clientId: mockClientId,
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  const mockBrandKit = {
    logos: { fullUrl: 'https://example.com/logo.png' },
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
    preset: 'minimal' as const,
  };

  const mockCapabilities = {
    canManageBrandKit: true,
    canExtractColors: true,
    canGenerateVariants: true,
    hasAIColorSuggestions: true,
    features: ['logo_upload', 'color_palette', 'typography', 'presets', 'color_extraction'],
  };

  const mockExtractedColors = {
    dominant: '#2563eb',
    palette: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#f59e0b'],
    suggested: {
      primary: '#2563eb',
      secondary: '#3b82f6',
      accent: '#f59e0b',
      text: '#1f2937',
      background: '#ffffff',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandKitController],
      providers: [
        {
          provide: BrandKitService,
          useValue: {
            getBrandKitCapabilities: jest.fn(),
            getBrandKit: jest.fn(),
            updateBrandKit: jest.fn(),
            applyPreset: jest.fn(),
            resetBrandKit: jest.fn(),
            extractColorsFromLogo: jest.fn(),
            generateLogoVariants: jest.fn(),
          },
        },
        {
          provide: HierarchyService,
          useValue: {
            canAccessCompany: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BrandKitController>(BrandKitController);
    brandKitService = module.get(BrandKitService);
    hierarchyService = module.get(HierarchyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCapabilities', () => {
    it('should return capabilities for company user', async () => {
      brandKitService.getBrandKitCapabilities.mockResolvedValue(mockCapabilities);

      const result = await controller.getCapabilities(undefined, mockCompanyUser);

      expect(result).toEqual(mockCapabilities);
      expect(brandKitService.getBrandKitCapabilities).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should verify access when CLIENT user provides companyId', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.getBrandKitCapabilities.mockResolvedValue(mockCapabilities);

      const result = await controller.getCapabilities(mockCompanyId, mockClientUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
      expect(result).toEqual(mockCapabilities);
    });

    it('should throw ForbiddenException when CLIENT user cannot access company', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.getCapabilities(mockCompanyId, mockClientUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no company context', async () => {
      await expect(
        controller.getCapabilities(undefined, mockClientUser)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBrandKit', () => {
    it('should return brand kit for company user', async () => {
      brandKitService.getBrandKit.mockResolvedValue(mockBrandKit);

      const result = await controller.getBrandKit(mockFunnelId, undefined, mockCompanyUser);

      expect(result).toEqual(mockBrandKit);
      expect(brandKitService.getBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId);
    });

    it('should return null when funnel has no custom brand kit', async () => {
      brandKitService.getBrandKit.mockResolvedValue(null);

      const result = await controller.getBrandKit(mockFunnelId, undefined, mockCompanyUser);

      expect(result).toBeNull();
    });

    it('should verify access for CLIENT user', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.getBrandKit.mockResolvedValue(mockBrandKit);

      const result = await controller.getBrandKit(mockFunnelId, mockCompanyId, mockClientUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
      expect(result).toEqual(mockBrandKit);
    });

    it('should throw ForbiddenException for unauthorized company access', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.getBrandKit(mockFunnelId, mockCompanyId, mockClientUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateBrandKit', () => {
    const updateDto: UpdateBrandKitDto = {
      colors: { primary: '#ff0000' },
    };

    it('should update brand kit for company user', async () => {
      const updatedBrandKit = { ...mockBrandKit, colors: { ...mockBrandKit.colors, primary: '#ff0000' } };
      brandKitService.updateBrandKit.mockResolvedValue(updatedBrandKit);

      const result = await controller.updateBrandKit(mockFunnelId, updateDto, undefined, mockCompanyUser);

      expect(result.colors.primary).toBe('#ff0000');
      expect(brandKitService.updateBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId, {
        logos: undefined,
        colors: { primary: '#ff0000' },
        typography: undefined,
        faviconUrl: undefined,
        preset: undefined,
      });
    });

    it('should update logos', async () => {
      const logoDto: UpdateBrandKitDto = {
        logos: { fullUrl: 'https://example.com/new-logo.png' },
      };
      brandKitService.updateBrandKit.mockResolvedValue(mockBrandKit);

      await controller.updateBrandKit(mockFunnelId, logoDto, undefined, mockCompanyUser);

      expect(brandKitService.updateBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId, expect.objectContaining({
        logos: { fullUrl: 'https://example.com/new-logo.png' },
      }));
    });

    it('should update typography', async () => {
      const typoDto: UpdateBrandKitDto = {
        typography: { headingFont: 'Poppins', baseFontSize: 18 },
      };
      brandKitService.updateBrandKit.mockResolvedValue(mockBrandKit);

      await controller.updateBrandKit(mockFunnelId, typoDto, undefined, mockCompanyUser);

      expect(brandKitService.updateBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId, expect.objectContaining({
        typography: { headingFont: 'Poppins', baseFontSize: 18 },
      }));
    });

    it('should verify access for CLIENT user', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.updateBrandKit.mockResolvedValue(mockBrandKit);

      await controller.updateBrandKit(mockFunnelId, updateDto, mockCompanyId, mockClientUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });
  });

  describe('applyPreset', () => {
    it('should apply minimal preset', async () => {
      brandKitService.applyPreset.mockResolvedValue(mockBrandKit);
      const dto: ApplyPresetDto = { preset: 'minimal' };

      const result = await controller.applyPreset(mockFunnelId, dto, undefined, mockCompanyUser);

      expect(result).toEqual(mockBrandKit);
      expect(brandKitService.applyPreset).toHaveBeenCalledWith(mockCompanyId, mockFunnelId, 'minimal');
    });

    it('should apply bold preset', async () => {
      brandKitService.applyPreset.mockResolvedValue({ ...mockBrandKit, preset: 'bold' });
      const dto: ApplyPresetDto = { preset: 'bold' };

      const result = await controller.applyPreset(mockFunnelId, dto, undefined, mockCompanyUser);

      expect(result.preset).toBe('bold');
    });

    it('should apply elegant preset', async () => {
      brandKitService.applyPreset.mockResolvedValue({ ...mockBrandKit, preset: 'elegant' });
      const dto: ApplyPresetDto = { preset: 'elegant' };

      await controller.applyPreset(mockFunnelId, dto, undefined, mockCompanyUser);

      expect(brandKitService.applyPreset).toHaveBeenCalledWith(mockCompanyId, mockFunnelId, 'elegant');
    });

    it('should apply playful preset', async () => {
      brandKitService.applyPreset.mockResolvedValue({ ...mockBrandKit, preset: 'playful' });
      const dto: ApplyPresetDto = { preset: 'playful' };

      await controller.applyPreset(mockFunnelId, dto, undefined, mockCompanyUser);

      expect(brandKitService.applyPreset).toHaveBeenCalledWith(mockCompanyId, mockFunnelId, 'playful');
    });

    it('should throw BadRequestException when no preset provided', async () => {
      const dto = {} as ApplyPresetDto;

      await expect(
        controller.applyPreset(mockFunnelId, dto, undefined, mockCompanyUser)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetBrandKit', () => {
    it('should reset brand kit for company user', async () => {
      brandKitService.resetBrandKit.mockResolvedValue(undefined);

      await controller.resetBrandKit(mockFunnelId, undefined, mockCompanyUser);

      expect(brandKitService.resetBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId);
    });

    it('should verify access for CLIENT user', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.resetBrandKit.mockResolvedValue(undefined);

      await controller.resetBrandKit(mockFunnelId, mockCompanyId, mockClientUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
      expect(brandKitService.resetBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId);
    });

    it('should throw ForbiddenException for unauthorized company access', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.resetBrandKit(mockFunnelId, mockCompanyId, mockClientUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no company context', async () => {
      await expect(
        controller.resetBrandKit(mockFunnelId, undefined, mockClientUser)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('extractColors', () => {
    it('should extract colors from logo URL', async () => {
      brandKitService.extractColorsFromLogo.mockResolvedValue(mockExtractedColors);

      const result = await controller.extractColors(
        { logoUrl: 'https://example.com/logo.png' },
        undefined,
        mockCompanyUser
      );

      expect(result).toEqual(mockExtractedColors);
      expect(brandKitService.extractColorsFromLogo).toHaveBeenCalledWith(
        mockCompanyId,
        'https://example.com/logo.png'
      );
    });

    it('should throw BadRequestException when no logo URL provided', async () => {
      await expect(
        controller.extractColors({ logoUrl: '' }, undefined, mockCompanyUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify access for CLIENT user', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.extractColorsFromLogo.mockResolvedValue(mockExtractedColors);

      await controller.extractColors(
        { logoUrl: 'https://example.com/logo.png' },
        mockCompanyId,
        mockClientUser
      );

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });
  });

  describe('generateVariants', () => {
    const mockVariants = {
      fullUrl: 'https://example.com/logo.png',
      iconUrl: 'https://example.com/logo-icon.png',
      monochromeUrl: 'https://example.com/logo-mono.png',
      reversedUrl: 'https://example.com/logo-reversed.png',
    };

    it('should generate logo variants', async () => {
      brandKitService.generateLogoVariants.mockResolvedValue(mockVariants);

      const result = await controller.generateVariants(
        { baseLogoUrl: 'https://example.com/logo.png' },
        undefined,
        mockCompanyUser
      );

      expect(result).toEqual(mockVariants);
      expect(brandKitService.generateLogoVariants).toHaveBeenCalledWith(
        mockCompanyId,
        'https://example.com/logo.png'
      );
    });

    it('should throw BadRequestException when no base logo URL provided', async () => {
      await expect(
        controller.generateVariants({ baseLogoUrl: '' }, undefined, mockCompanyUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify access for CLIENT user', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.generateLogoVariants.mockResolvedValue(mockVariants);

      await controller.generateVariants(
        { baseLogoUrl: 'https://example.com/logo.png' },
        mockCompanyId,
        mockClientUser
      );

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });
  });

  describe('Access Control', () => {
    it('should use user.companyId when available', async () => {
      const userWithCompanyId = { ...mockClientUser, companyId: mockCompanyId };
      brandKitService.getBrandKit.mockResolvedValue(mockBrandKit);

      const result = await controller.getBrandKit(mockFunnelId, undefined, userWithCompanyId);

      expect(result).toEqual(mockBrandKit);
      expect(brandKitService.getBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId);
    });

    it('should prefer COMPANY user scopeId over query param', async () => {
      brandKitService.getBrandKit.mockResolvedValue(mockBrandKit);

      await controller.getBrandKit(mockFunnelId, 'other-company', mockCompanyUser);

      // Company user's scopeId should be used, not the query param
      expect(brandKitService.getBrandKit).toHaveBeenCalledWith(mockCompanyId, mockFunnelId);
    });
  });
});
