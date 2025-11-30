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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { BundleService } from '../services/bundle.service';
import {
  CreateBundleDto,
  UpdateBundleDto,
  AddBundleItemDto,
  UpdateBundleItemDto,
  ReorderBundleItemsDto,
} from '../dto/bundle.dto';
import { BundleType } from '@prisma/client';

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

@Controller('bundles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  @Get()
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async listBundles(
    @Query('companyId') companyId: string,
    @Query('type') type?: BundleType,
    @Query('isActive') isActive?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.bundleService.listBundles(effectiveCompanyId, toUserContext(user!), {
      type,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async getBundle(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.getBundle(id, toUserContext(user));
  }

  @Get('product/:productId')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async getBundleByProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.getBundleByProduct(productId, toUserContext(user));
  }

  @Post()
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async createBundle(
    @Body() dto: CreateBundleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.createBundle(dto, toUserContext(user));
  }

  @Patch(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async updateBundle(
    @Param('id') id: string,
    @Body() dto: UpdateBundleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.updateBundle(id, dto, toUserContext(user));
  }

  @Delete(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBundle(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.deleteBundle(id, toUserContext(user));
  }

  // Bundle Items
  @Post(':id/items')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async addItem(
    @Param('id') id: string,
    @Body() dto: AddBundleItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.addItem(id, dto, toUserContext(user));
  }

  @Patch(':id/items/:itemId')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateBundleItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.updateItem(id, itemId, dto, toUserContext(user));
  }

  @Delete(':id/items/:itemId')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.removeItem(id, itemId, toUserContext(user));
  }

  @Post(':id/items/reorder')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async reorderItems(
    @Param('id') id: string,
    @Body() dto: ReorderBundleItemsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bundleService.reorderItems(id, dto.itemIds, toUserContext(user));
  }

  @Get(':id/calculate-price')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async calculatePrice(
    @Param('id') id: string,
    @Query('selectedItems') selectedItems?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const items = selectedItems ? JSON.parse(selectedItems) : undefined;
    return this.bundleService.calculatePrice(id, toUserContext(user!), items);
  }
}
