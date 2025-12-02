import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversionGoalType } from '@prisma/client';
import {
  CreateConversionGoalDto,
  UpdateConversionGoalDto,
  ConversionGoalSummary,
  ConversionGoalDetail,
  TrackConversionDto,
} from '../types/ab-testing.types';

@Injectable()
export class ConversionTrackingService {
  private readonly logger = new Logger(ConversionTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // CONVERSION GOAL CRUD
  // ═══════════════════════════════════════════════════════════════

  async findAll(companyId: string, landingPageId?: string): Promise<ConversionGoalSummary[]> {
    const where: any = { companyId };
    if (landingPageId) {
      where.landingPageId = landingPageId;
    }

    const goals = await this.prisma.conversionGoal.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      type: goal.type,
      isPrimary: goal.isPrimary,
      totalConversions: Number(goal.totalConversions),
      totalRevenue: Number(goal.totalRevenue),
      createdAt: goal.createdAt,
    }));
  }

  async findOne(companyId: string, goalId: string): Promise<ConversionGoalDetail> {
    const goal = await this.prisma.conversionGoal.findFirst({
      where: { id: goalId, companyId },
    });

    if (!goal) {
      throw new NotFoundException('Conversion goal not found');
    }

    return this.mapToDetail(goal);
  }

  async create(
    companyId: string,
    landingPageId: string,
    dto: CreateConversionGoalDto,
  ): Promise<ConversionGoalDetail> {
    // Verify landing page exists and belongs to company
    const page = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, companyId },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // If this is marked as primary, unset other primary goals
    if (dto.isPrimary) {
      await this.prisma.conversionGoal.updateMany({
        where: { landingPageId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Validate type-specific fields
    this.validateGoalConfig(dto.type, dto);

    const goal = await this.prisma.conversionGoal.create({
      data: {
        companyId,
        landingPageId,
        name: dto.name,
        type: dto.type,
        isPrimary: dto.isPrimary ?? false,
        selector: dto.selector,
        targetUrl: dto.targetUrl,
        threshold: dto.threshold,
        eventName: dto.eventName,
        revenueValue: dto.revenueValue,
      },
    });

    return this.mapToDetail(goal);
  }

  async update(companyId: string, goalId: string, dto: UpdateConversionGoalDto): Promise<ConversionGoalDetail> {
    const goal = await this.prisma.conversionGoal.findFirst({
      where: { id: goalId, companyId },
    });

    if (!goal) {
      throw new NotFoundException('Conversion goal not found');
    }

    // If setting as primary, unset other primary goals
    if (dto.isPrimary === true) {
      await this.prisma.conversionGoal.updateMany({
        where: { landingPageId: goal.landingPageId, isPrimary: true, id: { not: goalId } },
        data: { isPrimary: false },
      });
    }

    // Validate type-specific fields if type is being changed
    if (dto.type) {
      this.validateGoalConfig(dto.type, {
        ...goal,
        ...dto,
      });
    }

    const updated = await this.prisma.conversionGoal.update({
      where: { id: goalId },
      data: {
        name: dto.name,
        type: dto.type,
        isPrimary: dto.isPrimary,
        selector: dto.selector,
        targetUrl: dto.targetUrl,
        threshold: dto.threshold,
        eventName: dto.eventName,
        revenueValue: dto.revenueValue,
      },
    });

    return this.mapToDetail(updated);
  }

  async delete(companyId: string, goalId: string): Promise<void> {
    const goal = await this.prisma.conversionGoal.findFirst({
      where: { id: goalId, companyId },
    });

    if (!goal) {
      throw new NotFoundException('Conversion goal not found');
    }

    // Delete associated events first
    await this.prisma.conversionEvent.deleteMany({
      where: { goalId },
    });

    await this.prisma.conversionGoal.delete({
      where: { id: goalId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSION TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Track a conversion event
   */
  async trackConversion(dto: TrackConversionDto): Promise<boolean> {
    const goal = await this.prisma.conversionGoal.findUnique({
      where: { id: dto.goalId },
    });

    if (!goal) {
      this.logger.warn(`Conversion tracking failed: goal ${dto.goalId} not found`);
      return false;
    }

    // Create conversion event
    await this.prisma.conversionEvent.create({
      data: {
        goalId: dto.goalId,
        visitorId: dto.visitorId,
        pageUrl: dto.pageUrl,
        referrer: dto.referrer,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        revenue: dto.revenue,
      },
    });

    // Update goal totals
    const revenue = dto.revenue || goal.revenueValue || 0;
    await this.prisma.conversionGoal.update({
      where: { id: dto.goalId },
      data: {
        totalConversions: { increment: 1 },
        totalRevenue: revenue > 0 ? { increment: revenue } : undefined,
      },
    });

    return true;
  }

  /**
   * Get active conversion goals for a landing page
   * Used by the frontend to set up tracking
   */
  async getActiveGoals(landingPageId: string): Promise<ConversionGoalDetail[]> {
    const goals = await this.prisma.conversionGoal.findMany({
      where: { landingPageId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return goals.map(goal => this.mapToDetail(goal));
  }

  /**
   * Get the primary conversion goal for a landing page
   */
  async getPrimaryGoal(landingPageId: string): Promise<ConversionGoalDetail | null> {
    const goal = await this.prisma.conversionGoal.findFirst({
      where: { landingPageId, isPrimary: true },
    });

    return goal ? this.mapToDetail(goal) : null;
  }

  /**
   * Generate JavaScript code for client-side conversion tracking
   */
  generateTrackingScript(landingPageId: string, goals: ConversionGoalDetail[], apiEndpoint: string): string {
    if (goals.length === 0) return '';

    const goalsJson = JSON.stringify(goals.map(g => ({
      id: g.id,
      type: g.type,
      selector: g.selector,
      targetUrl: g.targetUrl,
      threshold: g.threshold,
      eventName: g.eventName,
    })));

    return `
(function() {
  const AVNZ_TRACKING = {
    pageId: "${landingPageId}",
    visitorId: null,
    goals: ${goalsJson},
    apiEndpoint: "${apiEndpoint}",

    init: function() {
      this.visitorId = this.getOrCreateVisitorId();
      this.setupTracking();
    },

    getOrCreateVisitorId: function() {
      let id = localStorage.getItem('avnz_visitor_id');
      if (!id) {
        id = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('avnz_visitor_id', id);
      }
      return id;
    },

    track: function(goalId, revenue) {
      const data = {
        goalId: goalId,
        visitorId: this.visitorId,
        pageUrl: window.location.href,
        referrer: document.referrer,
        utmSource: this.getUrlParam('utm_source'),
        utmMedium: this.getUrlParam('utm_medium'),
        utmCampaign: this.getUrlParam('utm_campaign'),
        revenue: revenue
      };

      fetch(this.apiEndpoint + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(function(e) { console.error('Conversion tracking failed', e); });
    },

    getUrlParam: function(name) {
      return new URLSearchParams(window.location.search).get(name);
    },

    setupTracking: function() {
      const self = this;

      this.goals.forEach(function(goal) {
        switch(goal.type) {
          case 'FORM_SUBMIT':
            if (goal.selector) {
              document.querySelectorAll(goal.selector).forEach(function(form) {
                form.addEventListener('submit', function() {
                  self.track(goal.id);
                });
              });
            }
            break;

          case 'BUTTON_CLICK':
          case 'LINK_CLICK':
            if (goal.selector) {
              document.querySelectorAll(goal.selector).forEach(function(el) {
                el.addEventListener('click', function() {
                  self.track(goal.id);
                });
              });
            }
            break;

          case 'SCROLL_DEPTH':
            if (goal.threshold) {
              let tracked = false;
              window.addEventListener('scroll', function() {
                if (tracked) return;
                const scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100;
                if (scrollPercent >= goal.threshold) {
                  tracked = true;
                  self.track(goal.id);
                }
              });
            }
            break;

          case 'TIME_ON_PAGE':
            if (goal.threshold) {
              setTimeout(function() {
                self.track(goal.id);
              }, goal.threshold * 1000);
            }
            break;

          case 'PAGE_VISIT':
            if (goal.targetUrl && window.location.pathname === goal.targetUrl) {
              self.track(goal.id);
            }
            break;

          case 'CUSTOM':
            if (goal.eventName) {
              window.addEventListener(goal.eventName, function(e) {
                self.track(goal.id, e.detail?.revenue);
              });
            }
            break;
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { AVNZ_TRACKING.init(); });
  } else {
    AVNZ_TRACKING.init();
  }

  window.AVNZ_TRACKING = AVNZ_TRACKING;
})();
`.trim();
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get conversion events for a goal within a date range
   */
  async getEvents(
    companyId: string,
    goalId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100,
  ): Promise<{
    events: any[];
    total: number;
    bySource: Record<string, number>;
    byMedium: Record<string, number>;
    byCampaign: Record<string, number>;
  }> {
    const goal = await this.prisma.conversionGoal.findFirst({
      where: { id: goalId, companyId },
    });

    if (!goal) {
      throw new NotFoundException('Conversion goal not found');
    }

    const where: any = { goalId };
    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = startDate;
      if (endDate) where.occurredAt.lte = endDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.conversionEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: limit,
      }),
      this.prisma.conversionEvent.count({ where }),
    ]);

    // Aggregate by source/medium/campaign
    const allEvents = await this.prisma.conversionEvent.findMany({
      where,
      select: { utmSource: true, utmMedium: true, utmCampaign: true },
    });

    const bySource: Record<string, number> = {};
    const byMedium: Record<string, number> = {};
    const byCampaign: Record<string, number> = {};

    for (const event of allEvents) {
      const source = event.utmSource || '(direct)';
      const medium = event.utmMedium || '(none)';
      const campaign = event.utmCampaign || '(none)';

      bySource[source] = (bySource[source] || 0) + 1;
      byMedium[medium] = (byMedium[medium] || 0) + 1;
      byCampaign[campaign] = (byCampaign[campaign] || 0) + 1;
    }

    return {
      events: events.map(e => ({
        id: e.id,
        visitorId: e.visitorId,
        occurredAt: e.occurredAt,
        pageUrl: e.pageUrl,
        referrer: e.referrer,
        utmSource: e.utmSource,
        utmMedium: e.utmMedium,
        utmCampaign: e.utmCampaign,
        revenue: e.revenue ? Number(e.revenue) : undefined,
      })),
      total,
      bySource,
      byMedium,
      byCampaign,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private validateGoalConfig(type: ConversionGoalType, dto: any): void {
    switch (type) {
      case ConversionGoalType.FORM_SUBMIT:
      case ConversionGoalType.BUTTON_CLICK:
      case ConversionGoalType.LINK_CLICK:
        // Selector is recommended but not required
        break;
      case ConversionGoalType.PAGE_VISIT:
        if (!dto.targetUrl) {
          this.logger.warn('PAGE_VISIT goal created without targetUrl');
        }
        break;
      case ConversionGoalType.SCROLL_DEPTH:
        if (dto.threshold === undefined || dto.threshold < 0 || dto.threshold > 100) {
          this.logger.warn('SCROLL_DEPTH goal should have threshold between 0-100');
        }
        break;
      case ConversionGoalType.TIME_ON_PAGE:
        if (dto.threshold === undefined || dto.threshold < 0) {
          this.logger.warn('TIME_ON_PAGE goal should have a positive threshold (seconds)');
        }
        break;
      case ConversionGoalType.CUSTOM:
        if (!dto.eventName) {
          this.logger.warn('CUSTOM goal created without eventName');
        }
        break;
    }
  }

  private mapToDetail(goal: any): ConversionGoalDetail {
    return {
      id: goal.id,
      landingPageId: goal.landingPageId,
      companyId: goal.companyId,
      name: goal.name,
      type: goal.type,
      isPrimary: goal.isPrimary,
      selector: goal.selector || undefined,
      targetUrl: goal.targetUrl || undefined,
      threshold: goal.threshold || undefined,
      eventName: goal.eventName || undefined,
      revenueValue: goal.revenueValue || undefined,
      totalConversions: Number(goal.totalConversions),
      totalRevenue: Number(goal.totalRevenue),
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }
}
