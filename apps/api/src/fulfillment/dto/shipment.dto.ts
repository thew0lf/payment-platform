import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ShippingCarrier, ShippingMethod } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// CREATE SHIPMENT DTO
// ═══════════════════════════════════════════════════════════════

export class CreateShipmentDto {
  @IsUUID()
  orderId: string;

  @IsEnum(ShippingCarrier)
  carrier: ShippingCarrier;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrierService?: string;

  @IsOptional()
  @IsEnum(ShippingMethod)
  shippingMethod?: ShippingMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceAmount?: number;

  @IsOptional()
  @IsDateString()
  estimatedShipDate?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @IsOptional()
  @IsBoolean()
  signatureRequired?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// UPDATE SHIPMENT DTO
// ═══════════════════════════════════════════════════════════════

export class UpdateShipmentDto {
  @IsOptional()
  @IsEnum(ShippingCarrier)
  carrier?: ShippingCarrier;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrierService?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shippingLabelUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnLabelUrl?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}

// ═══════════════════════════════════════════════════════════════
// TRACKING EVENT DTO
// ═══════════════════════════════════════════════════════════════

export class AddTrackingEventDto {
  @IsString()
  @MaxLength(50)
  status: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  carrierCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  carrierMessage?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// ACTION DTOS
// ═══════════════════════════════════════════════════════════════

export class MarkShippedDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;
}

export class MarkDeliveredDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  signedBy?: string;
}
