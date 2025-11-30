import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RefundType, RefundStatus, RefundReason, RefundMethod } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// CREATE REFUND DTO
// ═══════════════════════════════════════════════════════════════

export class CreateRefundDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsUUID()
  rmaId?: string;

  @IsOptional()
  @IsString()
  csSessionId?: string;

  @IsEnum(RefundType)
  type: RefundType;

  @IsEnum(RefundReason)
  reason: RefundReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonDetails?: string;

  @IsNumber()
  @Min(0)
  requestedAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsObject()
  amountBreakdown?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(RefundMethod)
  method?: RefundMethod;

  @IsString()
  @MaxLength(100)
  initiatedBy: string; // customer, ai_rep, ai_manager, human_agent, system

  @IsOptional()
  @IsString()
  @MaxLength(100)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerImpact?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  fraudScore?: number;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════
// UPDATE REFUND DTO
// ═══════════════════════════════════════════════════════════════

export class UpdateRefundDto {
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @IsOptional()
  @IsEnum(RefundMethod)
  method?: RefundMethod;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonDetails?: string;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════
// APPROVE/REJECT REFUND DTOS
// ═══════════════════════════════════════════════════════════════

export class ApproveRefundDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RejectRefundDto {
  @IsString()
  @MaxLength(1000)
  rejectionReason: string;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTO
// ═══════════════════════════════════════════════════════════════

export class RefundQueryParams {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsEnum(RefundType)
  type?: RefundType;

  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

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
}

// ═══════════════════════════════════════════════════════════════
// UPDATE REFUND SETTINGS DTO
// ═══════════════════════════════════════════════════════════════

export class UpdateRefundSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoApprovalEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  autoApprovalMaxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  autoApprovalMaxDays?: number;

  @IsOptional()
  @IsBoolean()
  requireReason?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPartialRefunds?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnRequest?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnCompletion?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface RefundStatsResult {
  totalRefunds: number;
  pendingRefunds: number;
  approvedRefunds: number;
  processingRefunds: number;
  completedRefunds: number;
  rejectedRefunds: number;
  cancelledRefunds: number;
  failedRefunds: number;
  totalRefundedAmount: number;
  averageRefundAmount: number;
  averageProcessingTime?: number; // in hours
}

export interface Refund {
  id: string;
  companyId: string;
  customerId: string;
  orderId: string;
  rmaId?: string;
  csSessionId?: string;
  type: RefundType;
  status: RefundStatus;
  reason: RefundReason;
  reasonDetails?: string;
  requestedAmount: number;
  approvedAmount?: number;
  currency: string;
  amountBreakdown?: Record<string, unknown>;
  method: RefundMethod;
  approvalLevel: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  autoApprovalRule?: string;
  paymentProcessor?: string;
  processorTransactionId?: string;
  processedAt?: Date;
  failureReason?: string;
  retryCount: number;
  initiatedBy: string;
  channel?: string;
  customerImpact?: string;
  fraudScore?: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface RefundSettings {
  id: string;
  companyId: string;
  autoApprovalEnabled: boolean;
  autoApprovalMaxAmount: number;
  autoApprovalMaxDays: number;
  requireReason: boolean;
  requireApproval: boolean;
  allowPartialRefunds: boolean;
  notifyOnRequest: boolean;
  notifyOnApproval: boolean;
  notifyOnCompletion: boolean;
  createdAt: Date;
  updatedAt: Date;
}
