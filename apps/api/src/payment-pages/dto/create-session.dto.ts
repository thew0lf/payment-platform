import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  SessionLineItem,
  SessionCustomerData,
  SessionBillingAddress,
  SessionShippingAddress,
  SessionUtmParams,
} from '../types';

export class LineItemDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateSessionDto {
  @ApiProperty({ description: 'Payment page ID' })
  @IsString()
  pageId: string;

  @ApiPropertyOptional({ description: 'Existing customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Currency code (defaults to page default)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Line items for the session', type: [LineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems: LineItemDto[];

  @ApiPropertyOptional({ description: 'Discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Tax amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Shipping amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @ApiPropertyOptional({ description: 'Pre-filled customer data' })
  @IsOptional()
  @IsObject()
  customerData?: SessionCustomerData;

  @ApiPropertyOptional({ description: 'Pre-filled billing address' })
  @IsOptional()
  @IsObject()
  billingAddress?: SessionBillingAddress;

  @ApiPropertyOptional({ description: 'Pre-filled shipping address' })
  @IsOptional()
  @IsObject()
  shippingAddress?: SessionShippingAddress;

  @ApiPropertyOptional({ description: 'UTM parameters for attribution' })
  @IsOptional()
  @IsObject()
  utmParams?: SessionUtmParams;

  @ApiPropertyOptional({ description: 'Referrer URL' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Success redirect URL (overrides page default)' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL (overrides page default)' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @ApiPropertyOptional({ description: 'Custom metadata for the session' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
