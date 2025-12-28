import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReserveTransactionType } from '@prisma/client';

// DTO for creating a reserve hold on a merchant profile
export class CreateReserveHoldDto {
  @IsString()
  transactionId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Transaction amount must be positive' })
  transactionAmount: number; // In cents

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Reserve percentage cannot be negative' })
  @Max(1, { message: 'Reserve percentage cannot exceed 100%' })
  reservePercentage: number; // 0.0 to 1.0

  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Hold days must be at least 1' })
  holdDays: number;
}

export class CreateReserveTransactionDto {
  @IsString()
  merchantRiskProfileId: string;

  @IsEnum(ReserveTransactionType)
  type: ReserveTransactionType;

  @IsNumber()
  @Type(() => Number)
  amount: number; // In cents, positive for hold, negative for release

  @IsOptional()
  @IsString()
  relatedTransactionId?: string;

  @IsOptional()
  @IsString()
  relatedChargebackId?: string;

  @IsOptional()
  @IsDateString()
  scheduledReleaseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class ReleaseReserveDto {
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class AdjustReserveDto {
  @IsNumber()
  @Type(() => Number)
  amount: number; // Can be positive or negative

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

// Response DTO with BigInt serialized as string for JSON compatibility
export class ReserveTransactionResponseDto {
  id: string;
  merchantRiskProfileId: string;
  type: ReserveTransactionType;
  amount: number;
  @Transform(({ value }) => value?.toString())
  balanceAfter: string; // BigInt serialized as string
  relatedTransactionId: string | null;
  relatedChargebackId: string | null;
  scheduledReleaseDate: Date | null;
  releasedAt: Date | null;
  description: string | null;
  internalNotes: string | null;
  createdAt: Date;
  createdBy: string | null;
}

// Response DTO with BigInt serialized as string for JSON compatibility
export class ReserveSummaryResponseDto {
  merchantRiskProfileId: string;
  @Transform(({ value }) => value?.toString())
  currentBalance: string; // BigInt serialized as string
  @Transform(({ value }) => value?.toString())
  totalHeld: string; // BigInt serialized as string
  @Transform(({ value }) => value?.toString())
  totalReleased: string; // BigInt serialized as string
  pendingReleases: {
    scheduledDate: Date;
    amount: number;
  }[];
  recentTransactions: ReserveTransactionResponseDto[];
}

// Helper function to serialize BigInt values in responses
export function serializeBigIntFields<T extends object>(obj: T): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'bigint') {
      result[key] = result[key].toString();
    } else if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = serializeBigIntFields(result[key] as object);
    } else if (Array.isArray(result[key])) {
      result[key] = (result[key] as unknown[]).map((item) =>
        typeof item === 'object' && item !== null ? serializeBigIntFields(item as object) : item,
      );
    }
  }
  return result as T;
}
