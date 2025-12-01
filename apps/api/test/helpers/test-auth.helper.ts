/**
 * Test Authentication Helper
 *
 * Provides utilities for creating test users with different scope levels
 * to verify cross-tenant access controls.
 */
import { JwtService } from '@nestjs/jwt';
import { ScopeType } from '@prisma/client';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  scopeType: ScopeType;
  scopeId: string;
  role: string;
  organizationId: string | null;
  clientId: string | null;
  companyId: string | null;
  departmentId: string | null;
}

/**
 * Test data for multi-tenant isolation testing
 */
export const TEST_DATA = {
  // Organization level (platform admin)
  orgUser: {
    id: 'test-org-user-1',
    email: 'org.admin@test.com',
    firstName: 'Org',
    lastName: 'Admin',
    avatar: null,
    scopeType: 'ORGANIZATION' as ScopeType,
    scopeId: 'test-org-1',
    role: 'SUPER_ADMIN',
    organizationId: 'test-org-1',
    clientId: null,
    companyId: null,
    departmentId: null,
  },

  // Client A - owns Company A1 and A2
  clientAUser: {
    id: 'test-client-a-user',
    email: 'client.a@test.com',
    firstName: 'Client',
    lastName: 'AAdmin',
    avatar: null,
    scopeType: 'CLIENT' as ScopeType,
    scopeId: 'test-client-a',
    role: 'ADMIN',
    organizationId: null,
    clientId: 'test-client-a',
    companyId: null,
    departmentId: null,
  },

  // Client B - owns Company B1
  clientBUser: {
    id: 'test-client-b-user',
    email: 'client.b@test.com',
    firstName: 'Client',
    lastName: 'BAdmin',
    avatar: null,
    scopeType: 'CLIENT' as ScopeType,
    scopeId: 'test-client-b',
    role: 'ADMIN',
    organizationId: null,
    clientId: 'test-client-b',
    companyId: null,
    departmentId: null,
  },

  // Company A1 user (belongs to Client A)
  companyA1User: {
    id: 'test-company-a1-user',
    email: 'company.a1@test.com',
    firstName: 'Company',
    lastName: 'A1User',
    avatar: null,
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'test-company-a1',
    role: 'MANAGER',
    organizationId: null,
    clientId: 'test-client-a',
    companyId: 'test-company-a1',
    departmentId: null,
  },

  // Company A2 user (belongs to Client A)
  companyA2User: {
    id: 'test-company-a2-user',
    email: 'company.a2@test.com',
    firstName: 'Company',
    lastName: 'A2User',
    avatar: null,
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'test-company-a2',
    role: 'MANAGER',
    organizationId: null,
    clientId: 'test-client-a',
    companyId: 'test-company-a2',
    departmentId: null,
  },

  // Company B1 user (belongs to Client B)
  companyB1User: {
    id: 'test-company-b1-user',
    email: 'company.b1@test.com',
    firstName: 'Company',
    lastName: 'B1User',
    avatar: null,
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'test-company-b1',
    role: 'MANAGER',
    organizationId: null,
    clientId: 'test-client-b',
    companyId: 'test-company-b1',
    departmentId: null,
  },

  // Test entities
  companies: {
    a1: { id: 'test-company-a1', clientId: 'test-client-a', name: 'Company A1' },
    a2: { id: 'test-company-a2', clientId: 'test-client-a', name: 'Company A2' },
    b1: { id: 'test-company-b1', clientId: 'test-client-b', name: 'Company B1' },
  },
};

/**
 * Helper class for generating test JWT tokens
 */
export class TestAuthHelper {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generate a JWT token for a test user
   */
  generateToken(user: TestUser): string {
    const payload = {
      sub: user.id,
      email: user.email,
      scopeType: user.scopeType,
      scopeId: user.scopeId,
      role: user.role,
      type: 'access',
    };

    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }

  /**
   * Get authorization header for a test user
   */
  getAuthHeader(user: TestUser): { Authorization: string } {
    return { Authorization: `Bearer ${this.generateToken(user)}` };
  }
}

/**
 * Access matrix for cross-tenant tests
 * Defines which users should have access to which companies
 */
export const ACCESS_MATRIX = {
  // Org user can access all companies
  [TEST_DATA.orgUser.id]: {
    [TEST_DATA.companies.a1.id]: true,
    [TEST_DATA.companies.a2.id]: true,
    [TEST_DATA.companies.b1.id]: true,
  },
  // Client A user can access only companies in Client A
  [TEST_DATA.clientAUser.id]: {
    [TEST_DATA.companies.a1.id]: true,
    [TEST_DATA.companies.a2.id]: true,
    [TEST_DATA.companies.b1.id]: false, // Should NOT have access
  },
  // Client B user can access only companies in Client B
  [TEST_DATA.clientBUser.id]: {
    [TEST_DATA.companies.a1.id]: false, // Should NOT have access
    [TEST_DATA.companies.a2.id]: false, // Should NOT have access
    [TEST_DATA.companies.b1.id]: true,
  },
  // Company A1 user can only access Company A1
  [TEST_DATA.companyA1User.id]: {
    [TEST_DATA.companies.a1.id]: true,
    [TEST_DATA.companies.a2.id]: false, // Should NOT have access
    [TEST_DATA.companies.b1.id]: false, // Should NOT have access
  },
  // Company A2 user can only access Company A2
  [TEST_DATA.companyA2User.id]: {
    [TEST_DATA.companies.a1.id]: false, // Should NOT have access
    [TEST_DATA.companies.a2.id]: true,
    [TEST_DATA.companies.b1.id]: false, // Should NOT have access
  },
  // Company B1 user can only access Company B1
  [TEST_DATA.companyB1User.id]: {
    [TEST_DATA.companies.a1.id]: false, // Should NOT have access
    [TEST_DATA.companies.a2.id]: false, // Should NOT have access
    [TEST_DATA.companies.b1.id]: true,
  },
};
