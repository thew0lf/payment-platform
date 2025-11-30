import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  MarketingVideoType,
  VideoGenerationStatus,
  VideoPlatform,
  SceneMediaType,
} from '@prisma/client';

// ============================================================================
// Scene DTOs
// ============================================================================

export class CreateVideoSceneDto {
  @IsNumber()
  @Min(1)
  sceneNumber: number;

  @IsNumber()
  @Min(1)
  @Max(60)
  duration: number;

  @IsEnum(SceneMediaType)
  mediaType: SceneMediaType;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  textOverlay?: string;

  @IsString()
  @IsOptional()
  textPosition?: string;

  @IsObject()
  @IsOptional()
  textStyle?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  transitionIn?: string;

  @IsString()
  @IsOptional()
  transitionOut?: string;
}

export class UpdateVideoSceneDto extends PartialType(CreateVideoSceneDto) {}

// ============================================================================
// Variant DTOs
// ============================================================================

export class CreateVideoVariantDto {
  @IsEnum(VideoPlatform)
  platform: VideoPlatform;

  @IsString()
  aspectRatio: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Main Video DTOs
// ============================================================================

export class CreateMarketingVideoDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(MarketingVideoType)
  type: MarketingVideoType;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsObject()
  @IsOptional()
  style?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  script?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  voiceoverText?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  callToAction?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  interventionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVideoSceneDto)
  @IsOptional()
  scenes?: CreateVideoSceneDto[];
}

export class UpdateMarketingVideoDto extends PartialType(CreateMarketingVideoDto) {
  @IsEnum(VideoGenerationStatus)
  @IsOptional()
  status?: VideoGenerationStatus;
}

// ============================================================================
// Generation DTOs
// ============================================================================

export class GenerateVideoFromProductDto {
  @IsString()
  productId: string;

  @IsEnum(MarketingVideoType)
  @IsOptional()
  type?: MarketingVideoType;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsObject()
  @IsOptional()
  style?: {
    mood?: 'professional' | 'casual' | 'luxury' | 'playful';
    colorScheme?: string;
    musicStyle?: string;
  };

  @IsArray()
  @IsEnum(VideoPlatform, { each: true })
  @IsOptional()
  platforms?: VideoPlatform[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  customPrompt?: string;

  @IsBoolean()
  @IsOptional()
  generateScript?: boolean;

  @IsBoolean()
  @IsOptional()
  useAIVoiceover?: boolean;
}

export class GenerateSceneMediaDto {
  @IsString()
  videoId: string;

  @IsNumber()
  @Min(1)
  sceneNumber: number;

  @IsString()
  @IsOptional()
  sourceImageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  prompt?: string;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(10)
  duration?: number;

  @IsString()
  @IsOptional()
  aspectRatio?: string;
}

export class GenerateScriptDto {
  @IsString()
  productId: string;

  @IsEnum(MarketingVideoType)
  type: MarketingVideoType;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(120)
  targetDuration?: number;

  @IsString()
  @IsOptional()
  tone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  additionalContext?: string;
}

// ============================================================================
// Query DTOs
// ============================================================================

export class ListMarketingVideosQueryDto {
  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsEnum(MarketingVideoType)
  @IsOptional()
  type?: MarketingVideoType;

  @IsEnum(VideoGenerationStatus)
  @IsOptional()
  status?: VideoGenerationStatus;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}

// ============================================================================
// Template DTOs
// ============================================================================

export class CreateVideoTemplateDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(MarketingVideoType)
  type: MarketingVideoType;

  @IsNumber()
  @Min(1)
  @Max(20)
  sceneCount: number;

  @IsNumber()
  @Min(5)
  @Max(180)
  defaultDuration: number;

  @IsObject()
  structure: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  defaultStyle?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  scriptTemplate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVideoTemplateDto extends PartialType(CreateVideoTemplateDto) {}
