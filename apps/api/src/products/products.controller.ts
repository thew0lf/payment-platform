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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ProductsService } from './services/products.service';
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
  constructor(private readonly productsService: ProductsService) {}

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
    const companyId = this.getCompanyId(user);
    return this.productsService.findAll(companyId, query);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = this.getCompanyId(user);
    return this.productsService.findById(id, companyId);
  }

  @Get('sku/:sku')
  async findBySku(
    @Param('sku') sku: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = this.getCompanyId(user);
    return this.productsService.findBySku(companyId, sku);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = this.getCompanyId(user);
    return this.productsService.update(id, companyId, dto, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.productsService.archive(id, companyId, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // STOCK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  @Patch(':id/stock')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = this.getCompanyId(user);
    return this.productsService.updateStock(id, companyId, dto.quantity, user.id);
  }

  @Post(':id/stock/adjust')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Product> {
    const companyId = this.getCompanyId(user);
    return this.productsService.adjustStock(id, companyId, dto.adjustment, user.id, dto.reason);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER
  // ═══════════════════════════════════════════════════════════════

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
    throw new Error('User does not have a valid company context');
  }
}
