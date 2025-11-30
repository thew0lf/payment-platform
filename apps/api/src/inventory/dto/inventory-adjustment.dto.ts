import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  MaxLength,
} from 'class-validator';

export enum AdjustmentReason {
  RECEIVED = 'RECEIVED',
  SOLD = 'SOLD',
  RETURNED = 'RETURNED',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  FOUND = 'FOUND',
  TRANSFERRED = 'TRANSFERRED',
  COUNT_ADJUSTMENT = 'COUNT_ADJUSTMENT',
  OTHER = 'OTHER',
}

export class CreateInventoryAdjustmentDto {
  @IsString()
  inventoryLevelId: string;

  @IsEnum(AdjustmentReason)
  type: AdjustmentReason;

  @IsInt()
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}

export class BulkAdjustInventoryDto {
  @IsString()
  locationId: string;

  @IsEnum(AdjustmentReason)
  type: AdjustmentReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  items: Array<{
    productId?: string;
    variantId?: string;
    quantity: number;
  }>;
}
