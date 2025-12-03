import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto, LineItemDto } from '../dto';
import {
  PaymentPageSession,
  PaymentSessionStatus,
  PaymentGatewayType,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  SessionCustomerData,
  SessionBillingAddress,
  SessionShippingAddress,
  SessionDeviceInfo,
  SessionGatewayResponse,
} from '../types';

export interface SessionWithPage extends PaymentPageSession {
  page: {
    id: string;
    name: string;
    slug: string;
    type: string;
    themeId: string | null;
    paymentConfig: unknown;
    acceptedGateways: unknown;
    company: {
      id: string;
      name: string;
      code: string;
    };
  };
}

const DEFAULT_EXPIRATION_MINUTES = 30;

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSessionDto, deviceInfo?: SessionDeviceInfo): Promise<SessionWithPage> {
    // Find the payment page
    const page = await this.prisma.paymentPage.findUnique({
      where: { id: dto.pageId },
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

    if (!page || page.deletedAt) {
      throw new NotFoundException(`Payment page with ID ${dto.pageId} not found`);
    }

    if (page.status !== 'PUBLISHED') {
      throw new BadRequestException('Payment page is not published');
    }

    // Calculate totals
    const subtotal = dto.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const discountAmount = dto.discountAmount || 0;
    const taxAmount = dto.taxAmount || 0;
    const shippingAmount = dto.shippingAmount || 0;
    const total = subtotal - discountAmount + taxAmount + shippingAmount;

    // Generate session token
    const sessionToken = this.generateSessionToken();

    // Calculate expiration (default 30 minutes)
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRATION_MINUTES * 60 * 1000);

    // Determine currency
    const paymentConfig = page.paymentConfig as Record<string, unknown>;
    const currency = dto.currency || (paymentConfig?.defaultCurrency as string) || 'USD';

    // Parse device info for storage
    const deviceData = deviceInfo ? {
      deviceType: this.detectDeviceType(deviceInfo.userAgent),
      browserType: this.detectBrowser(deviceInfo.userAgent),
      osType: this.detectOS(deviceInfo.userAgent),
      ipAddress: deviceInfo.ip,
      country: deviceInfo.country,
      city: deviceInfo.city,
    } : {};

    // Parse UTM params
    const utmData = dto.utmParams ? {
      utmSource: dto.utmParams.source,
      utmMedium: dto.utmParams.medium,
      utmCampaign: dto.utmParams.campaign,
      utmTerm: dto.utmParams.term,
      utmContent: dto.utmParams.content,
    } : {};

    const session = await this.prisma.paymentPageSession.create({
      data: {
        pageId: page.id,
        sessionToken,
        expiresAt,
        customerId: dto.customerId,
        currency,
        lineItems: dto.lineItems as unknown as Prisma.InputJsonValue,
        subtotal,
        discountAmount,
        taxAmount,
        shippingAmount,
        total,
        status: PaymentSessionStatus.PENDING,
        customerEmail: (dto.customerData as SessionCustomerData)?.email,
        customerName: dto.customerData
          ? `${(dto.customerData as SessionCustomerData).firstName || ''} ${(dto.customerData as SessionCustomerData).lastName || ''}`.trim() || null
          : null,
        customerPhone: (dto.customerData as SessionCustomerData)?.phone,
        billingAddress: dto.billingAddress as unknown as Prisma.InputJsonValue,
        shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
        ...deviceData,
        ...utmData,
        referrer: dto.referrer,
        metadata: dto.metadata as Prisma.InputJsonValue,
      },
      include: {
        page: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            themeId: true,
            paymentConfig: true,
            acceptedGateways: true,
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Created session ${session.id} for page ${page.id}`);

    return session as SessionWithPage;
  }

  async findByToken(token: string): Promise<SessionWithPage> {
    const session = await this.prisma.paymentPageSession.findUnique({
      where: { sessionToken: token },
      include: {
        page: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            themeId: true,
            paymentConfig: true,
            acceptedGateways: true,
            customerFieldsConfig: true,
            // Individual branding fields
            logoUrl: true,
            faviconUrl: true,
            brandColor: true,
            // Terms fields
            termsUrl: true,
            privacyUrl: true,
            refundPolicyUrl: true,
            customTermsText: true,
            requireTermsAccept: true,
            theme: true,
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session as unknown as SessionWithPage;
  }

  async findById(id: string): Promise<SessionWithPage> {
    const session = await this.prisma.paymentPageSession.findUnique({
      where: { id },
      include: {
        page: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            themeId: true,
            paymentConfig: true,
            acceptedGateways: true,
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session as SessionWithPage;
  }

  async updateStatus(
    id: string,
    status: PaymentSessionStatus,
    gatewayResponse?: SessionGatewayResponse,
  ): Promise<PaymentPageSession> {
    const session = await this.findById(id);

    const updateData: Prisma.PaymentPageSessionUpdateInput = {
      status,
    };

    // Set completion timestamp if completed
    if (status === PaymentSessionStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    // Set failure timestamp and reason
    if (status === PaymentSessionStatus.FAILED) {
      updateData.failedAt = new Date();
      if (gatewayResponse?.message) {
        updateData.failureReason = gatewayResponse.message;
      }
    }

    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated session ${id} status to ${status}`);

    return updated;
  }

  async selectGateway(
    id: string,
    gateway: PaymentGatewayType,
  ): Promise<PaymentPageSession> {
    const session = await this.findById(id);

    // Verify gateway is accepted
    const acceptedGateways = session.page.acceptedGateways as Record<string, unknown>;
    const gateways = (acceptedGateways?.gateways as Array<{ type: string; enabled: boolean }>) || [];
    const isAccepted = gateways.some(g => g.type === gateway && g.enabled);

    if (!isAccepted) {
      throw new BadRequestException(`Gateway ${gateway} is not accepted for this payment page`);
    }

    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: { selectedGateway: gateway },
    });

    this.logger.log(`Session ${id} selected gateway: ${gateway}`);

    return updated;
  }

  async updateCustomerData(
    id: string,
    customerData: SessionCustomerData,
    billingAddress?: SessionBillingAddress,
    shippingAddress?: SessionShippingAddress,
  ): Promise<PaymentPageSession> {
    await this.findById(id);

    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: {
        customerEmail: customerData.email,
        customerName: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || null,
        customerPhone: customerData.phone,
        ...(billingAddress && { billingAddress: billingAddress as unknown as Prisma.InputJsonValue }),
        ...(shippingAddress && { shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue }),
      },
    });

    return updated;
  }

  async applyPromoCode(id: string, promoCode: string): Promise<PaymentPageSession> {
    const session = await this.findById(id);

    // TODO: Implement promo code validation against company's discount rules
    // For now, just store the promo code
    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: { discountCode: promoCode },
    });

    this.logger.log(`Applied promo code ${promoCode} to session ${id}`);

    return updated;
  }

  async setRiskScore(id: string, riskScore: number, riskLevel?: string, riskFactors?: Record<string, unknown>): Promise<PaymentPageSession> {
    await this.findById(id);

    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: {
        riskScore,
        riskLevel,
        riskFactors: riskFactors as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async expire(id: string): Promise<PaymentPageSession> {
    const session = await this.findById(id);

    if (session.status !== PaymentSessionStatus.PENDING) {
      throw new BadRequestException('Can only expire pending sessions');
    }

    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: { status: PaymentSessionStatus.EXPIRED },
    });

    this.logger.log(`Session ${id} expired`);

    return updated;
  }

  async cancel(id: string): Promise<PaymentPageSession> {
    const session = await this.findById(id);

    if (!['PENDING', 'PROCESSING', 'REQUIRES_ACTION'].includes(session.status)) {
      throw new BadRequestException(`Cannot cancel session with status ${session.status}`);
    }

    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: { status: PaymentSessionStatus.CANCELLED },
    });

    this.logger.log(`Session ${id} cancelled`);

    return updated;
  }

  async abandon(id: string): Promise<PaymentPageSession> {
    const session = await this.findById(id);

    if (session.status !== PaymentSessionStatus.PENDING) {
      throw new BadRequestException('Can only mark pending sessions as abandoned');
    }

    const updated = await this.prisma.paymentPageSession.update({
      where: { id },
      data: { status: PaymentSessionStatus.ABANDONED },
    });

    this.logger.log(`Session ${id} marked as abandoned`);

    return updated;
  }

  async getSessionsForPage(
    pageId: string,
    filters: {
      status?: PaymentSessionStatus;
      startDate?: Date;
      endDate?: Date;
    } = {},
    page = 1,
    pageSize = 20,
  ): Promise<{
    items: PaymentPageSession[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { status, startDate, endDate } = filters;

    const where: Prisma.PaymentPageSessionWhereInput = {
      pageId,
      ...(status && { status }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.paymentPageSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.paymentPageSession.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.paymentPageSession.updateMany({
      where: {
        status: PaymentSessionStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: PaymentSessionStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} sessions`);
    }

    return result.count;
  }

  private generateSessionToken(): string {
    return `pps_${randomBytes(24).toString('hex')}`;
  }

  private detectDeviceType(userAgent: string): string {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private detectBrowser(userAgent: string): string {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('opera')) return 'Opera';
    return 'Other';
  }

  private detectOS(userAgent: string): string {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    return 'Other';
  }
}
