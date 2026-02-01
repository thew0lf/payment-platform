import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  IsEnum,
} from 'class-validator';
import { ConversionStatus } from '@prisma/client';

export class TrackConversionDto {
  @IsString()
  companyId: string;

  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsNumber()
  @Min(0)
  orderTotal: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsBoolean()
  isFirstPurchase?: boolean;

  // Attribution
  @IsOptional()
  @IsString()
  visitorId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  clickId?: string;

  @IsOptional()
  @IsString()
  affiliateCode?: string;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdateConversionDto {
  @IsOptional()
  @IsEnum(ConversionStatus)
  status?: ConversionStatus;

  @IsOptional()
  @IsString()
  rejectReason?: string;

  @IsOptional()
  @IsString()
  reversalReason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reversalAmount?: number;
}

export class ConversionQueryDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

export class PostbackDto {
  // Standard postback fields
  @IsString()
  clickId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  // SubID passback
  @IsOptional()
  @IsString()
  subId1?: string;

  @IsOptional()
  @IsString()
  subId2?: string;

  @IsOptional()
  @IsString()
  subId3?: string;

  @IsOptional()
  @IsString()
  subId4?: string;

  @IsOptional()
  @IsString()
  subId5?: string;
}
