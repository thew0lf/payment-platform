import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  MaxLength,
  IsObject,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionDataType, SessionStatus } from '../types/cross-site-session.types';

/**
 * DTO for creating a new cross-site session
 */
export class CreateCrossSiteSessionDto {
  @ApiPropertyOptional({ description: 'Company ID' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Site ID where session originated' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Visitor ID for tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  visitorId?: string;

  @ApiPropertyOptional({ description: 'Device/browser info' })
  @IsOptional()
  @IsObject()
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    fingerprint?: string;
  };
}

/**
 * DTO for transferring session data to another site
 */
export class TransferSessionDto {
  @ApiProperty({ description: 'Target site ID to transfer session to' })
  @IsString()
  targetSiteId: string;

  @ApiPropertyOptional({
    description: 'Which data types to transfer',
    enum: SessionDataType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SessionDataType, { each: true })
  dataTypes?: SessionDataType[];
}

/**
 * DTO for merging two sessions together
 */
export class MergeSessionsDto {
  @ApiProperty({ description: 'Source session token to merge from' })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  sourceSessionToken: string;

  @ApiPropertyOptional({
    description: 'Conflict resolution strategy',
    enum: ['KEEP_SOURCE', 'KEEP_TARGET', 'MERGE_ALL'],
    default: 'MERGE_ALL',
  })
  @IsOptional()
  @IsEnum(['KEEP_SOURCE', 'KEEP_TARGET', 'MERGE_ALL'])
  conflictStrategy?: 'KEEP_SOURCE' | 'KEEP_TARGET' | 'MERGE_ALL';
}

/**
 * DTO for attaching a customer to an existing session
 */
export class AttachCustomerDto {
  @ApiProperty({ description: 'Customer ID to attach to session' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Whether to merge guest data into customer data',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  mergeGuestData?: boolean;
}

/**
 * Query DTO for fetching cross-site sessions
 */
export class SessionQueryDto {
  @ApiPropertyOptional({ description: 'Site ID to filter by' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Include only active sessions',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by session status',
    enum: SessionStatus,
  })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Include data references in response' })
  @IsOptional()
  @IsBoolean()
  includeDataReferences?: boolean;
}

/**
 * DTO for updating session activity
 */
export class UpdateSessionActivityDto {
  @ApiPropertyOptional({ description: 'Site ID where activity occurred' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Updated device info' })
  @IsOptional()
  @IsObject()
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    fingerprint?: string;
  };
}

/**
 * DTO for revoking a session
 */
export class RevokeSessionDto {
  @ApiPropertyOptional({
    description: 'Reason for revoking the session',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Whether to revoke all sessions for this visitor/customer',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  revokeAll?: boolean;
}

/**
 * DTO for linking data to a session
 */
export class LinkDataToSessionDto {
  @ApiProperty({
    description: 'Type of data being linked',
    enum: SessionDataType,
  })
  @IsEnum(SessionDataType)
  type: SessionDataType;

  @ApiProperty({ description: 'Entity ID (cart ID, wishlist ID, etc.)' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Site ID where the data was created' })
  @IsString()
  siteId: string;
}

/**
 * DTO for unlinking data from a session
 */
export class UnlinkDataFromSessionDto {
  @ApiProperty({
    description: 'Type of data being unlinked',
    enum: SessionDataType,
  })
  @IsEnum(SessionDataType)
  type: SessionDataType;

  @ApiProperty({ description: 'Entity ID to unlink' })
  @IsString()
  entityId: string;
}

/**
 * DTO for creating a session (public endpoint)
 * Used by anonymous visitors to create a new session
 */
export class CreateSessionDto {
  @ApiPropertyOptional({ description: 'Site ID where session originated' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Visitor ID for tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  visitorId?: string;

  @ApiPropertyOptional({ description: 'Device fingerprint for tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  deviceFingerprint?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Client IP address' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;
}

/**
 * DTO for merging a guest session into authenticated user session
 * Used when a user logs in and wants to keep their guest cart/wishlist
 */
export class MergeSessionDto {
  @ApiProperty({ description: 'Source session ID to merge from (guest session)' })
  @IsString()
  sourceSessionId: string;

  @ApiPropertyOptional({
    description: 'Conflict resolution strategy',
    enum: ['KEEP_SOURCE', 'KEEP_TARGET', 'MERGE_ALL'],
    default: 'MERGE_ALL',
  })
  @IsOptional()
  @IsEnum(['KEEP_SOURCE', 'KEEP_TARGET', 'MERGE_ALL'])
  conflictStrategy?: 'KEEP_SOURCE' | 'KEEP_TARGET' | 'MERGE_ALL';
}

/**
 * DTO for updating session activity (public endpoint)
 * Used to track page views and update last activity timestamp
 */
export class UpdateActivityDto {
  @ApiPropertyOptional({ description: 'Current site ID where user is browsing' })
  @IsOptional()
  @IsString()
  currentSiteId?: string;

  @ApiPropertyOptional({ description: 'Current page URL or path' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  currentPage?: string;
}
