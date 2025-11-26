import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RMAStatus,
  RMAType,
  ReturnReason,
  InspectionResult,
  ItemCondition,
  DispositionAction,
  RMA,
  RMAItem,
  RMAPolicy,
  CreateRMADto,
  ApproveRMADto,
  RejectRMADto,
  UpdateRMAStatusDto,
  RecordInspectionDto,
  ProcessResolutionDto,
  GetRMAsDto,
  RMAAnalyticsDto,
  RMAAnalytics,
} from '../types/rma.types';

@Injectable()
export class RMAService {
  private readonly logger = new Logger(RMAService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // RMA CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  async createRMA(dto: CreateRMADto): Promise<RMA> {
    this.logger.log(`Creating RMA for order ${dto.orderId}`);

    // Get company RMA policy
    const policy = await this.getRMAPolicy(dto.companyId);

    // Validate RMA eligibility
    await this.validateRMAEligibility(dto, policy);

    // Check for auto-approval
    const autoApprove = await this.checkAutoApproval(dto, policy);

    // Build RMA items
    const rmaItems: RMAItem[] = dto.items.map((item, index) => ({
      id: this.generateItemId(),
      orderItemId: item.orderItemId,
      productId: `prod_${index}`, // In production, fetch from order
      productName: `Product ${index + 1}`, // In production, fetch from order
      sku: `SKU_${index}`, // In production, fetch from order
      quantity: item.quantity,
      unitPrice: 29.99, // In production, fetch from order
      reason: item.reason || dto.reason,
      reasonDetails: item.reasonDetails,
    }));

    // Create the RMA
    const rma: RMA = {
      id: this.generateRMAId(),
      rmaNumber: this.generateRMANumber(),
      companyId: dto.companyId,
      customerId: dto.customerId,
      orderId: dto.orderId,
      csSessionId: dto.csSessionId,

      type: dto.type,
      status: autoApprove ? RMAStatus.APPROVED : RMAStatus.REQUESTED,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,

      items: rmaItems,

      shipping: {
        labelType: 'prepaid',
        returnAddress: policy.shippingConfig.returnAddresses[0] || {
          name: 'Returns Center',
          street1: '123 Returns Way',
          city: 'Returns City',
          state: 'RC',
          postalCode: '12345',
          country: 'US',
        },
      },

      resolution: {
        type: dto.preferredResolution || 'refund',
        status: 'pending',
      },

      timeline: [
        {
          status: RMAStatus.REQUESTED,
          timestamp: new Date(),
          actorType: dto.metadata?.channel === 'api' ? 'system' : 'customer',
        },
      ],

      metadata: {
        initiatedBy: 'customer',
        channel: dto.metadata?.channel,
        priority: dto.metadata?.priority,
        tags: dto.metadata?.tags,
      },

      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + policy.generalRules.rmaExpirationDays * 24 * 60 * 60 * 1000),
    };

    // If auto-approved, update status and generate label
    if (autoApprove) {
      rma.timeline.push({
        status: RMAStatus.APPROVED,
        timestamp: new Date(),
        actorType: 'system',
        notes: 'Auto-approved based on policy rules',
      });

      // Generate shipping label
      await this.generateShippingLabel(rma);
    }

    // Emit RMA created event
    this.eventEmitter.emit('rma.created', {
      rmaId: rma.id,
      rmaNumber: rma.rmaNumber,
      orderId: dto.orderId,
      autoApproved: autoApprove,
    });

    this.logger.log(`RMA ${rma.rmaNumber} created with status ${rma.status}`);
    return rma;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  async approveRMA(dto: ApproveRMADto): Promise<RMA> {
    const rma = await this.getRMA(dto.rmaId);

    if (!rma) {
      throw new NotFoundException(`RMA ${dto.rmaId} not found`);
    }

    if (rma.status !== RMAStatus.REQUESTED) {
      throw new BadRequestException(`RMA is not pending approval`);
    }

    rma.status = RMAStatus.APPROVED;
    rma.timeline.push({
      status: RMAStatus.APPROVED,
      timestamp: new Date(),
      notes: dto.notes,
    });
    rma.updatedAt = new Date();

    // Generate shipping label
    await this.generateShippingLabel(rma);

    // Emit approval event
    this.eventEmitter.emit('rma.approved', {
      rmaId: rma.id,
      rmaNumber: rma.rmaNumber,
    });

    return rma;
  }

