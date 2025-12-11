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
  // QUERIES - WITH TENANT FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get a single RMA by ID
   * Note: Caller (controller) must verify companyId access after fetching
   */
  async getRMA(rmaId: string): Promise<RMA | null> {
    const rma = await this.prisma.rMA.findUnique({
      where: { id: rmaId },
    });

    if (!rma) {
      return null;
    }

    return this.mapPrismaRMAToRMA(rma);
  }

  /**
   * Get RMA by number
   * Note: Caller (controller) must verify companyId access after fetching
   */
  async getRMAByNumber(rmaNumber: string): Promise<RMA | null> {
    const rma = await this.prisma.rMA.findUnique({
      where: { rmaNumber },
    });

    if (!rma) {
      return null;
    }

    return this.mapPrismaRMAToRMA(rma);
  }

  /**
   * Get RMAs with filters
   * IMPORTANT: dto.companyIds should be pre-filtered by the controller
   * to include only companies the user has access to
   */
  async getRMAs(dto: GetRMAsDto): Promise<{ rmas: RMA[]; total: number }> {
    // Build where clause with tenant filtering
    const where: any = {};

    // CRITICAL: Tenant isolation - filter by accessible companies
    if (dto.companyId) {
      where.companyId = dto.companyId;
    } else if (dto.companyIds && dto.companyIds.length > 0) {
      where.companyId = { in: dto.companyIds };
    }

    // Additional filters
    if (dto.status) {
      where.status = dto.status;
    }
    if (dto.type) {
      where.type = dto.type;
    }
    if (dto.customerId) {
      where.customerId = dto.customerId;
    }
    if (dto.orderId) {
      where.orderId = dto.orderId;
    }
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        where.createdAt.lte = new Date(dto.endDate);
      }
    }

    // Execute queries in parallel
    const [rmas, total] = await Promise.all([
      this.prisma.rMA.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: dto.offset || 0,
        take: dto.limit || 50,
      }),
      this.prisma.rMA.count({ where }),
    ]);

    return {
      rmas: rmas.map(rma => this.mapPrismaRMAToRMA(rma)),
      total,
    };
  }

  /**
   * Map Prisma RMA model to RMA interface
   */
  private mapPrismaRMAToRMA(prismaRma: any): RMA {
    return {
      id: prismaRma.id,
      rmaNumber: prismaRma.rmaNumber,
      companyId: prismaRma.companyId,
      customerId: prismaRma.customerId,
      orderId: prismaRma.orderId,
      csSessionId: prismaRma.csSessionId,
      type: prismaRma.type as RMAType,
      status: prismaRma.status as RMAStatus,
      reason: prismaRma.reason as ReturnReason,
      reasonDetails: prismaRma.reasonDetails,
      items: prismaRma.items as RMAItem[],
      shipping: {
        labelType: prismaRma.labelType,
        carrier: prismaRma.carrier,
        trackingNumber: prismaRma.trackingNumber,
        trackingUrl: prismaRma.trackingUrl,
        labelUrl: prismaRma.labelUrl,
        labelSentAt: prismaRma.labelSentAt,
        shippedAt: prismaRma.shippedAt,
        deliveredAt: prismaRma.deliveredAt,
        returnAddress: prismaRma.returnAddress,
      },
      inspection: prismaRma.inspectionStatus ? {
        status: prismaRma.inspectionStatus,
        overallResult: prismaRma.inspectionResult as InspectionResult,
        notes: prismaRma.inspectionNotes,
      } : undefined,
      resolution: {
        type: prismaRma.resolutionType,
        status: prismaRma.resolutionStatus,
        ...(prismaRma.resolutionData || {}),
      },
      timeline: prismaRma.timeline as any[],
      metadata: {
        initiatedBy: prismaRma.initiatedBy,
        channel: prismaRma.channel,
        priority: prismaRma.priority,
        tags: prismaRma.tags,
      },
      createdAt: prismaRma.createdAt,
      updatedAt: prismaRma.updatedAt,
      expiresAt: prismaRma.expiresAt,
      completedAt: prismaRma.completedAt,
    };
  }

  /**
   * Get RMA policy for a company
   * Fetches from database or returns default policy
   */
  async getRMAPolicy(companyId: string): Promise<RMAPolicy> {
    const policy = await this.prisma.rMAPolicy.findUnique({
      where: { companyId },
    });

    if (policy) {
      return {
        companyId: policy.companyId,
        enabled: policy.enabled,
        generalRules: policy.generalRules as any,
        returnReasons: policy.returnReasons as any[],
        shippingConfig: policy.shippingConfig as any,
        inspectionConfig: policy.inspectionConfig as any,
        resolutionConfig: policy.resolutionConfig as any,
        notifications: policy.notifications as any,
        automation: policy.automation as any,
      };
    }

    // Return default policy if none exists
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

    // Fetch all RMAs in the date range
    const rmas = await this.prisma.rMA.findMany({
      where: {
        companyId: dto.companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Calculate overview stats
    const totalRMAs = rmas.length;
    const totalItems = rmas.reduce((sum, rma) => {
      const items = (rma.items as any[]) || [];
      return sum + items.length;
    }, 0);
    const totalValue = rmas.reduce((sum, rma) => {
      const items = (rma.items as any[]) || [];
      return sum + items.reduce((itemSum, item) => itemSum + (item.unitPrice || 0) * (item.quantity || 1), 0);
    }, 0);
    // Compare using string values since DB uses prefixed names (RMA_APPROVED vs APPROVED)
    const rejectedStatuses = ['REQUESTED', 'RMA_REJECTED', 'REJECTED', 'RMA_CANCELLED', 'CANCELLED'];
    const approvedRMAs = rmas.filter(r => !rejectedStatuses.includes(r.status));
    const approvalRate = totalRMAs > 0 ? (approvedRMAs.length / totalRMAs) * 100 : 0;

    // Calculate average processing time (in days)
    const completedStatuses = ['COMPLETED', 'RMA_COMPLETED'];
    const completedRMAs = rmas.filter(r => completedStatuses.includes(r.status) && r.completedAt);
    const avgProcessingTime = completedRMAs.length > 0
      ? completedRMAs.reduce((sum, r) => {
          const processingTime = (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return sum + processingTime;
        }, 0) / completedRMAs.length
      : 0;

    // Calculate return rate (RMAs / total orders in period)
    const totalOrders = await this.prisma.order.count({
      where: {
        companyId: dto.companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });
    const returnRate = totalOrders > 0 ? (totalRMAs / totalOrders) * 100 : 0;

    // Calculate by status
    const byStatus: Record<RMAStatus, { count: number; value: number }> = {} as any;
    for (const status of Object.values(RMAStatus)) {
      const statusRMAs = rmas.filter(r => r.status === status);
      const statusValue = statusRMAs.reduce((sum, rma) => {
        const items = (rma.items as any[]) || [];
        return sum + items.reduce((itemSum, item) => itemSum + (item.unitPrice || 0) * (item.quantity || 1), 0);
      }, 0);
      byStatus[status] = {
        count: statusRMAs.length,
        value: statusValue,
      };
    }

    // Calculate by type
    const byType: Record<RMAType, { count: number; value: number }> = {} as any;
    for (const type of Object.values(RMAType)) {
      const typeRMAs = rmas.filter(r => r.type === type);
      const typeValue = typeRMAs.reduce((sum, rma) => {
        const items = (rma.items as any[]) || [];
        return sum + items.reduce((itemSum, item) => itemSum + (item.unitPrice || 0) * (item.quantity || 1), 0);
      }, 0);
      byType[type] = {
        count: typeRMAs.length,
        value: typeValue,
      };
    }

    // Calculate by reason with trend
    const reasonStats = new Map<string, { count: number; value: number }>();
    for (const rma of rmas) {
      const reason = rma.reason;
      const current = reasonStats.get(reason) || { count: 0, value: 0 };
      const items = (rma.items as any[]) || [];
      const rmaValue = items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1), 0);
      reasonStats.set(reason, {
        count: current.count + 1,
        value: current.value + rmaValue,
      });
    }

    // Get previous period for trend calculation
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const prevRMAs = await this.prisma.rMA.findMany({
      where: {
        companyId: dto.companyId,
        createdAt: { gte: prevStartDate, lte: prevEndDate },
      },
    });

    const prevReasonStats = new Map<string, number>();
    for (const rma of prevRMAs) {
      const reason = rma.reason;
      prevReasonStats.set(reason, (prevReasonStats.get(reason) || 0) + 1);
    }

    const byReason = Array.from(reasonStats.entries()).map(([reason, data]) => {
      const prevCount = prevReasonStats.get(reason) || 0;
      const trend = prevCount > 0 ? ((data.count - prevCount) / prevCount) * 100 : 0;
      return {
        reason: reason as ReturnReason,
        count: data.count,
        value: data.value,
        avgValue: data.count > 0 ? data.value / data.count : 0,
        trend: Math.round(trend),
      };
    });

    // Calculate inspection stats
    const inspectedRMAs = rmas.filter(r => r.inspectionStatus === 'completed');
    const passedInspection = inspectedRMAs.filter(r =>
      r.inspectionResult === 'PASSED' || r.inspectionResult === 'PARTIAL'
    );
    const passRate = inspectedRMAs.length > 0 ? (passedInspection.length / inspectedRMAs.length) * 100 : 0;

    // Calculate inspection by condition and disposition from items
    const conditionCounts: Record<ItemCondition, number> = {} as any;
    const dispositionCounts: Record<DispositionAction, number> = {} as any;
    for (const condition of Object.values(ItemCondition)) {
      conditionCounts[condition] = 0;
    }
    for (const disposition of Object.values(DispositionAction)) {
      dispositionCounts[disposition] = 0;
    }

    for (const rma of rmas) {
      const items = (rma.items as any[]) || [];
      for (const item of items) {
        if (item.inspection?.condition) {
          conditionCounts[item.inspection.condition as ItemCondition]++;
        }
        if (item.disposition?.action) {
          dispositionCounts[item.disposition.action as DispositionAction]++;
        }
      }
    }

    // Calculate resolution stats
    const resolutionStats = new Map<string, { count: number; value: number }>();
    for (const rma of rmas) {
      const resolutionType = rma.resolutionType || 'refund';
      const current = resolutionStats.get(resolutionType) || { count: 0, value: 0 };
      const items = (rma.items as any[]) || [];
      const rmaValue = items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1), 0);
      resolutionStats.set(resolutionType, {
        count: current.count + 1,
        value: current.value + rmaValue,
      });
    }

    const resolutionByType = Array.from(resolutionStats.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      value: data.value,
    }));

    // Calculate shipping stats
    const shippedRMAs = rmas.filter(r => r.shippedAt && r.deliveredAt);
    const avgTransitTime = shippedRMAs.length > 0
      ? shippedRMAs.reduce((sum, r) => {
          const transitTime = (new Date(r.deliveredAt!).getTime() - new Date(r.shippedAt!).getTime()) / (1000 * 60 * 60 * 24);
          return sum + transitTime;
        }, 0) / shippedRMAs.length
      : 0;

    const prepaidLabelsIssued = rmas.filter(r => r.labelType === 'prepaid').length;

    // Calculate daily trends
    const trends: { date: string; rmaCount: number; itemCount: number; value: number }[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRMAs = rmas.filter(r => {
        const created = new Date(r.createdAt);
        return created >= currentDate && created < nextDate;
      });

      const dayItems = dayRMAs.reduce((sum, rma) => {
        const items = (rma.items as any[]) || [];
        return sum + items.length;
      }, 0);

      const dayValue = dayRMAs.reduce((sum, rma) => {
        const items = (rma.items as any[]) || [];
        return sum + items.reduce((itemSum, item) => itemSum + (item.unitPrice || 0) * (item.quantity || 1), 0);
      }, 0);

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        rmaCount: dayRMAs.length,
        itemCount: dayItems,
        value: dayValue,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate top returned products
    const productReturnStats = new Map<string, {
      productId: string;
      productName: string;
      count: number;
      reasons: Map<string, number>;
    }>();

    for (const rma of rmas) {
      const items = (rma.items as any[]) || [];
      for (const item of items) {
        const productId = item.productId || item.sku || 'unknown';
        const current = productReturnStats.get(productId) || {
          productId,
          productName: item.productName || item.sku || 'Unknown Product',
          count: 0,
          reasons: new Map<string, number>(),
        };
        current.count += item.quantity || 1;
        const reason = item.reason || rma.reason;
        current.reasons.set(reason, (current.reasons.get(reason) || 0) + 1);
        productReturnStats.set(productId, current);
      }
    }

    const topReturnedProducts = Array.from(productReturnStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(p => {
        const topReasons = Array.from(p.reasons.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([reason]) => reason as ReturnReason);
        return {
          productId: p.productId,
          productName: p.productName,
          returnCount: p.count,
          returnRate: 0, // Would need total orders per product to calculate
          topReasons,
        };
      });

    // Calculate quality insights
    const defectiveRMAs = rmas.filter(r => r.reason === ReturnReason.DEFECTIVE);
    const defectRate = totalRMAs > 0 ? (defectiveRMAs.length / totalRMAs) * 100 : 0;

    // Extract defect categories from reason details
    const defectCategories = new Map<string, number>();
    for (const rma of defectiveRMAs) {
      if (rma.reasonDetails) {
        defectCategories.set(rma.reasonDetails, (defectCategories.get(rma.reasonDetails) || 0) + 1);
      }
    }
    const topDefectCategories = Array.from(defectCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalRMAs,
        totalItems,
        totalValue,
        approvalRate,
        avgProcessingTime,
        returnRate,
      },
      byStatus,
      byType,
      byReason,
      inspection: {
        totalInspected: inspectedRMAs.length,
        passRate,
        avgInspectionTime: 0, // Would need inspection start/end timestamps
        byCondition: conditionCounts,
        byDisposition: dispositionCounts,
      },
      resolution: {
        byType: resolutionByType,
        avgResolutionTime: avgProcessingTime,
        customerSatisfaction: 0, // Would need separate survey data
      },
      shipping: {
        avgTransitTime,
        lostPackages: 0, // Would need separate tracking
        prepaidLabelsIssued,
        shippingCostTotal: 0, // Would need cost data
      },
      trends,
      topReturnedProducts,
      qualityInsights: {
        defectRate,
        topDefectCategories: topDefectCategories.length > 0 ? topDefectCategories : ['No defects reported'],
        vendorIssues: [], // Would need vendor data
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
