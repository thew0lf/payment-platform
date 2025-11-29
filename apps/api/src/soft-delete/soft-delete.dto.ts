import {
  IsString,
  IsBoolean,
  IsOptional,
  IsIn,
  IsDate,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SOFT_DELETE_MODELS, PERMANENT_DELETE_REASONS, SoftDeleteModel, PermanentDeleteReason } from './soft-delete.constants';

// ═══════════════════════════════════════════════════════════════
// DELETE DTOs
// ═══════════════════════════════════════════════════════════════

export class DeleteEntityDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  cascade?: boolean = true;
}

export class RestoreEntityDto {
  @IsOptional()
  @IsBoolean()
  cascade?: boolean = true;
}

export class PermanentDeleteDto {
  @IsIn(PERMANENT_DELETE_REASONS)
  reason: PermanentDeleteReason;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════

export class ListDeletedDto {
  @IsOptional()
  @IsIn([...SOFT_DELETE_MODELS])
  entityType?: SoftDeleteModel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deletedAfter?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deletedBefore?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class EntityTypeParamDto {
  @IsIn([...SOFT_DELETE_MODELS])
  entityType: SoftDeleteModel;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface DeletedRecord {
  id: string;
  entityType: SoftDeleteModel;
  entityName: string | null;
  deletedAt: Date;
  deletedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  deleteReason: string | null;
  cascadedFrom: string | null;
  canRestore: boolean;
  expiresAt: Date;
  cascadedCount: number;
}

export interface DeletionPreview {
  entity: {
    id: string;
    name: string;
    type: SoftDeleteModel;
  };
  cascadeCount: Record<string, number>;
  totalAffected: number;
  warnings: string[];
}

export interface DeletionDetails {
  id: string;
  entityType: SoftDeleteModel;
  entityId: string;
  entityName: string | null;
  deletedAt: Date;
  deletedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  deleteReason: string | null;
  canRestore: boolean;
  expiresAt: Date;
  retentionDays: number;
  cascadeRecords: Array<{
    entityType: string;
    entityId: string;
    entityName: string | null;
  }>;
  snapshot: Record<string, unknown> | null;
}

export interface DeleteResult {
  success: boolean;
  message: string;
  cascadeId?: string;
  affectedCount?: number;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredCount?: number;
}

export interface PurgeResult {
  purged: Record<string, number>;
  totalPurged: number;
}
