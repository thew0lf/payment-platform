import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService, ShippingSettings } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get shipping settings
   * GET /api/settings/shipping
   */
  @Get('shipping')
  async getShippingSettings(@Query('companyId') companyId: string) {
    const settings = await this.settingsService.getShippingSettings(companyId);
    return { settings };
  }

  /**
   * Update shipping settings
   * POST /api/settings/shipping
   */
  @Post('shipping')
  async updateShippingSettings(
    @Query('companyId') companyId: string,
    @Body() body: { settings: ShippingSettings },
  ) {
    const settings = await this.settingsService.updateShippingSettings(companyId, body.settings);
    return { settings };
  }
}
