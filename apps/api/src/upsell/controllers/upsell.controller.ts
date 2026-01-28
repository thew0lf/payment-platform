import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UpsellType, UpsellUrgency, ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { UpsellTargetingService } from '../services/upsell-targeting.service';
import { BulkDiscountService } from '../services/bulk-discount.service';
import { SubscriptionIntelligenceService } from '../services/subscription-intelligence.service';
import {
  CreateTargetingRuleDto,
  UpdateTargetingRuleDto,
  RecordImpressionDto,
  RecordAcceptanceDto,
  RecordDeclineDto,
  GetCartUpsellsQueryDto,
} from '../dto/upsell.dto';

@ApiTags('Upsell')
@Controller('upsell')
export class UpsellController {
  constructor(
    private readonly upsellTargetingService: UpsellTargetingService,
    private readonly bulkDiscountService: BulkDiscountService,
    private readonly subscriptionIntelligenceService: SubscriptionIntelligenceService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ==========================================================================
  // CART UPSELLS (Public - uses session)
  // ==========================================================================

  @Get('cart/:cartId')
  @ApiOperation({ summary: 'Get upsells for a cart' })
  async getCartUpsells(
    @Param('cartId') cartId: string,
    @Query() query: GetCartUpsellsQueryDto,
  ) {
    // Get targeted upsells
    const targetedUpsells = await this.upsellTargetingService.getTargetedUpsells(
      cartId,
      {
        maxUpsells: query.maxUpsells,
        placements: query.placements,
      },
    );

    return { upsells: targetedUpsells };
  }

  // ==========================================================================
  // TARGETING RULES (Admin)
  // ==========================================================================

  @Get('rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all targeting rules' })
  async getTargetingRules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.upsellTargetingService.getTargetingRules(companyId);
  }

  @Post('rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a targeting rule' })
  async createTargetingRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTargetingRuleDto,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.upsellTargetingService.createTargetingRule(companyId, {
      name: dto.name,
      description: dto.description,
      priority: dto.priority || 100,
      enabled: dto.enabled ?? true,
      conditions: dto.conditions as unknown as import('../types/upsell.types').UpsellConditions,
      upsellType: dto.upsellType as unknown as UpsellType,
      offer: dto.offer as unknown as import('../types/upsell.types').UpsellOffer,
      message: dto.message,
      urgency: (dto.urgency || 'MEDIUM') as UpsellUrgency,
      placements: dto.placements,
      maxImpressions: dto.maxImpressions,
      maxAcceptances: dto.maxAcceptances,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
    });
  }

  @Put('rules/:ruleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a targeting rule' })
  async updateTargetingRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateTargetingRuleDto,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.upsellTargetingService.updateTargetingRule(ruleId, companyId, {
      name: dto.name,
      description: dto.description,
      priority: dto.priority,
      enabled: dto.enabled,
      conditions: dto.conditions as unknown as import('../types/upsell.types').UpsellConditions,
      upsellType: dto.upsellType as unknown as UpsellType,
      offer: dto.offer as unknown as import('../types/upsell.types').UpsellOffer,
      message: dto.message,
      urgency: dto.urgency as UpsellUrgency,
      placements: dto.placements,
      maxImpressions: dto.maxImpressions,
      maxAcceptances: dto.maxAcceptances,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
    });
  }

  @Delete('rules/:ruleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a targeting rule' })
  async deleteTargetingRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    await this.upsellTargetingService.deleteTargetingRule(ruleId, companyId);
    return { success: true };
  }

  // ==========================================================================
  // IMPRESSIONS (Public - tracking)
  // ==========================================================================

  @Post('impressions')
  @ApiOperation({ summary: 'Record an upsell impression' })
  async recordImpression(@Body() dto: RecordImpressionDto) {
    const impressionId = await this.upsellTargetingService.recordImpression({
      cartId: dto.cartId,
      ruleId: dto.ruleId,
      customerId: dto.customerId,
      sessionId: dto.sessionId,
      placement: dto.placement,
      variant: dto.variant,
      offer: dto.offer,
    });
    return { impressionId };
  }

  @Post('impressions/accept')
  @ApiOperation({ summary: 'Record upsell acceptance' })
  async recordAcceptance(@Body() dto: RecordAcceptanceDto) {
    await this.upsellTargetingService.recordAcceptance(dto.impressionId, dto.revenue);
    return { success: true };
  }

  @Post('impressions/decline')
  @ApiOperation({ summary: 'Record upsell decline' })
  async recordDecline(@Body() dto: RecordDeclineDto) {
    await this.upsellTargetingService.recordDecline(dto.impressionId);
    return { success: true };
  }

  // ==========================================================================
  // SUBSCRIPTION ELIGIBILITY
  // ==========================================================================

  @Get('subscription-eligibility/:productId')
  @ApiOperation({ summary: 'Check subscription eligibility for a product' })
  async checkSubscriptionEligibility(
    @Param('productId') productId: string,
    @Query('companyId') companyId: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.subscriptionIntelligenceService.evaluateSubscriptionEligibility(
      customerId || null,
      productId,
      companyId,
    );
  }

  @Get('subscription-offer/:productId')
  @ApiOperation({ summary: 'Get subscription offer for a product' })
  async getSubscriptionOffer(
    @Param('productId') productId: string,
    @Query('companyId') companyId: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.subscriptionIntelligenceService.getSubscriptionOffer(
      productId,
      companyId,
      customerId || null,
    );
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async getCompanyId(user: AuthenticatedUser, queryCompanyId?: string): Promise<string> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    if (queryCompanyId) {
      const canAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!canAccess) {
        throw new ForbiddenException('Hmm, you don\'t have access to that company. Double-check your permissions or try a different one.');
      }
      return queryCompanyId;
    }
    throw new BadRequestException('Company ID is required. Please select a company or provide companyId parameter.');
  }
}
