import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomersService, CreateAddressInput, CreateNoteInput } from './customers.service';
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.customersService.getCustomers(req.user, {
      companyId,
      clientId,
      status,
      search,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      cursor,
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

  // ═══════════════════════════════════════════════════════════════
  // ADDRESSES
  // ═══════════════════════════════════════════════════════════════

  @Get(':id/addresses')
  async getAddresses(@Request() req, @Param('id') customerId: string) {
    return this.customersService.getAddresses(req.user, customerId);
  }

  @Post(':id/addresses')
  async addAddress(
    @Request() req,
    @Param('id') customerId: string,
    @Body() data: CreateAddressInput,
  ) {
    return this.customersService.addAddress(req.user, customerId, data);
  }

  @Patch(':id/addresses/:addressId')
  async updateAddress(
    @Request() req,
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
    @Body() data: Partial<CreateAddressInput>,
  ) {
    return this.customersService.updateAddress(req.user, customerId, addressId, data);
  }

  @Delete(':id/addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @Request() req,
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.deleteAddress(req.user, customerId, addressId);
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════

  @Get(':id/notes')
  async getNotes(@Request() req, @Param('id') customerId: string) {
    return this.customersService.getNotes(req.user, customerId);
  }

  @Post(':id/notes')
  async addNote(
    @Request() req,
    @Param('id') customerId: string,
    @Body() data: CreateNoteInput,
  ) {
    return this.customersService.addNote(req.user, customerId, req.user.sub, data);
  }

  @Delete(':id/notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNote(
    @Request() req,
    @Param('id') customerId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.customersService.deleteNote(req.user, customerId, noteId);
  }
}
