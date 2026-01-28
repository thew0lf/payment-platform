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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ProductsService } from './services/products.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { Product } from './types/product.types';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  UpdateStockDto,
  AdjustStockDto,
} from './dto/product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = this.getCompanyId(user);
    return this.productsService.create(companyId, dto, user.id);
  }

  @Get()
  async findAll(
    @Query() query: ProductQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ products: Product[]; total: number }> {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);
    return this.productsService.findAll(companyId, query);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.productsService.findById(id, companyId);
  }

  @Get('sku/:sku')
  async findBySku(
    @Param('sku') sku: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.productsService.findBySku(companyId, sku);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Query('companyId') queryCompanyId: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
    }
    return this.productsService.update(id, companyId, dto, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
    }
    return this.productsService.archive(id, companyId, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // STOCK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  @Patch(':id/stock')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateStock(
    @Param('id') id: string,
    @Query('companyId') queryCompanyId: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
    }
    return this.productsService.updateStock(id, companyId, dto.quantity, user.id);
  }

  @Post(':id/stock/adjust')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Param('id') id: string,
    @Query('companyId') queryCompanyId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
    }
    return this.productsService.adjustStock(id, companyId, dto.adjustment, user.id, dto.reason);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get companyId for write operations (create/update/delete).
   * Requires explicit company context.
   */
  private getCompanyId(user: AuthenticatedUser): string {
    // For COMPANY scope users, the scopeId IS the companyId
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    // For other scopes, check explicit companyId or clientId
    if (user.companyId) {
      return user.companyId;
    }
    if (user.clientId) {
      return user.clientId;
    }
    throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
  }

  /**
   * Get companyId for query operations (findAll).
   * For ORGANIZATION/CLIENT scope users, allows:
   * - Passing companyId query param to filter by specific company (with validation)
   * - Returns undefined to query all accessible products (when no companyId passed)
   */
  private async getCompanyIdForQuery(user: AuthenticatedUser, queryCompanyId?: string): Promise<string | undefined> {
    // For COMPANY scope users, always filter by their company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // For users with explicit companyId/clientId, use that
    if (user.companyId) {
      return user.companyId;
    }

    // For ORGANIZATION or CLIENT scope admins
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      // If they passed a companyId query param, validate access first
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          { sub: user.id, scopeType: user.scopeType as any, scopeId: user.scopeId, clientId: user.clientId, companyId: user.companyId },
          queryCompanyId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Hmm, you don\'t have access to that company. Double-check your permissions or try a different one.');
        }
        return queryCompanyId;
      }
      // Otherwise return undefined to allow querying all products they have access to
      return undefined;
    }

    throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
  }
}
