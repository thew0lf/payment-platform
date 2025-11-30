import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMediaDto {
  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  @IsOptional()
  caption?: string;
}

export class UpdateMediaDto {
  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  @IsOptional()
  caption?: string;
}

export class ReorderMediaDto {
  @IsArray()
  @IsString({ each: true })
  mediaIds: string[];
}

export class ProcessOptionsDto {
  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  scale?: number;

  @IsString()
  @IsOptional()
  gravity?: string;
}

export class ProcessMediaDto {
  @IsString()
  @IsIn(['remove_background', 'smart_crop', 'enhance', 'upscale'])
  action: 'remove_background' | 'smart_crop' | 'enhance' | 'upscale';

  @ValidateNested()
  @Type(() => ProcessOptionsDto)
  @IsOptional()
  options?: ProcessOptionsDto;
}
