import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDate,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { PriceRuleType, AdjustmentType } from '@prisma/client';

export class CreatePriceRuleDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(PriceRuleType)
  type: PriceRuleType;

  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @IsNumber()
  @Min(0)
  adjustmentValue: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minQuantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxQuantity?: number;

  @IsString()
  @IsOptional()
  customerGroupId?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePriceRuleDto extends PartialType(CreatePriceRuleDto) {}

export class CalculatePriceDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsString()
  @IsOptional()
  customerGroupId?: string;
}

export class ListPriceRulesQueryDto {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
