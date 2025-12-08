import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FunnelType,
  FunnelStatus,
  StageType,
  FunnelSettings,
  StageConfig,
  WinnerSelectionMode,
} from '../types/funnel.types';

// ═══════════════════════════════════════════════════════════════
// FUNNEL DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateFunnelDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FunnelType)
  type: FunnelType;

  @IsObject()
  @IsOptional()
  settings?: Partial<FunnelSettings>;

  @IsString()
  @IsOptional()
  templateId?: string; // Create from template
}

export class UpdateFunnelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FunnelType)
  @IsOptional()
  type?: FunnelType;

  @IsEnum(FunnelStatus)
  @IsOptional()
  status?: FunnelStatus;

  @IsObject()
  @IsOptional()
  settings?: Partial<FunnelSettings>;
}

export class PublishFunnelDto {
  @IsBoolean()
  @IsOptional()
  publish?: boolean; // true = publish, false = unpublish
}

// ═══════════════════════════════════════════════════════════════
// STAGE DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateStageDto {
  @IsString()
  name: string;

  @IsEnum(StageType)
  type: StageType;

  @IsNumber()
  @Min(0)
  order: number;

  @IsObject()
  @IsOptional()
  config?: StageConfig;

  @IsString()
  @IsOptional()
  themeId?: string;

  @IsObject()
  @IsOptional()
  customStyles?: Record<string, unknown>;
}

export class UpdateStageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsObject()
  @IsOptional()
  config?: StageConfig;

  @IsString()
  @IsOptional()
  themeId?: string;

  @IsObject()
  @IsOptional()
  customStyles?: Record<string, unknown>;
}

export class ReorderStagesDto {
  @IsArray()
  @IsString({ each: true })
  stageIds: string[]; // Array of stage IDs in new order
}

// ═══════════════════════════════════════════════════════════════
// VARIANT DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateVariantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isControl?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  trafficWeight?: number;

  @IsObject()
  @IsOptional()
  stageOverrides?: Record<string, unknown>;
}

export class UpdateVariantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  trafficWeight?: number;

  @IsObject()
  @IsOptional()
  stageOverrides?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// A/B TEST DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateABTestDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  hypothesis?: string;

  @IsEnum(WinnerSelectionMode)
  @IsOptional()
  winnerSelectionMode?: WinnerSelectionMode;

  @IsNumber()
  @Min(10)
  @IsOptional()
  minimumSessions?: number;

  @IsNumber()
  @Min(0.5)
  @Max(0.99)
  @IsOptional()
  confidenceThreshold?: number;

  @IsArray()
  @IsString({ each: true })
  variantIds: string[];
}

export class UpdateABTestDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  hypothesis?: string;

  @IsEnum(WinnerSelectionMode)
  @IsOptional()
  winnerSelectionMode?: WinnerSelectionMode;

  @IsNumber()
  @Min(10)
  @IsOptional()
  minimumSessions?: number;
}

export class DeclareWinnerDto {
  @IsString()
  variantId: string;
}

// ═══════════════════════════════════════════════════════════════
// SESSION DTOs (Public checkout flow)
// ═══════════════════════════════════════════════════════════════

export class CreateSessionDto {
  @IsString()
  @IsOptional()
  entryUrl?: string;

  @IsString()
  @IsOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}

// Product item for session selection
export class SelectedProductDto {
  @IsString()
  productId: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  sku?: string;
}

export class UpdateSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedProductDto)
  @IsOptional()
  selectedProducts?: SelectedProductDto[];

  @IsObject()
  @IsOptional()
  customerInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
  };

  @IsObject()
  @IsOptional()
  shippingAddress?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  billingAddress?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  currentStageOrder?: number;
}

export class TrackEventDto {
  @IsString()
  type: string;

  @IsNumber()
  stageOrder: number;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  templateType: 'FULL_FUNNEL' | 'COMPONENT';

  @IsString()
  category: string;

  @IsObject()
  config: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  industry?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════

export class FunnelQueryDto {
  @IsString()
  @IsOptional()
  companyId?: string;

  @IsEnum(FunnelStatus)
  @IsOptional()
  status?: FunnelStatus;

  @IsEnum(FunnelType)
  @IsOptional()
  type?: FunnelType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  offset?: number;
}

export class AnalyticsQueryDto {
  @IsString()
  @IsOptional()
  period?: 'day' | 'week' | 'month' | 'all';

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class TemplateQueryDto {
  @IsString()
  @IsOptional()
  templateType?: 'FULL_FUNNEL' | 'COMPONENT';

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  featured?: boolean;
}
