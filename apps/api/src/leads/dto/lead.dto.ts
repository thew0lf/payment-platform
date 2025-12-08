import { IsString, IsOptional, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';
import { LeadStatus, LeadSource } from '@prisma/client';

export class CaptureFieldDto {
  @IsString()
  sessionToken: string;

  @IsString()
  field: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsNumber()
  stageOrder?: number;

  @IsOptional()
  @IsString()
  stageName?: string;
}

export class CaptureFieldsDto {
  @IsString()
  sessionToken: string;

  fields: Record<string, string>;

  @IsOptional()
  @IsNumber()
  stageOrder?: number;

  @IsOptional()
  @IsString()
  stageName?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  capturedFields?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  cartValue?: number;

  @IsOptional()
  @IsArray()
  cartItems?: unknown[];
}

export class LeadQueryDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  funnelId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minEngagement?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minIntent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  orderBy?: 'lastSeenAt' | 'engagementScore' | 'intentScore' | 'estimatedValue';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}

export class ConvertLeadDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}

export class AbandonLeadDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
