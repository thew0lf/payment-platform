/**
 * Funnels Service Unit Tests
 *
 * Tests for funnel management including:
 * - CRUD operations
 * - SEO slug handling
 * - Stage management
 * - Variant management
 * - Company settings inclusion for branding
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FunnelsService } from './funnels.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShortIdService } from '../../common/services/short-id.service';
import { FunnelStatus, FunnelType, StageType, BrandKit } from '../types/funnel.types';

// Helper type for company settings in tests
interface CompanySettings {
  brandKit?: BrandKit;
  general?: {
    timezone?: string;
    currency?: string;
  };
}

describe('FunnelsService', () => {
  let service: FunnelsService;
  let prisma: {
    funnel: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    funnelStage: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
    funnelVariant: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let shortIdService: {
    generateUnique: jest.Mock;
    isValid: jest.Mock;
  };

  const mockCompanyId = 'cmig1fuhb002cp2gjyysfq6gw';
  const mockFunnelId = 'cmig1fuhb003cp2gjyysfq6gx';
  const mockUserId = 'cmig1fuhb004cp2gjyysfq6gy';
  const mockShortId = 'x7Kq3m';

  const mockCompanySettings = {
    brandKit: {
      logos: {
        fullUrl: 'https://example.com/company-logo.png',
        iconUrl: 'https://example.com/company-icon.png',
      },
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899',
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseFontSize: 16,
      },
    },
    general: {
      timezone: 'America/New_York',
      currency: 'USD',
    },
  };

  const mockFunnel = {
    id: mockFunnelId,
    companyId: mockCompanyId,
    name: 'Test Funnel',
    slug: 'test-funnel',
    shortId: mockShortId,
    description: 'A test funnel',
    type: FunnelType.FULL_FUNNEL,
    status: FunnelStatus.DRAFT,
    settings: {
      branding: {
        primaryColor: '#000000',
      },
      behavior: {
        allowBackNavigation: true,
        showProgressBar: true,
        autoSaveProgress: true,
        sessionTimeout: 30,
        abandonmentEmail: false,
      },
      urls: {},
      seo: {},
      ai: {
        insightsEnabled: true,
        insightTiming: 'hybrid',
        actionMode: 'draft_review',
      },
    },
    totalVisits: 0,
    totalConversions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    createdBy: mockUserId,
  };

  const mockStages = [
    {
      id: 'stage-1',
      funnelId: mockFunnelId,
      name: 'Landing',
      type: StageType.LANDING,
      order: 0,
      config: {},
    },
    {
      id: 'stage-2',
      funnelId: mockFunnelId,
      name: 'Products',
      type: StageType.PRODUCT_SELECTION,
      order: 1,
      config: {},
    },
    {
      id: 'stage-3',
      funnelId: mockFunnelId,
      name: 'Checkout',
      type: StageType.CHECKOUT,
      order: 2,
      config: {},
    },
  ];

  const mockVariants = [
    {
      id: 'variant-1',
      funnelId: mockFunnelId,
      name: 'Control',
      isControl: true,
      trafficWeight: 100,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  ];

  const mockCompany = {
    id: mockCompanyId,
    name: 'Test Company',
    code: 'TEST',
    settings: mockCompanySettings,
  };

  beforeEach(async () => {
    prisma = {
      funnel: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      funnelStage: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      funnelVariant: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((updates) => Promise.all(updates)),
    };

    shortIdService = {
      generateUnique: jest.fn().mockReturnValue(mockShortId),
      isValid: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunnelsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ShortIdService, useValue: shortIdService },
      ],
    }).compile();

    service = module.get<FunnelsService>(FunnelsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // FIND BY SEO SLUG - COMPANY SETTINGS
  // ═══════════════════════════════════════════════════════════════

  describe('findBySeoSlug', () => {
    it('should return funnel with company settings including brandKit', async () => {
      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      const result = await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(result.company).toBeDefined();
      expect(result.company.settings).toBeDefined();
      const settings = result.company.settings as CompanySettings;
      expect(settings.brandKit).toBeDefined();
      expect(settings.brandKit?.logos.fullUrl).toBe(
        'https://example.com/company-logo.png',
      );
      expect(settings.brandKit?.colors.primary).toBe('#6366f1');
      expect(settings.brandKit?.typography.headingFont).toBe('Inter');
    });

    it('should return funnel with company info (id, name, code)', async () => {
      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      const result = await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(result.company.id).toBe(mockCompanyId);
      expect(result.company.name).toBe('Test Company');
      expect(result.company.code).toBe('TEST');
    });

    it('should return funnel with empty brandKit when company has no brandKit configured', async () => {
      const companyWithoutBrandKit = {
        ...mockCompany,
        settings: {
          general: {
            timezone: 'America/New_York',
          },
        },
      };

      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: companyWithoutBrandKit,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      const result = await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(result.company).toBeDefined();
      expect(result.company.settings).toBeDefined();
      const settings = result.company.settings as CompanySettings;
      expect(settings.brandKit).toBeUndefined();
    });

    it('should return funnel with null settings when company has null settings', async () => {
      const companyWithNullSettings = {
        ...mockCompany,
        settings: null,
      };

      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: companyWithNullSettings,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      const result = await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(result.company).toBeDefined();
      expect(result.company.settings).toBeNull();
    });

    it('should increment visit count when funnel is accessed', async () => {
      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(prisma.funnel.update).toHaveBeenCalledWith({
        where: { id: mockFunnelId },
        data: { totalVisits: { increment: 1 } },
      });
    });

    it('should return seoUrl in the response', async () => {
      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      const result = await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(result.seoUrl).toBe(`test-funnel-${mockShortId}`);
    });

    it('should throw NotFoundException when funnel not found', async () => {
      prisma.funnel.findUnique.mockResolvedValue(null);

      await expect(service.findBySeoSlug(`nonexistent-${mockShortId}`)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when funnel is not published', async () => {
      const draftFunnel = {
        ...mockFunnel,
        status: FunnelStatus.DRAFT,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(draftFunnel);

      await expect(service.findBySeoSlug(`test-funnel-${mockShortId}`)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when seoSlug has invalid shortId', async () => {
      shortIdService.isValid.mockReturnValue(false);

      await expect(service.findBySeoSlug('test-funnel-invalid')).rejects.toThrow(NotFoundException);
    });

    it('should handle shortId-only format (no slug prefix)', async () => {
      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      const result = await service.findBySeoSlug(mockShortId);

      expect(result).toBeDefined();
      const settings = result.company.settings as CompanySettings;
      expect(settings.brandKit).toBeDefined();
    });

    it('should return stages ordered by order field', async () => {
      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      const result = await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(result.stages).toHaveLength(3);
      expect(result.stages[0].type).toBe(StageType.LANDING);
      expect(result.stages[1].type).toBe(StageType.PRODUCT_SELECTION);
      expect(result.stages[2].type).toBe(StageType.CHECKOUT);
    });

    it('should only return active variants', async () => {
      const publishedFunnel = {
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        company: mockCompany,
        stages: mockStages,
        variants: mockVariants,
      };

      prisma.funnel.findUnique.mockResolvedValue(publishedFunnel);
      prisma.funnel.update.mockResolvedValue(publishedFunnel);

      await service.findBySeoSlug(`test-funnel-${mockShortId}`);

      expect(prisma.funnel.findUnique).toHaveBeenCalledWith({
        where: { shortId: mockShortId },
        include: expect.objectContaining({
          variants: { where: { status: 'ACTIVE' } },
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GENERATE SEO SLUG
  // ═══════════════════════════════════════════════════════════════

  describe('generateSeoSlug', () => {
    it('should generate seo slug from slug and shortId', () => {
      const result = service.generateSeoSlug('my-funnel', 'abc123');

      expect(result).toBe('my-funnel-abc123');
    });

    it('should handle empty slug', () => {
      const result = service.generateSeoSlug('', 'abc123');

      expect(result).toBe('-abc123');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CREATE FUNNEL
  // ═══════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create a funnel with default stages for FULL_FUNNEL type', async () => {
      prisma.funnel.findUnique.mockResolvedValue(null);
      prisma.funnel.create.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
      });

      const result = await service.create(
        mockCompanyId,
        {
          name: 'Test Funnel',
          type: FunnelType.FULL_FUNNEL,
        },
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.seoUrl).toBe(`test-funnel-${mockShortId}`);
      expect(prisma.funnel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            name: 'Test Funnel',
            type: FunnelType.FULL_FUNNEL,
            shortId: mockShortId,
          }),
        }),
      );
    });

    it('should throw BadRequestException when slug already exists', async () => {
      prisma.funnel.findUnique.mockResolvedValue(mockFunnel);

      await expect(
        service.create(mockCompanyId, { name: 'Test Funnel', type: FunnelType.FULL_FUNNEL }, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FIND ONE
  // ═══════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return funnel with seoUrl', async () => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });

      const result = await service.findOne(mockFunnelId);

      expect(result).toBeDefined();
      expect(result.seoUrl).toBe(`test-funnel-${mockShortId}`);
    });

    it('should throw NotFoundException when funnel not found', async () => {
      prisma.funnel.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when companyId does not match', async () => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });

      await expect(service.findOne(mockFunnelId, 'different-company-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FIND BY SLUG
  // ═══════════════════════════════════════════════════════════════

  describe('findBySlug', () => {
    it('should return funnel by company and slug', async () => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
      });

      const result = await service.findBySlug(mockCompanyId, 'test-funnel');

      expect(result).toBeDefined();
      expect(result.slug).toBe('test-funnel');
    });

    it('should throw NotFoundException when funnel not found', async () => {
      prisma.funnel.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug(mockCompanyId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════

  describe('update', () => {
    beforeEach(() => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });
    });

    it('should update funnel name', async () => {
      prisma.funnel.update.mockResolvedValue({
        ...mockFunnel,
        name: 'Updated Name',
        stages: mockStages,
        variants: mockVariants,
      });

      const result = await service.update(mockFunnelId, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw BadRequestException when new slug already exists', async () => {
      prisma.funnel.findUnique
        .mockResolvedValueOnce({
          ...mockFunnel,
          stages: mockStages,
          variants: mockVariants,
          abTests: [],
          _count: { sessions: 10 },
        })
        .mockResolvedValueOnce({ id: 'other-funnel-id' }); // Existing funnel with same slug

      await expect(service.update(mockFunnelId, { slug: 'existing-slug' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUBLISH
  // ═══════════════════════════════════════════════════════════════

  describe('publish', () => {
    beforeEach(() => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });
    });

    it('should publish a funnel', async () => {
      prisma.funnel.update.mockResolvedValue({
        ...mockFunnel,
        status: FunnelStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      const result = await service.publish(mockFunnelId, true);

      expect(result.status).toBe(FunnelStatus.PUBLISHED);
      expect(prisma.funnel.update).toHaveBeenCalledWith({
        where: { id: mockFunnelId },
        data: {
          status: FunnelStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should unpublish a funnel', async () => {
      prisma.funnel.update.mockResolvedValue({
        ...mockFunnel,
        status: FunnelStatus.DRAFT,
        publishedAt: null,
      });

      const result = await service.publish(mockFunnelId, false);

      expect(result.status).toBe(FunnelStatus.DRAFT);
      expect(prisma.funnel.update).toHaveBeenCalledWith({
        where: { id: mockFunnelId },
        data: {
          status: FunnelStatus.DRAFT,
          publishedAt: null,
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════════

  describe('delete', () => {
    it('should delete a funnel', async () => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });
      prisma.funnel.delete.mockResolvedValue(mockFunnel);

      await service.delete(mockFunnelId);

      expect(prisma.funnel.delete).toHaveBeenCalledWith({
        where: { id: mockFunnelId },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DUPLICATE
  // ═══════════════════════════════════════════════════════════════

  describe('duplicate', () => {
    it('should duplicate a funnel with new shortId', async () => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });
      prisma.funnel.create.mockResolvedValue({
        ...mockFunnel,
        id: 'new-funnel-id',
        name: 'Test Funnel (Copy)',
        shortId: 'newShId',
        stages: mockStages,
        variants: mockVariants,
      });

      const result = await service.duplicate(mockFunnelId, mockCompanyId, mockUserId);

      expect(result.name).toBe('Test Funnel (Copy)');
      expect(shortIdService.generateUnique).toHaveBeenCalledWith('funnel');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STAGE CRUD
  // ═══════════════════════════════════════════════════════════════

  describe('createStage', () => {
    beforeEach(() => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });
    });

    it('should create a new stage', async () => {
      prisma.funnelStage.create.mockResolvedValue({
        id: 'new-stage-id',
        funnelId: mockFunnelId,
        name: 'New Landing',
        type: StageType.LANDING,
        order: 3,
        config: {},
      });

      const result = await service.createStage(mockFunnelId, {
        name: 'New Landing',
        type: StageType.LANDING,
        order: 3,
      });

      expect(result.name).toBe('New Landing');
      expect(result.type).toBe(StageType.LANDING);
    });
  });

  describe('deleteStage', () => {
    it('should delete a stage', async () => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });
      prisma.funnelStage.delete.mockResolvedValue(mockStages[0]);

      await service.deleteStage(mockFunnelId, 'stage-1');

      expect(prisma.funnelStage.delete).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VARIANT CRUD
  // ═══════════════════════════════════════════════════════════════

  describe('createVariant', () => {
    beforeEach(() => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });
    });

    it('should create a new variant', async () => {
      prisma.funnelVariant.create.mockResolvedValue({
        id: 'new-variant-id',
        funnelId: mockFunnelId,
        name: 'Variant B',
        isControl: false,
        trafficWeight: 50,
      });

      const result = await service.createVariant(mockFunnelId, {
        name: 'Variant B',
        trafficWeight: 50,
      });

      expect(result.name).toBe('Variant B');
      expect(result.trafficWeight).toBe(50);
    });
  });

  describe('deleteVariant', () => {
    it('should delete a non-control variant', async () => {
      const variantsWithB = [
        ...mockVariants,
        {
          id: 'variant-b',
          funnelId: mockFunnelId,
          name: 'Variant B',
          isControl: false,
          trafficWeight: 50,
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ];

      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: variantsWithB,
        abTests: [],
        _count: { sessions: 10 },
      });
      prisma.funnelVariant.delete.mockResolvedValue(variantsWithB[1]);

      await service.deleteVariant(mockFunnelId, 'variant-b');

      expect(prisma.funnelVariant.delete).toHaveBeenCalledWith({
        where: { id: 'variant-b' },
      });
    });

    it('should throw BadRequestException when trying to delete control variant', async () => {
      prisma.funnel.findUnique.mockResolvedValue({
        ...mockFunnel,
        stages: mockStages,
        variants: mockVariants,
        abTests: [],
        _count: { sessions: 10 },
      });

      await expect(service.deleteVariant(mockFunnelId, 'variant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FIND ALL
  // ═══════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return paginated funnels with seoUrl', async () => {
      prisma.funnel.findMany.mockResolvedValue([
        {
          ...mockFunnel,
          stages: mockStages,
          _count: { sessions: 10, variants: 1 },
        },
      ]);
      prisma.funnel.count.mockResolvedValue(1);

      const result = await service.findAll({ companyId: mockCompanyId });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].seoUrl).toBe(`test-funnel-${mockShortId}`);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.funnel.findMany.mockResolvedValue([]);
      prisma.funnel.count.mockResolvedValue(0);

      await service.findAll({ companyId: mockCompanyId, status: FunnelStatus.PUBLISHED });

      expect(prisma.funnel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: FunnelStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      prisma.funnel.findMany.mockResolvedValue([]);
      prisma.funnel.count.mockResolvedValue(0);

      await service.findAll({ companyId: mockCompanyId, search: 'test' });

      expect(prisma.funnel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });
});
