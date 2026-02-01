/**
 * Affiliate Links Controller Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateLinksController } from './affiliate-links.controller';
import { AffiliateLinksService, LinkFilters, LinkStats } from '../services/affiliate-links.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('AffiliateLinksController', () => {
  let controller: AffiliateLinksController;
  let linksService: jest.Mocked<AffiliateLinksService>;

  const mockUser = {
    user: {
      sub: 'user-123',
      scopeType: 'ORGANIZATION',
      scopeId: 'org-123',
    },
  };

  const mockLink = {
    id: 'link-123',
    partnerId: 'partner-123',
    companyId: 'company-123',
    name: 'Test Link',
    destinationUrl: 'https://example.com/product',
    trackingCode: 'ABC123DEF456',
    shortCode: 'abc12345',
    campaign: 'summer-sale',
    source: 'facebook',
    medium: 'social',
    subId1: 'banner-1',
    subId2: null,
    subId3: null,
    subId4: null,
    subId5: null,
    subIdConfig: null,
    customParams: null,
    isActive: true,
    totalClicks: 100,
    uniqueClicks: 80,
    totalConversions: 10,
    totalRevenue: 500,
    totalCommissions: 50,
    conversionRate: 10,
    expiresAt: null,
    maxClicks: null,
    maxConversions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    partner: {
      id: 'partner-123',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'JohnD',
      email: 'john@example.com',
      affiliateCode: 'JOHN2024',
    },
    company: {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
    },
    clicks: [] as any[],
    conversions: [] as any[],
    _count: {
      clicks: 100,
      conversions: 10,
    },
  };

  const mockStats: LinkStats = {
    totalClicks: 100,
    uniqueClicks: 80,
    totalConversions: 10,
    totalRevenue: 500,
    conversionRate: 10,
    clicksByDay: [
      { date: '2024-01-01', clicks: 10, uniqueClicks: 8 },
      { date: '2024-01-02', clicks: 15, uniqueClicks: 12 },
    ],
    conversionsByDay: [
      { date: '2024-01-01', conversions: 1, revenue: 50 },
      { date: '2024-01-02', conversions: 2, revenue: 100 },
    ],
    topSubIds: {
      subId1: [{ value: 'banner-1', clicks: 50, conversions: 5 }],
      subId2: [],
      subId3: [],
      subId4: [],
      subId5: [],
    },
  };

  beforeEach(async () => {
    const mockLinksService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
      duplicate: jest.fn(),
      generateShortCode: jest.fn(),
      validateShortCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliateLinksController],
      providers: [
        { provide: AffiliateLinksService, useValue: mockLinksService },
      ],
    }).compile();

    controller = module.get<AffiliateLinksController>(AffiliateLinksController);
    linksService = module.get(AffiliateLinksService);
  });

  describe('listLinks', () => {
    it('should return paginated links', async () => {
      const mockResult = {
        links: [mockLink],
        total: 1,
        limit: 50,
        offset: 0,
      };
      linksService.findAll.mockResolvedValue(mockResult);

      const result = await controller.listLinks(mockUser, {});

      expect(result).toEqual(mockResult);
      expect(linksService.findAll).toHaveBeenCalledWith(
        mockUser.user,
        expect.any(Object),
      );
    });

    it('should pass filters to service', async () => {
      const mockResult = { links: [], total: 0, limit: 50, offset: 0 };
      linksService.findAll.mockResolvedValue(mockResult);

      const query = {
        companyId: 'company-123',
        partnerId: 'partner-123',
        isActive: true,
        campaign: 'summer-sale',
        search: 'test',
        sortBy: 'totalClicks' as const,
        sortOrder: 'desc' as const,
        limit: 25,
        offset: 10,
      };

      await controller.listLinks(mockUser, query);

      expect(linksService.findAll).toHaveBeenCalledWith(mockUser.user, {
        companyId: 'company-123',
        partnerId: 'partner-123',
        partnershipId: undefined,
        isActive: true,
        campaign: 'summer-sale',
        source: undefined,
        medium: undefined,
        search: 'test',
        sortBy: 'totalClicks',
        sortOrder: 'desc',
        limit: 25,
        offset: 10,
      });
    });
  });

  describe('getLink', () => {
    it('should return a link by ID', async () => {
      linksService.findById.mockResolvedValue(mockLink);

      const result = await controller.getLink(mockUser, 'link-123');

      expect(result).toEqual(mockLink);
      expect(linksService.findById).toHaveBeenCalledWith(mockUser.user, 'link-123');
    });

    it('should throw NotFoundException if link not found', async () => {
      linksService.findById.mockRejectedValue(new NotFoundException('Link not found'));

      await expect(controller.getLink(mockUser, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createLink', () => {
    const createDto = {
      partnerId: 'partner-123',
      companyId: 'company-123',
      name: 'New Link',
      destinationUrl: 'https://example.com/product',
    };

    it('should create a new link', async () => {
      const createdLink = {
        ...mockLink,
        name: createDto.name,
        destinationUrl: createDto.destinationUrl,
      };
      linksService.create.mockResolvedValue(createdLink as any);

      const result = await controller.createLink(mockUser, createDto);

      expect((result as any).name).toBe(createDto.name);
      expect(linksService.create).toHaveBeenCalledWith(mockUser.user, createDto);
    });

    it('should throw BadRequestException for invalid partner', async () => {
      linksService.create.mockRejectedValue(
        new BadRequestException('Partner must be active'),
      );

      await expect(controller.createLink(mockUser, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateLink', () => {
    const updateDto = {
      name: 'Updated Link',
      campaign: 'winter-sale',
    };

    it('should update a link', async () => {
      const updatedLink = {
        ...mockLink,
        ...updateDto,
      };
      linksService.update.mockResolvedValue(updatedLink as any);

      const result = await controller.updateLink(mockUser, 'link-123', updateDto);

      expect((result as any).name).toBe(updateDto.name);
      expect((result as any).campaign).toBe(updateDto.campaign);
      expect(linksService.update).toHaveBeenCalledWith(mockUser.user, 'link-123', updateDto);
    });

    it('should throw NotFoundException if link not found', async () => {
      linksService.update.mockRejectedValue(new NotFoundException('Link not found'));

      await expect(
        controller.updateLink(mockUser, 'nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteLink', () => {
    it('should soft delete a link', async () => {
      linksService.delete.mockResolvedValue({ success: true });

      await controller.deleteLink(mockUser, 'link-123');

      expect(linksService.delete).toHaveBeenCalledWith(mockUser.user, 'link-123');
    });

    it('should throw NotFoundException if link not found', async () => {
      linksService.delete.mockRejectedValue(new NotFoundException('Link not found'));

      await expect(controller.deleteLink(mockUser, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLinkStats', () => {
    it('should return link stats', async () => {
      linksService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getLinkStats(mockUser, 'link-123', {});

      expect(result).toEqual(mockStats);
      expect(linksService.getStats).toHaveBeenCalledWith(mockUser.user, 'link-123', {
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should pass date range to service', async () => {
      linksService.getStats.mockResolvedValue(mockStats);

      await controller.getLinkStats(mockUser, 'link-123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(linksService.getStats).toHaveBeenCalledWith(mockUser.user, 'link-123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });
  });

  describe('duplicateLink', () => {
    const duplicateDto = {
      name: 'Duplicated Link',
      subId1: 'new-banner',
    };

    it('should duplicate a link', async () => {
      const duplicatedLink = {
        ...mockLink,
        id: 'link-456',
        name: duplicateDto.name,
        subId1: duplicateDto.subId1,
        trackingCode: 'NEWCODE123',
      };
      linksService.duplicate.mockResolvedValue(duplicatedLink as any);

      const result = await controller.duplicateLink(mockUser, 'link-123', duplicateDto);

      expect((result as any).id).toBe('link-456');
      expect((result as any).name).toBe(duplicateDto.name);
      expect((result as any).subId1).toBe(duplicateDto.subId1);
      expect(linksService.duplicate).toHaveBeenCalledWith(
        mockUser.user,
        'link-123',
        duplicateDto,
      );
    });

    it('should throw NotFoundException if original link not found', async () => {
      linksService.duplicate.mockRejectedValue(
        new NotFoundException('Link not found'),
      );

      await expect(
        controller.duplicateLink(mockUser, 'nonexistent', duplicateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateCode', () => {
    it('should generate a new short code', async () => {
      linksService.generateShortCode.mockResolvedValue('abc12345');

      const result = await controller.generateCode();

      expect(result).toEqual({ shortCode: 'abc12345' });
      expect(linksService.generateShortCode).toHaveBeenCalled();
    });
  });

  describe('validateCode', () => {
    it('should return valid for available code', async () => {
      linksService.validateShortCode.mockResolvedValue(undefined);

      const result = await controller.validateCode('mycode01');

      expect(result).toEqual({ valid: true, code: 'mycode01' });
    });

    it('should return invalid for reserved code', async () => {
      linksService.validateShortCode.mockRejectedValue(
        new BadRequestException('"admin" is a reserved code'),
      );

      const result = await controller.validateCode('admin');

      expect(result).toEqual({
        valid: false,
        code: 'admin',
        error: '"admin" is a reserved code',
      });
    });

    it('should return invalid for code already in use', async () => {
      linksService.validateShortCode.mockRejectedValue(
        new ConflictException('Short code is already in use'),
      );

      const result = await controller.validateCode('existing');

      expect(result).toEqual({
        valid: false,
        code: 'existing',
        error: 'Short code is already in use',
      });
    });

    it('should return invalid for code with wrong format', async () => {
      linksService.validateShortCode.mockRejectedValue(
        new BadRequestException('Short code must be 4-16 alphanumeric characters'),
      );

      const result = await controller.validateCode('ab');

      expect(result).toEqual({
        valid: false,
        code: 'ab',
        error: 'Short code must be 4-16 alphanumeric characters',
      });
    });
  });
});
