import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto/company.dto';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Helper to get organizationId for the user
   * For CLIENT users, we get it from their client record
   */
  private async getOrganizationId(user: any): Promise<string> {
    if (user.organizationId) {
      return user.organizationId;
    }

    // For CLIENT-scoped users, get organizationId from their client
    if (user.scopeType === 'CLIENT' && user.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: user.clientId },
        select: { organizationId: true },
      });
      if (client?.organizationId) {
        return client.organizationId;
      }
    }

    throw new ForbiddenException('Unable to determine organization');
  }

  /**
   * List all companies
   * - ORGANIZATION: Can see all companies across all clients
   * - CLIENT: Can see only companies belonging to their client
   */
  async findAll(user: any, query: CompanyQueryDto) {
    // Only organization and client level users can access companies
    if (user.scopeType !== 'ORGANIZATION' && user.scopeType !== 'CLIENT') {
      throw new ForbiddenException('Access denied');
    }

    const { clientId, search, status, sortBy = 'createdAt', sortOrder = 'desc', limit = 50, offset = 0 } = query;

    // Get organizationId (resolves from client for CLIENT-scoped users)
    const organizationId = await this.getOrganizationId(user);

    const where: any = {
      client: { organizationId },
      deletedAt: null,
    };

    // CLIENT users can only see their own client's companies
    if (user.scopeType === 'CLIENT') {
      where.clientId = user.clientId;
    } else if (clientId) {
      // ORGANIZATION users can filter by clientId - verify client belongs to their organization
      const clientBelongsToOrg = await this.prisma.client.findFirst({
        where: {
          id: clientId,
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!clientBelongsToOrg) {
        throw new ForbiddenException('Client not found or does not belong to your organization');
      }

      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              customers: { where: { deletedAt: null } },
              orders: true,
              users: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.company.count({ where }),
    ]);

    return { companies, total };
  }

  /**
   * Get single company by ID
   * - ORGANIZATION: Can access any company in the organization
   * - CLIENT: Can access only companies belonging to their client
   */
  async findOne(user: any, id: string) {
    if (user.scopeType !== 'ORGANIZATION' && user.scopeType !== 'CLIENT') {
      throw new ForbiddenException('Access denied');
    }

    // Get organizationId (resolves from client for CLIENT-scoped users)
    const organizationId = await this.getOrganizationId(user);

    const where: any = {
      id,
      client: { organizationId },
      deletedAt: null,
    };

    // CLIENT users can only access their own client's companies
    if (user.scopeType === 'CLIENT') {
      where.clientId = user.clientId;
    }

    const company = await this.prisma.company.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            customers: { where: { deletedAt: null } },
            orders: true,
            users: { where: { deletedAt: null } },
            products: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  /**
   * Get company stats for dashboard
   * - ORGANIZATION: Stats for all companies across all clients
   * - CLIENT: Stats for companies belonging to their client only
   */
  async getStats(user: any) {
    if (user.scopeType !== 'ORGANIZATION' && user.scopeType !== 'CLIENT') {
      throw new ForbiddenException('Access denied');
    }

    // Get organizationId (resolves from client for CLIENT-scoped users)
    const organizationId = await this.getOrganizationId(user);

    const baseWhere: any = {
      client: { organizationId },
      deletedAt: null,
    };

    // CLIENT users can only see stats for their own companies
    if (user.scopeType === 'CLIENT') {
      baseWhere.clientId = user.clientId;
    }

    const [
      totalCompanies,
      activeCompanies,
      companiesByClient,
    ] = await Promise.all([
      this.prisma.company.count({
        where: baseWhere,
      }),
      this.prisma.company.count({
        where: {
          ...baseWhere,
          status: 'ACTIVE',
        },
      }),
      this.prisma.company.groupBy({
        by: ['clientId'],
        where: baseWhere,
        _count: true,
      }),
    ]);

    // Get client names for the groupBy
    const clientIds = companiesByClient.map(c => c.clientId);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });

    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    return {
      totalCompanies,
      activeCompanies,
      companiesByClient: companiesByClient.map(c => ({
        clientId: c.clientId,
        clientName: clientMap.get(c.clientId) || 'Unknown',
        count: c._count,
      })),
    };
  }

  /**
   * Create a new company
   * - ORGANIZATION: Can create companies under any client
   * - CLIENT: Can only create companies under their own client
   */
  async create(user: any, data: CreateCompanyDto) {
    if (user.scopeType !== 'ORGANIZATION' && user.scopeType !== 'CLIENT') {
      throw new ForbiddenException('Access denied');
    }

    // Get organizationId (resolves from client for CLIENT-scoped users)
    const organizationId = await this.getOrganizationId(user);

    // For CLIENT users, force clientId to be their own client
    const targetClientId = user.scopeType === 'CLIENT' ? user.clientId : data.clientId;

    if (!targetClientId) {
      throw new BadRequestException('Client ID is required');
    }

    // Verify client exists and belongs to organization
    const client = await this.prisma.client.findFirst({
      where: {
        id: targetClientId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw new BadRequestException('Client not found or does not belong to your organization');
    }

    // CLIENT users can only create companies under their own client
    if (user.scopeType === 'CLIENT' && client.id !== user.clientId) {
      throw new ForbiddenException('You can only create companies under your own client');
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Generate unique code
    const code = await this.codeGenerator.generateCompanyCode(data.name, targetClientId);

    // Create Company and default Site in a transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          clientId: targetClientId,
          name: data.name,
          slug,
          code,
          domain: data.domain,
          logo: data.logo,
          timezone: data.timezone || 'UTC',
          currency: data.currency || 'USD',
          status: 'ACTIVE',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              customers: { where: { deletedAt: null } },
              orders: true,
              users: { where: { deletedAt: null } },
            },
          },
        },
      });

      // Auto-create default Site for the new Company
      const siteName = `${data.name} - Main Site`;
      const siteSlug = `${slug}-main`;
      const siteCode = await this.codeGenerator.generateSiteCode(siteName, company.id);

      const defaultSite = await tx.site.create({
        data: {
          companyId: company.id,
          name: siteName,
          slug: siteSlug,
          code: siteCode,
          isDefault: true,
          status: 'ACTIVE',
          timezone: company.timezone || 'UTC',
          currency: company.currency || 'USD',
          locale: 'en',
        },
      });

      return { company, defaultSite, siteName, siteCode };
    });

    const { company, defaultSite, siteName, siteCode } = result;

    // Audit log for company creation
    await this.auditLogs.log('CREATE', 'Company', company.id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      metadata: { name: data.name, code, clientId: targetClientId },
    });

    // Audit log for default site creation
    await this.auditLogs.log('CREATE', 'Site', defaultSite.id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      metadata: {
        name: siteName,
        code: siteCode,
        companyId: company.id,
        autoCreated: true,
      },
    });

    return company;
  }

  /**
   * Update an existing company
   * - ORGANIZATION: Can update any company in the organization
   * - CLIENT: Can only update companies belonging to their client
   */
  async update(user: any, id: string, data: UpdateCompanyDto) {
    if (user.scopeType !== 'ORGANIZATION' && user.scopeType !== 'CLIENT') {
      throw new ForbiddenException('Access denied');
    }

    // Get organizationId (resolves from client for CLIENT-scoped users)
    const organizationId = await this.getOrganizationId(user);

    const where: any = {
      id,
      client: { organizationId },
      deletedAt: null,
    };

    // CLIENT users can only update their own client's companies
    if (user.scopeType === 'CLIENT') {
      where.clientId = user.clientId;
    }

    // Verify company exists and belongs to organization/client
    const existing = await this.prisma.company.findFirst({
      where,
    });

    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    // Update slug if name changed
    const updateData: any = { ...data };
    if (data.name && data.name !== existing.name) {
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const company = await this.prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            customers: { where: { deletedAt: null } },
            orders: true,
            users: { where: { deletedAt: null } },
          },
        },
      },
    });

    // Audit log with changes
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    if (data.name && data.name !== existing.name) {
      changes.name = { before: existing.name, after: data.name };
    }
    if (data.status && data.status !== existing.status) {
      changes.status = { before: existing.status, after: data.status };
    }

    await this.auditLogs.log('UPDATE', 'Company', company.id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      changes,
    });

    return company;
  }

  /**
   * Soft delete a company
   * - ORGANIZATION: Can delete any company in the organization
   * - CLIENT: Can only delete companies belonging to their client
   */
  async delete(user: any, id: string) {
    if (user.scopeType !== 'ORGANIZATION' && user.scopeType !== 'CLIENT') {
      throw new ForbiddenException('Access denied');
    }

    // Get organizationId (resolves from client for CLIENT-scoped users)
    const organizationId = await this.getOrganizationId(user);

    const where: any = {
      id,
      client: { organizationId },
      deletedAt: null,
    };

    // CLIENT users can only delete their own client's companies
    if (user.scopeType === 'CLIENT') {
      where.clientId = user.clientId;
    }

    // Verify company exists and belongs to organization/client
    const existing = await this.prisma.company.findFirst({
      where,
    });

    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    // Soft delete
    await this.prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });

    // Audit log
    await this.auditLogs.log('SOFT_DELETE', 'Company', id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      metadata: { name: existing.name, clientId: existing.clientId },
    });

    return { success: true };
  }
}
