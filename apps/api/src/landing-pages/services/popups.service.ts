import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PopupStatus } from '@prisma/client';
import {
  CreatePopupDto,
  UpdatePopupDto,
  PopupSummary,
  PopupDetail,
  PopupContent,
  PopupStyles,
} from '../types/ab-testing.types';

@Injectable()
export class PopupsService {
  private readonly logger = new Logger(PopupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // POPUP CRUD
  // ═══════════════════════════════════════════════════════════════

  async findAll(companyId: string, landingPageId?: string): Promise<PopupSummary[]> {
    const where: any = { companyId };
    if (landingPageId) {
      where.landingPageId = landingPageId;
    }

    const popups = await this.prisma.landingPagePopup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return popups.map(popup => ({
      id: popup.id,
      name: popup.name,
      type: popup.type,
      status: popup.status,
      trigger: popup.trigger,
      impressions: Number(popup.impressions),
      conversions: Number(popup.conversions),
      conversionRate: Number(popup.impressions) > 0
        ? (Number(popup.conversions) / Number(popup.impressions)) * 100
        : 0,
      createdAt: popup.createdAt,
    }));
  }

  async findOne(companyId: string, popupId: string): Promise<PopupDetail> {
    const popup = await this.prisma.landingPagePopup.findFirst({
      where: { id: popupId, companyId },
    });

    if (!popup) {
      throw new NotFoundException('Popup not found');
    }

    return this.mapToDetail(popup);
  }

  async create(
    companyId: string,
    landingPageId: string,
    dto: CreatePopupDto,
    userId: string,
  ): Promise<PopupDetail> {
    // Verify landing page exists and belongs to company
    const page = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, companyId },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // Validate trigger configuration
    this.validateTriggerConfig(dto.trigger, dto.triggerValue, dto.triggerSelector);

    const popup = await this.prisma.landingPagePopup.create({
      data: {
        companyId,
        landingPageId,
        name: dto.name,
        type: dto.type,
        trigger: dto.trigger,
        triggerValue: dto.triggerValue,
        triggerSelector: dto.triggerSelector,
        position: dto.position ?? 'center',
        animation: dto.animation ?? 'fade',
        overlay: dto.overlay ?? true,
        overlayClose: dto.overlayClose ?? true,
        content: dto.content as any,
        styles: dto.styles as any,
        startDate: dto.startDate,
        endDate: dto.endDate,
        showOnce: dto.showOnce ?? false,
        showEveryDays: dto.showEveryDays,
        showOnMobile: dto.showOnMobile ?? true,
        showOnDesktop: dto.showOnDesktop ?? true,
        showOnAllPages: dto.showOnAllPages ?? true,
        targetPages: dto.targetPages ?? [],
        createdBy: userId,
      },
    });

    return this.mapToDetail(popup);
  }

  async update(companyId: string, popupId: string, dto: UpdatePopupDto): Promise<PopupDetail> {
    const popup = await this.prisma.landingPagePopup.findFirst({
      where: { id: popupId, companyId },
    });

    if (!popup) {
      throw new NotFoundException('Popup not found');
    }

    // Validate trigger configuration if updating trigger
    if (dto.trigger) {
      this.validateTriggerConfig(
        dto.trigger,
        dto.triggerValue ?? popup.triggerValue ?? undefined,
        dto.triggerSelector ?? popup.triggerSelector ?? undefined,
      );
    }

    const updated = await this.prisma.landingPagePopup.update({
      where: { id: popupId },
      data: {
        name: dto.name,
        type: dto.type,
        status: dto.status,
        trigger: dto.trigger,
        triggerValue: dto.triggerValue,
        triggerSelector: dto.triggerSelector,
        position: dto.position,
        animation: dto.animation,
        overlay: dto.overlay,
        overlayClose: dto.overlayClose,
        content: dto.content as any,
        styles: dto.styles as any,
        startDate: dto.startDate,
        endDate: dto.endDate,
        showOnce: dto.showOnce,
        showEveryDays: dto.showEveryDays,
        showOnMobile: dto.showOnMobile,
        showOnDesktop: dto.showOnDesktop,
        showOnAllPages: dto.showOnAllPages,
        targetPages: dto.targetPages,
      },
    });

    return this.mapToDetail(updated);
  }

