import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationProvider, IntegrationStatus, IntegrationCategory } from '../types/integration.types';
import {
  FAILOVER_CHAIN,
  getFailoverGroup,
  getFallbackProviders,
  getCommonFeatures,
  getFeaturesLostOnFailover,
} from '../config/failover-config';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FailoverResult {
  success: boolean;
  originalProvider: IntegrationProvider;
  fallbackProvider?: IntegrationProvider;
  integrationId?: string;
  message: string;
  featuresLost?: string[];
}

export interface ProviderHealth {
  provider: IntegrationProvider;
  integrationId: string;
  status: IntegrationStatus;
  lastTestedAt?: Date;
  lastTestResult?: 'success' | 'failure';
  errorCount: number;
  isAvailable: boolean;
}

export interface FailoverStrategy {
  maxRetries: number;
  retryDelayMs: number;
  errorThreshold: number; // Number of errors before failover
  cooldownMs: number; // Time before retrying failed provider
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class IntegrationFailoverService {
  private readonly logger = new Logger(IntegrationFailoverService.name);

  // Track error counts per integration (in-memory, resets on restart)
  private errorCounts = new Map<string, number>();

  // Track when providers were marked as failed (for cooldown)
  private failedAt = new Map<string, Date>();

  // Default failover strategy
  private readonly defaultStrategy: FailoverStrategy = {
    maxRetries: 3,
    retryDelayMs: 1000,
    errorThreshold: 3,
    cooldownMs: 5 * 60 * 1000, // 5 minutes
  };

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // CORE FAILOVER LOGIC
  // ─────────────────────────────────────────────────────────────

  /**
   * Get the best available provider for a category
   * Returns the first healthy provider in the failover chain
   */
  async getAvailableProvider(
    organizationId: string,
    category: IntegrationCategory,
    clientId?: string,
  ): Promise<{ provider: IntegrationProvider; integrationId: string } | null> {
    // Get all integrations for this category
    const integrations = await this.getIntegrationsForCategory(
      organizationId,
      category,
      clientId,
    );

    if (integrations.length === 0) {
      this.logger.warn(`No integrations configured for category: ${category}`);
      return null;
    }

    // Sort by priority (based on failover chain) and health
    const sorted = this.sortByPriorityAndHealth(integrations);

    for (const integration of sorted) {
      if (this.isAvailable(integration.id, integration.provider as IntegrationProvider)) {
        return {
          provider: integration.provider as IntegrationProvider,
          integrationId: integration.id,
        };
      }
    }

    this.logger.error(`No available providers for category: ${category}`);
    return null;
  }

  /**
   * Attempt failover when a provider fails
   */
  async attemptFailover(
    failedIntegrationId: string,
    organizationId: string,
    clientId?: string,
  ): Promise<FailoverResult> {
    // Get the failed integration
    const failed = await this.prisma.platformIntegration.findUnique({
      where: { id: failedIntegrationId },
    });

    if (!failed) {
      // Try client integration
      const clientIntegration = await this.prisma.clientIntegration.findUnique({
        where: { id: failedIntegrationId },
      });

      if (!clientIntegration) {
        return {
          success: false,
          originalProvider: IntegrationProvider.AUTH0, // placeholder
          message: 'Integration not found',
        };
      }

      return this.findFallback(
        clientIntegration.provider as IntegrationProvider,
        clientIntegration.category as IntegrationCategory,
        organizationId,
        clientId,
      );
    }

    return this.findFallback(
      failed.provider as IntegrationProvider,
      failed.category as IntegrationCategory,
      organizationId,
      clientId,
    );
  }

  /**
   * Find a fallback provider
   */
  private async findFallback(
    originalProvider: IntegrationProvider,
    category: IntegrationCategory,
    organizationId: string,
    clientId?: string,
  ): Promise<FailoverResult> {
    const fallbacks = getFallbackProviders(originalProvider);

    if (fallbacks.length === 0) {
      return {
        success: false,
        originalProvider,
        message: `No fallback providers configured for ${originalProvider}`,
      };
    }

    // Find a healthy fallback
    for (const fallbackProvider of fallbacks) {
      const integration = await this.findHealthyIntegration(
        fallbackProvider,
        organizationId,
        clientId,
      );

      if (integration) {
        const featuresLost = getFeaturesLostOnFailover(originalProvider, fallbackProvider);

        this.logger.log(
          `Failover: ${originalProvider} -> ${fallbackProvider} (features lost: ${featuresLost.join(', ') || 'none'})`,
        );

        return {
          success: true,
          originalProvider,
          fallbackProvider,
          integrationId: integration.id,
          message: `Failed over from ${originalProvider} to ${fallbackProvider}`,
          featuresLost,
        };
      }
    }

    return {
      success: false,
      originalProvider,
      message: `No healthy fallback providers available for ${originalProvider}`,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // ERROR TRACKING
  // ─────────────────────────────────────────────────────────────

  /**
   * Record an error for an integration
   */
  recordError(integrationId: string): void {
    const count = (this.errorCounts.get(integrationId) || 0) + 1;
    this.errorCounts.set(integrationId, count);

    if (count >= this.defaultStrategy.errorThreshold) {
      this.markAsFailed(integrationId);
    }
  }

  /**
   * Record a success (resets error count)
   */
  recordSuccess(integrationId: string): void {
    this.errorCounts.delete(integrationId);
    this.failedAt.delete(integrationId);
  }

  /**
   * Mark an integration as temporarily failed
   */
  private markAsFailed(integrationId: string): void {
    this.failedAt.set(integrationId, new Date());
    this.logger.warn(`Integration ${integrationId} marked as failed (threshold reached)`);
  }

  /**
   * Check if an integration is available (not in cooldown)
   */
  isAvailable(integrationId: string, provider: IntegrationProvider): boolean {
    const failedTime = this.failedAt.get(integrationId);

    if (!failedTime) {
      return true;
    }

    const elapsed = Date.now() - failedTime.getTime();

    if (elapsed >= this.defaultStrategy.cooldownMs) {
      // Cooldown expired, allow retry
      this.failedAt.delete(integrationId);
      this.errorCounts.delete(integrationId);
      this.logger.log(`Integration ${integrationId} cooldown expired, available for retry`);
      return true;
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // HEALTH CHECKS
  // ─────────────────────────────────────────────────────────────

  /**
   * Get health status for all integrations in a category
   */
  async getCategoryHealth(
    organizationId: string,
    category: IntegrationCategory,
    clientId?: string,
  ): Promise<ProviderHealth[]> {
    const integrations = await this.getIntegrationsForCategory(
      organizationId,
      category,
      clientId,
    );

    return integrations.map((integration) => ({
      provider: integration.provider as IntegrationProvider,
      integrationId: integration.id,
      status: integration.status as IntegrationStatus,
      lastTestedAt: integration.lastTestedAt || undefined,
      lastTestResult: integration.lastTestResult as 'success' | 'failure' | undefined,
      errorCount: this.errorCounts.get(integration.id) || 0,
      isAvailable: this.isAvailable(integration.id, integration.provider as IntegrationProvider),
    }));
  }

  /**
   * Get the failover chain for a provider
   */
  getFailoverChain(provider: IntegrationProvider): IntegrationProvider[] {
    return FAILOVER_CHAIN[provider] || [];
  }

  /**
   * Get common features between two providers
   */
  getCommonFeatures(
    provider1: IntegrationProvider,
    provider2: IntegrationProvider,
  ): string[] {
    return getCommonFeatures(provider1, provider2);
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────

  private async getIntegrationsForCategory(
    organizationId: string,
    category: IntegrationCategory,
    clientId?: string,
  ): Promise<any[]> {
    const integrations: any[] = [];

    // Get platform integrations
    const platform = await this.prisma.platformIntegration.findMany({
      where: {
        organizationId,
        category: category as any,
        status: { not: 'ERROR' },
      },
    });
    integrations.push(...platform);

    // Get client integrations if clientId provided
    if (clientId) {
      const client = await this.prisma.clientIntegration.findMany({
        where: {
          clientId,
          category: category as any,
          status: { not: 'ERROR' },
        },
      });
      integrations.push(...client);
    }

    return integrations;
  }

  private async findHealthyIntegration(
    provider: IntegrationProvider,
    organizationId: string,
    clientId?: string,
  ): Promise<any | null> {
    // Check platform integration first
    const platform = await this.prisma.platformIntegration.findFirst({
      where: {
        organizationId,
        provider: provider as any,
        status: 'ACTIVE',
      },
    });

    if (platform && this.isAvailable(platform.id, provider)) {
      return platform;
    }

    // Check client integration
    if (clientId) {
      const client = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId,
          provider: provider as any,
          status: 'ACTIVE',
        },
      });

      if (client && this.isAvailable(client.id, provider)) {
        return client;
      }
    }

    return null;
  }

  private sortByPriorityAndHealth(integrations: any[]): any[] {
    const group = integrations[0]
      ? getFailoverGroup(integrations[0].provider as IntegrationProvider)
      : null;

    if (!group) {
      return integrations;
    }

    return integrations.sort((a, b) => {
      const aIndex = group.priority.indexOf(a.provider as IntegrationProvider);
      const bIndex = group.priority.indexOf(b.provider as IntegrationProvider);

      // Priority first
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      // Then by health (fewer errors first)
      const aErrors = this.errorCounts.get(a.id) || 0;
      const bErrors = this.errorCounts.get(b.id) || 0;

      return aErrors - bErrors;
    });
  }
}
