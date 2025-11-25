import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FrictionLevel, TrustSignalType } from '../interfaces/continuity.interfaces';

export class StartFlowDto {
  @ApiProperty({ description: 'Unique session identifier' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Total number of steps in the flow' })
  @IsNumber()
  @Min(1)
  @Max(10)
  totalSteps: number;

  @ApiPropertyOptional({ description: 'User segment for personalization' })
  @IsOptional()
  @IsString()
  userSegment?: string;

  @ApiPropertyOptional({ description: 'Transaction amount for friction calculation' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transactionAmount?: number;
}

export class UpdateFlowDto {
  @ApiProperty({ description: 'Current step in the flow' })
  @IsNumber()
  @Min(1)
  currentStep: number;

  @ApiPropertyOptional({ description: 'Additional context data' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class FlowStateResponseDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  currentStep: number;

  @ApiProperty()
  totalSteps: number;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty()
  lastActivityAt: Date;

  @ApiProperty({ description: 'Score from 0-100 indicating behavioral momentum' })
  momentumScore: number;

  @ApiProperty({ enum: FrictionLevel })
  frictionLevel: FrictionLevel;

  @ApiProperty({ type: [Object] })
  trustSignals: TrustSignalDto[];
}

export class TrustSignalDto {
  @ApiProperty({ enum: TrustSignalType })
  @IsEnum(TrustSignalType)
  type: TrustSignalType;

  @ApiProperty()
  value: string | number;

  @ApiProperty()
  displayText: string;

  @ApiProperty({ description: 'Display priority (lower = higher priority)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  priority: number;
}

export class MomentumConfigDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  enableMicroConfirmations: boolean;

  @ApiProperty({ enum: ['steps', 'progress', 'minimal'], default: 'steps' })
  @IsEnum(['steps', 'progress', 'minimal'])
  progressIndicatorStyle: 'steps' | 'progress' | 'minimal';

  @ApiProperty({ description: 'Auto-advance delay in milliseconds', default: 500 })
  @IsNumber()
  @Min(0)
  @Max(5000)
  autoAdvanceDelay: number;
}

export class TrustConfigDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  showSecurityIndicators: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  displaySocialProof: boolean;

  @ApiProperty({ description: 'Minimum transactions to show count', default: 100 })
  @IsNumber()
  @Min(0)
  transactionCountThreshold: number;

  @ApiProperty({ type: [String], default: ['PCI-DSS', 'SOC2'] })
  @IsArray()
  @IsString({ each: true })
  showComplianceBadges: string[];
}

export class FrictionConfigDto {
  @ApiProperty({ description: 'Max amount for one-click payments', default: 100 })
  @IsNumber()
  @Min(0)
  oneClickThreshold: number;

  @ApiProperty({ description: 'Min amount requiring confirmation', default: 500 })
  @IsNumber()
  @Min(0)
  confirmationRequired: number;

  @ApiProperty({ description: 'Amount triggering step-up auth', default: 1000 })
  @IsNumber()
  @Min(0)
  stepUpAuthThreshold: number;
}

export class CognitiveConfigDto {
  @ApiProperty({ description: 'Max decision points in flow', default: 3 })
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDecisionPoints: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  progressiveDisclosure: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  inlineValidation: boolean;
}

export class ContinuityConfigDto {
  @ApiProperty({ type: MomentumConfigDto })
  @ValidateNested()
  @Type(() => MomentumConfigDto)
  momentum: MomentumConfigDto;

  @ApiProperty({ type: TrustConfigDto })
  @ValidateNested()
  @Type(() => TrustConfigDto)
  trust: TrustConfigDto;

  @ApiProperty({ type: FrictionConfigDto })
  @ValidateNested()
  @Type(() => FrictionConfigDto)
  friction: FrictionConfigDto;

  @ApiProperty({ type: CognitiveConfigDto })
  @ValidateNested()
  @Type(() => CognitiveConfigDto)
  cognitive: CognitiveConfigDto;
}

export class UpdateConfigDto {
  @ApiPropertyOptional({ type: MomentumConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MomentumConfigDto)
  momentum?: Partial<MomentumConfigDto>;

  @ApiPropertyOptional({ type: TrustConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrustConfigDto)
  trust?: Partial<TrustConfigDto>;

  @ApiPropertyOptional({ type: FrictionConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FrictionConfigDto)
  friction?: Partial<FrictionConfigDto>;

  @ApiPropertyOptional({ type: CognitiveConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CognitiveConfigDto)
  cognitive?: Partial<CognitiveConfigDto>;
}

export class ContinuityMetricsDto {
  @ApiProperty({ description: 'Percentage of flows completed' })
  flowCompletionRate: number;

  @ApiProperty({ description: 'Average time to payment in seconds' })
  averageTimeToPayment: number;

  @ApiProperty({ description: 'Percentage of abandoned flows' })
  abandonmentRate: number;

  @ApiProperty({ description: 'Correlation of trust signals to conversion' })
  trustScoreImpact: number;

  @ApiProperty({ description: 'False positive rate on friction triggers' })
  frictionEfficiency: number;
}

export class CalculateFrictionDto {
  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'User risk score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore?: number;

  @ApiPropertyOptional({ description: 'Is returning user' })
  @IsOptional()
  @IsBoolean()
  isReturningUser?: boolean;
}

export class FrictionResultDto {
  @ApiProperty({ enum: FrictionLevel })
  level: FrictionLevel;

  @ApiProperty({ description: 'Requires explicit confirmation' })
  requiresConfirmation: boolean;

  @ApiProperty({ description: 'Requires step-up authentication' })
  requiresStepUpAuth: boolean;

  @ApiProperty({ description: 'Eligible for one-click payment' })
  oneClickEligible: boolean;

  @ApiProperty({ description: 'Reason for friction level' })
  reason: string;
}
