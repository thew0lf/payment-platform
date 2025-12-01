/**
 * Cross-Tenant Access Integration Tests
 *
 * These tests verify that the multi-tenant isolation is working correctly.
 * Users should only be able to access data from companies they have access to:
 *
 * Hierarchy:
 *   ORGANIZATION (platform) → can access everything
 *   CLIENT → can access companies belonging to that client
 *   COMPANY → can only access their own company's data
 *   DEPARTMENT → can only access their company's data
 *
 * Test scenarios:
 * 1. User from Company A tries to access Company B's data → should fail (403)
 * 2. User from Client A tries to access Client B's company → should fail (403)
 * 3. Org-level user can access any company → should succeed
 * 4. Client-level user can access all companies in their client → should succeed
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service';
import { HierarchyService, UserContext } from '../src/hierarchy/hierarchy.service';
import { TestAuthHelper, TEST_DATA, ACCESS_MATRIX } from './helpers/test-auth.helper';
import { ScopeType } from '@prisma/client';

describe('Cross-Tenant Access Control (e2e)', () => {
  let hierarchyService: HierarchyService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authHelper: TestAuthHelper;
  let moduleFixture: TestingModule;

  // Store existing test data IDs from the database
  let existingCompanyIds: string[] = [];
  let existingClientIds: string[] = [];

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret-key',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [PrismaService, HierarchyService],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    hierarchyService = moduleFixture.get<HierarchyService>(HierarchyService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    authHelper = new TestAuthHelper(jwtService);

    // Fetch existing data from the database for testing
    const companies = await prisma.company.findMany({
      take: 3,
      select: { id: true, clientId: true },
    });
    existingCompanyIds = companies.map(c => c.id);
    existingClientIds = [...new Set(companies.map(c => c.clientId))];
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleFixture.close();
  });

  // =================================================================
  // HIERARCHY SERVICE UNIT TESTS
  // =================================================================

  describe('HierarchyService.canAccessCompany', () => {
    it('ORGANIZATION user should access any existing company', async () => {
      if (existingCompanyIds.length === 0) {
        console.log('No companies in database, skipping test');
        return;
      }

      const user: UserContext = {
        sub: 'test-org-user',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'test-org-id',
        clientId: undefined,
        companyId: undefined,
      };

      // Should have access to all existing companies
      for (const companyId of existingCompanyIds) {
        const hasAccess = await hierarchyService.canAccessCompany(user, companyId);
        expect(hasAccess).toBe(true);
      }
    });

    it('CLIENT user should only access companies in their client', async () => {
      if (existingClientIds.length === 0 || existingCompanyIds.length === 0) {
        console.log('Not enough data in database, skipping test');
        return;
      }

      // Get companies for the first client
      const clientId = existingClientIds[0];
      const clientCompanies = await prisma.company.findMany({
        where: { clientId },
        select: { id: true },
      });

      if (clientCompanies.length === 0) {
        console.log('No companies for client, skipping test');
        return;
      }

      const user: UserContext = {
        sub: 'test-client-user',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: clientId,
        clientId: clientId,
        companyId: undefined,
      };

      // Should have access to companies in their client
      for (const company of clientCompanies) {
        const hasAccess = await hierarchyService.canAccessCompany(user, company.id);
        expect(hasAccess).toBe(true);
      }

      // Find a company from a different client if available
      const otherCompany = await prisma.company.findFirst({
        where: {
          clientId: { not: clientId },
        },
        select: { id: true },
      });

      if (otherCompany) {
        // Should NOT have access to companies in other clients
        const hasAccess = await hierarchyService.canAccessCompany(user, otherCompany.id);
        expect(hasAccess).toBe(false);
      }
    });

    it('COMPANY user should only access their own company', async () => {
      if (existingCompanyIds.length < 2) {
        console.log('Need at least 2 companies for this test, skipping');
        return;
      }

      const company = await prisma.company.findFirst({
        select: { id: true, clientId: true },
      });

      if (!company) {
        console.log('No company found, skipping test');
        return;
      }

      const user: UserContext = {
        sub: 'test-company-user',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: company.id,
        clientId: company.clientId,
        companyId: company.id,
      };

      // Should have access to their own company
      const hasAccessOwn = await hierarchyService.canAccessCompany(user, company.id);
      expect(hasAccessOwn).toBe(true);

      // Find another company
      const otherCompany = await prisma.company.findFirst({
        where: { id: { not: company.id } },
        select: { id: true },
      });

      if (otherCompany) {
        // Should NOT have access to other companies
        const hasAccessOther = await hierarchyService.canAccessCompany(user, otherCompany.id);
        expect(hasAccessOther).toBe(false);
      }
    });

    it('should return false for non-existent company (CLIENT scope)', async () => {
      // Note: ORGANIZATION scope returns true without checking company existence
      // This test uses CLIENT scope which does check company existence
      const user: UserContext = {
        sub: 'test-client-user',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'test-client-id',
        clientId: 'test-client-id',
      };

      const hasAccess = await hierarchyService.canAccessCompany(user, 'non-existent-company-id');
      expect(hasAccess).toBe(false);
    });

    it('ORGANIZATION scope returns true for any company ID (including non-existent)', async () => {
      // This documents the current behavior - ORGANIZATION bypasses company existence check
      const user: UserContext = {
        sub: 'test-org-user',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'test-org-id',
      };

      const hasAccess = await hierarchyService.canAccessCompany(user, 'non-existent-company-id');
      // Current behavior: true for ORGANIZATION (bypasses DB check)
      expect(hasAccess).toBe(true);
    });
  });

  describe('HierarchyService.getAccessibleCompanyIds', () => {
    it('ORGANIZATION user should get all active company IDs', async () => {
      const user: UserContext = {
        sub: 'test-org-user',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'test-org-id',
      };

      const companyIds = await hierarchyService.getAccessibleCompanyIds(user);

      // Should include existing companies
      for (const existingId of existingCompanyIds) {
        expect(companyIds).toContain(existingId);
      }
    });

    it('CLIENT user should only get company IDs from their client', async () => {
      if (existingClientIds.length === 0) {
        console.log('No clients in database, skipping test');
        return;
      }

      const clientId = existingClientIds[0];
      const user: UserContext = {
        sub: 'test-client-user',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: clientId,
        clientId: clientId,
      };

      const accessibleIds = await hierarchyService.getAccessibleCompanyIds(user);

      // Verify all returned companies belong to the client
      for (const companyId of accessibleIds) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { clientId: true },
        });
        expect(company?.clientId).toBe(clientId);
      }
    });

    it('COMPANY user should only get their own company ID', async () => {
      if (existingCompanyIds.length === 0) {
        console.log('No companies in database, skipping test');
        return;
      }

      const company = await prisma.company.findFirst({
        select: { id: true, clientId: true },
      });

      if (!company) {
        console.log('No company found, skipping test');
        return;
      }

      const user: UserContext = {
        sub: 'test-company-user',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: company.id,
        clientId: company.clientId,
        companyId: company.id,
      };

      const accessibleIds = await hierarchyService.getAccessibleCompanyIds(user);
      expect(accessibleIds).toEqual([company.id]);
    });
  });

  describe('HierarchyService.buildScopeFilter', () => {
    it('ORGANIZATION user should get empty filter (access all)', () => {
      const user: UserContext = {
        sub: 'test-org-user',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'test-org-id',
      };

      const filter = hierarchyService.buildScopeFilter(user);
      expect(filter).toEqual({});
    });

    it('CLIENT user should get client-based filter', () => {
      const user: UserContext = {
        sub: 'test-client-user',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'test-client-id',
        clientId: 'test-client-id',
      };

      const filter = hierarchyService.buildScopeFilter(user);
      expect(filter).toEqual({
        company: {
          clientId: 'test-client-id',
        },
      });
    });

    it('COMPANY user should get company-based filter', () => {
      const user: UserContext = {
        sub: 'test-company-user',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'test-company-id',
        companyId: 'test-company-id',
      };

      const filter = hierarchyService.buildScopeFilter(user);
      expect(filter).toEqual({
        companyId: 'test-company-id',
      });
    });

    it('DEPARTMENT user should get company-based filter', () => {
      const user: UserContext = {
        sub: 'test-dept-user',
        scopeType: 'DEPARTMENT' as ScopeType,
        scopeId: 'test-dept-id',
        companyId: 'test-company-id',
      };

      const filter = hierarchyService.buildScopeFilter(user);
      expect(filter).toEqual({
        companyId: 'test-company-id',
      });
    });

    it('should support custom companyId field name', () => {
      const user: UserContext = {
        sub: 'test-company-user',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'test-company-id',
        companyId: 'test-company-id',
      };

      const filter = hierarchyService.buildScopeFilter(user, 'merchantCompanyId');
      expect(filter).toEqual({
        merchantCompanyId: 'test-company-id',
      });
    });
  });

  // =================================================================
  // TEST AUTH HELPER TESTS
  // =================================================================

  describe('TestAuthHelper', () => {
    it('should generate valid JWT tokens', () => {
      const token = authHelper.generateToken(TEST_DATA.orgUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate correct auth header', () => {
      const header = authHelper.getAuthHeader(TEST_DATA.companyA1User);
      expect(header).toHaveProperty('Authorization');
      expect(header.Authorization).toMatch(/^Bearer .+$/);
    });

    it('should include correct claims in token', () => {
      const token = authHelper.generateToken(TEST_DATA.clientAUser);
      const decoded = jwtService.decode(token) as any;

      expect(decoded.sub).toBe(TEST_DATA.clientAUser.id);
      expect(decoded.email).toBe(TEST_DATA.clientAUser.email);
      expect(decoded.scopeType).toBe(TEST_DATA.clientAUser.scopeType);
      expect(decoded.scopeId).toBe(TEST_DATA.clientAUser.scopeId);
    });
  });

  // =================================================================
  // ACCESS MATRIX VALIDATION
  // =================================================================

  describe('Access Matrix Validation', () => {
    it('should define correct access for organization user', () => {
      const orgAccessMap = ACCESS_MATRIX[TEST_DATA.orgUser.id];

      // Org user should have access to all companies
      expect(orgAccessMap[TEST_DATA.companies.a1.id]).toBe(true);
      expect(orgAccessMap[TEST_DATA.companies.a2.id]).toBe(true);
      expect(orgAccessMap[TEST_DATA.companies.b1.id]).toBe(true);
    });

    it('should define correct access for client A user', () => {
      const clientAAccessMap = ACCESS_MATRIX[TEST_DATA.clientAUser.id];

      // Client A user should access A1, A2 but NOT B1
      expect(clientAAccessMap[TEST_DATA.companies.a1.id]).toBe(true);
      expect(clientAAccessMap[TEST_DATA.companies.a2.id]).toBe(true);
      expect(clientAAccessMap[TEST_DATA.companies.b1.id]).toBe(false);
    });

    it('should define correct access for client B user', () => {
      const clientBAccessMap = ACCESS_MATRIX[TEST_DATA.clientBUser.id];

      // Client B user should access B1 but NOT A1 or A2
      expect(clientBAccessMap[TEST_DATA.companies.a1.id]).toBe(false);
      expect(clientBAccessMap[TEST_DATA.companies.a2.id]).toBe(false);
      expect(clientBAccessMap[TEST_DATA.companies.b1.id]).toBe(true);
    });

    it('should define correct access for company A1 user', () => {
      const companyA1AccessMap = ACCESS_MATRIX[TEST_DATA.companyA1User.id];

      // Company A1 user should only access A1
      expect(companyA1AccessMap[TEST_DATA.companies.a1.id]).toBe(true);
      expect(companyA1AccessMap[TEST_DATA.companies.a2.id]).toBe(false);
      expect(companyA1AccessMap[TEST_DATA.companies.b1.id]).toBe(false);
    });

    it('should define correct access for company B1 user', () => {
      const companyB1AccessMap = ACCESS_MATRIX[TEST_DATA.companyB1User.id];

      // Company B1 user should only access B1
      expect(companyB1AccessMap[TEST_DATA.companies.a1.id]).toBe(false);
      expect(companyB1AccessMap[TEST_DATA.companies.a2.id]).toBe(false);
      expect(companyB1AccessMap[TEST_DATA.companies.b1.id]).toBe(true);
    });
  });

  // =================================================================
  // SECURITY SCENARIO TESTS
  // =================================================================

  describe('Security Scenarios', () => {
    it('Cross-client access should be denied', async () => {
      // Simulate a CLIENT A user trying to access CLIENT B's company
      if (existingClientIds.length < 2) {
        console.log('Need at least 2 clients for this test, skipping');
        return;
      }

      const [clientA, clientB] = existingClientIds;

      // Find a company in Client B
      const companyInB = await prisma.company.findFirst({
        where: { clientId: clientB },
        select: { id: true },
      });

      if (!companyInB) {
        console.log('No company in Client B, skipping test');
        return;
      }

      const clientAUser: UserContext = {
        sub: 'test-client-a-user',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: clientA,
        clientId: clientA,
      };

      // Client A user should NOT be able to access Company B
      const hasAccess = await hierarchyService.canAccessCompany(clientAUser, companyInB.id);
      expect(hasAccess).toBe(false);
    });

    it('Cross-company access within same client should be denied for COMPANY scope', async () => {
      // Find two companies in the same client
      const clientWithMultipleCompanies = await prisma.company.groupBy({
        by: ['clientId'],
        _count: { id: true },
        having: {
          id: { _count: { gte: 2 } },
        },
      });

      if (clientWithMultipleCompanies.length === 0) {
        console.log('No client with multiple companies, skipping test');
        return;
      }

      const clientId = clientWithMultipleCompanies[0].clientId;
      const companies = await prisma.company.findMany({
        where: { clientId },
        take: 2,
        select: { id: true },
      });

      const [companyA, companyB] = companies;

      const companyAUser: UserContext = {
        sub: 'test-company-a-user',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: companyA.id,
        clientId: clientId,
        companyId: companyA.id,
      };

      // Company A user should NOT be able to access Company B
      // (even though they're in the same client)
      const hasAccess = await hierarchyService.canAccessCompany(companyAUser, companyB.id);
      expect(hasAccess).toBe(false);
    });
  });
});
