import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
  Matches,
  IsIP,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from '../types/payment.types';

// ═══════════════════════════════════════════════════════════════
// CARD DTO - Payment card details with PCI-aware validation
// ═══════════════════════════════════════════════════════════════

export class CardDto {
  @IsString()
  @MinLength(13)
  @MaxLength(19)
  @Matches(/^\d+$/, { message: 'Card number must contain only digits' })
  number: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2)
  @Matches(/^(0[1-9]|1[0-2]|[1-9])$/, { message: 'Invalid expiry month (01-12)' })
  expiryMonth: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4)
  @Matches(/^\d{2,4}$/, { message: 'Invalid expiry year' })
  expiryYear: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4)
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3-4 digits' })
  cvv: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cardholderName?: string;
}

// ═══════════════════════════════════════════════════════════════
// BILLING ADDRESS DTO
// ═══════════════════════════════════════════════════════════════

export class BillingAddressDto {
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
  street1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  street2?: string;

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
  @MinLength(2)
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
// CREATE TRANSACTION DTO - For charge/authorize/verify
// ═══════════════════════════════════════════════════════════════

export class CreateTransactionDto {
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @Max(999999.99, { message: 'Amount exceeds maximum allowed' })
  amount: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3-letter ISO code (e.g., USD)' })
  currency?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardDto)
  card?: CardDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  providerId?: string;

  @IsOptional()
  @IsBoolean()
  allowFallback?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CAPTURE DTO - For capturing authorized transactions
// ═══════════════════════════════════════════════════════════════

export class CaptureDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @Max(999999.99, { message: 'Amount exceeds maximum allowed' })
  amount?: number;
}

// ═══════════════════════════════════════════════════════════════
// REFUND DTO - For refunding transactions
// ═══════════════════════════════════════════════════════════════

export class RefundDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Refund amount must be greater than 0' })
  @Max(999999.99, { message: 'Refund amount exceeds maximum allowed' })
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// TOKENIZE CARD DTO - For card tokenization
// ═══════════════════════════════════════════════════════════════

export class TokenizeCardDto {
  @ValidateNested()
  @Type(() => CardDto)
  card: CardDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  providerId?: string;
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION QUERY DTO - For querying transactions
// ═══════════════════════════════════════════════════════════════

export class TransactionQueryDto {
  @IsOptional()
  @IsArray()
  @IsEnum(TransactionStatus, { each: true })
  status?: TransactionStatus[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transactionType?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  providerId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d{3})?Z?)?$/, {
    message: 'dateFrom must be a valid ISO date string',
  })
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d{3})?Z?)?$/, {
    message: 'dateTo must be a valid ISO date string',
  })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
