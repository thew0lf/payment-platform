import { Controller, Get, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async getCustomers(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.customersService.getCustomers(req.user, {
      companyId,
      clientId,
      status,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('stats')
  async getCustomerStats(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.customersService.getCustomerStats(req.user, { companyId, clientId });
  }

  @Get(':id')
  async getCustomer(@Request() req, @Param('id') id: string) {
    const customer = await this.customersService.getCustomer(req.user, id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
}
