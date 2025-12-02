import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ABTestStatus } from '@prisma/client';
import {
  CreateABTestDto,
  UpdateABTestDto,
  CreateVariantDto,
  UpdateVariantDto,
  ABTestSummary,
  ABTestDetail,
  VariantDetail,
  VariantChange,
  ABTestAssignmentResult,
  ABTestStats,
} from '../types/ab-testing.types';

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // A/B TEST CRUD
  // ═══════════════════════════════════════════════════════════════

  async findAll(companyId: string, landingPageId?: string): Promise<ABTestSummary[]> {
    const where: any = { companyId };
    if (landingPageId) {
      where.landingPageId = landingPageId;
    }

    const tests = await this.prisma.aBTest.findMany({
      where,
      include: {
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return tests.map(test => {
      const totalVisitors = test.variants.reduce((sum, v) => sum + Number(v.visitors), 0);
      const totalConversions = test.variants.reduce((sum, v) => sum + Number(v.conversions), 0);

      return {
        id: test.id,
        landingPageId: test.landingPageId,
        name: test.name,
        status: test.status,
        trafficPercentage: test.trafficPercentage,
        variantCount: test.variants.length,
        totalVisitors,
        totalConversions,
        overallConversionRate: totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0,
        startedAt: test.startedAt || undefined,
        endedAt: test.endedAt || undefined,
        winnerId: test.winnerId || undefined,
        createdAt: test.createdAt,
      };
    });
  }

  async findOne(companyId: string, testId: string): Promise<ABTestDetail> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, companyId },
      include: {
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('A/B test not found');
    }

    return {
      id: test.id,
      landingPageId: test.landingPageId,
      companyId: test.companyId,
      name: test.name,
      description: test.description || undefined,
      status: test.status,
      trafficPercentage: test.trafficPercentage,
      confidenceLevel: test.confidenceLevel,
      minimumSampleSize: test.minimumSampleSize,
      primaryMetric: test.primaryMetric,
      startedAt: test.startedAt || undefined,
      endedAt: test.endedAt || undefined,
      scheduledStart: test.scheduledStart || undefined,
      scheduledEnd: test.scheduledEnd || undefined,
      winnerId: test.winnerId || undefined,
      winnerDeclaredAt: test.winnerDeclaredAt || undefined,
      statisticalSignificance: test.statisticalSignificance || undefined,
      variants: test.variants.map(v => this.mapVariantToDetail(v)),
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };
  }

  async create(
    companyId: string,
    landingPageId: string,
    dto: CreateABTestDto,
    userId: string,
  ): Promise<ABTestDetail> {
    // Verify landing page exists and belongs to company
    const page = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, companyId },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // Check for existing running test on same page
    const existingRunning = await this.prisma.aBTest.findFirst({
      where: {
        landingPageId,
        status: ABTestStatus.RUNNING,
      },
    });

    if (existingRunning) {
      throw new ConflictException('A test is already running on this page. Please pause or complete it first.');
    }

    const test = await this.prisma.aBTest.create({
      data: {
        companyId,
        landingPageId,
        name: dto.name,
        description: dto.description,
        trafficPercentage: dto.trafficPercentage ?? 100,
        confidenceLevel: dto.confidenceLevel ?? 95,
        minimumSampleSize: dto.minimumSampleSize ?? 100,
        primaryMetric: dto.primaryMetric ?? 'conversions',
        scheduledStart: dto.scheduledStart,
        scheduledEnd: dto.scheduledEnd,
        createdBy: userId,
      },
    });

    return this.findOne(companyId, test.id);
  }

  async update(companyId: string, testId: string, dto: UpdateABTestDto): Promise<ABTestDetail> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, companyId },
    });

    if (!test) {
      throw new NotFoundException('A/B test not found');
    }

    // Can't update certain fields if test is running
    if (test.status === ABTestStatus.RUNNING) {
      if (dto.trafficPercentage !== undefined || dto.confidenceLevel !== undefined) {
        throw new BadRequestException('Cannot change traffic percentage or confidence level while test is running');
      }
    }

    await this.prisma.aBTest.update({
      where: { id: testId },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        trafficPercentage: dto.trafficPercentage,
        confidenceLevel: dto.confidenceLevel,
        minimumSampleSize: dto.minimumSampleSize,
        primaryMetric: dto.primaryMetric,
        scheduledStart: dto.scheduledStart,
        scheduledEnd: dto.scheduledEnd,
        startedAt: dto.status === ABTestStatus.RUNNING && !test.startedAt ? new Date() : undefined,
        endedAt: dto.status === ABTestStatus.COMPLETED && !test.endedAt ? new Date() : undefined,
      },
    });

    return this.findOne(companyId, testId);
  }

  async delete(companyId: string, testId: string): Promise<void> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, companyId },
    });

    if (!test) {
      throw new NotFoundException('A/B test not found');
    }

    if (test.status === ABTestStatus.RUNNING) {
      throw new BadRequestException('Cannot delete a running test. Please pause it first.');
    }

    // Delete assignments first
    await this.prisma.aBTestAssignment.deleteMany({
      where: { testId },
    });

    // Delete variants
    await this.prisma.aBTestVariant.deleteMany({
      where: { testId },
    });

    // Delete test
    await this.prisma.aBTest.delete({
      where: { id: testId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // VARIANT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async addVariant(companyId: string, testId: string, dto: CreateVariantDto): Promise<ABTestDetail> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, companyId },
      include: { variants: true },
    });

    if (!test) {
      throw new NotFoundException('A/B test not found');
    }

    if (test.status === ABTestStatus.RUNNING) {
      throw new BadRequestException('Cannot add variants to a running test');
    }

    // Check total weight won't exceed 100
    const currentWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    if (currentWeight + dto.weight > 100) {
      throw new BadRequestException(`Total variant weights would exceed 100% (current: ${currentWeight}%)`);
    }

    // If this is marked as control, ensure no other control exists
    if (dto.isControl) {
      const existingControl = test.variants.find(v => v.isControl);
      if (existingControl) {
        throw new ConflictException('A control variant already exists. Each test can only have one control.');
      }
    }

    await this.prisma.aBTestVariant.create({
      data: {
        testId,
        name: dto.name,
        isControl: dto.isControl ?? false,
        weight: dto.weight,
        changes: dto.changes as any,
      },
    });

    return this.findOne(companyId, testId);
  }

  async updateVariant(
    companyId: string,
    testId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<ABTestDetail> {
    const variant = await this.prisma.aBTestVariant.findFirst({
      where: {
        id: variantId,
        testId,
        test: { companyId },
      },
      include: { test: { include: { variants: true } } },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.test.status === ABTestStatus.RUNNING) {
      // Allow updating content changes during a running test, but not weights
      if (dto.weight !== undefined && dto.weight !== variant.weight) {
        throw new BadRequestException('Cannot change variant weight while test is running');
      }
    }

    // Check weight constraint
    if (dto.weight !== undefined) {
      const otherWeight = variant.test.variants
        .filter(v => v.id !== variantId)
        .reduce((sum, v) => sum + v.weight, 0);
      if (otherWeight + dto.weight > 100) {
        throw new BadRequestException(`Total variant weights would exceed 100%`);
      }
    }

    await this.prisma.aBTestVariant.update({
      where: { id: variantId },
      data: {
        name: dto.name,
        weight: dto.weight,
        changes: dto.changes as any,
      },
    });

    return this.findOne(companyId, testId);
  }

  async deleteVariant(companyId: string, testId: string, variantId: string): Promise<ABTestDetail> {
    const variant = await this.prisma.aBTestVariant.findFirst({
      where: {
        id: variantId,
        testId,
        test: { companyId },
      },
      include: { test: true },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.test.status === ABTestStatus.RUNNING) {
      throw new BadRequestException('Cannot delete variants from a running test');
    }

    // Delete assignments for this variant
    await this.prisma.aBTestAssignment.deleteMany({
      where: { variantId },
    });

    await this.prisma.aBTestVariant.delete({
      where: { id: variantId },
    });

    return this.findOne(companyId, testId);
  }

  // ═══════════════════════════════════════════════════════════════
  // VISITOR ASSIGNMENT & TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Assign a visitor to a variant based on weighted random selection
   * Returns the variant with content changes to apply
   */
  async assignVisitor(landingPageId: string, visitorId: string): Promise<ABTestAssignmentResult | null> {
    // Find active test for this page
    const test = await this.prisma.aBTest.findFirst({
      where: {
        landingPageId,
        status: ABTestStatus.RUNNING,
      },
      include: {
        variants: true,
      },
    });

    if (!test || test.variants.length === 0) {
      return null;
    }

    // Check if visitor is already assigned
    const existingAssignment = await this.prisma.aBTestAssignment.findUnique({
      where: {
        testId_visitorId: {
          testId: test.id,
          visitorId,
        },
      },
    });

    if (existingAssignment) {
      const variant = test.variants.find(v => v.id === existingAssignment.variantId);
      if (variant) {
        return {
          testId: test.id,
          variantId: variant.id,
          variantName: variant.name,
          changes: variant.changes as unknown as VariantChange[],
          isNewVisitor: false,
        };
      }
    }

    // Check if this visitor should be included in the test based on traffic percentage
    if (test.trafficPercentage < 100) {
      const shouldInclude = Math.random() * 100 < test.trafficPercentage;
      if (!shouldInclude) {
        // Return control variant without tracking
        const control = test.variants.find(v => v.isControl) || test.variants[0];
        return {
          testId: test.id,
          variantId: control.id,
          variantName: control.name,
          changes: control.changes as unknown as VariantChange[],
          isNewVisitor: false,
        };
      }
    }

    // Weighted random selection
    const selectedVariant = this.weightedRandomSelect(test.variants);

    // Create assignment
    await this.prisma.aBTestAssignment.create({
      data: {
        testId: test.id,
        variantId: selectedVariant.id,
        visitorId,
      },
    });

    // Increment visitor count
    await this.prisma.aBTestVariant.update({
      where: { id: selectedVariant.id },
      data: {
        visitors: { increment: 1 },
      },
    });

    return {
      testId: test.id,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      changes: selectedVariant.changes as unknown as VariantChange[],
      isNewVisitor: true,
    };
  }

  /**
   * Track a conversion for a visitor
   */
  async trackConversion(testId: string, visitorId: string, revenue?: number): Promise<boolean> {
    const assignment = await this.prisma.aBTestAssignment.findUnique({
      where: {
        testId_visitorId: { testId, visitorId },
      },
    });

    if (!assignment || assignment.converted) {
      return false;
    }

    // Update assignment
    await this.prisma.aBTestAssignment.update({
      where: { id: assignment.id },
      data: {
        converted: true,
        convertedAt: new Date(),
        revenue: revenue ? BigInt(revenue) : undefined,
      },
    });

    // Update variant stats
    await this.prisma.aBTestVariant.update({
      where: { id: assignment.variantId },
      data: {
        conversions: { increment: 1 },
        totalRevenue: revenue ? { increment: revenue } : undefined,
      },
    });

    // Recalculate conversion rate
    const variant = await this.prisma.aBTestVariant.findUnique({
      where: { id: assignment.variantId },
    });

    if (variant && Number(variant.visitors) > 0) {
      const rate = (Number(variant.conversions) / Number(variant.visitors)) * 100;
      await this.prisma.aBTestVariant.update({
        where: { id: assignment.variantId },
        data: {
          conversionRate: rate,
          avgOrderValue: revenue
            ? Number(variant.totalRevenue) / Number(variant.conversions)
            : variant.avgOrderValue,
        },
      });
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // STATISTICS & ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  async getStats(companyId: string, testId: string): Promise<ABTestStats[]> {
    const test = await this.findOne(companyId, testId);

    const control = test.variants.find(v => v.isControl);
    const controlRate = control?.conversionRate || 0;

    return test.variants.map(variant => {
      const improvement = controlRate > 0
        ? ((variant.conversionRate - controlRate) / controlRate) * 100
        : 0;

      // Calculate statistical significance using z-test approximation
      const confidence = this.calculateConfidence(
        variant.conversions,
        variant.visitors,
        control?.conversions || 0,
        control?.visitors || 0,
      );

      return {
        variantId: variant.id,
        variantName: variant.name,
        visitors: variant.visitors,
        conversions: variant.conversions,
        conversionRate: variant.conversionRate,
        improvement,
        confidence,
        isWinning: variant.conversionRate > controlRate && confidence >= test.confidenceLevel,
      };
    });
  }

  /**
   * Declare a winner for the test
   */
  async declareWinner(companyId: string, testId: string, variantId: string): Promise<ABTestDetail> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, companyId },
      include: { variants: true },
    });

    if (!test) {
      throw new NotFoundException('A/B test not found');
    }

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const stats = await this.getStats(companyId, testId);
    const variantStats = stats.find(s => s.variantId === variantId);

    await this.prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: ABTestStatus.COMPLETED,
        winnerId: variantId,
        winnerDeclaredAt: new Date(),
        endedAt: new Date(),
        statisticalSignificance: variantStats?.confidence,
      },
    });

    return this.findOne(companyId, testId);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private mapVariantToDetail(variant: any): VariantDetail {
    return {
      id: variant.id,
      name: variant.name,
      isControl: variant.isControl,
      weight: variant.weight,
      changes: variant.changes as unknown as VariantChange[],
      visitors: Number(variant.visitors),
      conversions: Number(variant.conversions),
      conversionRate: variant.conversionRate,
      bounceRate: variant.bounceRate,
      avgTimeOnPage: variant.avgTimeOnPage,
      totalRevenue: Number(variant.totalRevenue),
      avgOrderValue: variant.avgOrderValue,
      createdAt: variant.createdAt,
    };
  }

  private weightedRandomSelect(variants: any[]): any {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= variant.weight;
      if (random <= 0) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  /**
   * Calculate statistical confidence using two-proportion z-test
   */
  private calculateConfidence(
    conversionsA: number,
    visitorsA: number,
    conversionsB: number,
    visitorsB: number,
  ): number {
    if (visitorsA === 0 || visitorsB === 0) return 0;

    const p1 = conversionsA / visitorsA;
    const p2 = conversionsB / visitorsB;
    const pPooled = (conversionsA + conversionsB) / (visitorsA + visitorsB);

    if (pPooled === 0 || pPooled === 1) return 0;

    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / visitorsA + 1 / visitorsB));
    if (se === 0) return 0;

    const z = Math.abs(p1 - p2) / se;

    // Convert z-score to confidence percentage (simplified)
    // Using normal distribution approximation
    if (z >= 2.576) return 99;
    if (z >= 1.96) return 95;
    if (z >= 1.645) return 90;
    if (z >= 1.28) return 80;
    return Math.round(z * 30); // Rough approximation for lower values
  }
}
