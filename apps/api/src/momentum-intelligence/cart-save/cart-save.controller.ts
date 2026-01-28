import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { CartSaveService } from './cart-save.service';
import { CartRecoveryVoiceService } from './cart-recovery-voice.service';
import { CheckoutChurnDetectionService, CheckoutEvent } from './checkout-churn-detection.service';
import {
  CartAbandonmentReason,
  CartSaveFlowConfig,
} from './types/cart-save.types';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =============================================================================
// DTOs
// =============================================================================

class InitiateSaveFlowDto {
  @ApiProperty({ description: 'Cart ID to initiate save flow for' })
  @IsString()
  cartId: string;

  @ApiPropertyOptional({ description: 'Initial abandonment reason if known', enum: CartAbandonmentReason })
  @IsOptional()
  @IsEnum(CartAbandonmentReason)
  reason?: CartAbandonmentReason;
}

class RecordDiagnosisDto {
  @ApiProperty({ description: 'Abandonment reason from diagnosis survey', enum: CartAbandonmentReason })
  @IsEnum(CartAbandonmentReason)
  reason: CartAbandonmentReason;
}

class BlackoutHoursDto {
  @ApiProperty({ description: 'Blackout start hour (0-23)', minimum: 0, maximum: 23 })
  @IsNumber()
  @Min(0)
  @Max(23)
  start: number;

  @ApiProperty({ description: 'Blackout end hour (0-23)', minimum: 0, maximum: 23 })
  @IsNumber()
  @Min(0)
  @Max(23)
  end: number;
}

class UpdateConfigDto {
  @ApiPropertyOptional({ description: 'Stage configurations' })
  @IsOptional()
  @IsObject()
  stages?: Partial<CartSaveFlowConfig['stages']>;

