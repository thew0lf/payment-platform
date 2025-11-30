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
import { VendorProductService } from '../services/vendor-product.service';
import { CreateVendorProductDto, UpdateVendorProductDto } from '../dto/vendor.dto';

@Controller('admin/vendor-products')
@UseGuards(JwtAuthGuard)
export class VendorProductController {
  constructor(private readonly productService: VendorProductService) {}

  @Post()
  async create(@Body() dto: CreateVendorProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  async findAll(
    @Query('vendorCompanyId') vendorCompanyId: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('categories') categories?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: 'name' | 'wholesalePrice' | 'stockQuantity' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.productService.findAll({
      vendorCompanyId,
      search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      categories: categories ? categories.split(',') : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Get('sku/:vendorCompanyId/:sku')
  async findBySku(
    @Param('vendorCompanyId') vendorCompanyId: string,
    @Param('sku') sku: string,
  ) {
    return this.productService.findBySku(vendorCompanyId, sku);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVendorProductDto) {
    return this.productService.update(id, dto);
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.updateStock(id, quantity);
  }

  @Post('bulk-stock')
  async bulkUpdateStock(
    @Body('updates') updates: { id: string; quantity: number }[],
  ) {
    return this.productService.bulkUpdateStock(updates);
  }

  @Get('low-stock/:vendorCompanyId')
  async getLowStockProducts(@Param('vendorCompanyId') vendorCompanyId: string) {
    return this.productService.getLowStockProducts(vendorCompanyId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.productService.delete(id);
    return { success: true };
  }
}
