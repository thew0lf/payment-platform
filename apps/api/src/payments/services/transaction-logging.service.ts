import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentEvent, PaymentEventType, TransactionResponse, TransactionStatus } from '../types/payment.types';
import { TransactionType as PrismaTransactionType, TransactionStatus as PrismaTransactionStatus, Prisma } from '@prisma/client';

export interface TransactionLog { id: string; companyId: string; customerId?: string; providerId: string; providerName: string; transactionType: string; transactionId: string; referenceId: string; amount: number; currency: string; status: TransactionStatus; avsResult?: string; cvvResult?: string; authorizationCode?: string; errorCode?: string; errorMessage?: string; declineCode?: string; riskScore?: number; riskFlags?: string[]; ipAddress?: string; metadata?: Record<string, unknown>; rawRequest?: Record<string, unknown>; rawResponse?: Record<string, unknown>; processingTimeMs: number; fallbackUsed: boolean; createdAt: Date; }
export interface TransactionLogQuery { companyId?: string; customerId?: string; providerId?: string; status?: TransactionStatus[]; transactionType?: string[]; dateFrom?: Date; dateTo?: Date; minAmount?: number; maxAmount?: number; limit?: number; offset?: number; }

@Injectable()
export class TransactionLoggingService {
  private readonly logger = new Logger(TransactionLoggingService.name);

