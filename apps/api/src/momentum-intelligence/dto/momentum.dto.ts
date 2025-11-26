import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  IsDate,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InterventionType,
  DeliveryChannel,
  ContentType,
  UpsellType,
  UpsellMoment,
  VoiceScriptType,
  CallDirection,
} from '../types/momentum.types';

// =============================================================================
// INTENT DETECTION DTOs
// =============================================================================

export class CalculateChurnRiskDto {
  @IsString()
  companyId: string;

  @IsString()
  customerId: string;
}

export class BatchCalculateChurnRiskDto {
  @IsString()
  companyId: string;

  @IsArray()
  @IsString({ each: true })
  customerIds: string[];
}

export class GetHighRiskCustomersDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  riskLevel?: string;

  @IsOptional()
  @IsString()
  urgency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// =============================================================================
// SAVE FLOW DTOs
// =============================================================================

export class InitiateSaveFlowDto {
  @IsString()
  companyId: string;

  @IsString()
  customerId: string;

  @IsString()
  trigger: string;
}

export class ProgressSaveStageDto {
  @IsOptional()
  @IsObject()
  response?: Record<string, any>;

  @IsOptional()
  @IsString()
  selectedOption?: string;
}

export class CompleteSaveFlowDto {
  @IsString()
  outcome: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

export class UpdateSaveFlowConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  patternInterrupt?: Record<string, any>;

  @IsOptional()
  @IsObject()
  diagnosisSurvey?: Record<string, any>;

  @IsOptional()
  @IsObject()
  branchingInterventions?: Record<string, any>;

  @IsOptional()
  @IsObject()
  nuclearOffer?: Record<string, any>;

  @IsOptional()
  @IsObject()
  lossVisualization?: Record<string, any>;

  @IsOptional()
  @IsObject()
  exitSurvey?: Record<string, any>;

  @IsOptional()
  @IsObject()
  winback?: Record<string, any>;

  @IsOptional()
  @IsObject()
  voiceAIConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  voiceAIEnabled?: boolean;
}

// =============================================================================
// INTERVENTION DTOs
// =============================================================================

export class CreateInterventionDto {
  @IsString()
  companyId: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  intentId?: string;

  @IsEnum(InterventionType)
  type: InterventionType;

  @IsEnum(DeliveryChannel)
  channel: DeliveryChannel;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsObject()
  offers?: Record<string, any>;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;
}

export class UpdateInterventionDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsObject()
  outcomeDetails?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  revenueImpact?: number;
}

// =============================================================================
// VOICE AI DTOs
// =============================================================================

export class InitiateOutboundCallDto {
  @IsString()
  companyId: string;

  @IsString()
  customerId: string;

  @IsString()
  scriptId: string;

  @IsOptional()
  @IsString()
  priority?: string;
}

export class CreateVoiceScriptDto {
  @IsString()
  companyId: string;

  @IsString()
  name: string;

  @IsEnum(VoiceScriptType)
  type: VoiceScriptType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  opening: Record<string, any>;

  @IsObject()
  diagnosis: Record<string, any>;

  @IsObject()
  interventions: Record<string, any>;

  @IsObject()
  objectionHandling: Record<string, any>;

  @IsObject()
  closing: Record<string, any>;

  @IsObject()
  behavioralTriggers: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateVoiceScriptDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  opening?: Record<string, any>;

  @IsOptional()
  @IsObject()
  diagnosis?: Record<string, any>;

  @IsOptional()
  @IsObject()
  interventions?: Record<string, any>;

  @IsOptional()
  @IsObject()
  objectionHandling?: Record<string, any>;

  @IsOptional()
  @IsObject()
  closing?: Record<string, any>;

  @IsOptional()
  @IsObject()
  behavioralTriggers?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class TwilioInboundWebhookDto {
  @IsString()
  CallSid: string;

  @IsString()
  From: string;

  @IsString()
  To: string;

  @IsOptional()
  @IsString()
  CallStatus?: string;

  @IsOptional()
  @IsString()
  Direction?: string;

  @IsOptional()
  @IsString()
  SpeechResult?: string;

  @IsOptional()
  @IsNumber()
  Confidence?: number;
}

export class TwilioStatusCallbackDto {
  @IsString()
  CallSid: string;

  @IsString()
  CallStatus: string;

  @IsOptional()
  @IsNumber()
  CallDuration?: number;

  @IsOptional()
  @IsString()
  RecordingUrl?: string;
}

// =============================================================================
// CONTENT GENERATION DTOs
// =============================================================================

export class GenerateContentDto {
  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  companyId: string;

  @IsObject()
  context: {
    product: string;
    industry: string;
    brandVoice: string;
    targetAudience: string;
    valuePropositions: string[];
    competitors?: string[];
  };

  @IsObject()
  behavioralConfig: {
    primaryTrigger: string;
    secondaryTriggers: string[];
    emotionalTone: string;
  };

  @IsObject()
  personalization: {
    useCustomerName: boolean;
    useCustomerHistory: boolean;
    dynamicFields: string[];
  };

  @IsNumber()
  @Min(1)
  @Max(5)
  variants: number;

  @IsOptional()
  @IsObject()
  constraints?: {
    maxLength?: number;
    includeTerms?: string[];
    excludeTerms?: string[];
    ctaText?: string;
  };
}

export class ApproveContentDto {
  @IsString()
  approvedBy: string;
}

export class GenerateVariantDto {
  @IsOptional()
  @IsObject()
  modifications?: Record<string, any>;
}

// =============================================================================
// UPSELL DTOs
// =============================================================================

export class GetUpsellRecommendationDto {
  @IsString()
  companyId: string;

  @IsString()
  customerId: string;

  @IsEnum(UpsellMoment)
  moment: UpsellMoment;
}

export class RecordOfferPresentationDto {
  @IsString()
  offerId: string;
}

export class RecordOfferAcceptanceDto {
  @IsString()
  offerId: string;

  @IsNumber()
  revenue: number;
}

export class CreateUpsellOfferDto {
  @IsString()
  companyId: string;

  @IsString()
  customerId: string;

  @IsEnum(UpsellType)
  type: UpsellType;

  @IsEnum(UpsellMoment)
  moment: UpsellMoment;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  offerPrice?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;

  @IsOptional()
  @IsString()
  triggerUsed?: string;
}

// =============================================================================
// ANALYTICS DTOs
// =============================================================================

export class GetAnalyticsDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  dateRange?: string; // '7d', '30d', '90d', 'custom'

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

export class GetSavePerformanceDto extends GetAnalyticsDto {
  @IsOptional()
  @IsString()
  groupBy?: string; // 'day', 'week', 'month'
}

export class GetVoicePerformanceDto extends GetAnalyticsDto {
  @IsOptional()
  @IsEnum(CallDirection)
  direction?: CallDirection;
}

export class GetContentPerformanceDto extends GetAnalyticsDto {
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;
}

// =============================================================================
// BEHAVIORAL TRIGGER DTOs
// =============================================================================

export class CreateBehavioralTriggerDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category: string;

  @IsObject()
  implementation: Record<string, string>;

  @IsArray()
  @IsString({ each: true })
  examples: string[];
}

export class UpdateBehavioralTriggerDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  implementation?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examples?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
