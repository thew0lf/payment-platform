import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto, ClientQueryDto } from './dto/client.dto';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * List all clients (organization-level only)
   */
  async findAll(user: any, query: ClientQueryDto) {
    // Only organization-level users can access
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can access clients');
    }

    const { search, status, plan, sortBy = 'createdAt', sortOrder = 'desc', limit = 50, offset = 0 } = query;

    const where: any = {
      organizationId: user.organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (plan) {
      where.plan = plan;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          _count: {
            select: {
              companies: { where: { deletedAt: null } },
              users: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.client.count({ where }),
    ]);

    return { clients, total };
  }

  /**
   * Get single client by ID
   */
  async findOne(user: any, id: string) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can access clients');
    }

    const client = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            companies: { where: { deletedAt: null } },
            users: { where: { deletedAt: null } },
          },
        },
        companies: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  /**
   * Get client stats for dashboard
   */
  async getStats(user: any) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can access client stats');
    }

    const [
      totalClients,
      activeClients,
      totalCompanies,
      clientsByPlan,
    ] = await Promise.all([
      this.prisma.client.count({
        where: { organizationId: user.organizationId, deletedAt: null },
      }),
      this.prisma.client.count({
        where: { organizationId: user.organizationId, deletedAt: null, status: 'ACTIVE' },
      }),
      this.prisma.company.count({
        where: {
          client: { organizationId: user.organizationId },
          deletedAt: null,
        },
      }),
      this.prisma.client.groupBy({
        by: ['plan'],
        where: { organizationId: user.organizationId, deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      totalClients,
      activeClients,
      totalCompanies,
      clientsByPlan: clientsByPlan.reduce((acc, curr) => {
        acc[curr.plan] = curr._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Create a new client
   */
  async create(user: any, data: CreateClientDto) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can create clients');
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Generate unique code
    const code = await this.codeGenerator.generateClientCode(data.name);

    const client = await this.prisma.client.create({
      data: {
        organizationId: user.organizationId,
        name: data.name,
        slug,
        code,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        plan: data.plan || 'BASIC',
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            companies: { where: { deletedAt: null } },
            users: { where: { deletedAt: null } },
          },
        },
      },
    });

    // Audit log
    await this.auditLogs.log('CREATE', 'Client', client.id, {
      userId: user.sub,
      scopeType: 'ORGANIZATION',
      scopeId: user.organizationId,
      metadata: { name: data.name, code },
    });

    return client;
  }

  /**
   * Update an existing client
   */
  async update(user: any, id: string, data: UpdateClientDto) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can update clients');
    }

    // Verify client exists and belongs to organization
    const existing = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Client not found');
    }

    // Update slug if name changed
    const updateData: any = { ...data };
    if (data.name && data.name !== existing.name) {
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            companies: { where: { deletedAt: null } },
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
    if (data.plan && data.plan !== existing.plan) {
      changes.plan = { before: existing.plan, after: data.plan };
    }

    await this.auditLogs.log('UPDATE', 'Client', client.id, {
      userId: user.sub,
      scopeType: 'ORGANIZATION',
      scopeId: user.organizationId,
      changes,
    });

    return client;
  }

  /**
   * Soft delete a client
   */
  async delete(user: any, id: string) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization administrators can delete clients');
    }

    // Verify client exists and belongs to organization
    const existing = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Client not found');
    }

    // Soft delete with cascade ID for related entities
    const cascadeId = `del_${Date.now()}`;

    await this.prisma.$transaction([
      // Soft delete the client
      this.prisma.client.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: user.sub,
          cascadeId,
        },
      }),
      // Soft delete all companies under this client
      this.prisma.company.updateMany({
        where: { clientId: id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedBy: user.sub,
          cascadeId,
        },
      }),
    ]);

    // Audit log
    await this.auditLogs.log('SOFT_DELETE', 'Client', id, {
      userId: user.sub,
      scopeType: 'ORGANIZATION',
      scopeId: user.organizationId,
      metadata: { name: existing.name, cascadeId },
    });

    return { success: true };
  }
}
