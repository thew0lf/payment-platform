import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  UsagePeriodStatus,
} from '../types/billing.types';
import { PricingPlanService } from './pricing-plan.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PricingPlanService,
  ) {}

  async generateInvoice(clientId: string, usagePeriodId: string): Promise<Invoice> {
    const period = await this.prisma.usagePeriod.findUnique({
      where: { id: usagePeriodId },
    });
    if (!period) {
      throw new NotFoundException(`Usage period ${usagePeriodId} not found`);
    }
    if (period.status !== UsagePeriodStatus.CLOSED) {
      throw new Error('Cannot generate invoice for unclosed period');
    }

    const subscription = await this.prisma.clientSubscription.findUnique({
      where: { clientId },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = await this.planService.findById(subscription.planId);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Build line items
    const lineItems: InvoiceLineItem[] = [];

    // Base plan
    lineItems.push({
      description: `${plan.name} - ${plan.billingInterval} subscription`,
      quantity: 1,
      unitPrice: period.baseCost,
      amount: period.baseCost,
      type: 'base',
    });

    // Transaction fees
    if (period.transactionCost > 0) {
      const overage = Math.max(0, period.transactionCount - plan.included.transactions);
      lineItems.push({
        description: `Transaction fees (${overage} transactions over ${plan.included.transactions} included)`,
        quantity: overage,
        unitPrice: plan.overage.transactionPrice,
        amount: period.transactionCost,
        type: 'transaction',
      });
    }

    // Volume fees
    if (period.volumeCost > 0) {
      const volumeOverage = Math.max(0, Number(period.transactionVolume) - plan.included.volume);
      lineItems.push({
        description: `Volume fees (${(volumeOverage / 100).toFixed(2)} over included)`,
        quantity: 1,
        unitPrice: period.volumeCost,
        amount: period.volumeCost,
        type: 'volume',
        breakdown: {
          rate: plan.overage.volumePercent * 100,
        },
      });
    }

    // Overage fees
    if (period.overageCost > 0) {
      lineItems.push({
        description: 'Resource overage fees',
        quantity: 1,
        unitPrice: period.overageCost,
        amount: period.overageCost,
        type: 'overage',
      });
    }

    // Apply discount
    let discount = 0;
    if (subscription.discountPercent) {
      discount = Math.round(period.totalCost * (subscription.discountPercent / 100));
      lineItems.push({
        description: `Discount (${subscription.discountPercent}% - ${subscription.discountReason || 'Applied'})`,
        quantity: 1,
        unitPrice: -discount,
        amount: -discount,
        type: 'discount',
      });
    }

    const subtotal = period.totalCost;
    const total = subtotal - discount;

    const invoice = await this.prisma.invoice.create({
      data: {
        clientId,
        subscriptionId: subscription.id,
        usagePeriodId,
        invoiceNumber,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        subtotal,
        discount,
        tax: 0,
        total,
        amountPaid: 0,
        amountDue: total,
        currency: 'USD',
        lineItems: lineItems as any,
        status: InvoiceStatus.OPEN,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Update period status
    await this.prisma.usagePeriod.update({
      where: { id: usagePeriodId },
      data: { status: UsagePeriodStatus.INVOICED },
    });

    this.logger.log(`Generated invoice ${invoiceNumber} for client ${clientId}`);
    return this.mapToInvoice(invoice);
  }

  async findByClientId(clientId: string): Promise<Invoice[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
    return invoices.map(this.mapToInvoice.bind(this));
  }

  async findById(id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return this.mapToInvoice(invoice);
  }

  async markPaid(id: string, paymentMethod?: string): Promise<Invoice> {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        amountPaid: existing.total,
        amountDue: 0,
        paymentMethod,
      },
    });
    return this.mapToInvoice(invoice);
  }

  async voidInvoice(id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.VOID,
        voidedAt: new Date(),
      },
    });
    return this.mapToInvoice(invoice);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: {
        invoiceNumber: { startsWith: `INV-${year}` },
      },
    });
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private mapToInvoice(data: any): Invoice {
    return {
      id: data.id,
      clientId: data.clientId,
      subscriptionId: data.subscriptionId,
      usagePeriodId: data.usagePeriodId,
      invoiceNumber: data.invoiceNumber,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      amountPaid: data.amountPaid,
      amountDue: data.amountDue,
      currency: data.currency,
      lineItems: data.lineItems as InvoiceLineItem[],
      status: data.status as InvoiceStatus,
      dueDate: data.dueDate,
      paidAt: data.paidAt,
      stripeInvoiceId: data.stripeInvoiceId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      paymentMethod: data.paymentMethod,
      pdfUrl: data.pdfUrl,
      notes: data.notes,
      createdAt: data.createdAt,
      sentAt: data.sentAt,
    };
  }
}
