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
import { VendorConnectionService } from '../services/vendor-connection.service';
import { CreateConnectionDto, UpdateConnectionDto, ApproveConnectionDto } from '../dto/vendor.dto';
import { ConnectionStatus } from '@prisma/client';

@Controller('admin/vendor-connections')
@UseGuards(JwtAuthGuard)
export class VendorConnectionController {
  constructor(private readonly connectionService: VendorConnectionService) {}

  @Post()
  async create(@Body() dto: CreateConnectionDto) {
    return this.connectionService.create(dto);
  }

  @Get()
  async findAll(
    @Query('vendorId') vendorId?: string,
    @Query('vendorCompanyId') vendorCompanyId?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: ConnectionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.connectionService.findAll({
      vendorId,
      vendorCompanyId,
      companyId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('company/:companyId')
  async findByCompany(@Param('companyId') companyId: string) {
    return this.connectionService.findByCompany(companyId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.connectionService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateConnectionDto) {
    return this.connectionService.update(id, dto);
  }

  @Patch(':id/approve')
  async approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveConnectionDto,
  ) {
    const userId = req.user.id;
    return this.connectionService.approve(id, dto.approved, userId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ConnectionStatus,
  ) {
    return this.connectionService.updateStatus(id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.connectionService.delete(id);
    return { success: true };
  }
}
