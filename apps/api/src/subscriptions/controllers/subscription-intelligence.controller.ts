/**
 * Subscription Intelligence Controller
 *
 * Endpoints for AI-powered subscription analytics:
 * - Churn prediction
 * - Lifetime value
 * - Health reports
 * - Recommendations
 */

import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SubscriptionIntelligenceService,
  ChurnPrediction,
  LifetimeValueEstimate,
  SubscriptionHealthReport,
  IntelligenceInsights,
  ProductRecommendation,
  OptimalTimingRecommendation,
} from '../services/subscription-intelligence.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';

@Controller('subscriptions/intelligence')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionIntelligenceController {
  private readonly logger = new Logger(SubscriptionIntelligenceController.name);

  constructor(
    private readonly intelligenceService: SubscriptionIntelligenceService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHURN PREDICTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get churn prediction for a subscription
   */
  @Get('churn/:subscriptionId')
  async predictChurn(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChurnPrediction> {
    return this.intelligenceService.predictChurn(subscriptionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIFETIME VALUE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get lifetime value estimate for a customer
   */
  @Get('ltv/:customerId')
  async estimateLTV(
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LifetimeValueEstimate> {
    return this.intelligenceService.estimateLTV(customerId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HEALTH REPORTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get health report for a subscription
   */
  @Get('health/:subscriptionId')
  async getHealthReport(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionHealthReport> {
    return this.intelligenceService.getHealthReport(subscriptionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPANY INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get intelligence insights for a company
   */
  @Get('insights')
  async getCompanyInsights(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IntelligenceInsights> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.intelligenceService.getCompanyInsights(companyId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get product recommendations for a customer
   */
  @Get('recommendations/:customerId')
  async getProductRecommendations(
    @Param('customerId') customerId: string,
    @Query('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductRecommendation> {
    return this.intelligenceService.getProductRecommendations(
      customerId,
      subscriptionId || undefined,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMAL TIMING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get optimal timing for an action
   */
  @Get('timing/:subscriptionId/:actionType')
  async getOptimalTiming(
    @Param('subscriptionId') subscriptionId: string,
    @Param('actionType') actionType: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OptimalTimingRecommendation> {
    return this.intelligenceService.getOptimalTiming(subscriptionId, actionType);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    if (user.companyId) {
      return user.companyId;
    }

    if (!queryCompanyId) {
      throw new Error('companyId is required for organization/client users');
    }

    return queryCompanyId;
  }
}
