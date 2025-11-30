import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';

export class GenerateDescriptionDto {
  @IsString()
  @MaxLength(200)
  productName: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;

  @IsString()
  @IsIn(['professional', 'casual', 'luxury', 'technical'])
  @IsOptional()
  tone?: 'professional' | 'casual' | 'luxury' | 'technical';

  @IsString()
  @IsIn(['short', 'medium', 'long'])
  @IsOptional()
  length?: 'short' | 'medium' | 'long';

  @IsString()
  @IsOptional()
  @MaxLength(200)
  targetAudience?: string;

  @IsBoolean()
  @IsOptional()
  includeSEO?: boolean;

  @IsString()
  @IsOptional()
  companyId?: string;
}

export class SuggestCategoryDto {
  @IsString()
  @MaxLength(200)
  productName: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}

export class GenerateAltTextDto {
  @IsString()
  @MaxLength(200)
  productName: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  imageDescription?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}

export class CheckGrammarDto {
  @IsString()
  @MaxLength(10000)
  text: string;

  @IsString()
  @IsOptional()
  @IsIn(['en-US', 'en-GB', 'en-AU', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string;
}

export class ImproveDescriptionDto {
  @IsString()
  @MaxLength(5000)
  description: string;

  @IsString()
  @IsIn(['professional', 'casual', 'luxury', 'technical'])
  @IsOptional()
  tone?: 'professional' | 'casual' | 'luxury' | 'technical';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  focusAreas?: string[];

  @IsString()
  @IsOptional()
  companyId?: string;
}

export class ApplyAIContentDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;
}
