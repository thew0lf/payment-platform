/**
 * Sites Service Unit Tests
 * Tests for multi-tenant site management with scope-based access control
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';

describe('SitesService - Multi-tenant Site Management', () => {
  let service: SitesService;

  const mockPrismaService = {
    site: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
  };

  const mockCodeGeneratorService = {
    generateSiteCode: jest.fn(),
  };

  const mockAuditLogsService = {
    log: jest.fn(),
  };

  const mockOrganizationUser: AuthenticatedUser = {
    sub: 'user-123',
    id: 'user-123',
    email: 'admin@test.com',
    role: 'SUPER_ADMIN',
    scopeType: ScopeType.ORGANIZATION,
    scopeId: 'org-123',
    organizationId: 'org-123',
  };

  const mockClientUser: AuthenticatedUser = {
    sub: 'user-456',
    id: 'user-456',
    email: 'client@test.com',
    role: 'CLIENT_ADMIN',
    scopeType: ScopeType.CLIENT,
    scopeId: 'client-123',
    clientId: 'client-123',
  };

  const mockCompanyUser: AuthenticatedUser = {
    sub: 'user-789',
    id: 'user-789',
    email: 'company@test.com',
    role: 'COMPANY_ADMIN',
    scopeType: ScopeType.COMPANY,
    scopeId: 'company-123',
    companyId: 'company-123',
    organizationId: 'org-123',
  };

  const mockSite = {
    id: 'site-123',
    companyId: 'company-123',
    name: 'Main Store',
    slug: 'main-store',
    code: 'MAIN',
    domain: 'store.example.com',
    subdomain: null,
    logo: null,
    favicon: null,
    description: null,
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
    settings: {},
    timezone: 'UTC',
    currency: 'USD',
    locale: 'en',
    isDefault: true,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    cascadeId: null,
    company: {
      id: 'company-123',
      name: 'Test Company',
      code: 'TEST',
      timezone: 'UTC',
      currency: 'USD',
      client: {
        id: 'client-123',
        name: 'Test Client',
        code: 'TCLI',
        organizationId: 'org-123',
      },
    },
    _count: {
      funnels: 5,
      landingPages: 3,
    },
  };

  const mockCompany = {
    id: 'company-123',
    name: 'Test Company',
    clientId: 'client-123',
    client: {
      organizationId: 'org-123',
    },
    deletedAt: null,
  };

  const mockClient = {
    id: 'client-123',
    name: 'Test Client',
    organizationId: 'org-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CodeGeneratorService, useValue: mockCodeGeneratorService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
  });

  // ═══════════════════════════════════════════════════════════════
  // findAll Tests
  // ═══════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return sites for ORGANIZATION user', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrganizationUser, {});

      expect(result).toEqual({ sites: [mockSite], total: 1 });
      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company: expect.objectContaining({
              client: { organizationId: 'org-123' },
            }),
            deletedAt: null,
          }),
        }),
      );
    });

    it('should return sites for CLIENT user with proper scope', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      const result = await service.findAll(mockClientUser, {});

      expect(result.total).toBe(1);
      expect(mockPrismaService.site.findMany).toHaveBeenCalled();
    });

    it('should return sites for COMPANY user with proper scope', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      const result = await service.findAll(mockCompanyUser, {});

      expect(result.total).toBe(1);
    });

    it('should apply search filter', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([]);
      mockPrismaService.site.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationUser, { search: 'test' });

      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test', mode: 'insensitive' } },
              { code: { contains: 'test', mode: 'insensitive' } },
              { domain: { contains: 'test', mode: 'insensitive' } },
              { subdomain: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should apply status filter', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([]);
      mockPrismaService.site.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationUser, { status: 'ACTIVE' as any });

      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should apply companyId filter', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      await service.findAll(mockOrganizationUser, { companyId: 'company-123' });

      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-123',
          }),
        }),
      );
    });

    it('should throw ForbiddenException for unauthorized scope', async () => {
      const unauthorizedUser: AuthenticatedUser = {
        sub: 'user',
        id: 'user',
        email: 'user@test.com',
        role: 'USER',
        scopeType: ScopeType.DEPARTMENT,
        scopeId: 'dept-123',
      };

      await expect(service.findAll(unauthorizedUser, {})).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // findOne Tests
  // ═══════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return a site by ID', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(mockSite);

      const result = await service.findOne(mockOrganizationUser, 'site-123');

      expect(result).toEqual(mockSite);
      expect(mockPrismaService.site.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'site-123',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException when site not found', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockOrganizationUser, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized scope', async () => {
      const unauthorizedUser: AuthenticatedUser = {
        sub: 'user',
        id: 'user',
        email: 'user@test.com',
        role: 'USER',
        scopeType: ScopeType.DEPARTMENT,
        scopeId: 'dept-123',
      };

      await expect(service.findOne(unauthorizedUser, 'site-123')).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // create Tests
  // ═══════════════════════════════════════════════════════════════

  describe('create', () => {
    const createDto = {
      companyId: 'company-123',
      name: 'New Store',
      domain: 'newstore.com',
    };

    it('should create a site successfully', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.site.findFirst.mockResolvedValue(null); // No existing slug
      mockPrismaService.site.count.mockResolvedValue(0); // No existing sites
      mockCodeGeneratorService.generateSiteCode.mockResolvedValue('NEWS');
      mockPrismaService.site.create.mockResolvedValue({ ...mockSite, name: 'New Store', code: 'NEWS' });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      const result = await service.create(mockOrganizationUser, createDto);

      expect(result.name).toBe('New Store');
      expect(mockCodeGeneratorService.generateSiteCode).toHaveBeenCalledWith('New Store', 'company-123');
      expect(mockAuditLogsService.log).toHaveBeenCalledWith('CREATE', 'Site', expect.any(String), expect.any(Object));
    });

    it('should set first site as default', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.site.findFirst.mockResolvedValue(null);
      mockPrismaService.site.count.mockResolvedValue(0); // First site
      mockCodeGeneratorService.generateSiteCode.mockResolvedValue('NEWS');
      mockPrismaService.site.create.mockResolvedValue({ ...mockSite, isDefault: true });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      await service.create(mockOrganizationUser, createDto);

      expect(mockPrismaService.site.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDefault: true,
          }),
        }),
      );
    });

    it('should unset other defaults when creating with isDefault=true', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.site.findFirst.mockResolvedValue(null);
      mockPrismaService.site.count.mockResolvedValue(2); // Existing sites
      mockPrismaService.site.updateMany.mockResolvedValue({ count: 1 });
      mockCodeGeneratorService.generateSiteCode.mockResolvedValue('NEWS');
      mockPrismaService.site.create.mockResolvedValue({ ...mockSite, isDefault: true });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      await service.create(mockOrganizationUser, { ...createDto, isDefault: true });

      expect(mockPrismaService.site.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'company-123', isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should throw BadRequestException for duplicate slug', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.site.findFirst.mockResolvedValue(mockSite); // Existing slug

      await expect(service.create(mockOrganizationUser, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when company not accessible', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(service.create(mockOrganizationUser, createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthorized scope', async () => {
      const unauthorizedUser: AuthenticatedUser = {
        sub: 'user',
        id: 'user',
        email: 'user@test.com',
        role: 'USER',
        scopeType: ScopeType.DEPARTMENT,
        scopeId: 'dept-123',
      };

      await expect(service.create(unauthorizedUser, createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when companyId is missing for non-COMPANY user', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);

      await expect(service.create(mockOrganizationUser, { name: 'Test' } as any)).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // update Tests
  // ═══════════════════════════════════════════════════════════════

  describe('update', () => {
    const updateDto = { name: 'Updated Store' };

    it('should update a site successfully', async () => {
      mockPrismaService.site.findFirst
        .mockResolvedValueOnce(mockSite) // findOne call
        .mockResolvedValueOnce(null); // Slug check
      mockPrismaService.site.update.mockResolvedValue({ ...mockSite, name: 'Updated Store' });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      const result = await service.update(mockOrganizationUser, 'site-123', updateDto);

      expect(result.name).toBe('Updated Store');
      expect(mockAuditLogsService.log).toHaveBeenCalledWith('UPDATE', 'Site', 'site-123', expect.any(Object));
    });

    it('should update slug when name changes', async () => {
      mockPrismaService.site.findFirst
        .mockResolvedValueOnce(mockSite)
        .mockResolvedValueOnce(null);
      mockPrismaService.site.update.mockResolvedValue({ ...mockSite, name: 'Updated Store', slug: 'updated-store' });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      await service.update(mockOrganizationUser, 'site-123', updateDto);

      expect(mockPrismaService.site.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Updated Store',
            slug: 'updated-store',
          }),
        }),
      );
    });

    it('should throw BadRequestException for duplicate slug after name change', async () => {
      const existingWithDifferentId = { ...mockSite, id: 'site-456' };
      mockPrismaService.site.findFirst
        .mockResolvedValueOnce(mockSite)
        .mockResolvedValueOnce(existingWithDifferentId);

      await expect(
        service.update(mockOrganizationUser, 'site-123', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset other defaults when setting as default', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(mockSite);
      mockPrismaService.site.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.site.update.mockResolvedValue({ ...mockSite, isDefault: true });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      await service.update(mockOrganizationUser, 'site-123', { isDefault: true });

      expect(mockPrismaService.site.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-123',
            isDefault: true,
            id: { not: 'site-123' },
          }),
          data: { isDefault: false },
        }),
      );
    });

    it('should throw NotFoundException when site not found', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(null);

      await expect(service.update(mockOrganizationUser, 'nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // delete Tests
  // ═══════════════════════════════════════════════════════════════

  describe('delete', () => {
    it('should soft delete a non-default site', async () => {
      const nonDefaultSite = { ...mockSite, isDefault: false };
      mockPrismaService.site.findFirst.mockResolvedValue(nonDefaultSite);
      mockPrismaService.site.update.mockResolvedValue({ ...nonDefaultSite, deletedAt: new Date() });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      const result = await service.delete(mockOrganizationUser, 'site-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.site.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            deletedBy: 'user-123',
          }),
        }),
      );
      expect(mockAuditLogsService.log).toHaveBeenCalledWith('SOFT_DELETE', 'Site', 'site-123', expect.any(Object));
    });

    it('should throw BadRequestException when trying to delete default site with other sites', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(mockSite); // isDefault: true
      mockPrismaService.site.count.mockResolvedValue(2); // Other sites exist

      await expect(service.delete(mockOrganizationUser, 'site-123')).rejects.toThrow(BadRequestException);
    });

    it('should allow deleting default site when it is the only site', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(mockSite);
      mockPrismaService.site.count.mockResolvedValue(0); // No other sites
      mockPrismaService.site.update.mockResolvedValue({ ...mockSite, deletedAt: new Date() });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      const result = await service.delete(mockOrganizationUser, 'site-123');

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when site not found', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(null);

      await expect(service.delete(mockOrganizationUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // setDefault Tests
  // ═══════════════════════════════════════════════════════════════

  describe('setDefault', () => {
    it('should set a site as default', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(mockSite);
      mockPrismaService.site.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.site.update.mockResolvedValue({ ...mockSite, isDefault: true });
      mockAuditLogsService.log.mockResolvedValue(undefined);

      const result = await service.setDefault(mockOrganizationUser, 'site-123');

      expect(result.isDefault).toBe(true);
      expect(mockPrismaService.site.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'company-123', isDefault: true },
        data: { isDefault: false },
      });
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when site not found', async () => {
      mockPrismaService.site.findFirst.mockResolvedValue(null);

      await expect(service.setDefault(mockOrganizationUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getStats Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should return site statistics', async () => {
      mockPrismaService.site.count
        .mockResolvedValueOnce(10) // totalSites
        .mockResolvedValueOnce(8); // activeSites
      mockPrismaService.site.groupBy.mockResolvedValue([
        { companyId: 'company-1', _count: 5 },
        { companyId: 'company-2', _count: 5 },
      ]);
      mockPrismaService.company.findMany.mockResolvedValue([
        { id: 'company-1', name: 'Company 1' },
        { id: 'company-2', name: 'Company 2' },
      ]);

      const result = await service.getStats(mockOrganizationUser);

      expect(result).toEqual({
        totalSites: 10,
        activeSites: 8,
        sitesByCompany: expect.arrayContaining([
          expect.objectContaining({ companyId: 'company-1', companyName: 'Company 1', count: 5 }),
          expect.objectContaining({ companyId: 'company-2', companyName: 'Company 2', count: 5 }),
        ]),
      });
    });

    it('should filter stats by companyId when provided', async () => {
      mockPrismaService.site.count.mockResolvedValue(3);
      mockPrismaService.site.groupBy.mockResolvedValue([{ companyId: 'company-1', _count: 3 }]);
      mockPrismaService.company.findMany.mockResolvedValue([{ id: 'company-1', name: 'Company 1' }]);

      await service.getStats(mockOrganizationUser, 'company-1');

      expect(mockPrismaService.site.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
          }),
        }),
      );
    });

    it('should throw ForbiddenException for unauthorized scope', async () => {
      const unauthorizedUser: AuthenticatedUser = {
        sub: 'user',
        id: 'user',
        email: 'user@test.com',
        role: 'USER',
        scopeType: ScopeType.DEPARTMENT,
        scopeId: 'dept-123',
      };

      await expect(service.getStats(unauthorizedUser)).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Access Control Tests
  // ═══════════════════════════════════════════════════════════════

  describe('Access Control', () => {
    it('should scope sites to CLIENT when user is CLIENT-scoped', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      await service.findAll(mockClientUser, {});

      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company: expect.objectContaining({
              clientId: 'client-123',
            }),
          }),
        }),
      );
    });

    it('should scope sites to COMPANY when user is COMPANY-scoped', async () => {
      mockPrismaService.site.findMany.mockResolvedValue([mockSite]);
      mockPrismaService.site.count.mockResolvedValue(1);

      await service.findAll(mockCompanyUser, {});

      expect(mockPrismaService.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-123',
          }),
        }),
      );
    });
  });
});
