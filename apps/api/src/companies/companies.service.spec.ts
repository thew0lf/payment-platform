/**
 * Companies Service Unit Tests
 * Tests for multi-tenant company management with scope-based access control
 * and auto-creation of default Site on company creation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { EntityStatus } from './dto/company.dto';

describe('CompaniesService - Multi-tenant Company Management', () => {
  let service: CompaniesService;

  const mockPrismaService = {
    company: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    client: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    site: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCodeGeneratorService = {
    generateCompanyCode: jest.fn(),
    generateSiteCode: jest.fn(),
  };

  const mockAuditLogsService = {
    log: jest.fn(),
  };

  // Mock users for different scope types
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
    clientId: 'client-123',
  };

  const mockDepartmentUser: AuthenticatedUser = {
    sub: 'user-dept',
    id: 'user-dept',
    email: 'dept@test.com',
    role: 'DEPARTMENT_USER',
    scopeType: ScopeType.DEPARTMENT,
    scopeId: 'dept-123',
    companyId: 'company-123',
    departmentId: 'dept-123',
  };

  const mockClient = {
    id: 'client-123',
    organizationId: 'org-123',
  };

  const mockCompany = {
    id: 'company-123',
    clientId: 'client-123',
    name: 'Test Company',
    slug: 'test-company',
    code: 'TEST',
    domain: 'test.com',
    timezone: 'UTC',
    currency: 'USD',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    client: {
      id: 'client-123',
      name: 'Test Client',
      code: 'TCLT',
      organizationId: 'org-123',
    },
    _count: {
      customers: 5,
      orders: 10,
      users: 3,
      products: 20,
    },
  };

  const mockSite = {
    id: 'site-123',
    companyId: 'company-123',
    name: 'Test Company - Main Site',
    slug: 'test-company-main',
    code: 'TSMS',
    isDefault: true,
    status: 'ACTIVE',
    timezone: 'UTC',
    currency: 'USD',
    locale: 'en',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CodeGeneratorService, useValue: mockCodeGeneratorService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);

    // Reset mocks
    jest.clearAllMocks();

    // Set default mock returns
    mockCodeGeneratorService.generateCompanyCode.mockResolvedValue('TEST');
    mockCodeGeneratorService.generateSiteCode.mockResolvedValue('TSMS');
    mockAuditLogsService.log.mockResolvedValue(undefined);
  });

  describe('findAll', () => {
    it('should return companies for ORGANIZATION user', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([mockCompany]);
      mockPrismaService.company.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrganizationUser, {});

      expect(result).toEqual({ companies: [mockCompany], total: 1 });
      expect(mockPrismaService.company.findMany).toHaveBeenCalled();
    });

    it('should return companies for CLIENT user with proper scope', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.company.findMany.mockResolvedValue([mockCompany]);
      mockPrismaService.company.count.mockResolvedValue(1);

      const result = await service.findAll(mockClientUser, {});

      expect(result).toEqual({ companies: [mockCompany], total: 1 });
      // Verify clientId is scoped to user's client
      const findManyCall = mockPrismaService.company.findMany.mock.calls[0][0];
      expect(findManyCall.where.clientId).toBe('client-123');
    });

    it('should throw ForbiddenException for COMPANY scoped user', async () => {
      await expect(service.findAll(mockCompanyUser, {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for DEPARTMENT scoped user', async () => {
      await expect(service.findAll(mockDepartmentUser, {})).rejects.toThrow(ForbiddenException);
    });

    it('should apply search filter', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([mockCompany]);
      mockPrismaService.company.count.mockResolvedValue(1);

      await service.findAll(mockOrganizationUser, { search: 'test' });

      const findManyCall = mockPrismaService.company.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toEqual([
        { name: { contains: 'test', mode: 'insensitive' } },
        { code: { contains: 'test', mode: 'insensitive' } },
        { domain: { contains: 'test', mode: 'insensitive' } },
      ]);
    });

    it('should apply status filter', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([mockCompany]);
      mockPrismaService.company.count.mockResolvedValue(1);

      await service.findAll(mockOrganizationUser, { status: EntityStatus.ACTIVE });

      const findManyCall = mockPrismaService.company.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe('ACTIVE');
    });

    it('should apply pagination', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([mockCompany]);
      mockPrismaService.company.count.mockResolvedValue(100);

      await service.findAll(mockOrganizationUser, { limit: 10, offset: 20 });

      const findManyCall = mockPrismaService.company.findMany.mock.calls[0][0];
      expect(findManyCall.take).toBe(10);
      expect(findManyCall.skip).toBe(20);
    });
  });

  describe('findOne', () => {
    it('should return a company by ID for ORGANIZATION user', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);

      const result = await service.findOne(mockOrganizationUser, 'company-123');

      expect(result).toEqual(mockCompany);
    });

    it('should throw NotFoundException when company not found', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockOrganizationUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for COMPANY scoped user', async () => {
      await expect(service.findOne(mockCompanyUser, 'company-123')).rejects.toThrow(ForbiddenException);
    });

    it('should scope query for CLIENT user', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);

      await service.findOne(mockClientUser, 'company-123');

      const findFirstCall = mockPrismaService.company.findFirst.mock.calls[0][0];
      expect(findFirstCall.where.clientId).toBe('client-123');
    });
  });

  describe('create', () => {
    const createDto = {
      clientId: 'client-123',
      name: 'New Company',
      domain: 'newcompany.com',
      timezone: 'America/New_York',
      currency: 'USD',
    };

    // Helper to create transaction mock
    const setupTransactionMock = (company: any, site: any) => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txClient = {
          company: { create: jest.fn().mockResolvedValue(company) },
          site: { create: jest.fn().mockResolvedValue(site) },
        };
        return callback(txClient);
      });
    };

    it('should create a company with auto-created default site in a transaction', async () => {
      const createdCompany = {
        ...mockCompany,
        id: 'new-company-123',
        name: 'New Company',
        slug: 'new-company',
        timezone: 'America/New_York',
      };
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      setupTransactionMock(createdCompany, mockSite);

      const result = await service.create(mockOrganizationUser, createDto);

      expect(result.name).toBe('New Company');
      expect(mockCodeGeneratorService.generateCompanyCode).toHaveBeenCalledWith('New Company', 'client-123');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();

      // Verify audit logs for both company and site
      expect(mockAuditLogsService.log).toHaveBeenCalledTimes(2);
      expect(mockAuditLogsService.log).toHaveBeenNthCalledWith(1, 'CREATE', 'Company', expect.any(String), expect.any(Object));
      expect(mockAuditLogsService.log).toHaveBeenNthCalledWith(2, 'CREATE', 'Site', expect.any(String), expect.objectContaining({
        metadata: expect.objectContaining({
          autoCreated: true,
        }),
      }));
    });

    it('should auto-create site with company timezone and currency', async () => {
      const createdCompany = {
        ...mockCompany,
        name: 'New Company',
        slug: 'new-company',
        timezone: 'America/New_York',
        currency: 'EUR',
      };
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      setupTransactionMock(createdCompany, mockSite);

      await service.create(mockOrganizationUser, {
        ...createDto,
        timezone: 'America/New_York',
        currency: 'EUR',
      });

      // Verify the site code generator was called
      expect(mockCodeGeneratorService.generateSiteCode).toHaveBeenCalledWith(
        'New Company - Main Site',
        expect.any(String)
      );
    });

    it('should generate correct site code using company ID', async () => {
      const createdCompany = {
        ...mockCompany,
        id: 'new-company-id',
        name: 'New Company',
        slug: 'new-company',
      };
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      setupTransactionMock(createdCompany, mockSite);

      await service.create(mockOrganizationUser, createDto);

      expect(mockCodeGeneratorService.generateSiteCode).toHaveBeenCalledWith(
        'New Company - Main Site',
        'new-company-id'
      );
    });

    it('should throw BadRequestException when client not found', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue(null);

      await expect(service.create(mockOrganizationUser, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when clientId is missing for ORGANIZATION user', async () => {
      await expect(
        service.create(mockOrganizationUser, { ...createDto, clientId: undefined as any })
      ).rejects.toThrow(BadRequestException);
    });

    it('should force clientId for CLIENT user', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);

      // Track what clientId was used in the transaction
      let usedClientId: string | undefined;
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txClient = {
          company: {
            create: jest.fn().mockImplementation((args) => {
              usedClientId = args.data.clientId;
              return Promise.resolve(mockCompany);
            }),
          },
          site: { create: jest.fn().mockResolvedValue(mockSite) },
        };
        return callback(txClient);
      });

      await service.create(mockClientUser, { ...createDto, clientId: 'different-client' });

      // Should use user's clientId, not the one passed in
      expect(usedClientId).toBe('client-123');
    });

    it('should throw ForbiddenException when CLIENT user tries to create under different client', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      const differentClient = { ...mockClient, id: 'different-client' };
      mockPrismaService.client.findFirst.mockResolvedValue(differentClient);

      await expect(
        service.create(mockClientUser, { ...createDto, clientId: 'different-client' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for COMPANY scoped user', async () => {
      await expect(service.create(mockCompanyUser, createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should rollback both company and site on transaction failure', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      mockPrismaService.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockOrganizationUser, createDto)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Company',
    };

    it('should update a company successfully', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.company.update.mockResolvedValue({ ...mockCompany, ...updateDto });

      const result = await service.update(mockOrganizationUser, 'company-123', updateDto);

      expect(result.name).toBe('Updated Company');
      expect(mockAuditLogsService.log).toHaveBeenCalledWith('UPDATE', 'Company', 'company-123', expect.any(Object));
    });

    it('should update slug when name changes', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.company.update.mockResolvedValue({ ...mockCompany, name: 'New Name', slug: 'new-name' });

      await service.update(mockOrganizationUser, 'company-123', { name: 'New Name' });

      const updateCall = mockPrismaService.company.update.mock.calls[0][0];
      expect(updateCall.data.slug).toBe('new-name');
    });

    it('should throw NotFoundException when company not found', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockOrganizationUser, 'nonexistent', updateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for COMPANY scoped user', async () => {
      await expect(
        service.update(mockCompanyUser, 'company-123', updateDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should scope query for CLIENT user', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.company.update.mockResolvedValue({ ...mockCompany, ...updateDto });

      await service.update(mockClientUser, 'company-123', updateDto);

      const findFirstCall = mockPrismaService.company.findFirst.mock.calls[0][0];
      expect(findFirstCall.where.clientId).toBe('client-123');
    });
  });

  describe('delete', () => {
    it('should soft delete a company', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.company.update.mockResolvedValue({ ...mockCompany, deletedAt: new Date() });

      const result = await service.delete(mockOrganizationUser, 'company-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-123' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        },
      });
      expect(mockAuditLogsService.log).toHaveBeenCalledWith('SOFT_DELETE', 'Company', 'company-123', expect.any(Object));
    });

    it('should throw NotFoundException when company not found', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(service.delete(mockOrganizationUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for COMPANY scoped user', async () => {
      await expect(service.delete(mockCompanyUser, 'company-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats', () => {
    it('should return company statistics', async () => {
      mockPrismaService.company.count
        .mockResolvedValueOnce(10) // totalCompanies
        .mockResolvedValueOnce(8); // activeCompanies
      mockPrismaService.company.groupBy.mockResolvedValue([
        { clientId: 'client-123', _count: 5 },
        { clientId: 'client-456', _count: 3 },
      ]);
      mockPrismaService.client.findMany.mockResolvedValue([
        { id: 'client-123', name: 'Client A' },
        { id: 'client-456', name: 'Client B' },
      ]);

      const result = await service.getStats(mockOrganizationUser);

      expect(result).toEqual({
        totalCompanies: 10,
        activeCompanies: 8,
        companiesByClient: [
          { clientId: 'client-123', clientName: 'Client A', count: 5 },
          { clientId: 'client-456', clientName: 'Client B', count: 3 },
        ],
      });
    });

    it('should scope stats for CLIENT user', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.company.count.mockResolvedValue(5);
      mockPrismaService.company.groupBy.mockResolvedValue([{ clientId: 'client-123', _count: 5 }]);
      mockPrismaService.client.findMany.mockResolvedValue([{ id: 'client-123', name: 'Client A' }]);

      await service.getStats(mockClientUser);

      const countCalls = mockPrismaService.company.count.mock.calls;
      expect(countCalls[0][0].where.clientId).toBe('client-123');
    });

    it('should throw ForbiddenException for COMPANY scoped user', async () => {
      await expect(service.getStats(mockCompanyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Access Control', () => {
    it('should resolve organizationId from client for CLIENT-scoped users', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue({ organizationId: 'org-123' });
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.findAll(mockClientUser, {});

      expect(mockPrismaService.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        select: { organizationId: true },
      });
    });

    it('should throw ForbiddenException when unable to determine organization', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      const userWithNoOrg: AuthenticatedUser = {
        ...mockClientUser,
        organizationId: undefined,
      };

      await expect(service.findAll(userWithNoOrg, {})).rejects.toThrow(ForbiddenException);
    });
  });
});
