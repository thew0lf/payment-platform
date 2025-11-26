import { Controller, Get, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getTransactions(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.transactionsService.getTransactions(req.user, {
      companyId,
      clientId,
      status,
      type,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('stats')
  async getTransactionStats(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.transactionsService.getTransactionStats(req.user, { companyId, clientId });
  }

  @Get(':id')
  async getTransaction(@Request() req, @Param('id') id: string) {
    const transaction = await this.transactionsService.getTransaction(req.user, id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }
}
