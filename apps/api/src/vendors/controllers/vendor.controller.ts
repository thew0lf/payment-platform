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
import { VendorService } from '../services/vendor.service';
import { CreateVendorDto, UpdateVendorDto, VerifyVendorDto } from '../dto/vendor.dto';
import { VendorStatus, VendorTier, VendorType } from '@prisma/client';

@Controller('admin/vendors')
@UseGuards(JwtAuthGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateVendorDto) {
    const organizationId = req.user.organizationId;
    return this.vendorService.create(organizationId, dto);
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('vendorType') vendorType?: string,
    @Query('isVerified') isVerified?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.vendorService.findAll(organizationId, {
      search: search || undefined,
      status: status ? (status as VendorStatus) : undefined,
      tier: tier ? (tier as VendorTier) : undefined,
      vendorType: vendorType ? (vendorType as VendorType) : undefined,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      sortBy: sortBy as 'name' | 'createdAt' | 'totalOrders' | 'averageRating' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    const organizationId = req.user.organizationId;
    return this.vendorService.getStats(organizationId);
  }

  @Get(':id')
  async findById(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return this.vendorService.findById(id, organizationId);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.vendorService.update(id, organizationId, dto);
  }

  @Patch(':id/verify')
  async verify(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: VerifyVendorDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.vendorService.verify(id, organizationId, dto.isVerified);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    await this.vendorService.softDelete(id, organizationId, userId);
    return { success: true };
  }

  @Post(':id/refresh-metrics')
  async refreshMetrics(@Param('id') id: string) {
    await this.vendorService.updateMetrics(id);
    return { success: true };
  }
}
