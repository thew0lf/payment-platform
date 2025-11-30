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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ProductVariantService } from '../services/product-variant.service';
import {
  CreateVariantDto,
  UpdateVariantDto,
  BulkCreateVariantsDto,
  BulkUpdateVariantsDto,
  GenerateVariantsDto,
  UpdateInventoryDto,
  ReorderVariantsDto,
} from '../dto/product-variant.dto';
import { ScopeType } from '@prisma/client';

// Helper to convert AuthenticatedUser to UserContext
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

@Controller('products/:productId/variants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductVariantController {
  constructor(private readonly variantService: ProductVariantService) {}

  /**
   * Get all variants for a product
   */
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')
  async findAll(
    @Param('productId') productId: string,
    @Query('includeDeleted') includeDeleted: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.findAll(
      productId,
      toUserContext(user),
      includeDeleted === 'true'
    );
  }

  /**
   * Get available variant options for a product's company
   */
  @Get('options')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')
  async getAvailableOptions(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.getAvailableOptions(productId, toUserContext(user));
  }

  /**
   * Get a single variant
   */
  @Get(':variantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')
  async findOne(
    @Param('variantId') variantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.findOne(variantId, toUserContext(user));
  }

  /**
   * Create a new variant
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.create(productId, dto, toUserContext(user));
  }

  /**
   * Update a variant
   */
  @Put(':variantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.update(variantId, dto, toUserContext(user));
  }

  /**
   * Delete a variant (soft delete)
   */
  @Delete(':variantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('variantId') variantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.variantService.remove(variantId, toUserContext(user));
  }

  /**
   * Bulk create variants
   */
  @Post('bulk')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async bulkCreate(
    @Param('productId') productId: string,
    @Body() dto: BulkCreateVariantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.bulkCreate(productId, dto, toUserContext(user));
  }

  /**
   * Bulk update variants
   */
  @Put('bulk')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async bulkUpdate(
    @Param('productId') productId: string,
    @Body() dto: BulkUpdateVariantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.bulkUpdate(productId, dto, toUserContext(user));
  }

  /**
   * Generate variants from option combinations
   */
  @Post('generate')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async generateVariants(
    @Param('productId') productId: string,
    @Body() dto: GenerateVariantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.generateVariants(productId, dto, toUserContext(user));
  }

  /**
   * Update variant inventory
   */
  @Post(':variantId/inventory')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateInventory(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantService.updateInventory(variantId, dto, toUserContext(user));
  }

  /**
   * Reorder variants
   */
  @Post('reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderVariants(
    @Param('productId') productId: string,
    @Body() dto: ReorderVariantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.variantService.reorderVariants(productId, dto, toUserContext(user));
  }
}
