import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { UpsellService } from './upsell.service';
import { UpsellMoment, UpsellType } from '../types/momentum.types';

// DTO Classes
class GetRecommendationsDto {
  companyId: string;
  customerId: string;
  moment: UpsellMoment;
  useAI?: boolean;
  maxRecommendations?: number;
  cartContents?: string[];
}

class CreateOfferDto {
  companyId: string;
  customerId: string;
  type: UpsellType;
  moment: UpsellMoment;
  productId?: string;
  position: string;
  originalPrice?: number;
  offerPrice?: number;
  discount?: number;
  validUntil?: Date;
  triggerUsed?: string;
}

class RecordAcceptanceDto {
  revenue: number;
}

class RecordDeclineDto {
  reason?: string;
}

class CheckoutUpsellDto {
  companyId: string;
  customerId: string;
  cartContents: string[];
  cartTotal: number;
}

@ApiTags('Upsell')
@ApiBearerAuth()
@Controller('momentum/upsell')
@UseGuards(JwtAuthGuard)
export class UpsellController {
  constructor(
    private readonly upsellService: UpsellService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Verify user has access to a specific company
   */
  private async verifyCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<void> {
    const hasAccess = await this.hierarchyService.canAccessCompany(
      {
        sub: user.id,
        scopeType: user.scopeType as any,
        scopeId: user.scopeId,
        organizationId: user.organizationId,
        clientId: user.clientId,
        companyId: user.companyId,
      },
      companyId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════

  @Post('recommendations')
  @ApiOperation({ summary: 'Get AI-powered upsell recommendations for a customer' })
  @ApiResponse({ status: 200, description: 'Recommendations generated successfully' })
  async getRecommendations(
    @Body() dto: GetRecommendationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, dto.companyId);
    return this.upsellService.getRecommendations(
      dto.companyId,
      dto.customerId,
      dto.moment,
      {
        useAI: dto.useAI ?? true,
        maxRecommendations: dto.maxRecommendations ?? 3,
        cartContents: dto.cartContents,
      },
    );
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Get checkout-specific upsell recommendations' })
  @ApiResponse({ status: 200, description: 'Checkout upsells returned' })
  async getCheckoutUpsells(
    @Body() dto: CheckoutUpsellDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, dto.companyId);
    return this.upsellService.handleCheckoutUpsell(
      dto.companyId,
      dto.customerId,
      dto.cartContents,
      dto.cartTotal,
    );
  }

  @Get('post-purchase/:companyId/:customerId/:orderId')
  @ApiOperation({ summary: 'Get post-purchase upsell recommendations' })
  @ApiResponse({ status: 200, description: 'Post-purchase upsells returned' })
  async getPostPurchaseUpsells(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, companyId);
    return this.upsellService.handlePostPurchaseUpsell(
      companyId,
      customerId,
      orderId,
    );
  }

  @Get('save-flow/:companyId/:customerId')
  @ApiOperation({ summary: 'Get upsell for post-save-flow' })
  @ApiResponse({ status: 200, description: 'Save flow upsells returned' })
  async getSaveFlowUpsells(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Query('intervention') interventionAccepted?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.upsellService.handleSaveFlowUpsell(
      companyId,
      customerId,
      interventionAccepted,
    );
  }

  @Get('winback/:companyId/:customerId')
  @ApiOperation({ summary: 'Get winback upsell recommendations' })
  @ApiResponse({ status: 200, description: 'Winback upsells returned' })
  async getWinbackUpsells(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, companyId);
    return this.upsellService.handleWinbackUpsell(companyId, customerId);
  }

  // ═══════════════════════════════════════════════════════════════
  // OFFER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  @Post('offers')
  @ApiOperation({ summary: 'Create a new upsell offer' })
  @ApiResponse({ status: 201, description: 'Offer created successfully' })
  async createOffer(
    @Body() dto: CreateOfferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, dto.companyId);
    return this.upsellService.createOffer(dto);
  }

  @Post('offers/:offerId/present')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record that an offer was presented to customer' })
  @ApiResponse({ status: 200, description: 'Presentation recorded' })
  async recordPresentation(@Param('offerId') offerId: string) {
    // Note: Service should validate offer belongs to user's accessible companies
    return this.upsellService.recordPresentation(offerId);
  }

  @Post('offers/:offerId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record offer acceptance' })
  @ApiResponse({ status: 200, description: 'Acceptance recorded' })
  async recordAcceptance(
    @Param('offerId') offerId: string,
    @Body() dto: RecordAcceptanceDto,
  ) {
    // Note: Service should validate offer belongs to user's accessible companies
    return this.upsellService.recordAcceptance(offerId, dto.revenue);
  }

  @Post('offers/:offerId/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record offer decline' })
  @ApiResponse({ status: 200, description: 'Decline recorded' })
  async recordDecline(
    @Param('offerId') offerId: string,
    @Body() dto: RecordDeclineDto,
  ) {
    // Note: Service should validate offer belongs to user's accessible companies
    return this.upsellService.recordDecline(offerId, dto.reason);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('analytics/:companyId')
  @ApiOperation({ summary: 'Get upsell performance metrics' })
  @ApiQuery({ name: 'moment', required: false, enum: UpsellMoment })
  @ApiQuery({ name: 'dateRange', required: false, description: 'e.g., 7d, 30d, 90d' })
  @ApiResponse({ status: 200, description: 'Analytics returned' })
  async getPerformanceMetrics(
    @Param('companyId') companyId: string,
    @Query('moment') moment?: UpsellMoment,
    @Query('dateRange') dateRange?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.upsellService.getPerformanceMetrics(companyId, {
      moment,
      dateRange,
    });
  }

  @Get('history/:companyId/:customerId')
  @ApiOperation({ summary: 'Get customer upsell history' })
  @ApiResponse({ status: 200, description: 'History returned' })
  async getCustomerHistory(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, companyId);
    return this.upsellService.getCustomerUpsellHistory(companyId, customerId);
  }
}
