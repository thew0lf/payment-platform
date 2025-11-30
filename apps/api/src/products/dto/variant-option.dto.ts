import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

// DTO for creating variant option values
export class CreateVariantOptionValueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayValue?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'colorCode must be a valid hex color (e.g., #FF5733)' })
  colorCode?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

// DTO for updating variant option values
export class UpdateVariantOptionValueDto extends PartialType(CreateVariantOptionValueDto) {
  @IsString()
  @IsOptional()
  id?: string;
}

// DTO for creating a variant option
export class CreateVariantOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantOptionValueDto)
  @ArrayMinSize(1)
  values: CreateVariantOptionValueDto[];
}

// DTO for updating a variant option
export class UpdateVariantOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  displayName?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantOptionValueDto)
  @IsOptional()
  values?: UpdateVariantOptionValueDto[];
}

// DTO for adding a value to an existing option
export class AddVariantOptionValueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayValue?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'colorCode must be a valid hex color (e.g., #FF5733)' })
  colorCode?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

// DTO for reordering values
export class ReorderValuesDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  valueIds: string[];
}

// DTO for reordering options
export class ReorderOptionsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  optionIds: string[];
}
