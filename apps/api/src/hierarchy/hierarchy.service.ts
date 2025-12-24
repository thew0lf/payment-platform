import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType, DataClassification } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../audit-logs/types/audit-log.types';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Log an access denied event and throw ForbiddenException
   * SOC2 CC6.2 / PCI-DSS 10.2.4 - Track and log all failed access attempts
   *
   * @param user - The user who attempted the access
   * @param resource - Description of the resource they tried to access
   * @param entityType - The type of entity (e.g., 'Company', 'Order')
   * @param entityId - The ID of the entity they tried to access
   * @param message - Custom error message (default: 'Access denied')
   */
  async denyAccess(
    user: UserContext,
    resource: string,
    entityType?: string,
    entityId?: string,
    message = 'Access denied',
  ): Promise<never> {
    // Log the access denied event for SOC2/PCI compliance
    await this.auditLogsService.log(
      AuditAction.ACCESS_DENIED,
      entityType || 'unknown',
      entityId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          attemptedResource: resource,
          userScopeType: user.scopeType,
          userScopeId: user.scopeId,
          reason: message,
        },
      },
    );

    throw new ForbiddenException(message);
  }

  /**
   * Check company access and throw with audit logging if denied
   * Combines canAccessCompany check with access denial logging
   */
  async validateCompanyAccess(
    user: UserContext,
    companyId: string,
    operation: string,
  ): Promise<void> {
    const hasAccess = await this.canAccessCompany(user, companyId);
    if (!hasAccess) {
      await this.denyAccess(
        user,
        `${operation} for company ${companyId}`,
        AuditEntity.COMPANY,
        companyId,
        'Access denied to this company',
      );
    }
  }

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

  /**
   * Verify that an entity (CLIENT, COMPANY, DEPARTMENT, TEAM) belongs to a given organization
   * This is used for organization-level admins to validate they can access a specific scope
   */
  async verifyEntityInOrganization(
    organizationId: string,
    scopeType: string,
    scopeId: string,
  ): Promise<boolean> {
    switch (scopeType) {
      case 'ORGANIZATION':
        // Organization can only manage itself
        return scopeId === organizationId;

      case 'CLIENT':
        // Check if client belongs to the organization
        // Note: If clients have organizationId field, check it
        // For now, we assume all clients are in the organization (platform-level)
        const client = await this.prisma.client.findUnique({
          where: { id: scopeId },
          select: { id: true },
        });
        return !!client; // Client exists = valid (adjust if clients have organizationId)

      case 'COMPANY':
        // Check if company exists (and belongs to a valid client)
        const company = await this.prisma.company.findUnique({
          where: { id: scopeId },
          select: { id: true, clientId: true },
        });
        return !!company;

      case 'DEPARTMENT':
        // Check if department exists and is part of a company in the organization
        const department = await this.prisma.department.findUnique({
          where: { id: scopeId },
          select: { id: true, companyId: true },
        });
        return !!department;

      case 'TEAM':
        // Check if team exists and is part of a department in the organization
        const team = await this.prisma.team.findUnique({
          where: { id: scopeId },
          select: { id: true, departmentId: true },
        });
        return !!team;

      default:
        return false;
    }
  }

  /**
   * Verify that a client can access a specific company
   */
  async verifyCompanyInClient(clientId: string, companyId: string): Promise<boolean> {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        clientId: clientId,
      },
      select: { id: true },
    });
    return !!company;
  }

  // ═══════════════════════════════════════════════════════════════
  // USER MANAGEMENT SCOPE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get the Prisma where clause for querying users based on the actor's scope.
   *
   * - ORGANIZATION: Can see all users in the organization
   * - CLIENT: Can see CLIENT-level users + all COMPANY users under their client's companies
   * - COMPANY: Can see only users in their company
   */
  async getUserScopeFilter(user: UserContext): Promise<any> {
    switch (user.scopeType) {
      case 'ORGANIZATION':
        // Organization users can see everyone
        return { organizationId: user.organizationId };

      case 'CLIENT':
        // Client users can see:
        // 1. CLIENT-level users belonging to their client
        // 2. COMPANY-level users whose company belongs to their client
        const clientCompanyIds = await this.prisma.company.findMany({
          where: { clientId: user.clientId, deletedAt: null },
          select: { id: true },
        });
        const companyIds = clientCompanyIds.map(c => c.id);

        return {
          OR: [
            // CLIENT-level users in their client
            { clientId: user.clientId, scopeType: 'CLIENT' },
            // COMPANY-level users in companies under their client
            { companyId: { in: companyIds } },
          ],
        };

      case 'COMPANY':
        // Company users can only see users in their company
        return { companyId: user.companyId };

      case 'DEPARTMENT':
      case 'TEAM':
        // Department/Team users can see users in their company
        return { companyId: user.companyId };

      default:
        // No access
        return { id: 'NO_ACCESS' };
    }
  }

  /**
   * Check if the actor can manage (invite/update/delete) the target user.
   *
   * Rules:
   * - ORGANIZATION: Can manage any user in the organization
   * - CLIENT: Can manage CLIENT-level users in their client + COMPANY users under their client
   * - COMPANY: Can manage only COMPANY users in their own company
   *
   * Note: Role hierarchy is checked separately in the service.
   */
  async canManageUser(actor: UserContext, targetUserId: string): Promise<boolean> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        scopeType: true,
        organizationId: true,
        clientId: true,
        companyId: true,
        company: { select: { clientId: true } },
      },
    });

    if (!targetUser) return false;

    switch (actor.scopeType) {
      case 'ORGANIZATION':
        // Can manage anyone in the organization
        return targetUser.organizationId === actor.organizationId;

      case 'CLIENT':
        // Can manage CLIENT-level users in their client
        if (targetUser.scopeType === 'CLIENT' && targetUser.clientId === actor.clientId) {
          return true;
        }
        // Can manage COMPANY-level users whose company belongs to their client
        if (targetUser.companyId && targetUser.company?.clientId === actor.clientId) {
          return true;
        }
        return false;

      case 'COMPANY':
        // Can only manage users in their own company
        return targetUser.companyId === actor.companyId;

      case 'DEPARTMENT':
      case 'TEAM':
        // Department/Team level users can manage users in their company (if they have manager role)
        return targetUser.companyId === actor.companyId;

      default:
        return false;
    }
  }

  /**
   * Validate that an actor can invite a user into a specific scope.
   *
   * Rules:
   * - Cannot invite into a scope higher than your own
   * - ORGANIZATION: Can invite into ORG, any CLIENT, or any COMPANY
   * - CLIENT: Can invite into their CLIENT or any COMPANY under their client
   * - COMPANY: Can only invite into their own COMPANY
   */
  async canInviteToScope(
    actor: UserContext,
    targetScopeType: ScopeType,
    targetScopeId: string,
  ): Promise<boolean> {
    // Scope hierarchy: ORG > CLIENT > COMPANY > DEPARTMENT > TEAM
    const scopeHierarchy: Record<ScopeType, number> = {
      ORGANIZATION: 5,
      CLIENT: 4,
      COMPANY: 3,
      DEPARTMENT: 2,
      TEAM: 1,
      VENDOR: 4,
      VENDOR_COMPANY: 3,
      VENDOR_DEPARTMENT: 2,
      VENDOR_TEAM: 1,
    };

    // Cannot invite into a scope higher than your own
    if (scopeHierarchy[targetScopeType] > scopeHierarchy[actor.scopeType]) {
      return false;
    }

    switch (actor.scopeType) {
      case 'ORGANIZATION':
        // Can invite anywhere in the organization
        return this.verifyEntityInOrganization(actor.organizationId!, targetScopeType as string, targetScopeId);

      case 'CLIENT':
        if (targetScopeType === 'CLIENT') {
          // Can only invite into their own client
          return targetScopeId === actor.clientId;
        }
        if (targetScopeType === 'COMPANY') {
          // Can invite into companies under their client
          return this.verifyCompanyInClient(actor.clientId!, targetScopeId);
        }
        if (targetScopeType === 'DEPARTMENT' || targetScopeType === 'TEAM') {
          // Need to verify the department/team belongs to a company under their client
          const department = await this.prisma.department.findUnique({
            where: { id: targetScopeId },
            include: { company: true },
          });
          if (!department) return false;
          return department.company?.clientId === actor.clientId;
        }
        return false;

      case 'COMPANY':
        if (targetScopeType === 'COMPANY') {
          // Can only invite into their own company
          return targetScopeId === actor.companyId;
        }
        if (targetScopeType === 'DEPARTMENT' || targetScopeType === 'TEAM') {
          // Verify department/team belongs to their company
          const department = await this.prisma.department.findUnique({
            where: { id: targetScopeId },
            select: { companyId: true },
          });
          return department?.companyId === actor.companyId;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get the scope context for inviting a new user.
   * Returns the organizationId, clientId, companyId based on the target scope.
   */
  async getScopeContext(scopeType: ScopeType, scopeId: string): Promise<{
    organizationId?: string;
    clientId?: string;
    companyId?: string;
  }> {
    switch (scopeType) {
      case 'ORGANIZATION':
        return { organizationId: scopeId };

      case 'CLIENT':
        const client = await this.prisma.client.findUnique({
          where: { id: scopeId },
          select: { organizationId: true },
        });
        return {
          organizationId: client?.organizationId,
          clientId: scopeId,
        };

      case 'COMPANY':
        const company = await this.prisma.company.findUnique({
          where: { id: scopeId },
          select: { clientId: true, client: { select: { organizationId: true } } },
        });
        return {
          organizationId: company?.client?.organizationId,
          clientId: company?.clientId,
          companyId: scopeId,
        };

      case 'DEPARTMENT':
        const department = await this.prisma.department.findUnique({
          where: { id: scopeId },
          select: {
            companyId: true,
            company: {
              select: {
                clientId: true,
                client: { select: { organizationId: true } },
              },
            },
          },
        });
        return {
          organizationId: department?.company?.client?.organizationId,
          clientId: department?.company?.clientId,
          companyId: department?.companyId,
        };

      default:
        return {};
    }
  }
}
