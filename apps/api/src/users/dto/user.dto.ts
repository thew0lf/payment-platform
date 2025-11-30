import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsEmail,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus, ScopeType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// QUERY DTO
// ═══════════════════════════════════════════════════════════════

export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════
// INVITE USER DTO
// ═══════════════════════════════════════════════════════════════

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsString()
  scopeId: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];
}

// ═══════════════════════════════════════════════════════════════
// UPDATE USER DTO
// ═══════════════════════════════════════════════════════════════

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

// ═══════════════════════════════════════════════════════════════
// STATUS UPDATE DTO
// ═══════════════════════════════════════════════════════════════

export class UpdateStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

// ═══════════════════════════════════════════════════════════════
// ROLE ASSIGNMENT DTO
// ═══════════════════════════════════════════════════════════════

export class AssignRoleDto {
  @IsUUID()
  roleId: string;

  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsString()
  scopeId: string;
}
