import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GatewayPricingService } from '../services/gateway-pricing.service';
import {
  CreateGatewayPricingTierDto,
  UpdateGatewayPricingTierDto,
} from '../dto/gateway-pricing.dto';

@Controller('admin/gateway-risk/pricing')
@UseGuards(JwtAuthGuard)
export class GatewayPricingController {
  constructor(private readonly pricingService: GatewayPricingService) {}

  @Post()
  async createPricingTier(@Body() dto: CreateGatewayPricingTierDto) {
    return this.pricingService.createPricingTier(dto);
  }

  @Get()
  async getPricingTiers(@Query('platformIntegrationId') platformIntegrationId: string) {
    return this.pricingService.getPricingTiersForIntegration(platformIntegrationId);
  }

  @Get(':id')
  async getPricingTier(@Param('id') id: string) {
    return this.pricingService.getPricingTier(id);
  }

  @Patch(':id')
  async updatePricingTier(@Param('id') id: string, @Body() dto: UpdateGatewayPricingTierDto) {
    return this.pricingService.updatePricingTier(id, dto);
  }

  @Delete(':id')
  async deletePricingTier(@Param('id') id: string) {
    return this.pricingService.deletePricingTier(id);
  }

  @Post('initialize/:platformIntegrationId')
  async initializeDefaultTiers(
    @Param('platformIntegrationId') platformIntegrationId: string,
    @Query('isFounderPricing') isFounderPricing?: string,
  ) {
    return this.pricingService.initializeDefaultPricingTiers(
      platformIntegrationId,
      isFounderPricing === 'true',
    );
  }

  @Get(':id/display')
  async getPricingDisplay(@Param('id') id: string) {
    const tier = await this.pricingService.getPricingTier(id);
    return this.pricingService.formatPricingForDisplay(tier);
  }
}
