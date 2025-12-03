import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckoutPageThemeCategory } from '@prisma/client';
import type { ThemeStyles, ThemeLayout, ComponentStyles } from '../types';

export class CreateThemeDto {
  @ApiProperty({ description: 'Name of the theme' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Theme description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: CheckoutPageThemeCategory, description: 'Theme category' })
  @IsEnum(CheckoutPageThemeCategory)
  category: CheckoutPageThemeCategory;

  @ApiPropertyOptional({ description: 'Preview image URL' })
  @IsOptional()
  @IsUrl()
  previewImageUrl?: string;

  @ApiPropertyOptional({ description: 'Whether this is a system theme' })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Whether this theme is publicly available' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: 'Theme style configuration' })
  @IsObject()
  styles: ThemeStyles;

  @ApiProperty({ description: 'Theme layout configuration' })
  @IsObject()
  layout: ThemeLayout;

  @ApiProperty({ description: 'Component styles configuration' })
  @IsObject()
  components: ComponentStyles;

  @ApiPropertyOptional({ description: 'Dark mode style overrides' })
  @IsOptional()
  @IsObject()
  darkModeStyles?: Partial<ThemeStyles>;
}
