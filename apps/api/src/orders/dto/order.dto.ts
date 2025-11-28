import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
  Min,
  IsEmail,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// ADDRESS DTO
// ═══════════════════════════════════════════════════════════════

export class AddressDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsString()
  @MaxLength(255)
  address1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address2?: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  state: string;

  @IsString()
  @MaxLength(20)
  postalCode: string;

  @IsString()
  @MaxLength(2)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

// ═══════════════════════════════════════════════════════════════
// ORDER ITEM DTO
// ═══════════════════════════════════════════════════════════════

export class CreateOrderItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsString()
  @MaxLength(100)
  sku: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;
}

// ═══════════════════════════════════════════════════════════════
// CREATE ORDER DTO
// ═══════════════════════════════════════════════════════════════

export class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsUUID()
  billingAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Order must have at least one item' })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// UPDATE ORDER DTO
// ═══════════════════════════════════════════════════════════════

export class UpdateOrderDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// STATUS UPDATE DTOS
// ═══════════════════════════════════════════════════════════════

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class MarkPaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTO
// ═══════════════════════════════════════════════════════════════

export class OrderQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  fulfillmentStatus?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
