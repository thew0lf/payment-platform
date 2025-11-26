import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryService } from './delivery.service';
import {
  Automation,
  AutomationEnrollment,
  AutomationStep,
  AutomationStepType,
  AutomationTriggerType,
  CreateAutomationDto,
  EnrollCustomerDto,
  DeliveryChannel,
} from '../types/delivery.types';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly deliveryService: DeliveryService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // AUTOMATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async createAutomation(dto: CreateAutomationDto): Promise<Automation> {
    this.logger.log(`Creating automation: ${dto.name}`);

    // Add IDs to steps
    const stepsWithIds = dto.steps.map((step, index) => ({
      ...step,
      id: `step_${index}_${Date.now()}`,
    }));

    const automation = await this.prisma.automation.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        status: 'DRAFT',
        trigger: dto.trigger as any,
        steps: stepsWithIds as any,
        settings: dto.settings || {
          allowReentry: false,
          exitOnConversion: true,
          respectQuietHours: true,
        },
        enrollmentCount: 0,
        completionCount: 0,
        conversionCount: 0,
      },
    });

    return this.mapToAutomation(automation);
  }

  async getAutomation(automationId: string): Promise<Automation | null> {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) return null;

    return this.mapToAutomation(automation);
  }

  async getAutomations(
    companyId: string,
    options?: {
      status?: string;
      category?: string;
    },
  ): Promise<Automation[]> {
    const automations = await this.prisma.automation.findMany({
      where: {
        companyId,
        ...(options?.status && { status: options.status }),
        ...(options?.category && { category: options.category }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return automations.map((a) => this.mapToAutomation(a));
  }

  async updateAutomation(
    automationId: string,
    updates: Partial<CreateAutomationDto>,
  ): Promise<Automation> {
    const automation = await this.prisma.automation.update({
      where: { id: automationId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && {
          description: updates.description,
        }),
        ...(updates.category && { category: updates.category }),
        ...(updates.trigger && { trigger: updates.trigger as any }),
        ...(updates.steps && {
          steps: updates.steps.map((step, index) => ({
            ...step,
            id: (step as any).id || `step_${index}_${Date.now()}`,
          })) as any,
        }),
        ...(updates.settings && { settings: updates.settings }),
      },
    });

    return this.mapToAutomation(automation);
  }

  async activateAutomation(automationId: string): Promise<Automation> {
    const automation = await this.prisma.automation.update({
      where: { id: automationId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    this.logger.log(`Automation ${automationId} activated`);

    return this.mapToAutomation(automation);
  }

  async pauseAutomation(automationId: string): Promise<Automation> {
    const automation = await this.prisma.automation.update({
      where: { id: automationId },
      data: { status: 'PAUSED' },
    });

    this.logger.log(`Automation ${automationId} paused`);

    return this.mapToAutomation(automation);
  }

  async archiveAutomation(automationId: string): Promise<void> {
    await this.prisma.automation.update({
      where: { id: automationId },
      data: { status: 'ARCHIVED' },
    });

    this.logger.log(`Automation ${automationId} archived`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENROLLMENT
  // ═══════════════════════════════════════════════════════════════

  async enrollCustomer(dto: EnrollCustomerDto): Promise<AutomationEnrollment> {
    this.logger.log(
      `Enrolling customer ${dto.customerId} in automation ${dto.automationId}`,
    );

    const automation = await this.prisma.automation.findUnique({
      where: { id: dto.automationId },
    });

    if (!automation) {
      throw new NotFoundException(
        `Automation ${dto.automationId} not found`,
      );
    }

    if (automation.status !== 'ACTIVE') {
      throw new Error('Cannot enroll in inactive automation');
    }

    const settings = automation.settings as any;

    // Check if customer is already enrolled
    const existingEnrollment = await this.prisma.automationEnrollment.findFirst(
      {
        where: {
          automationId: dto.automationId,
          customerId: dto.customerId,
          status: 'ACTIVE',
        },
      },
    );

    if (existingEnrollment) {
      if (!settings.allowReentry) {
        throw new Error('Customer already enrolled in this automation');
      }
      // Check reentry delay
      if (settings.reentryDelay) {
        const lastEnrollment =
          await this.prisma.automationEnrollment.findFirst({
            where: {
              automationId: dto.automationId,
              customerId: dto.customerId,
            },
            orderBy: { enrolledAt: 'desc' },
          });

        if (lastEnrollment) {
          const hoursSinceLastEnrollment =
            (Date.now() - lastEnrollment.enrolledAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastEnrollment < settings.reentryDelay) {
            throw new Error('Reentry delay not met');
          }
        }
      }
    }

    // Get first step
    const steps = automation.steps as any as AutomationStep[];
    const firstStep = steps.find((s) => s.order === 0) || steps[0];

    const enrollment = await this.prisma.automationEnrollment.create({
      data: {
        automationId: dto.automationId,
        customerId: dto.customerId,
        status: 'ACTIVE',
        currentStepId: firstStep.id,
        currentStepStartedAt: new Date(),
        stepsCompleted: [],
        messagesSent: [],
        triggerData: (dto.triggerData || {}) as any,
      },
    });

    // Increment enrollment count
    await this.prisma.automation.update({
      where: { id: dto.automationId },
      data: { enrollmentCount: { increment: 1 } },
    });

    this.eventEmitter.emit('automation.enrolled', {
      enrollmentId: enrollment.id,
      automationId: dto.automationId,
      customerId: dto.customerId,
    });

    // Process first step immediately
    await this.processEnrollmentStep(enrollment.id);

    return this.mapToEnrollment(enrollment);
  }

  async exitEnrollment(
    enrollmentId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'EXITED',
        exitedAt: new Date(),
        exitReason: reason,
      },
    });

    this.logger.log(`Enrollment ${enrollmentId} exited: ${reason}`);
  }

  async getEnrollment(
    enrollmentId: string,
  ): Promise<AutomationEnrollment | null> {
    const enrollment = await this.prisma.automationEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) return null;

    return this.mapToEnrollment(enrollment);
  }

  async getCustomerEnrollments(
    customerId: string,
  ): Promise<AutomationEnrollment[]> {
    const enrollments = await this.prisma.automationEnrollment.findMany({
      where: { customerId },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((e) => this.mapToEnrollment(e));
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP PROCESSING
  // ═══════════════════════════════════════════════════════════════

  private async processEnrollmentStep(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.automationEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { automation: true },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') return;

    const automation = enrollment.automation;
    const steps = automation.steps as any as AutomationStep[];
    const currentStep = steps.find((s) => s.id === enrollment.currentStepId);

    if (!currentStep) {
      await this.completeEnrollment(enrollmentId);
      return;
    }

    this.logger.log(
      `Processing step ${currentStep.id} (${currentStep.type}) for enrollment ${enrollmentId}`,
    );

    try {
      const nextStepId = await this.executeStep(
        enrollment.id,
        enrollment.customerId,
        automation.companyId,
        currentStep,
        enrollment.triggerData as any,
      );

      if (nextStepId) {
        // Move to next step
        await this.prisma.automationEnrollment.update({
          where: { id: enrollmentId },
          data: {
            currentStepId: nextStepId,
            currentStepStartedAt: new Date(),
            stepsCompleted: { push: currentStep.id },
          },
        });

        // Check if next step is a wait step or should execute immediately
        const nextStep = steps.find((s) => s.id === nextStepId);
        if (nextStep && nextStep.type !== AutomationStepType.WAIT) {
          await this.processEnrollmentStep(enrollmentId);
        }
      } else {
        // No next step, complete enrollment
        await this.completeEnrollment(enrollmentId);
      }
    } catch (error) {
      this.logger.error(
        `Error processing step ${currentStep.id} for enrollment ${enrollmentId}`,
        error,
      );

      await this.prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'FAILED',
          exitReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async executeStep(
    enrollmentId: string,
    customerId: string,
    companyId: string,
    step: AutomationStep,
    triggerData: Record<string, unknown>,
  ): Promise<string | null> {
    switch (step.type) {
      case AutomationStepType.SEND_EMAIL:
        await this.executeSendStep(
          enrollmentId,
          customerId,
          companyId,
          step,
          DeliveryChannel.EMAIL,
        );
        break;

      case AutomationStepType.SEND_SMS:
        await this.executeSendStep(
          enrollmentId,
          customerId,
          companyId,
          step,
          DeliveryChannel.SMS,
        );
        break;

      case AutomationStepType.SEND_PUSH:
        await this.executeSendStep(
          enrollmentId,
          customerId,
          companyId,
          step,
          DeliveryChannel.PUSH_NOTIFICATION,
        );
        break;

      case AutomationStepType.SEND_IN_APP:
        await this.executeSendStep(
          enrollmentId,
          customerId,
          companyId,
          step,
          DeliveryChannel.IN_APP,
        );
        break;

      case AutomationStepType.WAIT:
        // Schedule next step processing
        const waitDuration = this.calculateWaitDuration(step.config);
        await this.scheduleStepProcessing(enrollmentId, waitDuration);
        return null; // Don't proceed immediately

      case AutomationStepType.CONDITION:
        return await this.evaluateCondition(
          customerId,
          step,
          triggerData,
        );

      case AutomationStepType.SPLIT:
        return await this.executeSplit(step);

      case AutomationStepType.WEBHOOK:
        await this.executeWebhook(step, customerId, triggerData);
        break;

      case AutomationStepType.ADD_TAG:
        await this.addCustomerTag(customerId, step.config.tagName!);
        break;

      case AutomationStepType.REMOVE_TAG:
        await this.removeCustomerTag(customerId, step.config.tagName!);
        break;

      case AutomationStepType.GOAL:
        // Goals are evaluated during scheduled processing
        await this.scheduleGoalCheck(enrollmentId, step);
        return null;

      case AutomationStepType.END:
        return null;

      default:
        this.logger.warn(`Unknown step type: ${step.type}`);
    }

    // Get next step
    if (step.nextSteps && step.nextSteps.length > 0) {
      const defaultNext = step.nextSteps.find(
        (n) => n.condition === 'default',
      );
      return defaultNext?.nextStepId || null;
    }

    return null;
  }

  private async executeSendStep(
    enrollmentId: string,
    customerId: string,
    companyId: string,
    step: AutomationStep,
    channel: DeliveryChannel,
  ): Promise<void> {
    const message = await this.deliveryService.sendMessage({
      companyId,
      customerId,
      channel,
      templateId: step.config.templateId,
      subject: step.config.subject,
      body: step.config.body || '',
      category: 'automation',
      automationId: enrollmentId,
      automationStepId: step.id,
    });

    await this.prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: {
        messagesSent: { push: message.id },
      },
    });
  }

  private calculateWaitDuration(config: AutomationStep['config']): number {
    const duration = config.waitDuration || 1;
    const unit = config.waitUnit || 'hours';

    switch (unit) {
      case 'minutes':
        return duration * 60 * 1000;
      case 'hours':
        return duration * 60 * 60 * 1000;
      case 'days':
        return duration * 24 * 60 * 60 * 1000;
      default:
        return duration * 60 * 60 * 1000;
    }
  }

  private async scheduleStepProcessing(
    enrollmentId: string,
    delayMs: number,
  ): Promise<void> {
    // In production, use a proper job queue like BullMQ
    // For now, we'll use a simple timeout (not recommended for production)
    setTimeout(() => {
      this.processEnrollmentStep(enrollmentId);
    }, Math.min(delayMs, 2147483647)); // Max setTimeout value
  }

  private async evaluateCondition(
    customerId: string,
    step: AutomationStep,
    triggerData: Record<string, unknown>,
  ): Promise<string | null> {
    const conditions = step.config.conditions || [];
    let passed = true;

    for (const condition of conditions) {
      const value = await this.getFieldValue(
        customerId,
        condition.field,
        triggerData,
      );
      const conditionPassed = this.evaluateFieldCondition(
        value,
        condition.operator,
        condition.value,
      );

      if (!conditionPassed) {
        passed = false;
        break;
      }
    }

    // Find next step based on condition result
    const nextSteps = step.nextSteps || [];
    const matchingNext = nextSteps.find(
      (n) => n.condition === (passed ? 'yes' : 'no'),
    );
    return matchingNext?.nextStepId || null;
  }

  private async getFieldValue(
    customerId: string,
    field: string,
    triggerData: Record<string, unknown>,
  ): Promise<unknown> {
    if (field.startsWith('trigger.')) {
      return triggerData[field.replace('trigger.', '')];
    }

    if (field.startsWith('customer.')) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      return customer?.[field.replace('customer.', '') as keyof typeof customer];
    }

    return null;
  }

  private evaluateFieldCondition(
    value: unknown,
    operator: string,
    expected: unknown,
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === expected;
      case 'not_equals':
        return value !== expected;
      case 'greater_than':
        return (value as number) > (expected as number);
      case 'less_than':
        return (value as number) < (expected as number);
      case 'contains':
        return String(value).includes(String(expected));
      case 'in':
        return (expected as unknown[]).includes(value);
      default:
        return false;
    }
  }

  private async executeSplit(step: AutomationStep): Promise<string | null> {
    const config = step.config;

    if (config.splitType === 'random') {
      const ratios = config.splitRatio || [50, 50];
      const random = Math.random() * 100;
      let cumulative = 0;

      for (let i = 0; i < ratios.length; i++) {
        cumulative += ratios[i];
        if (random < cumulative) {
          return step.nextSteps?.[i]?.nextStepId || null;
        }
      }
    }

    return step.nextSteps?.[0]?.nextStepId || null;
  }

  private async executeWebhook(
    step: AutomationStep,
    customerId: string,
    triggerData: Record<string, unknown>,
  ): Promise<void> {
    const config = step.config;
    if (!config.webhookUrl) return;

    try {
      const body = config.webhookBody
        ? JSON.parse(
            config.webhookBody
              .replace('{{customerId}}', customerId)
              .replace('{{triggerData}}', JSON.stringify(triggerData)),
          )
        : { customerId, triggerData };

      await fetch(config.webhookUrl, {
        method: config.webhookMethod || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.webhookHeaders,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(`Webhook execution failed`, error);
    }
  }

  private async addCustomerTag(
    customerId: string,
    tagName: string,
  ): Promise<void> {
    // Add tag to customer (implementation depends on your data model)
    this.logger.log(`Adding tag "${tagName}" to customer ${customerId}`);
  }

  private async removeCustomerTag(
    customerId: string,
    tagName: string,
  ): Promise<void> {
    // Remove tag from customer
    this.logger.log(`Removing tag "${tagName}" from customer ${customerId}`);
  }

  private async scheduleGoalCheck(
    enrollmentId: string,
    step: AutomationStep,
  ): Promise<void> {
    // Schedule periodic goal checking
    const timeout = step.config.goalTimeout || 24 * 60 * 60 * 1000; // Default 24h
    setTimeout(async () => {
      const enrollment = await this.prisma.automationEnrollment.findUnique({
        where: { id: enrollmentId },
      });

      if (enrollment?.status === 'ACTIVE') {
        // Goal not achieved, exit
        await this.exitEnrollment(enrollmentId, 'Goal timeout');
      }
    }, timeout);
  }

  private async completeEnrollment(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Increment completion count
    await this.prisma.automation.update({
      where: { id: enrollment.automationId },
      data: { completionCount: { increment: 1 } },
    });

    this.eventEmitter.emit('automation.completed', {
      enrollmentId,
      automationId: enrollment.automationId,
      customerId: enrollment.customerId,
      converted: !!enrollment.convertedAt,
    });

    this.logger.log(`Enrollment ${enrollmentId} completed`);
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  @OnEvent('churn.risk.high')
  async handleChurnRiskHigh(payload: {
    customerId: string;
    companyId: string;
    riskScore: number;
  }): Promise<void> {
    await this.triggerAutomations(
      payload.companyId,
      AutomationTriggerType.CHURN_RISK_HIGH,
      payload.customerId,
      payload,
    );
  }

  @OnEvent('subscription.cancelled')
  async handleSubscriptionCancelled(payload: {
    customerId: string;
    companyId: string;
    subscriptionId: string;
  }): Promise<void> {
    await this.triggerAutomations(
      payload.companyId,
      AutomationTriggerType.SUBSCRIPTION_CANCELLED,
      payload.customerId,
      payload,
    );
  }

  @OnEvent('order.placed')
  async handleOrderPlaced(payload: {
    customerId: string;
    companyId: string;
    orderId: string;
    total: number;
  }): Promise<void> {
    await this.triggerAutomations(
      payload.companyId,
      AutomationTriggerType.ORDER_PLACED,
      payload.customerId,
      payload,
    );
  }

  @OnEvent('delivery.converted')
  async handleMessageConverted(payload: {
    messageId: string;
    customerId: string;
  }): Promise<void> {
    // Find enrollment associated with this message
    const message = await this.prisma.deliveryMessage.findUnique({
      where: { id: payload.messageId },
    });

    if (message?.automationId) {
      const enrollment = await this.prisma.automationEnrollment.findFirst({
        where: {
          id: message.automationId,
          customerId: payload.customerId,
          status: 'ACTIVE',
        },
        include: { automation: true },
      });

      if (enrollment) {
        const settings = enrollment.automation.settings as any;

        await this.prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: { convertedAt: new Date() },
        });

        await this.prisma.automation.update({
          where: { id: enrollment.automationId },
          data: { conversionCount: { increment: 1 } },
        });

        if (settings.exitOnConversion) {
          await this.exitEnrollment(enrollment.id, 'Conversion achieved');
        }
      }
    }
  }

  private async triggerAutomations(
    companyId: string,
    triggerType: AutomationTriggerType,
    customerId: string,
    triggerData: Record<string, unknown>,
  ): Promise<void> {
    const automations = await this.prisma.automation.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
    });

    for (const automation of automations) {
      const trigger = automation.trigger as any;
      if (trigger.type === triggerType) {
        try {
          await this.enrollCustomer({
            automationId: automation.id,
            customerId,
            triggerData,
          });
        } catch (error) {
          this.logger.error(
            `Failed to enroll customer ${customerId} in automation ${automation.id}`,
            error,
          );
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULED PROCESSING
  // ═══════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_MINUTE)
  async processWaitingEnrollments(): Promise<void> {
    const enrollments = await this.prisma.automationEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        currentStepStartedAt: {
          lte: new Date(Date.now() - 60000), // Started more than 1 minute ago
        },
      },
      include: { automation: true },
      take: 50,
    });

    for (const enrollment of enrollments) {
      const steps = enrollment.automation.steps as any as AutomationStep[];
      const currentStep = steps.find(
        (s) => s.id === enrollment.currentStepId,
      );

      if (currentStep?.type === AutomationStepType.WAIT) {
        const waitDuration = this.calculateWaitDuration(currentStep.config);
        const waitEndTime =
          enrollment.currentStepStartedAt!.getTime() + waitDuration;

        if (Date.now() >= waitEndTime) {
          // Wait is over, move to next step
          const nextStepId =
            currentStep.nextSteps?.[0]?.nextStepId || null;

          if (nextStepId) {
            await this.prisma.automationEnrollment.update({
              where: { id: enrollment.id },
              data: {
                currentStepId: nextStepId,
                currentStepStartedAt: new Date(),
                stepsCompleted: { push: currentStep.id },
              },
            });

            await this.processEnrollmentStep(enrollment.id);
          } else {
            await this.completeEnrollment(enrollment.id);
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getAutomationStats(automationId: string): Promise<{
    enrollments: number;
    completions: number;
    conversions: number;
    completionRate: number;
    conversionRate: number;
    stepPerformance: Record<string, { reached: number; completed: number }>;
  }> {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    const steps = automation.steps as any as AutomationStep[];
    const stepPerformance: Record<string, { reached: number; completed: number }> = {};

    for (const step of steps) {
      const reached = await this.prisma.automationEnrollment.count({
        where: {
          automationId,
          OR: [
            { currentStepId: step.id },
            { stepsCompleted: { has: step.id } },
          ],
        },
      });

      const completed = await this.prisma.automationEnrollment.count({
        where: {
          automationId,
          stepsCompleted: { has: step.id },
        },
      });

      stepPerformance[step.id] = { reached, completed };
    }

    return {
      enrollments: automation.enrollmentCount,
      completions: automation.completionCount,
      conversions: automation.conversionCount,
      completionRate:
        automation.enrollmentCount > 0
          ? (automation.completionCount / automation.enrollmentCount) * 100
          : 0,
      conversionRate:
        automation.enrollmentCount > 0
          ? (automation.conversionCount / automation.enrollmentCount) * 100
          : 0,
      stepPerformance,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapToAutomation(data: any): Automation {
    return {
      id: data.id,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
      trigger: data.trigger,
      steps: data.steps,
      settings: data.settings,
      enrollmentCount: data.enrollmentCount,
      completionCount: data.completionCount,
      conversionCount: data.conversionCount,
      conversionRate: data.conversionRate,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      activatedAt: data.activatedAt,
    };
  }

  private mapToEnrollment(data: any): AutomationEnrollment {
    return {
      id: data.id,
      automationId: data.automationId,
      customerId: data.customerId,
      status: data.status,
      currentStepId: data.currentStepId,
      currentStepStartedAt: data.currentStepStartedAt,
      stepsCompleted: data.stepsCompleted,
      messagesSent: data.messagesSent,
      triggerData: data.triggerData,
      enrolledAt: data.enrolledAt,
      completedAt: data.completedAt,
      exitedAt: data.exitedAt,
      exitReason: data.exitReason,
      convertedAt: data.convertedAt,
      conversionValue: data.conversionValue
        ? parseFloat(data.conversionValue)
        : undefined,
    };
  }
}
