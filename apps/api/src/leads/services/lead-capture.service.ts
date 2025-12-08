import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadStatus, LeadSource, Prisma } from '@prisma/client';

export interface CaptureFieldDto {
  sessionToken: string;
  field: string;
  value: string;
  stageOrder?: number;
  stageName?: string;
}

export interface CaptureFieldsDto {
  sessionToken: string;
  fields: Record<string, string>;
  stageOrder?: number;
  stageName?: string;
}

export interface LeadUpdateDto {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  capturedFields?: Record<string, unknown>;
  cartValue?: number;
  cartItems?: unknown[];
}

@Injectable()
export class LeadCaptureService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // PROGRESSIVE FIELD CAPTURE
  // Called on field blur to save data immediately
  // ═══════════════════════════════════════════════════════════════

  async captureField(dto: CaptureFieldDto) {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken: dto.sessionToken },
      include: { funnel: true, lead: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get or create lead for this session
    let lead = session.lead;
    if (!lead) {
      lead = await this.createLeadFromSession(session);

      // Link lead to session
      await this.prisma.funnelSession.update({
        where: { id: session.id },
        data: { leadId: lead.id },
      });
    }

    // Build update data
    const updateData: Prisma.LeadUpdateInput = {
      lastSeenAt: new Date(),
    };

    // Map common fields to lead columns
    const fieldValue = dto.value.trim();
    if (fieldValue) {
      switch (dto.field.toLowerCase()) {
        case 'email':
          updateData.email = fieldValue;
          break;
        case 'phone':
        case 'phonenumber':
        case 'phone_number':
          updateData.phone = fieldValue;
          break;
        case 'firstname':
        case 'first_name':
          updateData.firstName = fieldValue;
          break;
        case 'lastname':
        case 'last_name':
          updateData.lastName = fieldValue;
          break;
      }
    }

    // Update captured fields JSON
    const capturedFields = (lead.capturedFields as Record<string, unknown>) || {};
    capturedFields[dto.field] = fieldValue;
    updateData.capturedFields = capturedFields as Prisma.InputJsonValue;

    // Add to field capture log
    const fieldCaptureLog = (lead.fieldCaptureLog as unknown[]) || [];
    fieldCaptureLog.push({
      field: dto.field,
      value: this.maskSensitiveValue(dto.field, fieldValue),
      timestamp: new Date().toISOString(),
      stageOrder: dto.stageOrder ?? session.currentStageOrder,
      stageName: dto.stageName,
    });
    updateData.fieldCaptureLog = fieldCaptureLog as Prisma.InputJsonValue;

    // Update highest stage if progressed
    if (dto.stageOrder !== undefined && dto.stageOrder > lead.highestStage) {
      updateData.highestStage = dto.stageOrder;
      updateData.lastStageName = dto.stageName;
    }

    // Update status based on captured data
    updateData.status = this.calculateLeadStatus(lead, updateData);

    // Update lead
    const updatedLead = await this.prisma.lead.update({
      where: { id: lead.id },
      data: updateData,
    });

    // Log activity
    await this.logActivity(lead.id, 'field_captured', {
      field: dto.field,
      hasValue: !!fieldValue,
      stageOrder: dto.stageOrder,
      stageName: dto.stageName,
    });

    return updatedLead;
  }

  async captureFields(dto: CaptureFieldsDto) {
    const results = [];
    for (const [field, value] of Object.entries(dto.fields)) {
      if (value) {
        results.push(
          await this.captureField({
            sessionToken: dto.sessionToken,
            field,
            value,
            stageOrder: dto.stageOrder,
            stageName: dto.stageName,
          }),
        );
      }
    }
    return results[results.length - 1]; // Return final state
  }

  // ═══════════════════════════════════════════════════════════════
  // LEAD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async getLeadBySession(sessionToken: string) {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken },
      include: { lead: true },
    });

    return session?.lead || null;
  }

  async getLeadById(leadId: string) {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
        },
        customer: true,
        visitorProfile: true,
      },
    });
  }

  async updateLead(leadId: string, dto: LeadUpdateDto) {
    const updateData: Prisma.LeadUpdateInput = {
      lastSeenAt: new Date(),
    };

    if (dto.email) updateData.email = dto.email;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;

    if (dto.capturedFields) {
      const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
      const existing = (lead?.capturedFields as Record<string, unknown>) || {};
      updateData.capturedFields = { ...existing, ...dto.capturedFields } as Prisma.InputJsonValue;
    }

    if (dto.cartValue !== undefined) {
      updateData.cartValue = dto.cartValue;
    }

    if (dto.cartItems) {
      updateData.cartItems = dto.cartItems as Prisma.InputJsonValue;
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });
  }

  async updateCartFromSession(sessionToken: string) {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken },
      include: { lead: true },
    });

    if (!session?.lead) return null;

    const selectedProducts = (session.selectedProducts as unknown[]) || [];
    const cartValue = selectedProducts.reduce((sum: number, item: any) => {
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0);

    return this.prisma.lead.update({
      where: { id: session.lead.id },
      data: {
        cartValue,
        cartItems: selectedProducts as Prisma.InputJsonValue,
        lastSeenAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ABANDONMENT TRACKING
  // ═══════════════════════════════════════════════════════════════

  async markAbandoned(sessionToken: string, reason?: string) {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken },
      include: { lead: true, funnel: { include: { stages: true } } },
    });

    if (!session?.lead) return null;

    const stageName = session.funnel.stages.find(
      (s) => s.order === session.currentStageOrder,
    )?.name;

    const updatedLead = await this.prisma.lead.update({
      where: { id: session.lead.id },
      data: {
        status: LeadStatus.ABANDONED,
        abandonStage: session.currentStageOrder,
        abandonReason: reason || 'session_timeout',
        lastSeenAt: new Date(),
      },
    });

    await this.logActivity(session.lead.id, 'abandoned', {
      stageOrder: session.currentStageOrder,
      stageName,
      reason: reason || 'session_timeout',
    });

    return updatedLead;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSION
  // ═══════════════════════════════════════════════════════════════

  async convertToCustomer(
    leadId: string,
    customerId: string,
    orderId?: string,
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONVERTED,
        convertedAt: new Date(),
        customerId,
        conversionOrderId: orderId,
      },
    });

    await this.logActivity(leadId, 'converted', {
      customerId,
      orderId,
      convertedAt: new Date().toISOString(),
    });

    return updatedLead;
  }

  // ═══════════════════════════════════════════════════════════════
  // SCORING
  // ═══════════════════════════════════════════════════════════════

  async updateScores(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        sessions: true,
        activities: { orderBy: { occurredAt: 'desc' }, take: 100 },
      },
    });

    if (!lead) return null;

    // Calculate engagement score (0-1)
    let engagementScore = 0;

    // Sessions contribute
    engagementScore += Math.min(lead.totalSessions / 5, 0.2);

    // Page views contribute
    engagementScore += Math.min(lead.totalPageViews / 20, 0.2);

    // Time on site contributes (max at 10 minutes)
    engagementScore += Math.min(lead.totalTimeOnSite / 600, 0.2);

    // Highest stage contributes
    engagementScore += Math.min(lead.highestStage / 3, 0.2);

    // Has identity info
    if (lead.email) engagementScore += 0.1;
    if (lead.phone) engagementScore += 0.1;

    // Calculate intent score (0-1)
    let intentScore = 0;

    // Stage progress is strong signal
    intentScore += Math.min(lead.highestStage / 3, 0.3);

    // Cart value indicates intent
    if (lead.cartValue && Number(lead.cartValue) > 0) {
      intentScore += 0.3;
    }

    // Multiple sessions indicates serious interest
    if (lead.totalSessions > 1) {
      intentScore += 0.2;
    }

    // Engagement feeds into intent
    intentScore += engagementScore * 0.2;

    // Estimate value based on cart or average
    const estimatedValue = lead.cartValue && Number(lead.cartValue) > 0
      ? Number(lead.cartValue)
      : intentScore * 50; // Rough estimate

    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        engagementScore: Math.min(1, engagementScore),
        intentScore: Math.min(1, intentScore),
        estimatedValue,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LIST & SEARCH
  // ═══════════════════════════════════════════════════════════════

  async findLeads(
    companyId: string,
    options: {
      status?: LeadStatus;
      source?: LeadSource;
      funnelId?: string;
      search?: string;
      minEngagement?: number;
      minIntent?: number;
      limit?: number;
      offset?: number;
      orderBy?: 'lastSeenAt' | 'engagementScore' | 'intentScore' | 'estimatedValue';
      order?: 'asc' | 'desc';
    } = {},
  ) {
    const where: Prisma.LeadWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (options.status) where.status = options.status;
    if (options.source) where.source = options.source;
    if (options.funnelId) where.funnelId = options.funnelId;

    if (options.minEngagement !== undefined) {
      where.engagementScore = { gte: options.minEngagement };
    }

    if (options.minIntent !== undefined) {
      where.intentScore = { gte: options.minIntent };
    }

    if (options.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
      ];
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          customer: { select: { id: true, email: true } },
        },
        orderBy: { [options.orderBy || 'lastSeenAt']: options.order || 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  async getLeadStats(companyId: string, funnelId?: string) {
    const where: Prisma.LeadWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (funnelId) where.funnelId = funnelId;

    const [
      total,
      anonymous,
      identified,
      qualified,
      converted,
      abandoned,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.ANONYMOUS } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.IDENTIFIED } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.QUALIFIED } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.ABANDONED } }),
    ]);

    const avgEngagement = await this.prisma.lead.aggregate({
      where,
      _avg: { engagementScore: true, intentScore: true },
    });

    const totalValue = await this.prisma.lead.aggregate({
      where,
      _sum: { estimatedValue: true, cartValue: true },
    });

    return {
      total,
      byStatus: {
        anonymous,
        identified,
        qualified,
        converted,
        abandoned,
      },
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      avgEngagementScore: avgEngagement._avg.engagementScore || 0,
      avgIntentScore: avgEngagement._avg.intentScore || 0,
      totalEstimatedValue: Number(totalValue._sum.estimatedValue) || 0,
      totalCartValue: Number(totalValue._sum.cartValue) || 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async createLeadFromSession(session: {
    id: string;
    funnelId: string;
    funnel: { companyId: string; name: string };
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    referrer: string | null;
    entryUrl: string | null;
    deviceType: string | null;
    browser: string | null;
    os: string | null;
    ipAddress: string | null;
    customerInfo: unknown;
  }) {
    const customerInfo = (session.customerInfo as Record<string, unknown>) || {};

    return this.prisma.lead.create({
      data: {
        companyId: session.funnel.companyId,
        source: LeadSource.FUNNEL,
        sourceId: session.funnelId,
        sourceName: session.funnel.name,
        funnelId: session.funnelId,
        utmSource: session.utmSource,
        utmMedium: session.utmMedium,
        utmCampaign: session.utmCampaign,
        utmTerm: session.utmTerm,
        utmContent: session.utmContent,
        referrer: session.referrer,
        landingPage: session.entryUrl,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        email: customerInfo.email as string | undefined,
        firstName: customerInfo.firstName as string | undefined,
        lastName: customerInfo.lastName as string | undefined,
        phone: customerInfo.phone as string | undefined,
        status: customerInfo.email ? LeadStatus.IDENTIFIED : LeadStatus.ANONYMOUS,
        totalSessions: 1,
      },
    });
  }

  private calculateLeadStatus(
    lead: { status: LeadStatus; email: string | null; phone: string | null; highestStage: number },
    updateData: Prisma.LeadUpdateInput,
  ): LeadStatus {
    // Already converted or disqualified - don't change
    if (lead.status === LeadStatus.CONVERTED || lead.status === LeadStatus.DISQUALIFIED) {
      return lead.status;
    }

    // Check if we now have identifying info
    const hasEmail = updateData.email || lead.email;
    const hasPhone = updateData.phone || lead.phone;
    const highestStage = (updateData.highestStage as number) ?? lead.highestStage;

    // Qualified if reached checkout stage (stage 2+) or high engagement
    if (highestStage >= 2) {
      return LeadStatus.QUALIFIED;
    }

    // Identified if we have email or phone
    if (hasEmail || hasPhone) {
      return LeadStatus.IDENTIFIED;
    }

    return LeadStatus.ANONYMOUS;
  }

  private maskSensitiveValue(field: string, value: string): string {
    const sensitiveFields = ['card', 'cvv', 'ssn', 'password', 'secret'];
    if (sensitiveFields.some((f) => field.toLowerCase().includes(f))) {
      return '***masked***';
    }

    // Mask email partially
    if (field.toLowerCase() === 'email' && value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }

    return value;
  }

  private async logActivity(
    leadId: string,
    type: string,
    data: Record<string, unknown>,
  ) {
    const categoryMap: Record<string, string> = {
      field_captured: 'capture',
      stage_reached: 'funnel',
      cart_updated: 'engagement',
      abandoned: 'funnel',
      converted: 'conversion',
      email_opened: 'email',
      email_clicked: 'email',
    };

    return this.prisma.leadActivity.create({
      data: {
        leadId,
        type,
        category: categoryMap[type] || 'other',
        data: data as Prisma.InputJsonValue,
      },
    });
  }
}