  async delete(companyId: string, popupId: string): Promise<void> {
    const popup = await this.prisma.landingPagePopup.findFirst({
      where: { id: popupId, companyId },
    });

    if (!popup) {
      throw new NotFoundException('Popup not found');
    }

    await this.prisma.landingPagePopup.delete({
      where: { id: popupId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async activate(companyId: string, popupId: string): Promise<PopupDetail> {
    return this.updateStatus(companyId, popupId, PopupStatus.ACTIVE);
  }

  async pause(companyId: string, popupId: string): Promise<PopupDetail> {
    return this.updateStatus(companyId, popupId, PopupStatus.PAUSED);
  }

  async archive(companyId: string, popupId: string): Promise<PopupDetail> {
    return this.updateStatus(companyId, popupId, PopupStatus.ARCHIVED);
  }

  private async updateStatus(companyId: string, popupId: string, status: PopupStatus): Promise<PopupDetail> {
    const popup = await this.prisma.landingPagePopup.findFirst({
      where: { id: popupId, companyId },
    });

    if (!popup) {
      throw new NotFoundException('Popup not found');
    }

    const updated = await this.prisma.landingPagePopup.update({
      where: { id: popupId },
      data: { status },
    });

    return this.mapToDetail(updated);
  }

  // ═══════════════════════════════════════════════════════════════
  // VISITOR TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get active popups for a page that should be shown to the visitor
   */
  async getActivePopupsForPage(
    landingPageId: string,
    pagePath: string,
    device: 'mobile' | 'desktop',
  ): Promise<PopupDetail[]> {
    const now = new Date();

    const popups = await this.prisma.landingPagePopup.findMany({
      where: {
        landingPageId,
        status: PopupStatus.ACTIVE,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter by device and page targeting
    return popups
      .filter(popup => {
        // Device filtering
        if (device === 'mobile' && !popup.showOnMobile) return false;
        if (device === 'desktop' && !popup.showOnDesktop) return false;

        // Page targeting
        if (!popup.showOnAllPages && popup.targetPages.length > 0) {
          const matches = popup.targetPages.some(pattern => {
            // Support wildcards
            if (pattern.includes('*')) {
              const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
              return regex.test(pagePath);
            }
            return pattern === pagePath;
          });
          if (!matches) return false;
        }

        return true;
      })
      .map(popup => this.mapToDetail(popup));
  }

  /**
   * Track popup impression
   */
  async trackImpression(popupId: string): Promise<void> {
    await this.prisma.landingPagePopup.update({
      where: { id: popupId },
      data: {
        impressions: { increment: 1 },
      },
    });
  }

  /**
   * Track popup close
   */
  async trackClose(popupId: string): Promise<void> {
    await this.prisma.landingPagePopup.update({
      where: { id: popupId },
      data: {
        closes: { increment: 1 },
      },
    });
  }

  /**
   * Track popup conversion (form submit, CTA click, etc.)
   */
  async trackConversion(popupId: string): Promise<void> {
    await this.prisma.landingPagePopup.update({
      where: { id: popupId },
      data: {
        conversions: { increment: 1 },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private validateTriggerConfig(trigger: string, triggerValue?: number, triggerSelector?: string): void {
    switch (trigger) {
      case 'TIME_DELAY':
        if (triggerValue === undefined || triggerValue < 0) {
          throw new BadRequestException('TIME_DELAY trigger requires a non-negative triggerValue (seconds)');
        }
        break;
      case 'SCROLL_PERCENT':
        if (triggerValue === undefined || triggerValue < 0 || triggerValue > 100) {
          throw new BadRequestException('SCROLL_PERCENT trigger requires triggerValue between 0 and 100');
        }
        break;
      case 'CLICK':
        if (!triggerSelector) {
          throw new BadRequestException('CLICK trigger requires a triggerSelector (CSS selector)');
        }
        break;
      case 'INACTIVITY':
        if (triggerValue === undefined || triggerValue < 0) {
          throw new BadRequestException('INACTIVITY trigger requires a non-negative triggerValue (seconds)');
        }
        break;
    }
  }

  private mapToDetail(popup: any): PopupDetail {
    return {
      id: popup.id,
      landingPageId: popup.landingPageId,
      companyId: popup.companyId,
      name: popup.name,
      type: popup.type,
      status: popup.status,
      trigger: popup.trigger,
      triggerValue: popup.triggerValue || undefined,
      triggerSelector: popup.triggerSelector || undefined,
      position: popup.position,
      animation: popup.animation,
      overlay: popup.overlay,
      overlayClose: popup.overlayClose,
      content: popup.content as unknown as PopupContent,
      styles: (popup.styles as unknown as PopupStyles) || undefined,
      startDate: popup.startDate || undefined,
      endDate: popup.endDate || undefined,
      showOnce: popup.showOnce,
      showEveryDays: popup.showEveryDays || undefined,
      showOnMobile: popup.showOnMobile,
      showOnDesktop: popup.showOnDesktop,
      showOnAllPages: popup.showOnAllPages,
      targetPages: popup.targetPages,
      impressions: Number(popup.impressions),
      closes: Number(popup.closes),
      conversions: Number(popup.conversions),
      createdAt: popup.createdAt,
      updatedAt: popup.updatedAt,
    };
  }
}
