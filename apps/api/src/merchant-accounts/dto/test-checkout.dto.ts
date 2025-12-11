/**
 * Test Checkout DTOs
 * For running test transactions against merchant accounts
 */

import { IsString, IsNumber, IsOptional, IsBoolean, ValidateNested, MinLength, MaxLength, Min, Max, Matches, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestCheckoutCardDto {
  @ApiProperty({ description: 'Card number (digits only)', example: '4242424242424242' })
  @IsString()
  @MinLength(13)
  @MaxLength(19)
  @Matches(/^\d+$/, { message: 'Card number must contain only digits' })
  number: string;

  @ApiProperty({ description: 'Expiry month (01-12)', example: '12' })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Expiry month must be 01-12' })
  expiryMonth: string;

  @ApiProperty({ description: 'Expiry year (4 digits)', example: '2030' })
  @IsString()
  @Matches(/^20[2-9]\d$/, { message: 'Expiry year must be a valid year (2020-2099)' })
  expiryYear: string;

  @ApiProperty({ description: 'CVV/CVC code', example: '123' })
  @IsString()
  @MinLength(3)
  @MaxLength(4)
  @Matches(/^\d+$/, { message: 'CVV must contain only digits' })
  cvv: string;

  @ApiPropertyOptional({ description: 'Cardholder name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cardholderName?: string;
}

export class TestCheckoutRequestDto {
  @ApiProperty({ description: 'Merchant account ID to charge', example: 'ma_abc123' })
  @IsString()
  @MinLength(1)
  merchantAccountId: string;

  @ApiProperty({ description: 'Amount in dollars', example: 1.00, minimum: 0.01, maximum: 99999.99 })
  @IsNumber()
  @Min(0.01)
  @Max(99999.99)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code (defaults to USD)', example: 'USD' })
  @IsOptional()
  @IsString()
  @IsIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'], { message: 'Currency must be one of: USD, EUR, GBP, CAD, AUD' })
  currency?: string;

  @ApiProperty({ description: 'Card details' })
  @ValidateNested()
  @Type(() => TestCheckoutCardDto)
  card: TestCheckoutCardDto;

  @ApiPropertyOptional({ description: 'Transaction description', example: 'Test transaction' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether to create an order record (defaults to true)', default: true })
  @IsOptional()
  @IsBoolean()
  createOrder?: boolean;
}

export interface TestCheckoutResponseDto {
  success: boolean;
  transactionId: string;
  orderId?: string;
  orderNumber?: string;
  transactionNumber?: string;
  amount: number;
  currency: string;
  status: string;
  environment: 'sandbox' | 'production';
  providerTransactionId?: string;
  avsResult?: string;
  cvvResult?: string;
  errorMessage?: string;
  errorCode?: string;
  processingTimeMs: number;
  createdAt: Date;
}

export interface TestCheckoutTestCardsDto {
  merchantAccountId: string;
  providerType: string;
  environment: 'sandbox' | 'production';
  testCards: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    brand: string;
    description: string;
  }[];
}
