import { IsString, IsOptional, IsIP } from 'class-validator';

export class TrackClickDto {
  @IsString()
  trackingCode: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  // SubID overrides from URL params
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

  // Session linking
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ClickQueryDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  subId1?: string;

  @IsOptional()
  @IsString()
  subId2?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}
