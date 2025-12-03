import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateSessionDto,
  UpdateSessionDto,
  TrackEventDto,
} from '../dto/funnel.dto';
import { FunnelSessionStatus, FunnelEventType } from '../types/funnel.types';
import { randomBytes } from 'crypto';

@Injectable()
export class FunnelSessionsService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async create(funnelId: string, dto: CreateSessionDto, clientInfo?: {
    ip?: string;
    userAgent?: string;
  }) {
    const funnel = await this.prisma.funnel.findUnique({
      where: { id: funnelId },
      include: {
        variants: { where: { status: 'ACTIVE' } },
      },
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel "${funnelId}" not found`);
    }

    // Assign variant based on traffic weights
    const variantId = this.selectVariant(funnel.variants);

    // Generate session token
    const sessionToken = this.generateSessionToken();

    // Parse device info from user agent
    const deviceInfo = this.parseUserAgent(dto.userAgent || clientInfo?.userAgent);

    const session = await this.prisma.funnelSession.create({
      data: {
        funnelId,
        sessionToken,
        variantId,
        entryUrl: dto.entryUrl,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        referrer: dto.referrer,
        userAgent: dto.userAgent || clientInfo?.userAgent,
        ipAddress: clientInfo?.ip,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
      },
      include: {
        variant: true,
      },
    });

    // Track initial event
    await this.trackEvent(session.sessionToken, {
      type: FunnelEventType.STAGE_ENTERED,
      stageOrder: 0,
      data: { source: 'initial' },
    });

    // Update funnel visit count
    await this.prisma.funnel.update({
      where: { id: funnelId },
      data: { totalVisits: { increment: 1 } },
    });

    // Update variant session count
    if (variantId) {
      await this.prisma.funnelVariant.update({
        where: { id: variantId },
        data: { totalSessions: { increment: 1 } },
      });
    }

    return session;
  }

  async findByToken(sessionToken: string) {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken },
      include: {
        funnel: {
          include: {
            stages: { orderBy: { order: 'asc' } },
          },
        },
        variant: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found`);
    }

    return session;
  }

  async update(sessionToken: string, dto: UpdateSessionDto) {
    const session = await this.findByToken(sessionToken);

    return this.prisma.funnelSession.update({
      where: { sessionToken },
      data: {
        selectedProducts: dto.selectedProducts as Prisma.InputJsonValue,
        customerInfo: dto.customerInfo as Prisma.InputJsonValue,
        shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
        billingAddress: dto.billingAddress as Prisma.InputJsonValue,
        customFields: dto.customFields as Prisma.InputJsonValue,
        currentStageOrder: dto.currentStageOrder,
        lastActivityAt: new Date(),
      },
    });
  }

  async complete(sessionToken: string, orderId: string, totalAmount: number, currency: string) {
    const session = await this.findByToken(sessionToken);

    // Update session
    const updatedSession = await this.prisma.funnelSession.update({
      where: { sessionToken },
      data: {
        status: FunnelSessionStatus.COMPLETED,
        completedAt: new Date(),
        orderId,
        totalAmount,
        currency,
      },
    });

    // Track completion event
    await this.trackEvent(sessionToken, {
      type: FunnelEventType.PAYMENT_COMPLETED,
      stageOrder: session.currentStageOrder,
      data: { orderId, totalAmount, currency },
    });

    // Update funnel conversion count
    await this.prisma.funnel.update({
      where: { id: session.funnelId },
      data: { totalConversions: { increment: 1 } },
    });

    // Update variant metrics
    if (session.variantId) {
      await this.prisma.funnelVariant.update({
        where: { id: session.variantId },
        data: {
          conversions: { increment: 1 },
          revenue: { increment: totalAmount },
        },
      });
    }

    return updatedSession;
  }

  async abandon(sessionToken: string) {
    const session = await this.findByToken(sessionToken);

    // Track abandonment event
    await this.trackEvent(sessionToken, {
      type: FunnelEventType.STAGE_ABANDONED,
      stageOrder: session.currentStageOrder,
      data: {},
    });

    return this.prisma.funnelSession.update({
      where: { sessionToken },
      data: {
        status: FunnelSessionStatus.ABANDONED,
        abandonedAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT TRACKING
  // ═══════════════════════════════════════════════════════════════

  async trackEvent(sessionToken: string, dto: TrackEventDto) {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      throw new NotFoundException(`Session not found`);
    }

    // Update last activity
    await this.prisma.funnelSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() },
    });

    return this.prisma.funnelEvent.create({
      data: {
        sessionId: session.id,
        type: dto.type as FunnelEventType,
        stageOrder: dto.stageOrder,
        data: (dto.data || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async advanceStage(sessionToken: string, toStageOrder: number) {
    const session = await this.findByToken(sessionToken);

    // Track stage completion
    await this.trackEvent(sessionToken, {
      type: FunnelEventType.STAGE_COMPLETED,
      stageOrder: session.currentStageOrder,
      data: {},
    });

    // Track new stage entry
    await this.trackEvent(sessionToken, {
      type: FunnelEventType.STAGE_ENTERED,
      stageOrder: toStageOrder,
      data: {},
    });

    // Update session
    return this.prisma.funnelSession.update({
      where: { sessionToken },
      data: {
        currentStageOrder: toStageOrder,
        completedStages: {
          push: session.currentStageOrder,
        },
        lastActivityAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  private selectVariant(variants: { id: string; trafficWeight: number }[]): string | null {
    if (variants.length === 0) return null;
    if (variants.length === 1) return variants[0].id;

    // Weighted random selection
    const totalWeight = variants.reduce((sum, v) => sum + v.trafficWeight, 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= variant.trafficWeight;
      if (random <= 0) {
        return variant.id;
      }
    }

    return variants[0].id;
  }

  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    browser?: string;
    os?: string;
  } {
    if (!userAgent) return {};

    const result: { deviceType?: string; browser?: string; os?: string } = {};

    // Device type
    if (/mobile/i.test(userAgent)) {
      result.deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      result.deviceType = 'tablet';
    } else {
      result.deviceType = 'desktop';
    }

    // Browser
    if (/chrome/i.test(userAgent)) {
      result.browser = 'Chrome';
    } else if (/firefox/i.test(userAgent)) {
      result.browser = 'Firefox';
    } else if (/safari/i.test(userAgent)) {
      result.browser = 'Safari';
    } else if (/edge/i.test(userAgent)) {
      result.browser = 'Edge';
    }

    // OS
    if (/windows/i.test(userAgent)) {
      result.os = 'Windows';
    } else if (/mac/i.test(userAgent)) {
      result.os = 'macOS';
    } else if (/linux/i.test(userAgent)) {
      result.os = 'Linux';
    } else if (/android/i.test(userAgent)) {
      result.os = 'Android';
    } else if (/ios|iphone|ipad/i.test(userAgent)) {
      result.os = 'iOS';
    }

    return result;
  }
}
