import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto, SiteQueryDto } from './dto/site.dto';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Helper to get organizationId for the user
   * For CLIENT users, we get it from their client record
   */
  private async getOrganizationId(user: AuthenticatedUser): Promise<string> {
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
   * Helper to verify company access
   */
  private async verifyCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<void> {
    const organizationId = await this.getOrganizationId(user);

    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        client: { organizationId },
        deletedAt: null,
        ...(user.scopeType === 'CLIENT' ? { clientId: user.clientId } : {}),
      },
    });

    if (!company) {
      throw new ForbiddenException('Company not found or access denied');
    }
  }

  /**
   * List all sites with filtering and pagination
   * - ORGANIZATION: Can see all sites across all clients/companies
   * - CLIENT: Can see only sites belonging to their client's companies
   * - COMPANY: Can see only sites belonging to their company
   */
  async findAll(user: AuthenticatedUser, query: SiteQueryDto) {
    if (!['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
      throw new ForbiddenException('Access denied');
    }

    const { companyId, search, status, sortBy = 'createdAt', sortOrder = 'desc', limit = 50, offset = 0 } = query;

    const organizationId = await this.getOrganizationId(user);

    const where: any = {
      company: {
        client: { organizationId },
        deletedAt: null,
      },
      deletedAt: null,
    };

    // Scope filtering based on user access level
    if (user.scopeType === 'COMPANY') {
      where.companyId = user.companyId;
    } else if (user.scopeType === 'CLIENT') {
      where.company.clientId = user.clientId;
    }

    // Additional company filter from query
    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [sites, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          _count: {
            select: {
              funnels: true,
              landingPages: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.site.count({ where }),
    ]);

    return { sites, total };
  }

  /**
   * Get single site by ID
   */
  async findOne(user: AuthenticatedUser, id: string) {
    if (!['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
      throw new ForbiddenException('Access denied');
    }

    const organizationId = await this.getOrganizationId(user);

    const where: any = {
      id,
      company: {
        client: { organizationId },
        deletedAt: null,
      },
      deletedAt: null,
    };

    if (user.scopeType === 'COMPANY') {
      where.companyId = user.companyId;
    } else if (user.scopeType === 'CLIENT') {
      where.company.clientId = user.clientId;
    }

    const site = await this.prisma.site.findFirst({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            timezone: true,
            currency: true,
            client: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            funnels: true,
            landingPages: true,
          },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }

  /**
   * Get site statistics
   */
  async getStats(user: AuthenticatedUser, companyId?: string) {
    if (!['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
      throw new ForbiddenException('Access denied');
    }

    const organizationId = await this.getOrganizationId(user);

    const baseWhere: any = {
      company: {
        client: { organizationId },
        deletedAt: null,
      },
      deletedAt: null,
    };

    if (user.scopeType === 'COMPANY') {
      baseWhere.companyId = user.companyId;
    } else if (user.scopeType === 'CLIENT') {
      baseWhere.company.clientId = user.clientId;
    }

    if (companyId) {
      baseWhere.companyId = companyId;
    }

    const [totalSites, activeSites, sitesByCompany] = await Promise.all([
      this.prisma.site.count({ where: baseWhere }),
      this.prisma.site.count({
        where: { ...baseWhere, status: 'ACTIVE' },
      }),
      this.prisma.site.groupBy({
        by: ['companyId'],
        where: baseWhere,
        _count: true,
      }),
    ]);

    // Get company names
    const companyIds = sitesByCompany.map(s => s.companyId);
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    });

    const companyMap = new Map(companies.map(c => [c.id, c.name]));

    return {
      totalSites,
      activeSites,
      sitesByCompany: sitesByCompany.map(s => ({
        companyId: s.companyId,
        companyName: companyMap.get(s.companyId) || 'Unknown',
        count: s._count,
      })),
    };
  }

  /**
   * Create a new site
   */
  async create(user: AuthenticatedUser, data: CreateSiteDto) {
    if (!['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
      throw new ForbiddenException('Access denied');
    }

    // Verify company access
    await this.verifyCompanyAccess(user, data.companyId);

    // For COMPANY users, force companyId to be their own
    const targetCompanyId = user.scopeType === 'COMPANY' ? user.companyId : data.companyId;

    if (!targetCompanyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check for slug uniqueness within company
    const existingSlug = await this.prisma.site.findFirst({
      where: {
        companyId: targetCompanyId,
        slug,
        deletedAt: null,
      },
    });

    if (existingSlug) {
      throw new BadRequestException('A site with this name already exists in this company');
    }

    // Generate unique code
    const code = await this.codeGenerator.generateSiteCode(data.name, targetCompanyId);

    // If this is the first site or isDefault is true, handle default logic
    const existingSites = await this.prisma.site.count({
      where: { companyId: targetCompanyId, deletedAt: null },
    });

    const isDefault = data.isDefault || existingSites === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.prisma.site.updateMany({
        where: { companyId: targetCompanyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const site = await this.prisma.site.create({
      data: {
        companyId: targetCompanyId,
        name: data.name,
        slug,
        code,
        domain: data.domain,
        subdomain: data.subdomain,
        logo: data.logo,
        favicon: data.favicon,
        description: data.description,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        ogImage: data.ogImage,
        timezone: data.timezone,
        currency: data.currency,
        locale: data.locale || 'en',
        isDefault,
        status: 'ACTIVE',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            client: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            funnels: true,
            landingPages: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogs.log('CREATE', 'Site', site.id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'COMPANY' ? user.companyId : user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      metadata: { name: data.name, code, companyId: targetCompanyId },
    });

    return site;
  }

  /**
   * Update an existing site
   */
  async update(user: AuthenticatedUser, id: string, data: UpdateSiteDto) {
    if (!['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
      throw new ForbiddenException('Access denied');
    }

    // Get existing site first
    const existing = await this.findOne(user, id);

    // Update slug if name changed
    const updateData: any = { ...data };
    if (data.name && data.name !== existing.name) {
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check slug uniqueness
      const existingSlug = await this.prisma.site.findFirst({
        where: {
          companyId: existing.companyId,
          slug: updateData.slug,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existingSlug) {
        throw new BadRequestException('A site with this name already exists in this company');
      }
    }

    // Handle default site logic
    if (data.isDefault === true) {
      await this.prisma.site.updateMany({
        where: { companyId: existing.companyId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const site = await this.prisma.site.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            client: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            funnels: true,
            landingPages: true,
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
    if (data.domain !== undefined && data.domain !== existing.domain) {
      changes.domain = { before: existing.domain, after: data.domain };
    }

    await this.auditLogs.log('UPDATE', 'Site', site.id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'COMPANY' ? user.companyId : user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      changes,
    });

    return site;
  }

  /**
   * Soft delete a site
   */
  async delete(user: AuthenticatedUser, id: string) {
    if (!['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
      throw new ForbiddenException('Access denied');
    }

    // Get existing site first to verify access
    const existing = await this.findOne(user, id);

    // Don't allow deleting the default site if there are other sites
    if (existing.isDefault) {
      const otherSites = await this.prisma.site.count({
        where: {
          companyId: existing.companyId,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (otherSites > 0) {
        throw new BadRequestException('Cannot delete the default site. Set another site as default first.');
      }
    }

    // Soft delete
    await this.prisma.site.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });

    // Audit log
    await this.auditLogs.log('SOFT_DELETE', 'Site', id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'COMPANY' ? user.companyId : user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      metadata: { name: existing.name, companyId: existing.companyId },
    });

    return { success: true };
  }

  /**
   * Set a site as the default for its company
   */
  async setDefault(user: AuthenticatedUser, id: string) {
    const site = await this.findOne(user, id);

    // Unset other defaults
    await this.prisma.site.updateMany({
      where: { companyId: site.companyId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    const updated = await this.prisma.site.update({
      where: { id },
      data: { isDefault: true },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    await this.auditLogs.log('UPDATE', 'Site', id, {
      userId: user.sub,
      scopeType: user.scopeType,
      scopeId: user.scopeType === 'COMPANY' ? user.companyId : user.scopeType === 'CLIENT' ? user.clientId : user.organizationId,
      changes: { isDefault: { before: false, after: true } },
    });

    return updated;
  }
}
