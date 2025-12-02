import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIFeature, AIUsageStatus } from '@prisma/client';

export interface TrackUsageParams {
  companyId: string;
  userId: string;
  feature: AIFeature;
  operation: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  landingPageId?: string;
  metadata?: Record<string, unknown>;
  status?: AIUsageStatus;
  errorMsg?: string;
}

export interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  usageByFeature: Record<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

// Default pricing (per 1000 tokens, in cents)
const DEFAULT_INPUT_PRICE = 3;   // $0.03 per 1K input tokens
const DEFAULT_OUTPUT_PRICE = 15; // $0.15 per 1K output tokens

@Injectable()
export class AIUsageService {
  private readonly logger = new Logger(AIUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track AI usage for billing
   */
  async trackUsage(params: TrackUsageParams): Promise<void> {
    const {
      companyId,
      userId,
      feature,
      operation,
      modelId,
      inputTokens,
      outputTokens,
      landingPageId,
      metadata,
      status = AIUsageStatus.SUCCESS,
      errorMsg,
    } = params;

    const totalTokens = inputTokens + outputTokens;

    // Calculate costs (per 1000 tokens)
    const inputCost = Math.ceil((inputTokens / 1000) * DEFAULT_INPUT_PRICE);
    const outputCost = Math.ceil((outputTokens / 1000) * DEFAULT_OUTPUT_PRICE);
    const totalCost = inputCost + outputCost;

    try {
      await this.prisma.aIUsage.create({
        data: {
          companyId,
          userId,
          feature,
          operation,
          modelId,
          inputTokens,
          outputTokens,
          totalTokens,
          inputCost,
          outputCost,
          totalCost,
          landingPageId,
          metadata: metadata as any,
          status,
          errorMsg,
        },
      });

      this.logger.debug(
        `Tracked AI usage: ${feature}/${operation} - ${totalTokens} tokens, $${(totalCost / 100).toFixed(4)}`
      );
    } catch (error) {
      this.logger.error('Failed to track AI usage', error);
      // Don't throw - usage tracking failure shouldn't break the main operation
    }
  }

  /**
   * Get current month's usage summary for a company
   */
  async getMonthlyUsage(companyId: string): Promise<UsageSummary> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const usage = await this.prisma.aIUsage.findMany({
      where: {
        companyId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: AIUsageStatus.SUCCESS,
      },
    });

    const summary: UsageSummary = {
      totalRequests: usage.length,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      usageByFeature: {},
    };

    for (const record of usage) {
      summary.totalInputTokens += record.inputTokens;
      summary.totalOutputTokens += record.outputTokens;
      summary.totalTokens += record.totalTokens;
      summary.totalCost += record.totalCost;

      const featureKey = record.feature;
      if (!summary.usageByFeature[featureKey]) {
        summary.usageByFeature[featureKey] = {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
        };
      }
      summary.usageByFeature[featureKey].requests++;
      summary.usageByFeature[featureKey].inputTokens += record.inputTokens;
      summary.usageByFeature[featureKey].outputTokens += record.outputTokens;
      summary.usageByFeature[featureKey].cost += record.totalCost;
    }

    return summary;
  }

  /**
   * Get usage history with pagination
   */
  async getUsageHistory(
    companyId: string,
    options: {
      feature?: AIFeature;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ records: any[]; total: number }> {
    const { feature, startDate, endDate, limit = 50, offset = 0 } = options;

    const where: any = { companyId };

    if (feature) {
      where.feature = feature;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [records, total] = await Promise.all([
      this.prisma.aIUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.aIUsage.count({ where }),
    ]);

    return { records, total };
  }

  /**
   * Create or update monthly summary for billing
   */
  async updateMonthlySummary(companyId: string): Promise<void> {
    const summary = await this.getMonthlyUsage(companyId);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await this.prisma.aIUsageSummary.upsert({
      where: {
        companyId_periodStart: {
          companyId,
          periodStart,
        },
      },
      create: {
        companyId,
        periodStart,
        periodEnd,
        totalRequests: summary.totalRequests,
        totalInputTokens: summary.totalInputTokens,
        totalOutputTokens: summary.totalOutputTokens,
        totalTokens: summary.totalTokens,
        totalCost: summary.totalCost,
        usageByFeature: summary.usageByFeature,
      },
      update: {
        totalRequests: summary.totalRequests,
        totalInputTokens: summary.totalInputTokens,
        totalOutputTokens: summary.totalOutputTokens,
        totalTokens: summary.totalTokens,
        totalCost: summary.totalCost,
        usageByFeature: summary.usageByFeature,
      },
    });
  }
}
