import { IsString, IsOptional, IsEnum, IsUrl, MaxLength, MinLength, IsInt, Min, Max, IsBoolean, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class CreateSiteDto {
  @IsString()
  companyId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, {
    message: 'domain must be a valid domain format (e.g., example.com)',
  })
  domain?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, {
    message: 'subdomain must be a valid domain format (e.g., shop.example.com)',
  })
  subdomain?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'logo must be a valid HTTP/HTTPS URL' })
  logo?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'favicon must be a valid HTTP/HTTPS URL' })
  favicon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'ogImage must be a valid HTTP/HTTPS URL' })
  ogImage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, {
    message: 'domain must be a valid domain format (e.g., example.com)',
  })
  domain?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, {
    message: 'subdomain must be a valid domain format (e.g., shop.example.com)',
  })
  subdomain?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'logo must be a valid HTTP/HTTPS URL' })
  logo?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'favicon must be a valid HTTP/HTTPS URL' })
  favicon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'ogImage must be a valid HTTP/HTTPS URL' })
  ogImage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class SiteQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
