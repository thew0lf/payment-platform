import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { InventoryLevelService } from '../services/inventory-level.service';
import {
  CreateInventoryLevelDto,
  UpdateInventoryLevelDto,
  SetInventoryDto,
  TransferInventoryDto,
} from '../dto/inventory-level.dto';
import { CreateInventoryAdjustmentDto } from '../dto/inventory-adjustment.dto';

function toUserContext(user: AuthenticatedUser) {
  return {
    sub: user.id,
    scopeType: user.scopeType as ScopeType,
    scopeId: user.scopeId,
    organizationId: user.organizationId,
    clientId: user.clientId,
    companyId: user.companyId,
  };
}

@Controller('inventory/levels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryLevelController {
  constructor(private readonly levelService: InventoryLevelService) {}

  @Get('by-location/:locationId')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async findByLocation(
    @Param('locationId') locationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.findByLocation(locationId, toUserContext(user));
  }

  @Get('by-product/:productId')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async findByProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.findByProduct(productId, toUserContext(user));
  }

  @Get('by-variant/:variantId')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async findByVariant(
    @Param('variantId') variantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.findByVariant(variantId, toUserContext(user));
  }

  @Get('low-stock')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async getLowStock(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.levelService.getLowStockItems(effectiveCompanyId, toUserContext(user));
  }

  @Get(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.findOne(id, toUserContext(user));
  }

  @Get(':id/history')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async getHistory(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.getAdjustmentHistory(
      id,
      toUserContext(user),
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post()
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async upsert(
    @Body() dto: CreateInventoryLevelDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.upsert(dto, toUserContext(user));
  }

  @Patch(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryLevelDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.update(id, dto, toUserContext(user));
  }

  @Post('set')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async setInventory(
    @Body() dto: SetInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.setInventory(dto, user.id, toUserContext(user));
  }

  @Post('adjust')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async adjustInventory(
    @Body() dto: CreateInventoryAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.adjustInventory(dto, user.id, toUserContext(user));
  }

  @Post('transfer')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async transferInventory(
    @Body() dto: TransferInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.levelService.transferInventory(dto, user.id, toUserContext(user));
  }
}
