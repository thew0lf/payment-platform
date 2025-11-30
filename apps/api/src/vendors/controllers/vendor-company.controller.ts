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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VendorCompanyService } from '../services/vendor-company.service';
import { CreateVendorCompanyDto, UpdateVendorCompanyDto } from '../dto/vendor.dto';
import { EntityStatus } from '@prisma/client';

@Controller('admin/vendor-companies')
@UseGuards(JwtAuthGuard)
export class VendorCompanyController {
  constructor(private readonly vendorCompanyService: VendorCompanyService) {}

  @Post()
  async create(@Body() dto: CreateVendorCompanyDto) {
    return this.vendorCompanyService.create(dto);
  }

  @Get()
  async findAll(
    @Query('vendorId') vendorId?: string,
    @Query('search') search?: string,
    @Query('status') status?: EntityStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: 'name' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.vendorCompanyService.findAll({
      vendorId,
      search,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.vendorCompanyService.findById(id);
  }

  @Get('vendor/:vendorId')
  async findByVendor(@Param('vendorId') vendorId: string) {
    return this.vendorCompanyService.findByVendor(vendorId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVendorCompanyDto) {
    return this.vendorCompanyService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    await this.vendorCompanyService.softDelete(id, userId);
    return { success: true };
  }
}
