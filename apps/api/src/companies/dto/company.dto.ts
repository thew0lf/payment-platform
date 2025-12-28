import { IsString, IsOptional, IsEnum, IsUrl, MaxLength, MinLength, IsInt, Min, Max, Matches, IsIn, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Whitelist of valid IANA timezones (common ones)
const VALID_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto',
  'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Zurich', 'Europe/Vienna', 'Europe/Warsaw',
  'Europe/Prague', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Helsinki',
  'Europe/Moscow', 'Europe/Istanbul', 'Asia/Dubai', 'Asia/Jerusalem', 'Asia/Mumbai',
  'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
];

// Whitelist of valid ISO 4217 currency codes
const VALID_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'CHF', 'HKD', 'SGD',
  'NZD', 'KRW', 'MXN', 'BRL', 'INR', 'RUB', 'ZAR', 'TRY', 'AED', 'SAR',
  'THB', 'PLN', 'SEK', 'NOK', 'DKK', 'ILS', 'MYR', 'PHP', 'IDR', 'VND',
];

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and dangerous characters
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '')  // Remove dangerous chars
    .trim();
}

export class CreateCompanyDto {
  @IsOptional()
  @IsString()
  @IsUUID('4', { message: 'clientId must be a valid UUID' })
  clientId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => sanitizeString(value))
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/, {
    message: 'domain must be a valid domain name (e.g., example.com)',
  })
  domain?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true }, {
    message: 'logo must be a valid HTTPS URL'
  })
  logo?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_TIMEZONES, { message: 'timezone must be a valid IANA timezone' })
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_CURRENCIES, { message: 'currency must be a valid ISO 4217 currency code' })
  currency?: string;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => sanitizeString(value))
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/, {
    message: 'domain must be a valid domain name (e.g., example.com)',
  })
  domain?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true }, {
    message: 'logo must be a valid HTTPS URL'
  })
  logo?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_TIMEZONES, { message: 'timezone must be a valid IANA timezone' })
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_CURRENCIES, { message: 'currency must be a valid ISO 4217 currency code' })
  currency?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class CompanyQueryDto {
  @IsOptional()
  @IsString()
  @IsUUID('4', { message: 'clientId must be a valid UUID' })
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => sanitizeString(value))
  search?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsIn(['name', 'createdAt'], { message: 'sortBy must be name or createdAt' })
  sortBy?: 'name' | 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sortOrder must be asc or desc' })
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
