import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ChargebackStatus, ChargebackReason } from '@prisma/client';

export class CreateChargebackRecordDto {
  @IsString()
  merchantRiskProfileId: string;

  @IsString()
  chargebackId: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNumber()
  @Type(() => Number)
  fee: number;

  @IsEnum(ChargebackReason)
  reason: ChargebackReason;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  reasonDescription?: string;

  @IsDateString()
  receivedAt: string;

  @IsOptional()
  @IsDateString()
  respondByDate?: string;
}

export class UpdateChargebackRecordDto {
  @IsOptional()
  @IsEnum(ChargebackStatus)
  status?: ChargebackStatus;

  @IsOptional()
  @IsString()
  reasonDescription?: string;

  @IsOptional()
  @IsDateString()
  respondByDate?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class SubmitRepresentmentDto {
  @IsObject()
  evidence: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResolveChargebackDto {
  @IsEnum(ChargebackStatus)
  status: ChargebackStatus; // WON, LOST, or ACCEPTED

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  outcomeAmount?: number; // Amount recovered if won

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  outcomeFee?: number; // Fee refunded if won

  @IsOptional()
  @IsBoolean()
  impactReserve?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reserveDebitAmount?: number;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class ChargebackRecordResponseDto {
  id: string;
  merchantRiskProfileId: string;
  chargebackId: string;
  transactionId: string | null;
  orderId: string | null;
  amount: number;
  currency: string;
  fee: number;
  reason: ChargebackReason;
  reasonCode: string | null;
  reasonDescription: string | null;
  status: ChargebackStatus;
  receivedAt: Date;
  respondByDate: Date | null;
  resolvedAt: Date | null;
  representmentSubmittedAt: Date | null;
  representmentEvidence: Record<string, unknown> | null;
  representmentNotes: string | null;
  outcomeDate: Date | null;
  outcomeAmount: number | null;
  outcomeFee: number | null;
  impactedReserve: boolean;
  reserveDebitAmount: number | null;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ChargebackStatsResponseDto {
  merchantRiskProfileId: string;
  totalChargebacks: number;
  openChargebacks: number;
  wonChargebacks: number;
  lostChargebacks: number;
  totalAmount: number;
  totalFees: number;
  recoveredAmount: number;
  chargebackRatio: number;
  recentChargebacks: ChargebackRecordResponseDto[];
}
