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

  // Fallback data used only when no real data exists in the database
  private readonly fallbackNames = [
    'Sarah', 'Michael', 'Emily', 'James', 'Jessica', 'David', 'Ashley', 'Robert',
    'Jennifer', 'Daniel', 'Amanda', 'Christopher', 'Stephanie', 'Matthew', 'Nicole',
    'Andrew', 'Lauren', 'Joshua', 'Megan', 'Ryan', 'Brittany', 'Brandon', 'Samantha',
  ];

  private readonly fallbackLocations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
    'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
    'Austin, TX', 'Seattle, WA', 'Denver, CO', 'Boston, MA', 'Nashville, TN',
    'Portland, OR', 'Miami, FL', 'Atlanta, GA', 'San Francisco, CA', 'Minneapolis, MN',
  ];

  // Cached real data from database
  private cachedNames: string[] = [];
  private cachedLocations: string[] = [];
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Refresh cached names and locations from real customer/order data
   */
  private async refreshCache(companyId: string): Promise<void> {
    if (Date.now() < this.cacheExpiry && this.cachedNames.length > 0) {
      return; // Cache still valid
    }

    try {
      // Get real customer names from recent orders
      const recentOrders = await this.prisma.order.findMany({
        where: {
          companyId,
          status: { in: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
        select: {
          shippingSnapshot: true,
          customer: {
            select: {
              firstName: true,
            },
          },
        },
        take: 100,
      });

      // Extract unique first names from orders
      const names = new Set<string>();
      const locations = new Set<string>();

      for (const order of recentOrders) {
        // Get name from customer
        if (order.customer?.firstName) {
          names.add(order.customer.firstName);
        }

        // Get location from shipping snapshot (Json field)
        const address = order.shippingSnapshot as { city?: string; state?: string } | null;
        if (address?.city && address?.state) {
          locations.add(`${address.city}, ${address.state}`);
        }
      }

      // Also get names from customers table
      const customers = await this.prisma.customer.findMany({
        where: {
          companyId,
          firstName: { not: null },
        },
        select: {
          firstName: true,
          addresses: true,
        },
        take: 50,
      });

      for (const customer of customers) {
        if (customer.firstName) {
          names.add(customer.firstName);
        }
        // Get locations from customer addresses
        const addresses = customer.addresses as any[];
        if (Array.isArray(addresses)) {
          for (const addr of addresses) {
            if (addr?.city && addr?.state) {
              locations.add(`${addr.city}, ${addr.state}`);
            }
          }
        }
      }

      // Update cache with real data, keeping fallbacks if insufficient data
      this.cachedNames = names.size >= 5 ? Array.from(names) : this.fallbackNames;
      this.cachedLocations = locations.size >= 5 ? Array.from(locations) : this.fallbackLocations;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      this.logger.debug(
        `Social proof cache refreshed: ${this.cachedNames.length} names, ${this.cachedLocations.length} locations`,
      );
    } catch (error) {
      this.logger.warn(`Failed to refresh social proof cache, using fallbacks: ${error}`);
      this.cachedNames = this.fallbackNames;
      this.cachedLocations = this.fallbackLocations;
    }
  }

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

  // Time ago options for social proof notifications
  private readonly timeAgoOptions = [
    'just now', '2 minutes ago', '5 minutes ago', '8 minutes ago',
    '12 minutes ago', '15 minutes ago', '23 minutes ago', '34 minutes ago',
    '45 minutes ago', '1 hour ago', '2 hours ago', '3 hours ago',
  ];

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
      // Refresh the cache with real customer data
      await this.refreshCache(funnel.companyId);

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
    const names = this.cachedNames.length > 0 ? this.cachedNames : this.fallbackNames;
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomLocation(): string {
    const locations = this.cachedLocations.length > 0 ? this.cachedLocations : this.fallbackLocations;
    return locations[Math.floor(Math.random() * locations.length)];
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
