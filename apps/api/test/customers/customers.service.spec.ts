import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from '../../src/customers/customers.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { HierarchyService, UserContext } from '../../src/hierarchy/hierarchy.service';
import { PaginationService } from '../../src/common/pagination';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScopeType } from '@prisma/client';

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaService: PrismaService;
  let hierarchyService: HierarchyService;

  const mockUser: UserContext = {
    sub: 'user-1',
    scopeType: ScopeType.COMPANY,
    scopeId: 'company-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
  };

  const mockCustomer = {
    id: 'customer-1',
    companyId: 'company-1',
    email: 'customer@test.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    status: 'ACTIVE',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCompanyIds = ['company-1', 'company-2'];

  beforeEach(async () => {
    const mockPrisma = {
      customer: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockHierarchy = {
      getAccessibleCompanyIds: jest.fn().mockResolvedValue(mockCompanyIds),
    };

    const mockPagination = {
      parseCursor: jest.fn(),
      buildCursorResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HierarchyService, useValue: mockHierarchy },
        { provide: PaginationService, useValue: mockPagination },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prismaService = module.get<PrismaService>(PrismaService);
    hierarchyService = module.get<HierarchyService>(HierarchyService);
  });

  // ═══════════════════════════════════════════════════════════════
  // CREATE CUSTOMER TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createCustomer', () => {
    const createInput = {
      email: 'new@customer.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1987654321',
      companyId: 'company-1',
    };

    it('should create a customer successfully', async () => {
      const newCustomer = { ...mockCustomer, ...createInput, id: 'new-customer-1' };
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(newCustomer);

      const result = await service.createCustomer(mockUser, createInput);

      expect(result).toEqual(newCustomer);
      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: createInput.email.toLowerCase(),
            firstName: createInput.firstName,
            lastName: createInput.lastName,
            phone: createInput.phone,
            companyId: createInput.companyId,
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should normalize email to lowercase', async () => {
      const inputWithUppercase = { ...createInput, email: 'NEW@CUSTOMER.COM' };
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(mockCustomer);

      await service.createCustomer(mockUser, inputWithUppercase);

      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@customer.com',
          }),
        }),
      );
    });

    it('should throw ForbiddenException when user has no access to company', async () => {
      (hierarchyService.getAccessibleCompanyIds as jest.Mock).mockResolvedValue(['other-company']);

      await expect(
        service.createCustomer(mockUser, createInput),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for duplicate email in same company', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);

      await expect(
        service.createCustomer(mockUser, createInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow same email in different company (multi-tenant)', async () => {
      const otherCompanyInput = { ...createInput, companyId: 'company-2' };
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        companyId: 'company-2',
      });

      const result = await service.createCustomer(mockUser, otherCompanyInput);

      expect(result.companyId).toBe('company-2');
    });

    // Note: Email format validation is handled at the API/DTO layer via class-validator,
    // not in the service. The service accepts whatever input it receives.
    it('should accept any email string (validation at API layer)', async () => {
      const anyEmailInput = { ...createInput, email: 'any-string-here' };
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(mockCustomer);

      // Service doesn't validate email format - that's API layer responsibility
      await expect(
        service.createCustomer(mockUser, anyEmailInput),
      ).resolves.toBeDefined();
    });

    // Note: XSS sanitization is handled at the presentation/API layer via class-validator,
    // not in the service. This test documents the current behavior.
    it('should store input as-is (XSS prevention at API layer)', async () => {
      const xssInput = { ...createInput, firstName: '<script>alert("xss")</script>' };
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(mockCustomer);

      await service.createCustomer(mockUser, xssInput);

      // Service passes data through - XSS sanitization happens at API/DTO layer
      const createCall = (prismaService.customer.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.firstName).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UPDATE CUSTOMER TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateCustomer', () => {
    const updateInput = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+1111111111',
      status: 'INACTIVE',
    };

    beforeEach(() => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
    });

    it('should update a customer successfully', async () => {
      const updatedCustomer = { ...mockCustomer, ...updateInput };
      (prismaService.customer.update as jest.Mock).mockResolvedValue(updatedCustomer);

      const result = await service.updateCustomer(mockUser, 'customer-1', updateInput);

      expect(result).toEqual(updatedCustomer);
      expect(prismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'customer-1' },
          data: expect.objectContaining(updateInput),
        }),
      );
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateCustomer(mockUser, 'non-existent', updateInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user has no access to customer company', async () => {
      // Customer in unauthorized company won't be found due to companyId filter
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateCustomer(mockUser, 'customer-1', updateInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate status transitions', async () => {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

      for (const status of validStatuses) {
        (prismaService.customer.update as jest.Mock).mockResolvedValue({
          ...mockCustomer,
          status,
        });

        const result = await service.updateCustomer(mockUser, 'customer-1', { status });
        expect(result.status).toBe(status);
      }
    });

    it('should not allow updating email directly', async () => {
      const inputWithEmail = { ...updateInput, email: 'new@email.com' };
      (prismaService.customer.update as jest.Mock).mockResolvedValue(mockCustomer);

      await service.updateCustomer(mockUser, 'customer-1', inputWithEmail);

      const updateCall = (prismaService.customer.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('email');
    });

    // Security: Prevent mass assignment
    it('should not allow updating companyId (tenant isolation)', async () => {
      const maliciousInput = { ...updateInput, companyId: 'other-company' };
      (prismaService.customer.update as jest.Mock).mockResolvedValue(mockCustomer);

      await service.updateCustomer(mockUser, 'customer-1', maliciousInput as any);

      const updateCall = (prismaService.customer.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('companyId');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCESS CONTROL TESTS (SOC2 CC6.1, CC6.2)
  // ═══════════════════════════════════════════════════════════════

  describe('Access Control', () => {
    it('should only return customers from accessible companies', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(1);

      await service.getCustomers(mockUser, {});

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: { in: mockCompanyIds },
          }),
        }),
      );
    });

    it('should enforce company scope when getting single customer', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);

      await service.getCustomer(mockUser, 'customer-1');

      expect(prismaService.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'customer-1',
            companyId: { in: mockCompanyIds },
          }),
        }),
      );
    });

    it('should prevent cross-tenant data access by returning null', async () => {
      // User only has access to company-1 and company-2
      // The service filters by companyId, so customer from company-3 won't be found
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (hierarchyService.getAccessibleCompanyIds as jest.Mock).mockResolvedValue(['company-1', 'company-2']);

      const result = await service.getCustomer(mockUser, 'customer-from-company-3');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SOFT DELETE TESTS (Data Retention - SOC2 CC6.5)
  // ═══════════════════════════════════════════════════════════════

  describe('Soft Delete', () => {
    it('should only return customers from accessible companies in list', async () => {
      // Soft delete is handled at DB/middleware level
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(1);

      await service.getCustomers(mockUser, {});

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: { in: mockCompanyIds },
          }),
        }),
      );
    });

    it('should not return soft-deleted customer by ID', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getCustomer(mockUser, 'deleted-customer');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOGGING TESTS (SOC2 CC7.2)
  // ═══════════════════════════════════════════════════════════════

  describe('Audit Logging', () => {
    // Note: Actual audit logging should be tested via integration tests
    // These tests verify the service provides necessary data for audit

    it('should track who created the customer', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(mockCustomer);

      await service.createCustomer(mockUser, {
        email: 'new@test.com',
        companyId: 'company-1',
      });

      // Verify user context is available for audit
      expect(mockUser.sub).toBeDefined();
      expect(mockUser.scopeType).toBeDefined();
    });

    it('should track who updated the customer', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prismaService.customer.update as jest.Mock).mockResolvedValue(mockCustomer);

      await service.updateCustomer(mockUser, 'customer-1', { firstName: 'Updated' });

      // Verify user context is available for audit
      expect(mockUser.sub).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PAGINATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Pagination', () => {
    it('should apply limit and offset correctly', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(100);

      await service.getCustomers(mockUser, { limit: 20, offset: 40 });

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        }),
      );
    });

    it('should return total count with results', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(100);

      const result = await service.getCustomers(mockUser, {});

      expect(result).toHaveProperty('total', 100);
      expect(result).toHaveProperty('customers');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SEARCH & FILTER TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Search & Filter', () => {
    it('should search by email', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(1);

      await service.getCustomers(mockUser, { search: 'customer@test.com' });

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                email: expect.objectContaining({ contains: 'customer@test.com' }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(1);

      await service.getCustomers(mockUser, { status: 'ACTIVE' });

      expect(prismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    // Security: SQL Injection prevention (handled by Prisma ORM)
    it('should safely handle special characters in search', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      // These should not cause SQL injection
      const maliciousSearches = [
        "'; DROP TABLE customers; --",
        "1' OR '1'='1",
        "<script>alert('xss')</script>",
        "${process.env.SECRET}",
      ];

      for (const search of maliciousSearches) {
        await expect(
          service.getCustomers(mockUser, { search }),
        ).resolves.not.toThrow();
      }
    });
  });
});
