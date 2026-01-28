import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { SettingsService, ShippingSettings } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get company ID for operations
   * Validates user has access to the company
   * Throws BadRequestException if no company context is available
   */
  private async getCompanyId(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
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
        throw new ForbiddenException(
          "Hmm, you don't have access to that company. Double-check your permissions or try a different one.",
        );
      }
      return queryCompanyId;
    }
    throw new BadRequestException(
      'Company ID is required. Please select a company or provide companyId parameter.',
    );
  }

  /**
   * Get shipping settings
   * GET /api/settings/shipping
   */
  @Get('shipping')
  async getShippingSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    const settings = await this.settingsService.getShippingSettings(companyId);
    return { settings };
  }

  /**
   * Update shipping settings
   * POST /api/settings/shipping
   */
  @Post('shipping')
  async updateShippingSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId: string,
    @Body() body: { settings: ShippingSettings },
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    const settings = await this.settingsService.updateShippingSettings(
      companyId,
      body.settings,
    );
    return { settings };
  }
}
