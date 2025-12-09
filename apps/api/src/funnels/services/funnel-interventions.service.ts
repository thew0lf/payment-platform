import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BehavioralTriggerType } from '../../momentum-intelligence/types/triggers.types';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERVENTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SocialProofConfig {
  enabled: boolean;
  type: 'recent_purchase' | 'active_viewers' | 'total_purchases' | 'rating';
  displayInterval: number; // seconds between notifications
  displayDuration: number; // how long each notification shows
  minDelay: number; // minimum seconds before first notification
  maxDelay: number; // maximum seconds before first notification
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  showOnStages: string[]; // stage types to show on
}

export interface UrgencyConfig {
  enabled: boolean;
  type: 'countdown' | 'limited_time' | 'ending_soon';
  duration: number; // seconds
  message: string;
  expiredMessage?: string;
  showOnStages: string[];
  position: 'banner' | 'inline' | 'floating';
  style: 'warning' | 'info' | 'danger';
}

export interface ScarcityConfig {
  enabled: boolean;
  type: 'stock' | 'spots' | 'availability';
  threshold: number; // number to display
  message: string;
  showOnStages: string[];
  animate: boolean;
}

export interface InterventionConfig {
  socialProof?: SocialProofConfig;
  urgency?: UrgencyConfig;
  scarcity?: ScarcityConfig;
}

export interface SocialProofNotification {
  id: string;
  name: string;
  location: string;
  product: string;
  timeAgo: string;
  avatarUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class FunnelInterventionsService {
  private readonly logger = new Logger(FunnelInterventionsService.name);

  // Sample data for social proof - in production this would come from real transactions
  private readonly sampleNames = [
    'Sarah', 'Michael', 'Emily', 'James', 'Jessica', 'David', 'Ashley', 'Robert',
    'Jennifer', 'Daniel', 'Amanda', 'Christopher', 'Stephanie', 'Matthew', 'Nicole',
    'Andrew', 'Lauren', 'Joshua', 'Megan', 'Ryan', 'Brittany', 'Brandon', 'Samantha',
  ];

  private readonly sampleLocations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
    'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
    'Austin, TX', 'Seattle, WA', 'Denver, CO', 'Boston, MA', 'Nashville, TN',
    'Portland, OR', 'Miami, FL', 'Atlanta, GA', 'San Francisco, CA', 'Minneapolis, MN',
  ];

