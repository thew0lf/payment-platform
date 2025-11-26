import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType } from '@prisma/client';

export interface UserContext {
  sub: string;
  scopeType: ScopeType;
  scopeId: string;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  departmentId?: string;
}

@Injectable()
export class HierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get accessible hierarchy based on user's scope level
   */
  async getAccessibleHierarchy(user: UserContext) {
    const result = {
      clients: [],
      companies: [],
      departments: [],
    };

    switch (user.scopeType) {
      case 'ORGANIZATION':
        // Org level: can see all clients and companies
        result.clients = await this.prisma.client.findMany({
          where: { status: 'ACTIVE' },
          include: {
            _count: {
              select: { companies: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        result.companies = await this.prisma.company.findMany({
          where: { status: 'ACTIVE' },
          include: {
            _count: {
              select: { departments: true, users: true, transactions: true, customers: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        result.departments = await this.prisma.department.findMany({
          where: { status: 'ACTIVE' },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'CLIENT':
        // Client level: can only see their own companies
        result.companies = await this.prisma.company.findMany({
          where: {
            clientId: user.clientId,
            status: 'ACTIVE',
          },
          include: {
            _count: {
              select: { departments: true, users: true, transactions: true, customers: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        const companyIds = result.companies.map(c => c.id);
        result.departments = await this.prisma.department.findMany({
          where: {
            companyId: { in: companyIds },
            status: 'ACTIVE',
          },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'COMPANY':
        // Company level: can only see their own company
        const company = await this.prisma.company.findUnique({
          where: { id: user.companyId },
          include: {
            _count: {
              select: { departments: true, users: true, transactions: true, customers: true },
            },
          },
        });
        if (company) {
          result.companies = [company];
        }

        result.departments = await this.prisma.department.findMany({
          where: {
            companyId: user.companyId,
            status: 'ACTIVE',
          },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'DEPARTMENT':
        // Department level: can only see their own department
        const department = await this.prisma.department.findUnique({
          where: { id: user.departmentId },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
        });
        if (department) {
          result.departments = [department];
        }
        break;
    }

    return result;
  }

  /**
   * Build a where clause that filters data based on user's scope
   */
  buildScopeFilter(user: UserContext, companyIdField = 'companyId') {
    switch (user.scopeType) {
      case 'ORGANIZATION':
        // No filter - can see all
        return {};

      case 'CLIENT':
        // Filter to companies belonging to their client
        return {
          company: {
            clientId: user.clientId,
          },
        };

      case 'COMPANY':
        // Filter to their company only
        return {
          [companyIdField]: user.companyId,
        };

      case 'DEPARTMENT':
        // Filter to their company (departments don't own transactions directly)
        return {
          [companyIdField]: user.companyId,
        };

      default:
        // Most restrictive - no access
        return {
          [companyIdField]: 'NO_ACCESS',
        };
    }
  }

  /**
   * Check if user can access a specific company
   */
  async canAccessCompany(user: UserContext, companyId: string): Promise<boolean> {
    if (user.scopeType === 'ORGANIZATION') {
      return true;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    if (!company) {
      return false;
    }

    if (user.scopeType === 'CLIENT') {
      return company.clientId === user.clientId;
    }

    if (user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT') {
      return companyId === user.companyId;
    }

    return false;
  }

  /**
   * Get company IDs that user can access
   */
  async getAccessibleCompanyIds(user: UserContext): Promise<string[]> {
    switch (user.scopeType) {
      case 'ORGANIZATION':
        const allCompanies = await this.prisma.company.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true },
        });
        return allCompanies.map(c => c.id);

      case 'CLIENT':
        const clientCompanies = await this.prisma.company.findMany({
          where: { clientId: user.clientId, status: 'ACTIVE' },
          select: { id: true },
        });
        return clientCompanies.map(c => c.id);

      case 'COMPANY':
      case 'DEPARTMENT':
        return user.companyId ? [user.companyId] : [];

      default:
        return [];
    }
  }
}