  async rejectRMA(dto: RejectRMADto): Promise<RMA> {
    const rma = await this.getRMA(dto.rmaId);

    if (!rma) {
      throw new NotFoundException(`RMA ${dto.rmaId} not found`);
    }

    if (rma.status !== RMAStatus.REQUESTED) {
      throw new BadRequestException(`RMA is not pending approval`);
    }

    rma.status = RMAStatus.REJECTED;
    rma.timeline.push({
      status: RMAStatus.REJECTED,
      timestamp: new Date(),
      notes: dto.reason,
    });
    rma.updatedAt = new Date();

    // Emit rejection event
    this.eventEmitter.emit('rma.rejected', {
      rmaId: rma.id,
      rmaNumber: rma.rmaNumber,
      reason: dto.reason,
    });

    return rma;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS UPDATES
  // ═══════════════════════════════════════════════════════════════════════════

  async updateStatus(dto: UpdateRMAStatusDto): Promise<RMA> {
    const rma = await this.getRMA(dto.rmaId);

    if (!rma) {
      throw new NotFoundException(`RMA ${dto.rmaId} not found`);
    }

    const previousStatus = rma.status;
    rma.status = dto.status;
    rma.timeline.push({
      status: dto.status,
      timestamp: new Date(),
      notes: dto.notes,
      metadata: dto.metadata,
    });
    rma.updatedAt = new Date();

    // Handle specific status transitions
    switch (dto.status) {
      case RMAStatus.IN_TRANSIT:
        rma.shipping.shippedAt = new Date();
        break;
      case RMAStatus.RECEIVED:
        rma.shipping.deliveredAt = new Date();
        break;
      case RMAStatus.COMPLETED:
        rma.completedAt = new Date();
        break;
    }

    // Emit status change event
    this.eventEmitter.emit('rma.status.changed', {
      rmaId: rma.id,
      rmaNumber: rma.rmaNumber,
      previousStatus,
      newStatus: dto.status,
    });

    return rma;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INSPECTION
  // ═══════════════════════════════════════════════════════════════════════════

  async recordInspection(dto: RecordInspectionDto): Promise<RMA> {
    const rma = await this.getRMA(dto.rmaId);

    if (!rma) {
      throw new NotFoundException(`RMA ${dto.rmaId} not found`);
    }

    if (rma.status !== RMAStatus.RECEIVED && rma.status !== RMAStatus.INSPECTING) {
      throw new BadRequestException(`RMA must be received before inspection`);
    }

    // Update status to inspecting if not already
    if (rma.status !== RMAStatus.INSPECTING) {
      rma.status = RMAStatus.INSPECTING;
      rma.timeline.push({
        status: RMAStatus.INSPECTING,
        timestamp: new Date(),
      });
    }

    // Record inspection results for each item
    for (const itemInspection of dto.items) {
      const rmaItem = rma.items.find(i => i.id === itemInspection.rmaItemId);
      if (rmaItem) {
        rmaItem.inspection = {
          condition: itemInspection.condition,
          result: itemInspection.result,
          notes: itemInspection.notes,
          photos: itemInspection.photos,
          inspectedAt: new Date(),
          refundEligible: itemInspection.result !== InspectionResult.FAILED,
          refundPercentage: itemInspection.refundPercentage || this.getRefundPercentage(itemInspection.condition),
        };

        // Determine disposition action
        rmaItem.disposition = {
          action: this.determineDisposition(itemInspection.condition),
        };
      }
    }

    // Calculate overall inspection result
    const allResults = rma.items
      .filter(i => i.inspection)
      .map(i => i.inspection!.result);

    let overallResult = InspectionResult.PASSED;
    if (allResults.every(r => r === InspectionResult.FAILED)) {
      overallResult = InspectionResult.FAILED;
    } else if (allResults.some(r => r === InspectionResult.FAILED)) {
      overallResult = InspectionResult.PARTIAL;
    }

    rma.inspection = {
      status: 'completed',
      startedAt: rma.inspection?.startedAt || new Date(),
      completedAt: new Date(),
      overallResult,
      notes: dto.overallNotes,
    };

    rma.status = RMAStatus.INSPECTION_COMPLETE;
    rma.timeline.push({
      status: RMAStatus.INSPECTION_COMPLETE,
      timestamp: new Date(),
      notes: `Inspection complete: ${overallResult}`,
    });
    rma.updatedAt = new Date();

    // Emit inspection complete event
    this.eventEmitter.emit('rma.inspection.complete', {
      rmaId: rma.id,
      rmaNumber: rma.rmaNumber,
      result: overallResult,
    });

    return rma;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════

  async processResolution(dto: ProcessResolutionDto): Promise<RMA> {
    const rma = await this.getRMA(dto.rmaId);

    if (!rma) {
      throw new NotFoundException(`RMA ${dto.rmaId} not found`);
    }

    if (rma.status !== RMAStatus.INSPECTION_COMPLETE) {
      throw new BadRequestException(`RMA inspection must be complete before resolution`);
    }

    rma.resolution.type = dto.resolutionType;
    rma.resolution.status = 'processing';

    switch (dto.resolutionType) {
      case 'refund':
        if (dto.refund) {
          rma.resolution.refund = {
            amount: dto.refund.amount,
            method: dto.refund.method || 'original_payment',
          };
          // In production, create refund record
        }
        break;

      case 'exchange':
        if (dto.exchange) {
          rma.resolution.exchange = {
            items: dto.exchange.items,
            additionalPayment: dto.exchange.additionalPayment,
          };
          // In production, create exchange order
        }
        break;

      case 'store_credit':
        if (dto.storeCredit) {
          rma.resolution.storeCredit = {
            amount: dto.storeCredit.amount,
            expiresAt: dto.storeCredit.expirationDays
              ? new Date(Date.now() + dto.storeCredit.expirationDays * 24 * 60 * 60 * 1000)
              : undefined,
          };
          // In production, create store credit
        }
        break;
    }

    rma.status = RMAStatus.PROCESSING_REFUND;
    rma.timeline.push({
      status: RMAStatus.PROCESSING_REFUND,
      timestamp: new Date(),
      notes: `Processing ${dto.resolutionType}`,
    });

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));

    rma.resolution.status = 'completed';
    rma.status = RMAStatus.COMPLETED;
    rma.timeline.push({
      status: RMAStatus.COMPLETED,
      timestamp: new Date(),
      notes: `${dto.resolutionType} completed`,
    });
    rma.completedAt = new Date();
    rma.updatedAt = new Date();

    // Emit resolution complete event
    this.eventEmitter.emit('rma.resolution.complete', {
      rmaId: rma.id,
      rmaNumber: rma.rmaNumber,
      resolutionType: dto.resolutionType,
    });

    return rma;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION & AUTO-APPROVAL
  // ═══════════════════════════════════════════════════════════════════════════

  private async validateRMAEligibility(dto: CreateRMADto, policy: RMAPolicy): Promise<void> {
    if (!policy.enabled) {
      throw new BadRequestException('RMA is not enabled for this company');
    }

    if (dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    if (dto.items.length > policy.generalRules.maxItemsPerRMA) {
      throw new BadRequestException(`Maximum ${policy.generalRules.maxItemsPerRMA} items per RMA`);
    }

    // In production, would check:
    // - Order exists and is within return window
    // - Items are eligible for return
    // - Customer hasn't exceeded RMA limits
  }

  private async checkAutoApproval(dto: CreateRMADto, policy: RMAPolicy): Promise<boolean> {
    if (!policy.automation.autoApprove.enabled) {
      return false;
    }

    for (const condition of policy.automation.autoApprove.conditions) {
      const matches = await this.evaluateAutoApproveCondition(dto, condition);
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  private async evaluateAutoApproveCondition(
    dto: CreateRMADto,
    condition: RMAPolicy['automation']['autoApprove']['conditions'][0],
  ): Promise<boolean> {
    switch (condition.field) {
      case 'reason':
        if (condition.operator === 'in' && Array.isArray(condition.value)) {
          return condition.value.includes(dto.reason);
        }
        return dto.reason === condition.value;
      default:
        return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPPING
  // ═══════════════════════════════════════════════════════════════════════════

  private async generateShippingLabel(rma: RMA): Promise<void> {
    // In production, call shipping API (EasyPost, ShipStation, etc.)
    rma.shipping.labelType = 'prepaid';
    rma.shipping.carrier = 'USPS';
    rma.shipping.trackingNumber = `9400${Date.now()}`;
    rma.shipping.trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${rma.shipping.trackingNumber}`;
    rma.shipping.labelUrl = `https://example.com/labels/${rma.id}.pdf`;
    rma.shipping.labelSentAt = new Date();

    rma.status = RMAStatus.LABEL_SENT;
    rma.timeline.push({
      status: RMAStatus.LABEL_SENT,
      timestamp: new Date(),
      notes: `Shipping label generated: ${rma.shipping.trackingNumber}`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getRMA(rmaId: string): Promise<RMA | null> {
    // In production, fetch from database
    return null;
  }

  async getRMAByNumber(rmaNumber: string): Promise<RMA | null> {
    // In production, fetch from database
    return null;
  }

  async getRMAs(dto: GetRMAsDto): Promise<{ rmas: RMA[]; total: number }> {
    // In production, fetch from database with filters
    return { rmas: [], total: 0 };
  }

  async getRMAPolicy(companyId: string): Promise<RMAPolicy> {
    // In production, fetch from database
    return {
      companyId,
      enabled: true,
      generalRules: {
        returnWindowDays: 30,
        warrantyDays: 365,
        maxItemsPerRMA: 10,
        rmaExpirationDays: 30,
        requirePhotos: false,
        requireReason: true,
        requireProofOfPurchase: false,
        allowPartialReturns: true,
        allowExchanges: true,
        allowWarrantyClaims: true,
        excludedCategories: [],
        excludedProducts: [],
        finalSaleCategories: ['clearance'],
      },
      returnReasons: [
        {
          reason: ReturnReason.DEFECTIVE,
          enabled: true,
          requiresProof: true,
          proofTypes: ['photo'],
          autoApprove: true,
          restockingFeePercentage: 0,
          customerPaysReturn: false,
          eligibleForExchange: true,
          priority: 'high',
        },
        {
          reason: ReturnReason.WRONG_ITEM,
          enabled: true,
          requiresProof: false,
          proofTypes: [],
          autoApprove: true,
          restockingFeePercentage: 0,
          customerPaysReturn: false,
          eligibleForExchange: true,
          priority: 'high',
        },
        {
          reason: ReturnReason.NO_LONGER_NEEDED,
          enabled: true,
          requiresProof: false,
          proofTypes: [],
          autoApprove: false,
          restockingFeePercentage: 15,
          customerPaysReturn: true,
          eligibleForExchange: true,
          priority: 'normal',
        },
      ],
      shippingConfig: {
        defaultCarrier: 'USPS',
        prepaidLabels: {
          enabled: true,
          carriers: ['USPS', 'UPS', 'FedEx'],
          maxValue: 500,
        },
        customerPaidReturns: {
          enabled: true,
          minOrderValue: 0,
        },
        pickupService: {
          enabled: false,
          carriers: [],
          minOrderValue: 200,
        },
        returnAddresses: [
          {
            name: 'Returns Processing Center',
            company: 'Coffee Co Returns',
            street1: '456 Returns Blvd',
            city: 'Returns City',
            state: 'CA',
            postalCode: '90210',
            country: 'US',
          },
        ],
        defaultReturnAddressId: 'addr_1',
        internationalReturns: {
          enabled: true,
          customerPaysCustoms: true,
          allowedCountries: ['CA', 'MX', 'GB'],
        },
      },
      inspectionConfig: {
        required: true,
        autoPassConditions: [ItemCondition.NEW_UNOPENED, ItemCondition.NEW_OPENED],
        autoFailConditions: [ItemCondition.DAMAGED],
        inspectionChecklist: [
          { id: 'check_1', name: 'Original packaging present', required: false, passCondition: 'yes' },
          { id: 'check_2', name: 'Product intact', required: true, passCondition: 'yes' },
          { id: 'check_3', name: 'No signs of use', required: false, passCondition: 'yes' },
        ],
        dispositionRules: [
          { condition: ItemCondition.NEW_UNOPENED, action: DispositionAction.RESTOCK },
          { condition: ItemCondition.NEW_OPENED, action: DispositionAction.RESTOCK },
          { condition: ItemCondition.LIKE_NEW, action: DispositionAction.REFURBISH },
          { condition: ItemCondition.GOOD, action: DispositionAction.REFURBISH },
          { condition: ItemCondition.FAIR, action: DispositionAction.LIQUIDATE },
          { condition: ItemCondition.POOR, action: DispositionAction.DONATE },
          { condition: ItemCondition.DAMAGED, action: DispositionAction.DESTROY },
        ],
        qualityMetrics: {
          trackDefectRates: true,
          trackVendorIssues: true,
          reportingThreshold: 5,
        },
      },
      resolutionConfig: {
        defaultResolution: 'refund',
        refundRules: {
          processingTimeDays: 5,
          partialRefundThreshold: 50,
          restockingFeeEnabled: true,
          defaultRestockingFeePercentage: 15,
        },
        exchangeRules: {
          allowDifferentProduct: true,
          allowUpgrade: true,
          allowDowngrade: true,
          priceProtectionDays: 30,
        },
        storeCreditRules: {
          bonusPercentage: 10,
          expirationDays: 365,
          minimumAmount: 5,
        },
      },
      notifications: {
        customer: {
          onCreation: true,
          onApproval: true,
          onLabelSent: true,
          onReceived: true,
          onInspectionComplete: true,
          onResolution: true,
          reminderBeforeExpiration: true,
          reminderDays: 7,
          channels: ['email', 'sms'],
        },
        internal: {
          onHighValue: true,
          highValueThreshold: 200,
          onInspectionFailed: true,
          onExpiring: true,
          expiringDays: 3,
          dailySummary: true,
          recipients: ['returns@company.com'],
          channels: ['email', 'slack'],
        },
      },
      automation: {
        autoApprove: {
          enabled: true,
          conditions: [
            { field: 'reason', operator: 'in', value: [ReturnReason.DEFECTIVE, ReturnReason.WRONG_ITEM] },
          ],
        },
        autoCreateLabel: true,
        autoProcessRefund: false,
        autoCloseAfterDays: 60,
        autoExpireReminders: true,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalytics(dto: RMAAnalyticsDto): Promise<RMAAnalytics> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalRMAs: 320,
        totalItems: 485,
        totalValue: 14250,
        approvalRate: 94,
        avgProcessingTime: 5.2,
        returnRate: 3.5,
      },
      byStatus: {
        [RMAStatus.REQUESTED]: { count: 15, value: 450 },
        [RMAStatus.APPROVED]: { count: 10, value: 300 },
        [RMAStatus.LABEL_SENT]: { count: 25, value: 750 },
        [RMAStatus.IN_TRANSIT]: { count: 35, value: 1050 },
        [RMAStatus.RECEIVED]: { count: 8, value: 240 },
        [RMAStatus.INSPECTING]: { count: 5, value: 150 },
        [RMAStatus.INSPECTION_COMPLETE]: { count: 3, value: 90 },
        [RMAStatus.PROCESSING_REFUND]: { count: 2, value: 60 },
        [RMAStatus.COMPLETED]: { count: 200, value: 10500 },
        [RMAStatus.REJECTED]: { count: 12, value: 360 },
        [RMAStatus.CANCELLED]: { count: 3, value: 150 },
        [RMAStatus.EXPIRED]: { count: 2, value: 150 },
      },
      byType: {
        [RMAType.RETURN]: { count: 250, value: 11000 },
        [RMAType.EXCHANGE]: { count: 45, value: 2200 },
        [RMAType.WARRANTY]: { count: 20, value: 900 },
        [RMAType.REPAIR]: { count: 3, value: 100 },
        [RMAType.RECALL]: { count: 2, value: 50 },
      },
      byReason: [
        { reason: ReturnReason.DEFECTIVE, count: 85, value: 2800, avgValue: 32.94, trend: -8 },
        { reason: ReturnReason.WRONG_SIZE, count: 60, value: 1800, avgValue: 30.00, trend: 0 },
        { reason: ReturnReason.NOT_AS_DESCRIBED, count: 55, value: 1650, avgValue: 30.00, trend: -3 },
        { reason: ReturnReason.NO_LONGER_NEEDED, count: 70, value: 2100, avgValue: 30.00, trend: 5 },
        { reason: ReturnReason.QUALITY_NOT_EXPECTED, count: 50, value: 1500, avgValue: 30.00, trend: -2 },
      ],
      inspection: {
        totalInspected: 195,
        passRate: 88,
        avgInspectionTime: 1.5,
        byCondition: {
          [ItemCondition.NEW_UNOPENED]: 45,
          [ItemCondition.NEW_OPENED]: 65,
          [ItemCondition.LIKE_NEW]: 40,
          [ItemCondition.GOOD]: 25,
          [ItemCondition.FAIR]: 12,
          [ItemCondition.POOR]: 5,
          [ItemCondition.DAMAGED]: 3,
          [ItemCondition.DEFECTIVE]: 0,
        },
        byDisposition: {
          [DispositionAction.RESTOCK]: 110,
          [DispositionAction.REFURBISH]: 55,
          [DispositionAction.LIQUIDATE]: 15,
          [DispositionAction.DONATE]: 10,
          [DispositionAction.DESTROY]: 3,
          [DispositionAction.RETURN_TO_VENDOR]: 2,
        },
      },
      resolution: {
        byType: [
          { type: 'refund', count: 180, value: 8500 },
          { type: 'exchange', count: 45, value: 2200 },
          { type: 'store_credit', count: 35, value: 1400 },
        ],
        avgResolutionTime: 3.8,
        customerSatisfaction: 4.4,
      },
      shipping: {
        avgTransitTime: 4.2,
        lostPackages: 2,
        prepaidLabelsIssued: 285,
        shippingCostTotal: 2850,
      },
      trends: [
        { date: '2024-01-01', rmaCount: 12, itemCount: 18, value: 540 },
        { date: '2024-01-02', rmaCount: 15, itemCount: 22, value: 660 },
        { date: '2024-01-03', rmaCount: 10, itemCount: 15, value: 450 },
      ],
      topReturnedProducts: [
        { productId: 'prod_1', productName: 'Premium Coffee Blend', returnCount: 35, returnRate: 4.2, topReasons: [ReturnReason.QUALITY_NOT_EXPECTED, ReturnReason.NOT_AS_DESCRIBED] },
        { productId: 'prod_2', productName: 'Coffee Grinder Pro', returnCount: 28, returnRate: 5.1, topReasons: [ReturnReason.DEFECTIVE, ReturnReason.QUALITY_NOT_EXPECTED] },
        { productId: 'prod_3', productName: 'Single Origin Sampler', returnCount: 22, returnRate: 2.8, topReasons: [ReturnReason.NO_LONGER_NEEDED] },
      ],
      qualityInsights: {
        defectRate: 2.3,
        topDefectCategories: ['Seal issues', 'Stale product', 'Packaging damage'],
        vendorIssues: [
          { vendorId: 'vendor_1', vendorName: 'Bean Supplier Co', returnCount: 15, defectRate: 3.8 },
          { vendorId: 'vendor_2', vendorName: 'Equipment Ltd', returnCount: 12, defectRate: 4.2 },
        ],
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private getRefundPercentage(condition: ItemCondition): number {
    const percentages: Record<ItemCondition, number> = {
      [ItemCondition.NEW_UNOPENED]: 100,
      [ItemCondition.NEW_OPENED]: 100,
      [ItemCondition.LIKE_NEW]: 95,
      [ItemCondition.GOOD]: 85,
      [ItemCondition.FAIR]: 70,
      [ItemCondition.POOR]: 50,
      [ItemCondition.DAMAGED]: 0,
      [ItemCondition.DEFECTIVE]: 100,
    };
    return percentages[condition];
  }

  private determineDisposition(condition: ItemCondition): DispositionAction {
    const dispositions: Record<ItemCondition, DispositionAction> = {
      [ItemCondition.NEW_UNOPENED]: DispositionAction.RESTOCK,
      [ItemCondition.NEW_OPENED]: DispositionAction.RESTOCK,
      [ItemCondition.LIKE_NEW]: DispositionAction.REFURBISH,
      [ItemCondition.GOOD]: DispositionAction.REFURBISH,
      [ItemCondition.FAIR]: DispositionAction.LIQUIDATE,
      [ItemCondition.POOR]: DispositionAction.DONATE,
      [ItemCondition.DAMAGED]: DispositionAction.DESTROY,
      [ItemCondition.DEFECTIVE]: DispositionAction.RETURN_TO_VENDOR,
    };
    return dispositions[condition];
  }

  private generateRMAId(): string {
    return `rma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRMANumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `RMA-${year}-${random}`;
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
