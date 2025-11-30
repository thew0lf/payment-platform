import {
  IsString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateInventoryLevelDto {
  @IsString()
  locationId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  onHand?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  committed?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  incoming?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderPoint?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderQuantity?: number;
}

export class UpdateInventoryLevelDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  onHand?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  committed?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  incoming?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderPoint?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderQuantity?: number;
}

export class SetInventoryDto {
  @IsString()
  locationId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class TransferInventoryDto {
  @IsString()
  fromLocationId: string;

  @IsString()
  toLocationId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
