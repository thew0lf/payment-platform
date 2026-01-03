import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FunnelLogoController, UploadLogoDto, ProcessLogoDto, GenerateLogoDto } from './funnel-logo.controller';
import { FunnelLogoService, LogoCapabilities, UploadedLogo, LogoGenerationResult } from '../services/funnel-logo.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';

describe('FunnelLogoController', () => {
  let controller: FunnelLogoController;
  let logoService: jest.Mocked<FunnelLogoService>;
  let hierarchyService: jest.Mocked<HierarchyService>;

  const validCompanyId = 'cuid1234567890123456789012';
  const validFunnelId = 'funnel-123';

  const mockCompanyUser: AuthenticatedUser = {
    sub: 'user-123',
    id: 'user-123',
    email: 'user@company.com',
    role: 'ADMIN',
    scopeType: 'COMPANY',
    scopeId: validCompanyId,
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: validCompanyId,
    departmentId: undefined,
  };

  const mockClientUser: AuthenticatedUser = {
    sub: 'user-456',
    id: 'user-456',
    email: 'user@client.com',
    role: 'ADMIN',
    scopeType: 'CLIENT',
    scopeId: 'client-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: undefined,
    departmentId: undefined,
  };

  const mockCapabilities: LogoCapabilities = {
    canUpload: true,
    canProcess: true,
    canGenerate: false,
    maxFileSize: 5 * 1024 * 1024,
    allowedTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    processingOptions: ['removeBackground', 'resize', 'format', 'optimize'],
    features: ['Upload custom logo', 'Background removal'],
  };

  const mockUploadedLogo: UploadedLogo = {
    key: 'funnels/funnel-123/branding/logo.png',
    url: 'https://s3.amazonaws.com/bucket/logo.png',
    cdnUrl: 'https://cdn.example.com/logo.png',
    size: 1024,
    mimeType: 'image/png',
  };

  beforeEach(async () => {
    const mockLogoService = {
      getLogoCapabilities: jest.fn().mockResolvedValue(mockCapabilities),
      uploadLogo: jest.fn().mockResolvedValue(mockUploadedLogo),
      removeLogo: jest.fn().mockResolvedValue(undefined),
      processLogo: jest.fn().mockResolvedValue({ url: 'https://processed.com/logo.png' }),
      generateLogo: jest.fn().mockRejectedValue(new BadRequestException('AI logo generation is coming soon.')),
      getGenerationStatus: jest.fn().mockRejectedValue(new BadRequestException('AI logo generation is coming soon.')),
    };

    const mockHierarchyService = {
      canAccessCompany: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FunnelLogoController],
      providers: [
        { provide: FunnelLogoService, useValue: mockLogoService },
        { provide: HierarchyService, useValue: mockHierarchyService },
      ],
    }).compile();

    controller = module.get<FunnelLogoController>(FunnelLogoController);
    logoService = module.get(FunnelLogoService);
    hierarchyService = module.get(HierarchyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // CAPABILITIES TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCapabilities', () => {
    it('should return capabilities for COMPANY scoped user', async () => {
      const result = await controller.getCapabilities(validCompanyId, mockCompanyUser);

      expect(result).toEqual(mockCapabilities);
      expect(logoService.getLogoCapabilities).toHaveBeenCalledWith(validCompanyId);
    });

    it('should use scopeId for COMPANY scoped user', async () => {
      const result = await controller.getCapabilities('', mockCompanyUser);

      expect(result).toEqual(mockCapabilities);
      expect(logoService.getLogoCapabilities).toHaveBeenCalledWith(validCompanyId);
    });

    it('should check access for CLIENT user with queryCompanyId', async () => {
      await controller.getCapabilities(validCompanyId, mockClientUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
      expect(logoService.getLogoCapabilities).toHaveBeenCalledWith(validCompanyId);
    });

    it('should throw ForbiddenException when CLIENT user lacks access', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.getCapabilities(validCompanyId, mockClientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no companyId available', async () => {
      await expect(
        controller.getCapabilities('', mockClientUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UPLOAD TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('uploadLogo', () => {
    const mockFile: Express.Multer.File = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'logo.png',
      mimetype: 'image/png',
      fieldname: 'file',
      encoding: '7bit',
      size: 1024,
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
    };

    it('should upload file for COMPANY user', async () => {
      const result = await controller.uploadLogo(
        validFunnelId,
        {},
        mockFile,
        validCompanyId,
        mockCompanyUser,
      );

      expect(result).toEqual(mockUploadedLogo);
      expect(logoService.uploadLogo).toHaveBeenCalledWith(
        validCompanyId,
        validFunnelId,
        expect.objectContaining({
          fileData: mockFile.buffer,
          filename: mockFile.originalname,
          mimeType: mockFile.mimetype,
        }),
      );
    });

    it('should upload base64 file from DTO', async () => {
      const dto: UploadLogoDto = {
        fileData: 'base64-encoded-data',
        filename: 'logo.png',
        mimeType: 'image/png',
      };

      const result = await controller.uploadLogo(
        validFunnelId,
        dto,
        undefined,
        validCompanyId,
        mockCompanyUser,
      );

      expect(result).toEqual(mockUploadedLogo);
      expect(logoService.uploadLogo).toHaveBeenCalledWith(
        validCompanyId,
        validFunnelId,
        expect.objectContaining({
          fileData: dto.fileData,
          filename: dto.filename,
          mimeType: dto.mimeType,
        }),
      );
    });

    it('should throw BadRequestException when no file or fileData provided', async () => {
      await expect(
        controller.uploadLogo(validFunnelId, {}, undefined, validCompanyId, mockCompanyUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should check access for CLIENT user', async () => {
      await controller.uploadLogo(
        validFunnelId,
        {},
        mockFile,
        validCompanyId,
        mockClientUser,
      );

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REMOVE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('removeLogo', () => {
    it('should remove logo for COMPANY user', async () => {
      await controller.removeLogo(validFunnelId, validCompanyId, mockCompanyUser);

      expect(logoService.removeLogo).toHaveBeenCalledWith(validCompanyId, validFunnelId);
    });

    it('should check access for CLIENT user', async () => {
      await controller.removeLogo(validFunnelId, validCompanyId, mockClientUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
      expect(logoService.removeLogo).toHaveBeenCalledWith(validCompanyId, validFunnelId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PROCESS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('processLogo', () => {
    const dto: ProcessLogoDto = {
      logoUrl: 'https://example.com/logo.png',
      options: { removeBackground: true },
    };

    it('should process logo for COMPANY user', async () => {
      const result = await controller.processLogo(
        validFunnelId,
        dto,
        validCompanyId,
        mockCompanyUser,
      );

      expect(result).toEqual({ url: 'https://processed.com/logo.png' });
      expect(logoService.processLogo).toHaveBeenCalledWith(
        validCompanyId,
        dto.logoUrl,
        dto.options,
      );
    });

    it('should throw BadRequestException when logoUrl is missing', async () => {
      const invalidDto = { logoUrl: '', options: { removeBackground: true } };

      await expect(
        controller.processLogo(validFunnelId, invalidDto, validCompanyId, mockCompanyUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when options are empty', async () => {
      const invalidDto = { logoUrl: 'https://example.com/logo.png', options: {} };

      await expect(
        controller.processLogo(validFunnelId, invalidDto, validCompanyId, mockCompanyUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AI GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('generateLogo', () => {
    const dto: GenerateLogoDto = {
      brandName: 'Acme Corp',
      industry: 'Technology',
      style: 'modern',
    };

    it('should throw when brandName is missing', async () => {
      const invalidDto = { ...dto, brandName: '' };

      await expect(
        controller.generateLogo(invalidDto, validCompanyId, mockCompanyUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when industry is missing', async () => {
      const invalidDto = { ...dto, industry: '' };

      await expect(
        controller.generateLogo(invalidDto, validCompanyId, mockCompanyUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call service for valid request', async () => {
      // The service will throw "coming soon" but we test the controller validation passes
      await expect(
        controller.generateLogo(dto, validCompanyId, mockCompanyUser),
      ).rejects.toThrow('AI logo generation is coming soon.');

      expect(logoService.generateLogo).toHaveBeenCalledWith(validCompanyId, dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECURITY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Security', () => {
    it('should throw ForbiddenException when CLIENT user lacks company access', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.uploadLogo(
          validFunnelId,
          {},
          { buffer: Buffer.from('data'), originalname: 'logo.png', mimetype: 'image/png' } as Express.Multer.File,
          validCompanyId,
          mockClientUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for ORGANIZATION user without companyId', async () => {
      const orgUser: AuthenticatedUser = {
        ...mockClientUser,
        scopeType: 'ORGANIZATION',
        scopeId: 'org-1',
      };

      await expect(
        controller.uploadLogo(validFunnelId, {}, undefined, '', orgUser),
      ).rejects.toThrow();
    });
  });
});