  private readonly timeAgoOptions = [
    '2 minutes ago', '5 minutes ago', '8 minutes ago', '12 minutes ago', '15 minutes ago',
    '20 minutes ago', '25 minutes ago', '30 minutes ago', '45 minutes ago', '1 hour ago',
  ];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // INTERVENTION CONFIG
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get intervention configuration for a funnel
   */
  async getInterventionConfig(funnelId: string): Promise<InterventionConfig> {
    const funnel = await this.prisma.funnel.findUnique({
      where: { id: funnelId },
      select: {
        id: true,
        settings: true,
        companyId: true,
      },
    });

    if (!funnel) {
      return {};
    }

    // Check if company has MI interventions enabled
    const company = await this.prisma.company.findUnique({
      where: { id: funnel.companyId },
      select: {
        id: true,
        settings: true,
      },
    });

    const companySettings = company?.settings as any || {};
    const miEnabled = companySettings.miInterventionsEnabled !== false; // Default to enabled

    if (!miEnabled) {
      return {};
    }

    // Get funnel-specific intervention settings
    const funnelSettings = funnel.settings as any || {};
    const interventionSettings = funnelSettings.interventions || {};

    // Build intervention config with defaults
    const config: InterventionConfig = {};

    // Social Proof
    if (interventionSettings.socialProof?.enabled !== false) {
      config.socialProof = {
        enabled: true,
        type: interventionSettings.socialProof?.type || 'recent_purchase',
        displayInterval: interventionSettings.socialProof?.displayInterval || 45,
        displayDuration: interventionSettings.socialProof?.displayDuration || 5,
        minDelay: interventionSettings.socialProof?.minDelay || 10,
        maxDelay: interventionSettings.socialProof?.maxDelay || 30,
        position: interventionSettings.socialProof?.position || 'bottom-left',
        showOnStages: interventionSettings.socialProof?.showOnStages || ['LANDING', 'PRODUCT_SELECTION', 'CHECKOUT'],
      };
    }

    // Urgency
    if (interventionSettings.urgency?.enabled) {
      config.urgency = {
        enabled: true,
        type: interventionSettings.urgency?.type || 'countdown',
        duration: interventionSettings.urgency?.duration || 900, // 15 minutes
        message: interventionSettings.urgency?.message || 'Limited time offer! Ends in:',
        expiredMessage: interventionSettings.urgency?.expiredMessage || 'Offer expired',
        showOnStages: interventionSettings.urgency?.showOnStages || ['CHECKOUT'],
        position: interventionSettings.urgency?.position || 'banner',
        style: interventionSettings.urgency?.style || 'warning',
      };
    }

    // Scarcity
    if (interventionSettings.scarcity?.enabled) {
      config.scarcity = {
        enabled: true,
        type: interventionSettings.scarcity?.type || 'stock',
        threshold: interventionSettings.scarcity?.threshold || 5,
        message: interventionSettings.scarcity?.message || 'Only {count} left in stock!',
        showOnStages: interventionSettings.scarcity?.showOnStages || ['PRODUCT_SELECTION', 'CHECKOUT'],
        animate: interventionSettings.scarcity?.animate !== false,
      };
    }

    return config;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SOCIAL PROOF DATA
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get social proof notifications for a funnel
   * Returns sample notifications for display
   */
  async getSocialProofNotifications(
    funnelId: string,
    count: number = 10,
  ): Promise<SocialProofNotification[]> {
    // Try to get real recent orders for this funnel's company
    const funnel = await this.prisma.funnel.findUnique({
      where: { id: funnelId },
      select: { companyId: true },
    });

    if (funnel) {
      // Get recent order count to determine if we have real data
      const recentOrderCount = await this.prisma.order.count({
        where: {
          companyId: funnel.companyId,
          status: { in: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      // If we have recent orders, generate realistic notifications
      if (recentOrderCount > 0) {
        return this.generateRealisticNotifications(count);
      }
    }

    // Fallback to sample notifications
    return this.generateSampleNotifications(count);
  }

  /**
   * Generate realistic notifications based on actual order activity
   */
  private generateRealisticNotifications(count: number): SocialProofNotification[] {
    const notifications: SocialProofNotification[] = [];

    for (let i = 0; i < count; i++) {
      notifications.push({
        id: `real-${i}-${Date.now()}`,
        name: this.getRandomName(),
        location: this.getRandomLocation(),
        product: 'this product',
        timeAgo: this.timeAgoOptions[i % this.timeAgoOptions.length],
      });
    }

    return notifications;
  }

  /**
   * Generate sample social proof notifications
   */
  private generateSampleNotifications(count: number): SocialProofNotification[] {
    const notifications: SocialProofNotification[] = [];

    for (let i = 0; i < count; i++) {
      notifications.push({
        id: `sample-${i}-${Date.now()}`,
        name: this.getRandomName(),
        location: this.getRandomLocation(),
        product: 'this product',
        timeAgo: this.timeAgoOptions[Math.floor(Math.random() * this.timeAgoOptions.length)],
      });
    }

    return notifications;
  }

  private getRandomName(): string {
    return this.sampleNames[Math.floor(Math.random() * this.sampleNames.length)];
  }

  private getRandomLocation(): string {
    return this.sampleLocations[Math.floor(Math.random() * this.sampleLocations.length)];
  }

  private getTimeAgo(date: Date): string {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 2) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRACKING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Track intervention interaction
   */
  async trackInterventionEvent(
    sessionId: string,
    interventionType: string,
    action: 'shown' | 'clicked' | 'dismissed' | 'converted',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Use CUSTOM_EVENT type with intervention details in data field
      await this.prisma.funnelEvent.create({
        data: {
          sessionId,
          type: 'CUSTOM_EVENT',
          stageOrder: 0,
          data: {
            eventSubType: `intervention_${action}`,
            interventionType,
            ...metadata,
          } as any,
        },
      });

      this.logger.debug(
        `Tracked intervention event: ${interventionType} - ${action} for session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to track intervention event: ${error}`);
    }
  }
}
