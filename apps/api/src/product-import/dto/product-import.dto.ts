import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ImportJobStatus, ImportJobPhase } from '@prisma/client';
import { FieldTransform } from '../types/product-import.types';

// ═══════════════════════════════════════════════════════════════
// FIELD MAPPING DTO
// ═══════════════════════════════════════════════════════════════

export class FieldMappingDto {
  @IsString()
  @IsNotEmpty()
  sourceField: string;

  @IsString()
  @IsNotEmpty()
  targetField: string;

  @IsOptional()
  @IsString()
  transform?: FieldTransform;
}

// ═══════════════════════════════════════════════════════════════
// CREATE IMPORT JOB DTO
// ═══════════════════════════════════════════════════════════════

export class CreateImportJobDto {
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedProductIds?: string[];

  @IsOptional()
  @IsBoolean()
  importImages?: boolean = true;

  @IsOptional()
  @IsBoolean()
  generateThumbnails?: boolean = true;

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean = true;

  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean = false;

  @IsOptional()
  @IsString()
  fieldMappingProfileId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  customMappings?: FieldMappingDto[];
}

// ═══════════════════════════════════════════════════════════════
// PREVIEW IMPORT DTO
// ═══════════════════════════════════════════════════════════════

export class PreviewImportDto {
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsOptional()
  @IsString()
  fieldMappingProfileId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  customMappings?: FieldMappingDto[];
}

// ═══════════════════════════════════════════════════════════════
// FIELD MAPPING PROFILE DTO
// ═══════════════════════════════════════════════════════════════

export class CreateFieldMappingProfileDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  mappings: FieldMappingDto[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}

export class UpdateFieldMappingProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  mappings?: FieldMappingDto[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════

export class ListImportJobsQueryDto {
  @IsOptional()
  @IsEnum(ImportJobStatus)
  status?: ImportJobStatus;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE DTOs
// ═══════════════════════════════════════════════════════════════

export class ImportJobResponseDto {
  id: string;
  companyId: string;
  provider: string;
  status: ImportJobStatus;
  phase: ImportJobPhase;
  progress: number;
  totalProducts: number;
  processedProducts: number;
  totalImages: number;
  processedImages: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  currentItem?: string;
  estimatedSecondsRemaining?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class PreviewProductDto {
  externalId: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageCount: number;
  variantCount: number;
  willImport: boolean;
  skipReason?: string;
  mappedData: Record<string, unknown>;
}

export class PreviewImportResponseDto {
  provider: string;
  totalProducts: number;
  willImport: number;
  willSkip: number;
  estimatedImages: number;
  products: PreviewProductDto[];
  suggestedMappings: FieldMappingDto[];
}

export class ImportJobListResponseDto {
  items: ImportJobResponseDto[];
  total: number;
  limit: number;
  offset: number;
}
