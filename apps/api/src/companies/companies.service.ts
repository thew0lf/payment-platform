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
   * List all companies (organization-level only)
   */
  async findAll(user: any, query: CompanyQueryDto) {
    // Only organization-level users can access all companies
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can access all companies');
    }

    const { clientId, search, status, sortBy = 'createdAt', sortOrder = 'desc', limit = 50, offset = 0 } = query;

    const where: any = {
      client: { organizationId: user.organizationId },
      deletedAt: null,
    };

    if (clientId) {
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
   */
  async findOne(user: any, id: string) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can access companies');
    }

    const company = await this.prisma.company.findFirst({
      where: {
        id,
        client: { organizationId: user.organizationId },
        deletedAt: null,
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
   */
  async getStats(user: any) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can access company stats');
    }

    const [
      totalCompanies,
      activeCompanies,
      companiesByClient,
    ] = await Promise.all([
      this.prisma.company.count({
        where: {
          client: { organizationId: user.organizationId },
          deletedAt: null,
        },
      }),
      this.prisma.company.count({
        where: {
          client: { organizationId: user.organizationId },
          deletedAt: null,
          status: 'ACTIVE',
        },
      }),
      this.prisma.company.groupBy({
        by: ['clientId'],
        where: {
          client: { organizationId: user.organizationId },
          deletedAt: null,
        },
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
   */
  async create(user: any, data: CreateCompanyDto) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can create companies');
    }

    // Verify client exists and belongs to organization
    const client = await this.prisma.client.findFirst({
      where: {
        id: data.clientId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw new BadRequestException('Client not found or does not belong to your organization');
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Generate unique code
    const code = await this.codeGenerator.generateCompanyCode(data.name, data.clientId);

    const company = await this.prisma.company.create({
      data: {
        clientId: data.clientId,
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

    // Audit log
    await this.auditLogs.log('CREATE', 'Company', company.id, {
      userId: user.sub,
      scopeType: 'ORGANIZATION',
      scopeId: user.organizationId,
      metadata: { name: data.name, code, clientId: data.clientId },
    });

    return company;
  }

  /**
   * Update an existing company
   */
  async update(user: any, id: string, data: UpdateCompanyDto) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can update companies');
    }

    // Verify company exists and belongs to organization
    const existing = await this.prisma.company.findFirst({
      where: {
        id,
        client: { organizationId: user.organizationId },
        deletedAt: null,
      },
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
      scopeType: 'ORGANIZATION',
      scopeId: user.organizationId,
      changes,
    });

    return company;
  }

  /**
   * Soft delete a company
   */
  async delete(user: any, id: string) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can delete companies');
    }

    // Verify company exists and belongs to organization
    const existing = await this.prisma.company.findFirst({
      where: {
        id,
        client: { organizationId: user.organizationId },
        deletedAt: null,
      },
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
      scopeType: 'ORGANIZATION',
      scopeId: user.organizationId,
      metadata: { name: existing.name, clientId: existing.clientId },
    });

    return { success: true };
  }
}
