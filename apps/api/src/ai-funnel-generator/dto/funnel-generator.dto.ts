import { IsString, IsArray, IsEnum, IsObject, IsOptional, MinLength, ArrayMinSize } from 'class-validator';
import { MarketingMethodology } from '../types/funnel-generator.types';

export class StartGenerationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];

  @IsOptional()
  @IsString()
  primaryProductId?: string;

  @IsEnum(MarketingMethodology)
  methodology: MarketingMethodology;

  @IsObject()
  discoveryAnswers: Record<string, string>;
}

export class SaveFunnelDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class RegenerateSectionDto {
  @IsString()
  section: 'landing' | 'products' | 'emails' | 'leadCapture' | 'checkout' | 'success';
}
