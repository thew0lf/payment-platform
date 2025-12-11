import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { PaymentProcessingService, ProcessPaymentOptions, PaymentResult } from './services/payment-processing.service';
import { TransactionLoggingService, TransactionLog, TransactionLogQuery } from './services/transaction-logging.service';
import { TransactionRequest, CardData, BillingAddress } from './types/payment.types';
import {
  CreateTransactionDto,
  CaptureDto,
  RefundDto,
  TokenizeCardDto,
  TransactionQueryDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentProcessingService,
    private readonly loggingService: TransactionLoggingService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Verify user has access to a specific company
   */
  private async verifyCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<void> {
    const hasAccess = await this.hierarchyService.canAccessCompany(
      {
        sub: user.id,
        scopeType: user.scopeType as any,
        scopeId: user.scopeId,
        organizationId: user.organizationId,
        clientId: user.clientId,
        companyId: user.companyId,
      },
      companyId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }

  /**
   * Verify transaction belongs to user's accessible companies
   */
  private async verifyTransactionAccess(user: AuthenticatedUser, transactionId: string): Promise<TransactionLog> {
    const transaction = await this.loggingService.getTransaction(transactionId);
    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }
    await this.verifyCompanyAccess(user, transaction.companyId);
    return transaction;
  }

  @Post('charge')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 transactions per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a sale (authorize + capture)' })
  async charge(@Request() req, @Body() dto: CreateTransactionDto): Promise<PaymentResult> {
    const companyId = this.getCompanyId(req);
    const request = this.buildTransactionRequest(dto, req);
    return this.paymentService.sale(request, { companyId, providerId: dto.providerId, allowFallback: dto.allowFallback ?? false, metadata: dto.metadata });
  }

  @Post('authorize')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 authorizations per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authorize a transaction (capture later)' })
  async authorize(@Request() req, @Body() dto: CreateTransactionDto): Promise<PaymentResult> {
    const companyId = this.getCompanyId(req);
    const request = this.buildTransactionRequest(dto, req);
    return this.paymentService.authorize(request, { companyId, providerId: dto.providerId, allowFallback: dto.allowFallback ?? false, metadata: dto.metadata });
  }

  @Post(':transactionId/capture')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 captures per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture authorized transaction' })
  async capture(@Param('transactionId') transactionId: string, @Query('providerId') providerId: string, @Body() dto: CaptureDto, @CurrentUser() user: AuthenticatedUser): Promise<PaymentResult> {
    if (!providerId) throw new BadRequestException('providerId required');
    await this.verifyTransactionAccess(user, transactionId);
    return this.paymentService.capture(transactionId, providerId, dto.amount);
  }

  @Post(':transactionId/void')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 voids per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void transaction' })
  async void(@Param('transactionId') transactionId: string, @Query('providerId') providerId: string, @CurrentUser() user: AuthenticatedUser): Promise<PaymentResult> {
    if (!providerId) throw new BadRequestException('providerId required');
    await this.verifyTransactionAccess(user, transactionId);
    return this.paymentService.void(transactionId, providerId);
  }

  @Post(':transactionId/refund')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 refunds per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund transaction' })
  async refund(@Param('transactionId') transactionId: string, @Query('providerId') providerId: string, @Body() dto: RefundDto, @CurrentUser() user: AuthenticatedUser): Promise<PaymentResult> {
    if (!providerId) throw new BadRequestException('providerId required');
    await this.verifyTransactionAccess(user, transactionId);
    return this.paymentService.refund(transactionId, providerId, dto.amount);
  }

  @Post('verify')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 verifications per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify card' })
  async verify(@Request() req, @Body() dto: CreateTransactionDto): Promise<PaymentResult> {
    const companyId = this.getCompanyId(req);
    const request = this.buildTransactionRequest(dto, req);
    return this.paymentService.verify(request, { companyId, providerId: dto.providerId });
  }

  @Post('tokenize')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 tokenizations per minute (stricter - PCI sensitive)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tokenize card' })
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
  async getTransaction(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<TransactionLog> {
    return this.verifyTransactionAccess(user, id);
  }

  @Get('transactions/reference/:referenceId') @ApiOperation({ summary: 'Get by reference' })
  async getTransactionByReference(@Param('referenceId') referenceId: string, @CurrentUser() user: AuthenticatedUser): Promise<TransactionLog | null> {
    const transaction = await this.loggingService.getTransactionByReference(referenceId);
    if (transaction) {
      await this.verifyCompanyAccess(user, transaction.companyId);
    }
    return transaction;
  }

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
