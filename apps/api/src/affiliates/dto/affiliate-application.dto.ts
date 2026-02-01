/**
 * Affiliate Application DTOs
 *
 * Data transfer objects for affiliate application/registration endpoints.
 */

import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
  MinLength,
  MaxLength,
  IsNotEmpty,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialMediaProfilesDto {
  @IsOptional()
  @IsUrl({}, { message: 'Twitter must be a valid URL' })
  twitter?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Instagram must be a valid URL' })
  instagram?: string;

  @IsOptional()
  @IsUrl({}, { message: 'YouTube must be a valid URL' })
  youtube?: string;

  @IsOptional()
  @IsUrl({}, { message: 'TikTok must be a valid URL' })
  tiktok?: string;

  @IsOptional()
  @IsUrl({}, { message: 'LinkedIn must be a valid URL' })
  linkedin?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Facebook must be a valid URL' })
  facebook?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Blog must be a valid URL' })
  blog?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Podcast must be a valid URL' })
  podcast?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  other?: string;
}

export class CreateAffiliateApplicationDto {
  // Company context (required)
  @IsString()
  @IsNotEmpty({ message: 'Company ID is required' })
  companyId: string;

  // Step 1: Contact Information
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  // Step 2: Business Details
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaProfilesDto)
  socialMedia?: SocialMediaProfilesDto;

  // Step 3: Traffic & Experience
  @IsOptional()
  @IsString()
  @MaxLength(100)
  howDidYouHear?: string;

  @IsArray({ message: 'Please select at least one promotion method' })
  @ArrayMinSize(1, { message: 'Please select at least one promotion method' })
  @IsString({ each: true })
  promotionMethods: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  estimatedReach?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Experience description must be under 2000 characters' })
  relevantExperience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Additional notes must be under 2000 characters' })
  additionalNotes?: string;

  // Step 4: Agreement
  @IsBoolean()
  @IsNotEmpty({ message: 'You must agree to the terms and conditions' })
  agreedToTerms: boolean;

  @IsBoolean()
  @IsNotEmpty({ message: 'You must agree to the privacy policy' })
  agreedToPrivacy: boolean;

  // reCAPTCHA token for spam prevention
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}

export class GetProgramInfoDto {
  @IsString()
  @IsNotEmpty()
  companyCode: string;
}
