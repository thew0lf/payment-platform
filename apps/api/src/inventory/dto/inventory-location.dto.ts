import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export enum LocationType {
  WAREHOUSE = 'WAREHOUSE',
  STORE = 'STORE',
  DROPSHIP = 'DROPSHIP',
  VIRTUAL = 'VIRTUAL',
}

export class CreateInventoryLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code: string;

  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  country?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateInventoryLocationDto extends PartialType(CreateInventoryLocationDto) {}