  // PCI-DSS: Keys that may contain sensitive card data in provider responses
  private readonly sensitiveKeys = [
    'card_number', 'cardNumber', 'ccnumber', 'acct', 'ACCT', 'number',
    'cvv', 'cvc', 'cvv2', 'CVV2', 'card', 'pan',
    'exp_date', 'expdate', 'EXPDATE', 'expiry',
    'security_code', 'securityCode',
    'account_number', 'accountNumber', 'routing_number', 'routingNumber',
    'password', 'pwd', 'PWD', 'secret', 'apiKey', 'api_key', 'signature', 'SIGNATURE',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * PCI-DSS Compliance: Sanitize provider responses before storage
   * Removes or masks sensitive card data from raw provider responses
   */
  private sanitizeProviderResponse(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || typeof data !== 'object') return data;

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Check if key matches sensitive pattern
      const isSensitive = this.sensitiveKeys.some(sk =>
        key.toLowerCase().includes(sk.toLowerCase())
      );

      if (isSensitive && typeof value === 'string' && value.length > 4) {
        // Mask sensitive values, keeping only last 4 chars if it looks like card data
        sanitized[key] = value.length >= 12 ? `****${value.slice(-4)}` : '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeProviderResponse(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  @OnEvent(PaymentEventType.TRANSACTION_APPROVED) async handleTransactionApproved(event: PaymentEvent): Promise<void> { await this.logTransaction(event); }
  @OnEvent(PaymentEventType.TRANSACTION_DECLINED) async handleTransactionDeclined(event: PaymentEvent): Promise<void> { await this.logTransaction(event); }
  @OnEvent(PaymentEventType.TRANSACTION_VOIDED) async handleTransactionVoided(event: PaymentEvent): Promise<void> { await this.logTransaction(event); }
  @OnEvent(PaymentEventType.TRANSACTION_REFUNDED) async handleTransactionRefunded(event: PaymentEvent): Promise<void> { await this.logTransaction(event); }

  async logTransaction(event: PaymentEvent): Promise<void> {
    try {
      const data = event.data as unknown as TransactionResponse & { providerId: string; providerName: string; processingTimeMs: number; fallbackUsed: boolean; customerId?: string; transactionType?: string; ipAddress?: string; metadata?: Record<string, unknown>; };
      // PCI-DSS: Sanitize raw response to remove any card data before storage
      const sanitizedRawResponse = data.rawResponse ? this.sanitizeProviderResponse(data.rawResponse) : undefined;
      const providerResponseData = { authorizationCode: data.authorizationCode, processingTimeMs: data.processingTimeMs, fallbackUsed: data.fallbackUsed, ipAddress: data.ipAddress, rawResponse: sanitizedRawResponse, providerId: data.providerId, providerName: data.providerName, ...data.metadata };

      // Check if providerId exists in payment_providers table, skip if it doesn't (might be a client integration ID)
      let paymentProviderId: string | null = null;
      if (data.providerId) {
        const provider = await this.prisma.paymentProvider.findUnique({ where: { id: data.providerId } });
        if (provider) paymentProviderId = data.providerId;
      }

      await this.prisma.transaction.create({
        data: { companyId: event.companyId, customerId: data.customerId, paymentProviderId, transactionNumber: data.referenceId, type: this.mapTransactionType(data.transactionType || event.type), amount: data.amount, currency: data.currency || 'USD', status: this.mapTransactionStatus(data.status), providerTransactionId: data.transactionId, avsResult: data.avsResult, cvvResult: data.cvvResult, failureCode: data.errorCode || data.declineCode, failureReason: data.errorMessage, riskScore: data.riskScore, riskFlags: data.riskFlags || [], processedAt: data.processedAt, providerResponse: providerResponseData as Prisma.InputJsonValue }
      });
      this.logger.debug(`Transaction logged: ${data.referenceId} (${data.status})`);
    } catch (error) { this.logger.error(`Failed to log transaction: ${(error as Error).message}`, (error as Error).stack); }
  }

  async getTransaction(id: string): Promise<TransactionLog | null> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id }, include: { company: { select: { id: true, name: true } }, customer: { select: { id: true, email: true, firstName: true, lastName: true } }, paymentProvider: { select: { id: true, name: true, type: true } } } });
    if (!transaction) return null;
    return this.mapToTransactionLog(transaction);
  }

  async getTransactionByReference(referenceId: string): Promise<TransactionLog | null> {
    const transaction = await this.prisma.transaction.findFirst({ where: { transactionNumber: referenceId }, include: { company: { select: { id: true, name: true } }, customer: { select: { id: true, email: true, firstName: true, lastName: true } }, paymentProvider: { select: { id: true, name: true, type: true } } } });
    if (!transaction) return null;
    return this.mapToTransactionLog(transaction);
  }

  async queryTransactions(query: TransactionLogQuery): Promise<{ transactions: TransactionLog[]; total: number }> {
    const where: any = {};
    if (query.companyId) where.companyId = query.companyId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.providerId) where.paymentProviderId = query.providerId;
    if (query.status?.length) where.status = { in: query.status };
    if (query.transactionType?.length) where.type = { in: query.transactionType };
    if (query.dateFrom || query.dateTo) { where.createdAt = {}; if (query.dateFrom) where.createdAt.gte = query.dateFrom; if (query.dateTo) where.createdAt.lte = query.dateTo; }
    if (query.minAmount !== undefined || query.maxAmount !== undefined) { where.amount = {}; if (query.minAmount !== undefined) where.amount.gte = query.minAmount; if (query.maxAmount !== undefined) where.amount.lte = query.maxAmount; }
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({ where, include: { company: { select: { id: true, name: true } }, customer: { select: { id: true, email: true, firstName: true, lastName: true } }, paymentProvider: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: 'desc' }, take: query.limit || 50, skip: query.offset || 0 }),
      this.prisma.transaction.count({ where })
    ]);
    return { transactions: transactions.map(this.mapToTransactionLog), total };
  }

  async getTransactionStats(companyId: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = { companyId }; if (dateFrom || dateTo) { where.createdAt = {}; if (dateFrom) where.createdAt.gte = dateFrom; if (dateTo) where.createdAt.lte = dateTo; }
    const [stats, byProvider, byStatus] = await Promise.all([ this.prisma.transaction.aggregate({ where, _count: true, _sum: { amount: true }, _avg: { amount: true } }), this.prisma.transaction.groupBy({ by: ['paymentProviderId'], where, _count: true, _sum: { amount: true } }), this.prisma.transaction.groupBy({ by: ['status'], where, _count: true }) ]);
    const statusCounts = byStatus.reduce((acc, s) => { acc[s.status] = s._count; return acc; }, {} as Record<string, number>);
    const successCount = statusCounts['COMPLETED'] || statusCounts['APPROVED'] || 0;
    return { totalTransactions: stats._count, totalVolume: stats._sum.amount || 0, successCount, declineCount: statusCounts['DECLINED'] || 0, errorCount: statusCounts['FAILED'] || statusCounts['ERROR'] || 0, successRate: stats._count > 0 ? (successCount / stats._count) * 100 : 0, averageAmount: stats._avg.amount || 0, byProvider: byProvider.map((p) => ({ providerId: p.paymentProviderId || '', count: p._count, volume: p._sum.amount || 0 })), byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })) };
  }

  private mapToTransactionLog(transaction: any): TransactionLog {
    const providerResponse = transaction.providerResponse as Record<string, unknown> || {};
    return { id: transaction.id, companyId: transaction.companyId, customerId: transaction.customerId, providerId: transaction.paymentProviderId || '', providerName: transaction.paymentProvider?.name || '', transactionType: transaction.type, transactionId: transaction.providerTransactionId || '', referenceId: transaction.transactionNumber, amount: Number(transaction.amount), currency: transaction.currency, status: transaction.status as TransactionStatus, avsResult: transaction.avsResult, cvvResult: transaction.cvvResult, authorizationCode: providerResponse.authorizationCode as string, errorCode: transaction.failureCode, errorMessage: transaction.failureReason, riskScore: transaction.riskScore, riskFlags: transaction.riskFlags, ipAddress: providerResponse.ipAddress as string, metadata: providerResponse, rawResponse: providerResponse.rawResponse as Record<string, unknown>, processingTimeMs: (providerResponse.processingTimeMs as number) || 0, fallbackUsed: (providerResponse.fallbackUsed as boolean) || false, createdAt: transaction.createdAt };
  }

  private mapTransactionType(eventType: string): PrismaTransactionType { const mapping: Record<string, PrismaTransactionType> = { [PaymentEventType.TRANSACTION_APPROVED]: 'CHARGE', [PaymentEventType.TRANSACTION_DECLINED]: 'CHARGE', [PaymentEventType.TRANSACTION_VOIDED]: 'VOID', [PaymentEventType.TRANSACTION_REFUNDED]: 'REFUND', 'SALE': 'CHARGE', 'AUTHORIZATION': 'AUTHORIZATION', 'CAPTURE': 'CAPTURE', 'VOID': 'VOID', 'REFUND': 'REFUND', 'VERIFY': 'AUTHORIZATION' }; return mapping[eventType] || 'CHARGE'; }
  private mapTransactionStatus(status: TransactionStatus): PrismaTransactionStatus { const mapping: Record<TransactionStatus, PrismaTransactionStatus> = { [TransactionStatus.PENDING]: 'PENDING', [TransactionStatus.PROCESSING]: 'PROCESSING', [TransactionStatus.APPROVED]: 'COMPLETED', [TransactionStatus.DECLINED]: 'FAILED', [TransactionStatus.ERROR]: 'FAILED', [TransactionStatus.VOIDED]: 'VOIDED', [TransactionStatus.REFUNDED]: 'REFUNDED', [TransactionStatus.SETTLED]: 'COMPLETED', [TransactionStatus.HELD_FOR_REVIEW]: 'PENDING' }; return mapping[status] || 'PENDING'; }
}
