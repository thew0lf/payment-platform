/**
 * Subscription AI Actions Service
 *
 * Handles AI-driven actions for subscription management:
 * - Automated lifecycle decisions
 * - Smart recommendations
 * - Predictive actions
 * - Voice/chat AI integration
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Subscription,
  SubscriptionStatus,
  Customer,
  Prisma,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export enum AIActionType {
  // Lifecycle Actions
  PAUSE_SUBSCRIPTION = 'PAUSE_SUBSCRIPTION',
  RESUME_SUBSCRIPTION = 'RESUME_SUBSCRIPTION',
  CANCEL_SUBSCRIPTION = 'CANCEL_SUBSCRIPTION',
  SKIP_SHIPMENT = 'SKIP_SHIPMENT',

  // Modification Actions
  CHANGE_FREQUENCY = 'CHANGE_FREQUENCY',
  CHANGE_QUANTITY = 'CHANGE_QUANTITY',
  CHANGE_PLAN = 'CHANGE_PLAN',
  SWAP_PRODUCT = 'SWAP_PRODUCT',
  UPDATE_SHIPPING = 'UPDATE_SHIPPING',
  UPDATE_PAYMENT = 'UPDATE_PAYMENT',

  // Scheduling Actions
  CHANGE_BILLING_DATE = 'CHANGE_BILLING_DATE',
  EXPEDITE_SHIPMENT = 'EXPEDITE_SHIPMENT',
  DELAY_SHIPMENT = 'DELAY_SHIPMENT',

  // Retention Actions
  APPLY_DISCOUNT = 'APPLY_DISCOUNT',
  OFFER_DOWNGRADE = 'OFFER_DOWNGRADE',
  EXTEND_TRIAL = 'EXTEND_TRIAL',

  // Information Actions
  GET_STATUS = 'GET_STATUS',
  GET_NEXT_SHIPMENT = 'GET_NEXT_SHIPMENT',
  GET_BILLING_INFO = 'GET_BILLING_INFO',
  GET_ORDER_HISTORY = 'GET_ORDER_HISTORY',
}

export enum AIActionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
  REQUIRES_CONFIRMATION = 'REQUIRES_CONFIRMATION',
}

export enum AIActionSource {
  VOICE_AI = 'VOICE_AI',
  CHAT_AI = 'CHAT_AI',
  EMAIL_AI = 'EMAIL_AI',
  AUTOMATED = 'AUTOMATED',
  PREDICTIVE = 'PREDICTIVE',
}

export interface AIActionRequest {
  id: string;
  companyId: string;
  customerId: string;
  subscriptionId?: string;
  actionType: AIActionType;
  source: AIActionSource;
  status: AIActionStatus;

  // Request details
  parameters: Record<string, unknown>;
  customerIntent?: string;
  confidenceScore?: number;

  // Execution
  executedAt?: Date;
  result?: Record<string, unknown>;
  errorMessage?: string;

  // Audit
  requestedAt: Date;
  sessionId?: string;
  agentId?: string;
}

export interface ProcessActionDto {
  companyId: string;
  customerId: string;
  subscriptionId?: string;
  actionType: AIActionType;
  parameters: Record<string, unknown>;
  source: AIActionSource;
  customerIntent?: string;
  sessionId?: string;
  agentId?: string;
  autoExecute?: boolean;
}

export interface ActionResult {
  actionId: string;
  status: AIActionStatus;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}

export interface AICapability {
  actionType: AIActionType;
  description: string;
  requiredPermissions: string[];
  requiresConfirmation: boolean;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

export interface CustomerContext {
  customer: {
    id: string;
    name: string;
    email: string;
    totalOrders: number;
    lifetimeValue: number;
    riskLevel: string;
  };
  subscriptions: Array<{
    id: string;
    planName: string;
    status: string;
    nextBillingDate: Date | null;
    currentPrice: number;
  }>;
  recentActions: Array<{
    type: string;
    date: Date;
    result: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionAIActionsService {
  private readonly logger = new Logger(SubscriptionAIActionsService.name);

  // In-memory storage for action requests
  private actionRequests: Map<string, AIActionRequest> = new Map();

  // Action configurations
  private actionConfigs: Map<AIActionType, AICapability> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeActionConfigs();
  }

  private initializeActionConfigs(): void {
    const configs: AICapability[] = [
      {
        actionType: AIActionType.PAUSE_SUBSCRIPTION,
        description: 'Pause a subscription temporarily',
        requiredPermissions: ['subscription:write'],
        requiresConfirmation: true,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: true, description: 'Subscription ID' },
          { name: 'pauseDays', type: 'number', required: false, description: 'Number of days to pause' },
          { name: 'reason', type: 'string', required: false, description: 'Reason for pausing' },
        ],
      },
      {
        actionType: AIActionType.RESUME_SUBSCRIPTION,
        description: 'Resume a paused subscription',
        requiredPermissions: ['subscription:write'],
        requiresConfirmation: false,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: true, description: 'Subscription ID' },
        ],
      },
      {
        actionType: AIActionType.SKIP_SHIPMENT,
        description: 'Skip the next shipment',
        requiredPermissions: ['subscription:write'],
        requiresConfirmation: true,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: true, description: 'Subscription ID' },
          { name: 'cycles', type: 'number', required: false, description: 'Number of cycles to skip' },
        ],
      },
      {
        actionType: AIActionType.CHANGE_FREQUENCY,
        description: 'Change subscription billing frequency',
        requiredPermissions: ['subscription:write'],
        requiresConfirmation: true,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: true, description: 'Subscription ID' },
          { name: 'newFrequency', type: 'string', required: true, description: 'New frequency (WEEKLY, BIWEEKLY, MONTHLY, etc.)' },
        ],
      },
      {
        actionType: AIActionType.CHANGE_QUANTITY,
        description: 'Change subscription quantity',
        requiredPermissions: ['subscription:write'],
        requiresConfirmation: true,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: true, description: 'Subscription ID' },
          { name: 'newQuantity', type: 'number', required: true, description: 'New quantity' },
        ],
      },
      {
        actionType: AIActionType.APPLY_DISCOUNT,
        description: 'Apply a discount to subscription',
        requiredPermissions: ['subscription:write', 'discount:apply'],
        requiresConfirmation: true,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: true, description: 'Subscription ID' },
          { name: 'discountPct', type: 'number', required: true, description: 'Discount percentage' },
          { name: 'durationCycles', type: 'number', required: false, description: 'Number of cycles' },
        ],
      },
      {
        actionType: AIActionType.GET_STATUS,
        description: 'Get subscription status and details',
        requiredPermissions: ['subscription:read'],
        requiresConfirmation: false,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: false, description: 'Subscription ID' },
        ],
      },
      {
        actionType: AIActionType.GET_NEXT_SHIPMENT,
        description: 'Get next shipment information',
        requiredPermissions: ['subscription:read'],
        requiresConfirmation: false,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: false, description: 'Subscription ID' },
        ],
      },
      {
        actionType: AIActionType.CANCEL_SUBSCRIPTION,
        description: 'Cancel a subscription',
        requiredPermissions: ['subscription:write', 'subscription:cancel'],
        requiresConfirmation: true,
        parameters: [
          { name: 'subscriptionId', type: 'string', required: true, description: 'Subscription ID' },
          { name: 'reason', type: 'string', required: false, description: 'Cancellation reason' },
          { name: 'immediate', type: 'boolean', required: false, description: 'Cancel immediately' },
        ],
      },
    ];

    for (const config of configs) {
      this.actionConfigs.set(config.actionType, config);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTION PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Process an AI action request
   */
  async processAction(dto: ProcessActionDto): Promise<ActionResult> {
    // Create action request
    const actionRequest: AIActionRequest = {
      id: this.generateActionId(),
      companyId: dto.companyId,
      customerId: dto.customerId,
      subscriptionId: dto.subscriptionId,
      actionType: dto.actionType,
      source: dto.source,
      status: AIActionStatus.PENDING,
      parameters: dto.parameters,
      customerIntent: dto.customerIntent,
      requestedAt: new Date(),
      sessionId: dto.sessionId,
      agentId: dto.agentId,
    };

    this.actionRequests.set(actionRequest.id, actionRequest);

    // Get action config
    const config = this.actionConfigs.get(dto.actionType);

    if (!config) {
      actionRequest.status = AIActionStatus.REJECTED;
      actionRequest.errorMessage = 'Unknown action type';
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.REJECTED,
        success: false,
        message: 'Unknown action type',
      };
    }

    // Check if confirmation required
    if (config.requiresConfirmation && !dto.autoExecute) {
      actionRequest.status = AIActionStatus.REQUIRES_CONFIRMATION;
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.REQUIRES_CONFIRMATION,
        success: true,
        message: 'Action requires confirmation',
        requiresConfirmation: true,
        confirmationPrompt: this.generateConfirmationPrompt(dto.actionType, dto.parameters),
      };
    }

    // Execute action
    return this.executeAction(actionRequest);
  }

  /**
   * Confirm and execute a pending action
   */
  async confirmAction(actionId: string): Promise<ActionResult> {
    const actionRequest = this.actionRequests.get(actionId);

    if (!actionRequest) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    if (actionRequest.status !== AIActionStatus.REQUIRES_CONFIRMATION) {
      throw new BadRequestException('Action does not require confirmation');
    }

    actionRequest.status = AIActionStatus.APPROVED;
    return this.executeAction(actionRequest);
  }

  /**
   * Execute an approved action
   */
  private async executeAction(actionRequest: AIActionRequest): Promise<ActionResult> {
    try {
      let result: ActionResult;

      switch (actionRequest.actionType) {
        case AIActionType.GET_STATUS:
          result = await this.executeGetStatus(actionRequest);
          break;

        case AIActionType.GET_NEXT_SHIPMENT:
          result = await this.executeGetNextShipment(actionRequest);
          break;

        case AIActionType.PAUSE_SUBSCRIPTION:
          result = await this.executePauseSubscription(actionRequest);
          break;

        case AIActionType.RESUME_SUBSCRIPTION:
          result = await this.executeResumeSubscription(actionRequest);
          break;

        case AIActionType.SKIP_SHIPMENT:
          result = await this.executeSkipShipment(actionRequest);
          break;

        case AIActionType.CHANGE_QUANTITY:
          result = await this.executeChangeQuantity(actionRequest);
          break;

        case AIActionType.APPLY_DISCOUNT:
          result = await this.executeApplyDiscount(actionRequest);
          break;

        case AIActionType.CANCEL_SUBSCRIPTION:
          result = await this.executeCancelSubscription(actionRequest);
          break;

        default:
          result = {
            actionId: actionRequest.id,
            status: AIActionStatus.FAILED,
            success: false,
            message: `Action type ${actionRequest.actionType} not implemented`,
          };
      }

      // Update action request
      actionRequest.status = result.success ? AIActionStatus.EXECUTED : AIActionStatus.FAILED;
      actionRequest.executedAt = new Date();
      actionRequest.result = result.data;
      if (!result.success) {
        actionRequest.errorMessage = result.message;
      }
      this.actionRequests.set(actionRequest.id, actionRequest);

      // Emit event
      this.eventEmitter.emit('subscription.ai_action.executed', {
        actionId: actionRequest.id,
        actionType: actionRequest.actionType,
        success: result.success,
        source: actionRequest.source,
      });

      return result;
    } catch (error) {
      actionRequest.status = AIActionStatus.FAILED;
      actionRequest.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.actionRequests.set(actionRequest.id, actionRequest);

      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: actionRequest.errorMessage,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTION IMPLEMENTATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async executeGetStatus(actionRequest: AIActionRequest): Promise<ActionResult> {
    const { customerId, subscriptionId } = actionRequest;

    const where: Prisma.SubscriptionWhereInput = {
      customerId,
      deletedAt: null,
    };

    if (subscriptionId) {
      where.id = subscriptionId;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        subscriptionPlan: true,
        items: { include: { product: true } },
      },
    });

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: `Found ${subscriptions.length} subscription(s)`,
      data: {
        subscriptions: subscriptions.map((sub) => ({
          id: sub.id,
          planName: sub.subscriptionPlan?.name || sub.planName,
          status: sub.status,
          currentPrice: Number(sub.planAmount),
          nextBillingDate: sub.nextBillingDate,
          items: sub.items.map((item) => ({
            product: item.product.name,
            quantity: item.quantity,
          })),
        })),
      },
    };
  }

  private async executeGetNextShipment(actionRequest: AIActionRequest): Promise<ActionResult> {
    const { customerId, subscriptionId } = actionRequest;

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId || undefined,
        customerId,
        status: SubscriptionStatus.ACTIVE,
        deletedAt: null,
      },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.EXECUTED,
        success: true,
        message: 'No active subscription found',
        data: { hasNextShipment: false },
      };
    }

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: 'Next shipment information retrieved',
      data: {
        hasNextShipment: true,
        nextBillingDate: subscription.nextBillingDate,
        planName: subscription.subscriptionPlan?.name || subscription.planName,
        shippingAddressId: subscription.shippingAddressId,
      },
    };
  }

  private async executePauseSubscription(actionRequest: AIActionRequest): Promise<ActionResult> {
    const subscriptionId = actionRequest.parameters.subscriptionId as string;
    const pauseDays = (actionRequest.parameters.pauseDays as number) || 30;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: 'Subscription not found',
      };
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: `Cannot pause subscription in ${subscription.status} status`,
      };
    }

    const resumeDate = new Date();
    resumeDate.setDate(resumeDate.getDate() + pauseDays);

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: new Date(),
        pauseResumeAt: resumeDate,
      },
    });

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: `Subscription paused for ${pauseDays} days`,
      data: {
        subscriptionId,
        pausedUntil: resumeDate,
      },
    };
  }

  private async executeResumeSubscription(actionRequest: AIActionRequest): Promise<ActionResult> {
    const subscriptionId = actionRequest.parameters.subscriptionId as string;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: 'Subscription not found',
      };
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: 'Subscription is not paused',
      };
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
        pauseResumeAt: null,
        metadata: {
          ...((subscription.metadata as object) || {}),
          resumedAt: new Date().toISOString(),
        },
      },
    });

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: 'Subscription resumed',
      data: { subscriptionId },
    };
  }

  private async executeSkipShipment(actionRequest: AIActionRequest): Promise<ActionResult> {
    const subscriptionId = actionRequest.parameters.subscriptionId as string;
    const cycles = (actionRequest.parameters.cycles as number) || 1;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: 'Subscription not found',
      };
    }

    // Increment skip counter via skipCount field
    const newSkipCount = (subscription.skipCount || 0) + cycles;

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        skipNextBilling: true,
        skipCount: newSkipCount,
        lastSkipAt: new Date(),
        // Advance next billing date
        nextBillingDate: this.calculateNextBillingDate(subscription, cycles),
      },
    });

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: `Skipped ${cycles} shipment(s)`,
      data: { subscriptionId, cyclesSkipped: cycles },
    };
  }

  private async executeChangeQuantity(actionRequest: AIActionRequest): Promise<ActionResult> {
    const subscriptionId = actionRequest.parameters.subscriptionId as string;
    const newQuantity = actionRequest.parameters.newQuantity as number;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: 'Subscription not found',
      };
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { quantity: newQuantity },
    });

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: `Quantity changed to ${newQuantity}`,
      data: { subscriptionId, newQuantity },
    };
  }

  private async executeApplyDiscount(actionRequest: AIActionRequest): Promise<ActionResult> {
    const subscriptionId = actionRequest.parameters.subscriptionId as string;
    const discountPct = actionRequest.parameters.discountPct as number;
    const durationCycles = (actionRequest.parameters.durationCycles as number) || 1;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: 'Subscription not found',
      };
    }

    const metadata = (subscription.metadata as Record<string, unknown>) || {};

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        metadata: {
          ...metadata,
          aiDiscount: {
            percentage: discountPct,
            remainingCycles: durationCycles,
            appliedAt: new Date().toISOString(),
            source: actionRequest.source,
          },
        },
      },
    });

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: `${discountPct}% discount applied for ${durationCycles} cycle(s)`,
      data: { subscriptionId, discountPct, durationCycles },
    };
  }

  private async executeCancelSubscription(actionRequest: AIActionRequest): Promise<ActionResult> {
    const subscriptionId = actionRequest.parameters.subscriptionId as string;
    const reason = actionRequest.parameters.reason as string;
    const immediate = actionRequest.parameters.immediate as boolean;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return {
        actionId: actionRequest.id,
        status: AIActionStatus.FAILED,
        success: false,
        message: 'Subscription not found',
      };
    }

    if (immediate) {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason: reason,
          cancelSource: 'ai_churn',
        },
      });
    } else {
      // Cancel at end of period - store in metadata
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelReason: reason,
          cancelSource: 'ai_churn',
          metadata: {
            ...((subscription.metadata as object) || {}),
            scheduledCancellationDate: subscription.currentPeriodEnd?.toISOString(),
          },
        },
      });
    }

    return {
      actionId: actionRequest.id,
      status: AIActionStatus.EXECUTED,
      success: true,
      message: immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at end of period',
      data: {
        subscriptionId,
        cancellationDate: immediate ? new Date() : subscription.currentPeriodEnd,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CUSTOMER CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get customer context for AI agent
   */
  async getCustomerContext(customerId: string): Promise<CustomerContext> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Get subscriptions
    const subscriptions = await this.prisma.subscription.findMany({
      where: { customerId, deletedAt: null },
      include: { subscriptionPlan: true },
    });

    // Get recent orders for metrics
    const recentOrders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const lifetimeValue = recentOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    // Get recent AI actions
    const recentActions = Array.from(this.actionRequests.values())
      .filter((a) => a.customerId === customerId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .slice(0, 5)
      .map((a) => ({
        type: a.actionType,
        date: a.requestedAt,
        result: a.status,
      }));

    return {
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        totalOrders: recentOrders.length,
        lifetimeValue,
        riskLevel: this.calculateRiskLevel(subscriptions, recentOrders.length),
      },
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        planName: sub.subscriptionPlan?.name || sub.planName,
        status: sub.status,
        nextBillingDate: sub.nextBillingDate,
        currentPrice: Number(sub.planAmount),
      })),
      recentActions,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get available AI capabilities
   */
  getCapabilities(): AICapability[] {
    return Array.from(this.actionConfigs.values());
  }

  /**
   * Get capability for specific action
   */
  getCapability(actionType: AIActionType): AICapability | null {
    return this.actionConfigs.get(actionType) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTION HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get action history for customer
   */
  async getActionHistory(
    customerId: string,
    limit: number = 20,
  ): Promise<AIActionRequest[]> {
    return Array.from(this.actionRequests.values())
      .filter((a) => a.customerId === customerId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get action by ID
   */
  async getAction(actionId: string): Promise<AIActionRequest | null> {
    return this.actionRequests.get(actionId) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConfirmationPrompt(
    actionType: AIActionType,
    parameters: Record<string, unknown>,
  ): string {
    const prompts: Record<AIActionType, string> = {
      [AIActionType.PAUSE_SUBSCRIPTION]: `Are you sure you want to pause your subscription for ${parameters.pauseDays || 30} days?`,
      [AIActionType.CANCEL_SUBSCRIPTION]: 'Are you sure you want to cancel your subscription? This action cannot be undone.',
      [AIActionType.SKIP_SHIPMENT]: `Are you sure you want to skip the next ${parameters.cycles || 1} shipment(s)?`,
      [AIActionType.CHANGE_FREQUENCY]: `Would you like to change your delivery frequency to ${parameters.newFrequency}?`,
      [AIActionType.CHANGE_QUANTITY]: `Would you like to change your quantity to ${parameters.newQuantity}?`,
      [AIActionType.APPLY_DISCOUNT]: `We can offer you a ${parameters.discountPct}% discount. Would you like to apply it?`,
      [AIActionType.RESUME_SUBSCRIPTION]: 'Would you like to resume your subscription?',
      [AIActionType.CHANGE_PLAN]: `Would you like to change to the ${parameters.planName} plan?`,
      [AIActionType.SWAP_PRODUCT]: 'Would you like to swap this product?',
      [AIActionType.UPDATE_SHIPPING]: 'Would you like to update your shipping address?',
      [AIActionType.UPDATE_PAYMENT]: 'Would you like to update your payment method?',
      [AIActionType.CHANGE_BILLING_DATE]: `Would you like to change your billing date to ${parameters.newDate}?`,
      [AIActionType.EXPEDITE_SHIPMENT]: 'Would you like to expedite your next shipment?',
      [AIActionType.DELAY_SHIPMENT]: 'Would you like to delay your next shipment?',
      [AIActionType.OFFER_DOWNGRADE]: 'Would you like to switch to a more affordable plan?',
      [AIActionType.EXTEND_TRIAL]: 'Would you like to extend your trial period?',
      [AIActionType.GET_STATUS]: '',
      [AIActionType.GET_NEXT_SHIPMENT]: '',
      [AIActionType.GET_BILLING_INFO]: '',
      [AIActionType.GET_ORDER_HISTORY]: '',
    };

    return prompts[actionType] || 'Please confirm this action.';
  }

  private calculateNextBillingDate(subscription: Subscription, skipCycles: number): Date {
    const current = subscription.nextBillingDate || new Date();
    const next = new Date(current);

    // Simple monthly skip - would use actual frequency in production
    next.setMonth(next.getMonth() + skipCycles);

    return next;
  }

  private calculateRiskLevel(subscriptions: Subscription[], orderCount: number): string {
    if (subscriptions.length === 0) return 'NEW';
    if (orderCount < 2) return 'NEW';

    const hasActive = subscriptions.some((s) => s.status === SubscriptionStatus.ACTIVE);
    const hasPaused = subscriptions.some((s) => s.status === SubscriptionStatus.PAUSED);
    const hasCanceled = subscriptions.some((s) => s.status === SubscriptionStatus.CANCELED);

    if (hasCanceled && !hasActive) return 'HIGH';
    if (hasPaused) return 'MEDIUM';
    if (hasActive && orderCount > 5) return 'LOW';

    return 'MEDIUM';
  }
}
