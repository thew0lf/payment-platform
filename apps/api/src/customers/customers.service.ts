import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';
import {
  PaginationService,
  CursorPaginatedResponse,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} from '../common/pagination';

export interface CustomerFilters {
  companyId?: string;
  clientId?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface CreateAddressInput {
  type: 'SHIPPING' | 'BILLING' | 'BOTH';
  isDefault?: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateNoteInput {
  content: string;
  type?: 'INTERNAL' | 'CUSTOMER_SERVICE';
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly paginationService: PaginationService,
  ) {}

  async getCustomers(user: UserContext, filters: CustomerFilters = {}) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Apply company filter
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    // Apply client filter (for org users)
    if (filters.clientId && user.scopeType === 'ORGANIZATION') {
      const clientCompanies = await this.prisma.company.findMany({
        where: { clientId: filters.clientId, status: 'ACTIVE' },
        select: { id: true },
      });
      companyIds = clientCompanies.map(c => c.id).filter(id => companyIds.includes(id));
    }

    const where: any = {
      companyId: { in: companyIds },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Date range filter (based on customer creation date)
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Use cursor pagination if cursor is provided, otherwise fall back to offset
    if (filters.cursor) {
      return this.getCustomersWithCursor(where, filters);
    }

    // Legacy offset pagination (for backwards compatibility)
    const limit = Math.min(filters.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              transactions: true,
              subscriptions: true,
              paymentVaults: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: filters.offset || 0,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      customers,
      total,
      limit,
      offset: filters.offset || 0,
    };
  }

  /**
   * Get customers with cursor-based pagination (scalable for millions of rows)
   */
  private async getCustomersWithCursor(
    baseWhere: any,
    filters: CustomerFilters,
  ): Promise<CursorPaginatedResponse<any>> {
    const { limit, cursorWhere, orderBy } = this.paginationService.parseCursor(
      { cursor: filters.cursor, limit: filters.limit },
      'createdAt',
      'desc',
    );

    // Merge base where with cursor where
    const where = cursorWhere.OR
      ? { AND: [baseWhere, cursorWhere] }
      : { ...baseWhere, ...cursorWhere };

    // Fetch one extra to determine if there are more pages
    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            subscriptions: true,
            paymentVaults: true,
          },
        },
      },
      orderBy,
      take: limit + 1,
    });

    return this.paginationService.createResponse(
      customers,
      limit,
      { cursor: filters.cursor, limit: filters.limit },
      'createdAt',
    );
  }

  async getCustomer(user: UserContext, customerId: string) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId: { in: companyIds },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            transactionNumber: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            planName: true,
            status: true,
            planAmount: true,
            currency: true,
            interval: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
        paymentVaults: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            last4: true,
            expMonth: true,
            expYear: true,
            isDefault: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            subscriptions: true,
            paymentVaults: true,
          },
        },
      },
    });

    return customer;
  }

  async getCustomerStats(user: UserContext, filters: { companyId?: string; clientId?: string } = {}) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    if (filters.clientId && user.scopeType === 'ORGANIZATION') {
      const clientCompanies = await this.prisma.company.findMany({
        where: { clientId: filters.clientId, status: 'ACTIVE' },
        select: { id: true },
      });
      companyIds = clientCompanies.map(c => c.id).filter(id => companyIds.includes(id));
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [total, active, newThisMonth, newLastMonth] = await Promise.all([
      this.prisma.customer.count({
        where: { companyId: { in: companyIds } },
      }),
      this.prisma.customer.count({
        where: { companyId: { in: companyIds }, status: 'ACTIVE' },
      }),
      this.prisma.customer.count({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.customer.count({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
    ]);

    const growthRate = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;

    return {
      total,
      active,
      inactive: total - active,
      newThisMonth,
      growthRate: Math.round(growthRate * 10) / 10,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ADDRESSES
  // ═══════════════════════════════════════════════════════════════

  async getAddresses(user: UserContext, customerId: string) {
    // Verify access to customer first
    const customer = await this.getCustomer(user, customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const addresses = await this.prisma.address.findMany({
      where: { customerId },
      orderBy: { isDefault: 'desc' },
    });

    return addresses.map((addr) => ({
      id: addr.id,
      type: addr.type,
      isDefault: addr.isDefault,
      firstName: addr.firstName,
      lastName: addr.lastName,
      company: addr.company,
      address1: addr.street1,
      address2: addr.street2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone,
    }));
  }

  async addAddress(user: UserContext, customerId: string, data: CreateAddressInput) {
    // Verify access to customer first
    const customer = await this.getCustomer(user, customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // If this is the default, unset other defaults of the same type
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { customerId, type: data.type as any },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        customerId,
        type: data.type as any,
        isDefault: data.isDefault || false,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        street1: data.address1,
        street2: data.address2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        phone: data.phone,
      },
    });

    return {
      id: address.id,
      type: address.type,
      isDefault: address.isDefault,
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      address1: address.street1,
      address2: address.street2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
    };
  }

  async updateAddress(user: UserContext, customerId: string, addressId: string, data: Partial<CreateAddressInput>) {
    // Verify access to customer first
    const customer = await this.getCustomer(user, customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    // If this is becoming the default, unset other defaults
    if (data.isDefault && !existing.isDefault) {
      await this.prisma.address.updateMany({
        where: { customerId, type: (data.type || existing.type) as any },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        type: data.type as any,
        isDefault: data.isDefault,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        street1: data.address1,
        street2: data.address2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        phone: data.phone,
      },
    });

    return {
      id: updated.id,
      type: updated.type,
      isDefault: updated.isDefault,
      firstName: updated.firstName,
      lastName: updated.lastName,
      company: updated.company,
      address1: updated.street1,
      address2: updated.street2,
      city: updated.city,
      state: updated.state,
      postalCode: updated.postalCode,
      country: updated.country,
      phone: updated.phone,
    };
  }

  async deleteAddress(user: UserContext, customerId: string, addressId: string) {
    // Verify access to customer first
    const customer = await this.getCustomer(user, customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({
      where: { id: addressId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════

  async getNotes(user: UserContext, customerId: string) {
    // Verify access to customer first
    const customer = await this.getCustomer(user, customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const notes = await this.prisma.customerNote.findMany({
      where: { customerId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map((note) => ({
      id: note.id,
      customerId: note.customerId,
      userId: note.userId,
      content: note.content,
      type: note.type,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      user: note.user
        ? {
            id: note.user.id,
            name: `${note.user.firstName || ''} ${note.user.lastName || ''}`.trim() || note.user.email,
            email: note.user.email,
          }
        : null,
    }));
  }

  async addNote(user: UserContext, customerId: string, userId: string, data: CreateNoteInput) {
    // Verify access to customer first
    const customer = await this.getCustomer(user, customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const note = await this.prisma.customerNote.create({
      data: {
        customerId,
        userId,
        content: data.content,
        type: (data.type || 'INTERNAL') as any,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      id: note.id,
      customerId: note.customerId,
      userId: note.userId,
      content: note.content,
      type: note.type,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      user: note.user
        ? {
            id: note.user.id,
            name: `${note.user.firstName || ''} ${note.user.lastName || ''}`.trim() || note.user.email,
            email: note.user.email,
          }
        : null,
    };
  }

  async deleteNote(user: UserContext, customerId: string, noteId: string) {
    // Verify access to customer first
    const customer = await this.getCustomer(user, customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const existing = await this.prisma.customerNote.findFirst({
      where: { id: noteId, customerId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    await this.prisma.customerNote.delete({
      where: { id: noteId },
    });
  }
}
