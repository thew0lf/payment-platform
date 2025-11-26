import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentProcessingService, ProcessPaymentOptions, PaymentResult } from './services/payment-processing.service';
import { TransactionLoggingService, TransactionLog, TransactionLogQuery } from './services/transaction-logging.service';
import { TransactionRequest, CardData, BillingAddress, TransactionStatus } from './types/payment.types';

class CardDto implements CardData { number: string; expiryMonth: string; expiryYear: string; cvv: string; cardholderName?: string; }
class BillingAddressDto implements BillingAddress { firstName: string; lastName: string; company?: string; street1: string; street2?: string; city: string; state: string; postalCode: string; country: string; phone?: string; email?: string; }
class CreateTransactionDto { amount: number; currency?: string; card?: CardDto; token?: string; orderId?: string; customerId?: string; description?: string; billingAddress?: BillingAddressDto; ipAddress?: string; metadata?: Record<string, string>; providerId?: string; allowFallback?: boolean; }
class CaptureDto { amount?: number; }
class RefundDto { amount?: number; reason?: string; }
class TokenizeCardDto { card: CardDto; providerId?: string; }
class TransactionQueryDto implements TransactionLogQuery { status?: TransactionStatus[]; transactionType?: string[]; providerId?: string; dateFrom?: string; dateTo?: string; minAmount?: number; maxAmount?: number; limit?: number; offset?: number; }

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentService: PaymentProcessingService, private readonly loggingService: TransactionLoggingService) {}

  @Post('charge') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Process a sale (authorize + capture)' })
  async charge(@Request() req, @Body() dto: CreateTransactionDto): Promise<PaymentResult> {
    const companyId = this.getCompanyId(req);
    const request = this.buildTransactionRequest(dto, req);
    return this.paymentService.sale(request, { companyId, providerId: dto.providerId, allowFallback: dto.allowFallback ?? false, metadata: dto.metadata });
  }

  @Post('authorize') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Authorize a transaction (capture later)' })
  async authorize(@Request() req, @Body() dto: CreateTransactionDto): Promise<PaymentResult> {
    const companyId = this.getCompanyId(req);
    const request = this.buildTransactionRequest(dto, req);
    return this.paymentService.authorize(request, { companyId, providerId: dto.providerId, allowFallback: dto.allowFallback ?? false, metadata: dto.metadata });
  }

  @Post(':transactionId/capture') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Capture authorized transaction' })
  async capture(@Param('transactionId') transactionId: string, @Query('providerId') providerId: string, @Body() dto: CaptureDto): Promise<PaymentResult> {
    if (!providerId) throw new BadRequestException('providerId required');
    return this.paymentService.capture(transactionId, providerId, dto.amount);
  }

  @Post(':transactionId/void') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Void transaction' })
  async void(@Param('transactionId') transactionId: string, @Query('providerId') providerId: string): Promise<PaymentResult> {
    if (!providerId) throw new BadRequestException('providerId required');
    return this.paymentService.void(transactionId, providerId);
  }

  @Post(':transactionId/refund') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Refund transaction' })
  async refund(@Param('transactionId') transactionId: string, @Query('providerId') providerId: string, @Body() dto: RefundDto): Promise<PaymentResult> {
    if (!providerId) throw new BadRequestException('providerId required');
    return this.paymentService.refund(transactionId, providerId, dto.amount);
  }

  @Post('verify') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Verify card' })
  async verify(@Request() req, @Body() dto: CreateTransactionDto): Promise<PaymentResult> {
    const companyId = this.getCompanyId(req);
    const request = this.buildTransactionRequest(dto, req);
    return this.paymentService.verify(request, { companyId, providerId: dto.providerId });
  }

  @Post('tokenize') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Tokenize card' })
  async tokenize(@Request() req, @Body() dto: TokenizeCardDto): Promise<{ token: string; last4: string; brand: string; providerId: string }> {
    const companyId = this.getCompanyId(req);
    const result = await this.paymentService.tokenize(dto.card, companyId, dto.providerId);
    return { token: result.token, last4: result.last4, brand: result.brand, providerId: result.providerId };
  }

  @Post('tokens/:token/delete') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Delete token' })
  async deleteToken(@Param('token') token: string, @Query('providerId') providerId: string): Promise<{ success: boolean }> {
    if (!providerId) throw new BadRequestException('providerId required');
    return { success: await this.paymentService.deleteToken(token, providerId) };
  }

  @Get('transactions') @ApiOperation({ summary: 'Query transactions' })
  async getTransactions(@Request() req, @Query() query: TransactionQueryDto): Promise<{ transactions: TransactionLog[]; total: number }> {
    const companyId = this.getCompanyId(req);
    return this.loggingService.queryTransactions({ companyId, ...query, dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined, dateTo: query.dateTo ? new Date(query.dateTo) : undefined });
  }

  @Get('transactions/:id') @ApiOperation({ summary: 'Get transaction by ID' })
  async getTransaction(@Param('id') id: string): Promise<TransactionLog | null> { return this.loggingService.getTransaction(id); }

  @Get('transactions/reference/:referenceId') @ApiOperation({ summary: 'Get by reference' })
  async getTransactionByReference(@Param('referenceId') referenceId: string): Promise<TransactionLog | null> { return this.loggingService.getTransactionByReference(referenceId); }

  @Get('stats') @ApiOperation({ summary: 'Get stats' })
  async getStats(@Request() req, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.loggingService.getTransactionStats(this.getCompanyId(req), dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
  }

  @Get('providers') @ApiOperation({ summary: 'Get providers' })
  async getProviders(@Request() req) { return this.paymentService.getAvailableProviders(this.getCompanyId(req)); }

  @Get('providers/health') @ApiOperation({ summary: 'Provider health' })
  async getProvidersHealth(@Request() req) { return this.paymentService.getProvidersHealth(this.getCompanyId(req)); }

  private getCompanyId(req: any): string { if (req.user.companyId) return req.user.companyId; const companyId = req.query?.companyId; if (!companyId) throw new BadRequestException('companyId required'); return companyId; }
  private buildTransactionRequest(dto: CreateTransactionDto, req: any): TransactionRequest { return { referenceId: '', type: undefined as any, amount: Math.round(dto.amount * 100), currency: dto.currency || 'USD', card: dto.card, token: dto.token, orderId: dto.orderId, customerId: dto.customerId, description: dto.description, billingAddress: dto.billingAddress, ipAddress: dto.ipAddress || req.ip, metadata: dto.metadata }; }
}
