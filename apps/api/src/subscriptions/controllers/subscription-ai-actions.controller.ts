/**
 * Subscription AI Actions Controller
 *
 * Endpoints for AI-driven subscription management:
 * - Process AI actions
 * - Get capabilities
 * - Customer context
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SubscriptionAIActionsService,
  AIActionType,
  AIActionSource,
  ActionResult,
  AICapability,
  CustomerContext,
  AIActionRequest,
} from '../services/subscription-ai-actions.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class ProcessActionDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsEnum(AIActionType)
  actionType: AIActionType;

  @IsObject()
  parameters: Record<string, unknown>;

  @IsEnum(AIActionSource)
  source: AIActionSource;

  @IsOptional()
  @IsString()
  customerIntent?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsBoolean()
  autoExecute?: boolean;
}

@Controller('subscriptions/ai-actions')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionAIActionsController {
  private readonly logger = new Logger(SubscriptionAIActionsController.name);

  constructor(
    private readonly aiActionsService: SubscriptionAIActionsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTION PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Process an AI action request
   */
  @Post('process')
  async processAction(
    @Body() dto: ProcessActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ActionResult> {
    const companyId = await this.getCompanyIdForQuery(user, dto.companyId);

    return this.aiActionsService.processAction({
      companyId,
      customerId: dto.customerId,
      subscriptionId: dto.subscriptionId,
      actionType: dto.actionType,
      parameters: dto.parameters,
      source: dto.source,
      customerIntent: dto.customerIntent,
      sessionId: dto.sessionId,
      agentId: dto.agentId,
      autoExecute: dto.autoExecute,
    });
  }

  /**
   * Confirm a pending action
   */
  @Post('confirm/:actionId')
  async confirmAction(
    @Param('actionId') actionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ActionResult> {
    return this.aiActionsService.confirmAction(actionId);
  }

  /**
   * Get action by ID
   */
  @Get('actions/:actionId')
  async getAction(
    @Param('actionId') actionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AIActionRequest | null> {
    return this.aiActionsService.getAction(actionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get all available AI capabilities
   */
  @Get('capabilities')
  async getCapabilities(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AICapability[]> {
    return this.aiActionsService.getCapabilities();
  }

  /**
   * Get specific capability
   */
  @Get('capabilities/:actionType')
  async getCapability(
    @Param('actionType') actionType: AIActionType,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AICapability | null> {
    return this.aiActionsService.getCapability(actionType);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CUSTOMER CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get customer context for AI agent
   */
  @Get('context/:customerId')
  async getCustomerContext(
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerContext> {
    return this.aiActionsService.getCustomerContext(customerId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTION HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get action history for customer
   */
  @Get('history/:customerId')
  async getActionHistory(
    @Param('customerId') customerId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AIActionRequest[]> {
    return this.aiActionsService.getActionHistory(
      customerId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    if (user.companyId) {
      return user.companyId;
    }

    if (!queryCompanyId) {
      throw new Error('companyId is required for organization/client users');
    }

    return queryCompanyId;
  }
}
