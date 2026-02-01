import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDate,
  Min,
  Max,
  IsUrl,
  IsEnum,
  ValidateNested,
  Matches,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * SubID configuration for tracking variables (t1-t5)
 *
 * This configuration allows customizing:
 * - Which SubIDs are enabled for this link
 * - Custom labels for each SubID (e.g., t1 = "Campaign", t2 = "Source")
 * - Default values for SubIDs
 *
 * Supports macros like {CLICK_ID}, {TIMESTAMP}, {DATE}, {RANDOM}
 *
 * @example
 * {
 *   enabledVariables: ['t1', 't2', 't3'],
 *   labels: { t1: 'Campaign', t2: 'Source', t3: 'Medium' },
 *   defaults: { t1: 'direct' }
 * }
 */
export class SubIdConfigDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledVariables?: string[]; // ['t1', 't2', 't3', 't4', 't5']

  @IsOptional()
  labels?: Record<string, string>; // { t1: 'Campaign', t2: 'Source' }

  @IsOptional()
  defaults?: Record<string, string>; // { t1: 'organic' }

  // Legacy support - individual SubID fields
  @IsOptional()
  @IsString()
  subId1?: string;

  @IsOptional()
  @IsString()
  subId1Label?: string;

  @IsOptional()
  @IsString()
  subId2?: string;

  @IsOptional()
  @IsString()
  subId2Label?: string;

  @IsOptional()
  @IsString()
  subId3?: string;

  @IsOptional()
  @IsString()
  subId3Label?: string;

  @IsOptional()
  @IsString()
  subId4?: string;

  @IsOptional()
  @IsString()
  subId4Label?: string;

  @IsOptional()
  @IsString()
  subId5?: string;

  @IsOptional()
  @IsString()
  subId5Label?: string;
}

/**
 * Helper type for SubID fields
 */
export type SubIdFields = {
  t1?: string;
  t2?: string;
  t3?: string;
  t4?: string;
  t5?: string;
  // Legacy names
  subId1?: string;
  subId2?: string;
  subId3?: string;
  subId4?: string;
  subId5?: string;
};

export class CreateLinkDto {
  @IsString()
  partnerId: string;

  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsUrl()
  destinationUrl: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]{4,16}$/, {
    message: 'Custom code must be 4-16 alphanumeric characters',
  })
  customCode?: string;

  @IsOptional()
  @IsString()
  shortCode?: string;

  // Campaign tracking
  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  // SubID fields
  @IsOptional()
  @IsString()
  subId1?: string;

  @IsOptional()
  @IsString()
  subId2?: string;

  @IsOptional()
  @IsString()
  subId3?: string;

  @IsOptional()
  @IsString()
  subId4?: string;

  @IsOptional()
  @IsString()
  subId5?: string;

  // SubID configuration (optional)
  @IsOptional()
  @ValidateNested()
  @Type(() => SubIdConfigDto)
  subIdConfig?: SubIdConfigDto;

  // Link settings
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxClicks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConversions?: number;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdateLinkDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  destinationUrl?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  subId1?: string;

  @IsOptional()
  @IsString()
  subId2?: string;

  @IsOptional()
  @IsString()
  subId3?: string;

  @IsOptional()
  @IsString()
  subId4?: string;

  @IsOptional()
  @IsString()
  subId5?: string;

  // SubID configuration (optional)
  @IsOptional()
  @ValidateNested()
  @Type(() => SubIdConfigDto)
  subIdConfig?: SubIdConfigDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxClicks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConversions?: number;
}

/**
 * Query parameters for listing links
 */
export class LinkQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  partnershipId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'totalClicks', 'totalConversions', 'totalRevenue', 'conversionRate'])
  sortBy?: 'createdAt' | 'totalClicks' | 'totalConversions' | 'totalRevenue' | 'conversionRate';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * Link performance stats response
 */
export class LinkStatsDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * Duplicate link with new SubIDs
 */
export class DuplicateLinkDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  destinationUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]{4,16}$/, {
    message: 'Short code must be 4-16 alphanumeric characters',
  })
  shortCode?: string;

  @IsOptional()
  @IsBoolean()
  generateShortCode?: boolean;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  subId1?: string;

  @IsOptional()
  @IsString()
  subId2?: string;

  @IsOptional()
  @IsString()
  subId3?: string;

  @IsOptional()
  @IsString()
  subId4?: string;

  @IsOptional()
  @IsString()
  subId5?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxClicks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConversions?: number;
}
