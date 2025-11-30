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
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { InventoryLocationService } from '../services/inventory-location.service';
import {
  CreateInventoryLocationDto,
  UpdateInventoryLocationDto,
} from '../dto/inventory-location.dto';

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

@Controller('inventory/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryLocationController {
  constructor(private readonly locationService: InventoryLocationService) {}

  @Get()
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async findAll(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.locationService.findAll(effectiveCompanyId, toUserContext(user));
  }

  @Get('default')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async getDefault(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.locationService.getDefault(effectiveCompanyId, toUserContext(user));
  }

  @Get(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.locationService.findOne(id, toUserContext(user));
  }

  @Post()
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async create(
    @Query('companyId') companyId: string,
    @Body() dto: CreateInventoryLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.locationService.create(effectiveCompanyId, dto, toUserContext(user));
  }

  @Patch(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.locationService.update(id, dto, toUserContext(user));
  }

  @Delete(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.locationService.remove(id, toUserContext(user));
  }

  @Post(':id/set-default')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async setDefault(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.locationService.setDefault(id, toUserContext(user));
  }
}