  @ApiPropertyOptional({ description: 'Maximum attempts per cart', minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxAttemptsPerCart?: number;

  @ApiPropertyOptional({ description: 'Respect customer unsubscribe preferences' })
  @IsOptional()
  @IsBoolean()
  respectUnsubscribe?: boolean;

  @ApiPropertyOptional({ description: 'Blackout hours (no communications during this time)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlackoutHoursDto)
  blackoutHours?: BlackoutHoursDto;
}

class TrackCheckoutEventDto {
  @ApiProperty({ description: 'Session ID for the checkout' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Checkout event data' })
  @IsObject()
  event: CheckoutEvent;
}

class EscalateToCSAIDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Risk score (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @ApiProperty({ description: 'Predicted abandonment reason', enum: CartAbandonmentReason })
  @IsEnum(CartAbandonmentReason)
  predictedReason: CartAbandonmentReason;

  @ApiProperty({ description: 'Risk signals detected' })
  @IsArray()
  signals: any[];
}

// =============================================================================
// CONTROLLER
// =============================================================================

@ApiTags('Cart Recovery')
@Controller('momentum/cart-save')
export class CartSaveController {
  constructor(
    private readonly cartSaveService: CartSaveService,
    private readonly voiceRecoveryService: CartRecoveryVoiceService,
    private readonly churnDetectionService: CheckoutChurnDetectionService,
  ) {}

  // ===========================================================================
  // PUBLIC ENDPOINTS (for cart recovery links)
  // Rate limited to prevent abuse
  // ===========================================================================

  @Post('initiate')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per IP
  @ApiOperation({ summary: 'Initiate cart save flow' })
  async initiateSaveFlow(@Body() dto: InitiateSaveFlowDto) {
    return this.cartSaveService.initiateCartSaveFlow(dto.cartId, dto.reason);
  }

  @Post('attempts/:attemptId/progress')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute per IP
  @ApiOperation({ summary: 'Progress save flow to next stage' })
  async progressSaveFlow(
    @Param('attemptId') attemptId: string,
    @Body() body?: { responseType?: string; data?: Record<string, unknown> },
  ) {
    return this.cartSaveService.progressCartSaveFlow(
      attemptId,
      body?.responseType
        ? { type: body.responseType as never, data: body.data }
        : undefined,
    );
  }

  @Post('attempts/:attemptId/diagnosis')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per IP
  @ApiOperation({ summary: 'Record diagnosis survey answer' })
  async recordDiagnosis(
    @Param('attemptId') attemptId: string,
    @Body() dto: RecordDiagnosisDto,
  ) {
    await this.cartSaveService.recordDiagnosisAnswer(attemptId, dto.reason);
    return { success: true };
  }

  @Post('attempts/:attemptId/execute')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per IP
  @ApiOperation({ summary: 'Execute intervention for current stage' })
  async executeIntervention(@Param('attemptId') attemptId: string) {
    return this.cartSaveService.executeIntervention(attemptId);
  }

  @Get('attempts/:attemptId/status')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute per IP
  @ApiOperation({ summary: 'Get save attempt status' })
  async getAttemptStatus(@Param('attemptId') attemptId: string) {
    return this.cartSaveService.getAttemptStatus(attemptId);
  }

  // ===========================================================================
  // ADMIN ENDPOINTS
  // ===========================================================================

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart save configuration' })
  async getConfig(@CurrentUser() user: AuthenticatedUser) {
    const companyId = this.getCompanyId(user);
    return this.cartSaveService.getFlowConfig(companyId);
  }

  @Put('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart save configuration' })
  async updateConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConfigDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.cartSaveService.updateFlowConfig(companyId, dto as Partial<CartSaveFlowConfig>);
  }

  // ===========================================================================
  // VOICE RECOVERY ENDPOINTS
  // ===========================================================================

  @Post('voice/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate voice recovery call for abandoned cart' })
  async initiateVoiceRecovery(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { cartId: string; priority?: 'high' | 'normal' | 'low' },
  ) {
    const companyId = this.getCompanyId(user);
    return this.voiceRecoveryService.initiateVoiceRecovery(companyId, dto.cartId, {
      priority: dto.priority,
    });
  }

  @Post('voice/outcome/:callId')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per IP
  @ApiOperation({ summary: 'Process voice recovery call outcome' })
  async processVoiceOutcome(
    @Param('callId') callId: string,
    @Body() dto: {
      outcome: 'SAVED' | 'DECLINED' | 'NO_ANSWER' | 'VOICEMAIL' | 'CALLBACK_SCHEDULED';
      reason?: CartAbandonmentReason;
      offerAccepted?: string;
      nextAttemptTime?: string;
    },
  ) {
    await this.voiceRecoveryService.processCallOutcome(callId, dto.outcome, {
      reason: dto.reason,
      offerAccepted: dto.offerAccepted,
      nextAttemptTime: dto.nextAttemptTime ? new Date(dto.nextAttemptTime) : undefined,
    });
    return { success: true };
  }

  @Get('voice/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get voice recovery analytics' })
  async getVoiceAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const companyId = this.getCompanyId(user);
    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;
    return this.voiceRecoveryService.getVoiceRecoveryAnalytics(companyId, dateRange);
  }

  // ===========================================================================
  // CHURN DETECTION ENDPOINTS
  // ===========================================================================

  @Post('churn/track')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute per IP (higher for frequent events)
  @ApiOperation({ summary: 'Track checkout behavior event for churn detection' })
  async trackCheckoutEvent(@Body() dto: TrackCheckoutEventDto) {
    return this.churnDetectionService.trackCheckoutEvent(dto.sessionId, dto.event);
  }

  @Post('churn/escalate')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per IP
  @ApiOperation({ summary: 'Escalate detected churn risk to CS AI' })
  async escalateToCSAI(@Body() dto: EscalateToCSAIDto) {
    return this.churnDetectionService.escalateToCSAI(dto.sessionId, {
      sessionId: dto.sessionId,
      riskScore: dto.riskScore,
      predictedReason: dto.predictedReason,
      signals: dto.signals,
      suggestedIntervention: {
        type: 'CHAT_OFFER',
        message: 'Need help completing your order?',
        urgency: dto.riskScore > 70 ? 'immediate' : 'gentle',
        channel: 'CHAT_WIDGET',
      },
      timestamp: Date.now(),
    });
  }

  // ===========================================================================
  // ANALYTICS ENDPOINTS
  // ===========================================================================

  @Get('analytics/overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart recovery analytics overview' })
  async getAnalyticsOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.cartSaveService.getAnalytics(companyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('analytics/attempts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent cart save attempts' })
  async getAttempts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.cartSaveService.getAttempts(companyId, {
      status: status as any,
      channel: channel as any,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private getCompanyId(user: AuthenticatedUser): string {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    throw new ForbiddenException('Company context required for this operation');
  }
}
