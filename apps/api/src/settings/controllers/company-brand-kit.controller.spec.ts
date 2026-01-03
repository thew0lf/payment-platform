/**
 * Company Brand Kit Controller Tests
 * Testing API endpoints for brand kit management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CompanyBrandKitController, UpdateBrandKitDto, ApplyPresetDto } from './company-brand-kit.controller';
import { CompanyBrandKitService } from '../services/company-brand-kit.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ScopeType } from '@prisma/client';

describe('CompanyBrandKitController', () => {
  let controller: CompanyBrandKitController;
  let brandKitService: jest.Mocked<CompanyBrandKitService>;
  let hierarchyService: jest.Mocked<HierarchyService>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';

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

  const mockOrgUser = {
    id: 'user-3',
    sub: 'user-3',
    email: 'admin@org.com',
    scopeType: 'ORGANIZATION' as ScopeType,
    scopeId: 'org-1',
    companyId: undefined,
    clientId: undefined,
    organizationId: 'org-1',
    role: 'SUPER_ADMIN',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyBrandKitController],
      providers: [
        {
          provide: CompanyBrandKitService,
          useValue: {
            getBrandKitCapabilities: jest.fn(),
            getBrandKit: jest.fn(),
            updateBrandKit: jest.fn(),
            getPresets: jest.fn(),
            applyPreset: jest.fn(),
            extractColorsFromLogo: jest.fn(),
            generateLogoVariants: jest.fn(),
            removeBackground: jest.fn(),
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

    controller = module.get<CompanyBrandKitController>(CompanyBrandKitController);
    brandKitService = module.get(CompanyBrandKitService);
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

    it('should return capabilities using companyId from user context', async () => {
      brandKitService.getBrandKitCapabilities.mockResolvedValue(mockCapabilities);
      const userWithCompanyContext = { ...mockClientUser, companyId: mockCompanyId };

      const result = await controller.getCapabilities(undefined, userWithCompanyContext);

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

      const result = await controller.getBrandKit(undefined, mockCompanyUser);

      expect(result).toEqual(mockBrandKit);
      expect(brandKitService.getBrandKit).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should return brand kit for CLIENT user with companyId', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.getBrandKit.mockResolvedValue(mockBrandKit);

      const result = await controller.getBrandKit(mockCompanyId, mockClientUser);

      expect(result).toEqual(mockBrandKit);
    });

    it('should throw ForbiddenException for unauthorized company access', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.getBrandKit(mockCompanyId, mockClientUser)
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

      const result = await controller.updateBrandKit(updateDto, undefined, mockCompanyUser);

      expect(result.colors.primary).toBe('#ff0000');
      expect(brandKitService.updateBrandKit).toHaveBeenCalledWith(mockCompanyId, {
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

      await controller.updateBrandKit(logoDto, undefined, mockCompanyUser);

      expect(brandKitService.updateBrandKit).toHaveBeenCalledWith(mockCompanyId, expect.objectContaining({
        logos: { fullUrl: 'https://example.com/new-logo.png' },
      }));
    });

    it('should update typography', async () => {
      const typoDto: UpdateBrandKitDto = {
        typography: { headingFont: 'Poppins', baseFontSize: 18 },
      };
      brandKitService.updateBrandKit.mockResolvedValue(mockBrandKit);

      await controller.updateBrandKit(typoDto, undefined, mockCompanyUser);

      expect(brandKitService.updateBrandKit).toHaveBeenCalledWith(mockCompanyId, expect.objectContaining({
        typography: { headingFont: 'Poppins', baseFontSize: 18 },
      }));
    });

    it('should verify access for CLIENT user', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.updateBrandKit.mockResolvedValue(mockBrandKit);

      await controller.updateBrandKit(updateDto, mockCompanyId, mockClientUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });
  });

  describe('getPresets', () => {
    const mockPresets = {
      minimal: { colors: mockBrandKit.colors, typography: mockBrandKit.typography, preset: 'minimal' as const },
      bold: { colors: { ...mockBrandKit.colors, primary: '#000000' }, typography: mockBrandKit.typography, preset: 'bold' as const },
    };

    it('should return all presets', async () => {
      brandKitService.getPresets.mockReturnValue(mockPresets as any);

      const result = await controller.getPresets();

      expect(result).toEqual(mockPresets);
    });
  });

  describe('applyPreset', () => {
    it('should apply minimal preset', async () => {
      brandKitService.applyPreset.mockResolvedValue(mockBrandKit);
      const dto: ApplyPresetDto = { preset: 'minimal' };

      const result = await controller.applyPreset(dto, undefined, mockCompanyUser);

      expect(result).toEqual(mockBrandKit);
      expect(brandKitService.applyPreset).toHaveBeenCalledWith(mockCompanyId, 'minimal');
    });

    it('should apply bold preset', async () => {
      brandKitService.applyPreset.mockResolvedValue({ ...mockBrandKit, preset: 'bold' });
      const dto: ApplyPresetDto = { preset: 'bold' };

      const result = await controller.applyPreset(dto, undefined, mockCompanyUser);

      expect(result.preset).toBe('bold');
    });

    it('should apply elegant preset', async () => {
      brandKitService.applyPreset.mockResolvedValue({ ...mockBrandKit, preset: 'elegant' });
      const dto: ApplyPresetDto = { preset: 'elegant' };

      await controller.applyPreset(dto, undefined, mockCompanyUser);

      expect(brandKitService.applyPreset).toHaveBeenCalledWith(mockCompanyId, 'elegant');
    });

    it('should apply playful preset', async () => {
      brandKitService.applyPreset.mockResolvedValue({ ...mockBrandKit, preset: 'playful' });
      const dto: ApplyPresetDto = { preset: 'playful' };

      await controller.applyPreset(dto, undefined, mockCompanyUser);

      expect(brandKitService.applyPreset).toHaveBeenCalledWith(mockCompanyId, 'playful');
    });

    it('should throw BadRequestException when no preset provided', async () => {
      const dto = {} as ApplyPresetDto;

      await expect(
        controller.applyPreset(dto, undefined, mockCompanyUser)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('extractColors', () => {
    const mockExtractedColors = {
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
  });

  describe('removeBackground', () => {
    const mockUploadResult = {
      url: 'https://s3.example.com/nobg.png',
      cdnUrl: 'https://cdn.example.com/nobg.png',
      size: 12345,
      contentType: 'image/png',
    };

    it('should remove background from logo', async () => {
      brandKitService.removeBackground.mockResolvedValue(mockUploadResult);

      const result = await controller.removeBackground(
        { logoUrl: 'https://example.com/logo.png' },
        undefined,
        mockCompanyUser
      );

      expect(result).toEqual(mockUploadResult);
      expect(brandKitService.removeBackground).toHaveBeenCalledWith(
        mockCompanyId,
        'https://example.com/logo.png'
      );
    });

    it('should throw BadRequestException when no logo URL provided', async () => {
      await expect(
        controller.removeBackground({ logoUrl: '' }, undefined, mockCompanyUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow ORG user with valid company access', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.removeBackground.mockResolvedValue(mockUploadResult);

      const result = await controller.removeBackground(
        { logoUrl: 'https://example.com/logo.png' },
        mockCompanyId,
        mockOrgUser
      );

      expect(result).toEqual(mockUploadResult);
      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });

    it('should deny ORG user without company access', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.removeBackground(
          { logoUrl: 'https://example.com/logo.png' },
          mockCompanyId,
          mockOrgUser
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Access Control', () => {
    it('should allow ORG user with companyId query param', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      brandKitService.getBrandKit.mockResolvedValue(mockBrandKit);

      const result = await controller.getBrandKit(mockCompanyId, mockOrgUser);

      expect(result).toEqual(mockBrandKit);
      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });

    it('should require companyId for ORG user without company context', async () => {
      await expect(
        controller.getBrandKit(undefined, mockOrgUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should use user.companyId when available', async () => {
      const userWithCompanyId = { ...mockOrgUser, companyId: mockCompanyId };
      brandKitService.getBrandKit.mockResolvedValue(mockBrandKit);

      const result = await controller.getBrandKit(undefined, userWithCompanyId);

      expect(result).toEqual(mockBrandKit);
      expect(brandKitService.getBrandKit).toHaveBeenCalledWith(mockCompanyId);
    });
  });
});
