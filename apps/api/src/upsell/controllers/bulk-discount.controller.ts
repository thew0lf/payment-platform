import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { BulkDiscountService } from '../services/bulk-discount.service';
import { SubscriptionIntelligenceService } from '../services/subscription-intelligence.service';
import {
  CreateBulkDiscountDto,
  CalculateBulkPriceDto,
  CreateSubscriptionConfigDto,
} from '../dto/upsell.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';

@ApiTags('Bulk Discounts')
@Controller('products')
export class BulkDiscountController {
  constructor(
    private readonly bulkDiscountService: BulkDiscountService,
    private readonly subscriptionIntelligenceService: SubscriptionIntelligenceService,
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ==========================================================================
  // BULK DISCOUNT CONFIG
  // ==========================================================================

  @Get(':productId/bulk-discount')
  @ApiOperation({ summary: 'Get bulk discount config for a product' })
  async getBulkDiscount(@Param('productId') productId: string) {
    return this.bulkDiscountService.getProductBulkDiscount(productId);
  }

  @Put(':productId/bulk-discount')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update bulk discount config' })
  async upsertBulkDiscount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: CreateBulkDiscountDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.bulkDiscountService.upsertBulkDiscount(productId, companyId, {
      enabled: dto.enabled,
      tiers: dto.tiers as unknown as import('../types/upsell.types').BulkDiscountTier[],
      stackWithOtherDiscounts: dto.stackWithOtherDiscounts,
      maxDiscountPercent: dto.maxDiscountPercent,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
    });
  }

  @Delete(':productId/bulk-discount')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete bulk discount config' })
  async deleteBulkDiscount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    const companyId = this.getCompanyId(user);
    await this.bulkDiscountService.deleteBulkDiscount(productId, companyId);
    return { success: true };
  }

  @Get(':productId/bulk-recommendation')
  @ApiOperation({ summary: 'Get bulk purchase recommendation' })
  async getBulkRecommendation(
    @Param('productId') productId: string,
    @Query('quantity') quantity: string,
  ) {
    return this.bulkDiscountService.getBulkUpsellRecommendation(
      productId,
      parseInt(quantity, 10) || 1,
    );
  }

  // ==========================================================================
  // SUBSCRIPTION CONFIG
  // ==========================================================================

  @Get(':productId/subscription-config')
  @ApiOperation({ summary: 'Get subscription config for a product' })
  async getSubscriptionConfig(@Param('productId') productId: string) {
    return this.subscriptionIntelligenceService.getSubscriptionConfig(productId);
  }

  @Put(':productId/subscription-config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update subscription config' })
  async upsertSubscriptionConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: CreateSubscriptionConfigDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.subscriptionIntelligenceService.upsertSubscriptionConfig(
      productId,
      companyId,
      {
        enabled: dto.enabled,
        discountTiers: dto.discountTiers as unknown as import('../types/upsell.types').SubscriptionDiscountTier[],
        defaultFrequency: dto.defaultFrequency,
        freeShippingIncluded: dto.freeShippingIncluded,
        eligibility: dto.eligibility as unknown as import('../types/upsell.types').SubscriptionEligibilityRules,
      },
    );
  }

  // ==========================================================================
  // PRICING CALCULATION
  // ==========================================================================

  @Post('pricing/bulk-calculate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate bulk pricing for a product' })
  async calculateBulkPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CalculateBulkPriceDto,
  ) {
    // Get company ID for the query - validates user has company context
    const companyId = await this.getCompanyIdForQuery(user, undefined);

    // Fetch product and verify it belongs to the user's accessible companies
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        deletedAt: null,
        ...(companyId && { companyId }),
      },
      select: { price: true, companyId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Additional validation: if user is COMPANY scoped, verify product belongs to their company
    if (companyId && product.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this product');
    }

    return this.bulkDiscountService.calculateBulkPrice(
      dto.productId,
      dto.quantity,
      Number(product.price),
    );
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getCompanyId(user: AuthenticatedUser): string {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    throw new ForbiddenException('Company context required for this operation');
  }

  /**
   * Get company ID for READ operations
   * Returns undefined for ORG/CLIENT users (allows cross-company queries)
   * Validates company access when query param is provided
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId; // COMPANY users always filtered by their company
    }

    if (queryCompanyId) {
      // Validate user can access the requested company
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

    return undefined; // ORG/CLIENT admins can see all
  }
}
