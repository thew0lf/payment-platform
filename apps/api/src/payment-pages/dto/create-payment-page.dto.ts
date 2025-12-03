import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsUrl,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPageType, PaymentPageStatus } from '@prisma/client';

export class CreatePaymentPageDto {
  @ApiProperty({ description: 'Name of the payment page' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Custom domain for the payment page' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiProperty({ enum: PaymentPageType, description: 'Type of payment page' })
  @IsEnum(PaymentPageType)
  type: PaymentPageType;

  @ApiPropertyOptional({ enum: PaymentPageStatus })
  @IsOptional()
  @IsEnum(PaymentPageStatus)
  status?: PaymentPageStatus;

  @ApiPropertyOptional({ description: 'Theme ID to use' })
  @IsOptional()
  @IsString()
  themeId?: string;

  @ApiPropertyOptional({ description: 'Custom styles to override theme' })
  @IsOptional()
  @IsObject()
  customStyles?: Record<string, unknown>;

  // Branding fields (individual)
  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Favicon URL' })
  @IsOptional()
  @IsUrl()
  faviconUrl?: string;

  @ApiPropertyOptional({ description: 'Primary brand color' })
  @IsOptional()
  @IsString()
  brandColor?: string;

  // Content fields
  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description shown to customer' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Main headline' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ description: 'Supporting text' })
  @IsOptional()
  @IsString()
  subheadline?: string;

  // Payment Configuration (JSON)
  @ApiProperty({ description: 'Payment configuration - amounts, currencies, methods' })
  @IsObject()
  paymentConfig: Record<string, unknown>;

  @ApiProperty({ description: 'Accepted payment gateways with priority' })
  @IsObject()
  acceptedGateways: Record<string, unknown>;

  // Line items for CHECKOUT type
  @ApiPropertyOptional({ description: 'Product definitions for CHECKOUT type' })
  @IsOptional()
  @IsObject()
  lineItemsConfig?: Record<string, unknown>;

  // Subscription for SUBSCRIPTION type
  @ApiPropertyOptional({ description: 'Plans and trials for SUBSCRIPTION type' })
  @IsOptional()
  @IsObject()
  subscriptionConfig?: Record<string, unknown>;

  // Donation for DONATION type
  @ApiPropertyOptional({ description: 'Suggested amounts for DONATION type' })
  @IsOptional()
  @IsObject()
  donationConfig?: Record<string, unknown>;

  // Customer Fields
  @ApiProperty({ description: 'Which customer fields to collect' })
  @IsObject()
  customerFieldsConfig: Record<string, unknown>;

  // Shipping
  @ApiPropertyOptional({ description: 'Enable shipping' })
  @IsOptional()
  @IsBoolean()
  shippingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Shipping methods and rates' })
  @IsOptional()
  @IsObject()
  shippingConfig?: Record<string, unknown>;

  // Tax
  @ApiPropertyOptional({ description: 'Enable tax calculation' })
  @IsOptional()
  @IsBoolean()
  taxEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Tax calculation settings' })
  @IsOptional()
  @IsObject()
  taxConfig?: Record<string, unknown>;

  // Discounts
  @ApiPropertyOptional({ description: 'Enable discounts/coupons' })
  @IsOptional()
  @IsBoolean()
  discountsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Coupon settings' })
  @IsOptional()
  @IsObject()
  discountsConfig?: Record<string, unknown>;

  // Terms & Policies
  @ApiPropertyOptional({ description: 'Terms of service URL' })
  @IsOptional()
  @IsUrl()
  termsUrl?: string;

  @ApiPropertyOptional({ description: 'Privacy policy URL' })
  @IsOptional()
  @IsUrl()
  privacyUrl?: string;

  @ApiPropertyOptional({ description: 'Refund policy URL' })
  @IsOptional()
  @IsUrl()
  refundPolicyUrl?: string;

  @ApiPropertyOptional({ description: 'Custom terms text' })
  @IsOptional()
  @IsString()
  customTermsText?: string;

  @ApiPropertyOptional({ description: 'Require terms acceptance' })
  @IsOptional()
  @IsBoolean()
  requireTermsAccept?: boolean;

  // Success/Cancel
  @ApiPropertyOptional({ description: 'Redirect URL after success' })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Redirect URL on cancel' })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;

  @ApiPropertyOptional({ description: 'Message shown on success' })
  @IsOptional()
  @IsString()
  successMessage?: string;

  // Webhook
  @ApiPropertyOptional({ description: 'Webhook URL for payment events' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook HMAC secret' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  // AI & Analytics
  @ApiPropertyOptional({ description: 'Enable AI insights' })
  @IsOptional()
  @IsBoolean()
  aiInsightsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable conversion tracking' })
  @IsOptional()
  @IsBoolean()
  conversionTracking?: boolean;

  // A/B Testing
  @ApiPropertyOptional({ description: 'Is this a variant page' })
  @IsOptional()
  @IsBoolean()
  isVariant?: boolean;

  @ApiPropertyOptional({ description: 'Parent page ID for variants' })
  @IsOptional()
  @IsString()
  parentPageId?: string;

  @ApiPropertyOptional({ description: 'Variant name (A, B, C)' })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiPropertyOptional({ description: 'Traffic percentage (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  variantWeight?: number;

  // SEO
  @ApiPropertyOptional({ description: 'Meta title for SEO' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description for SEO' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Open Graph image URL' })
  @IsOptional()
  @IsUrl()
  ogImage?: string;

  @ApiPropertyOptional({ description: 'Prevent indexing' })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  // Security
  @ApiPropertyOptional({ description: 'Allowed embed domains' })
  @IsOptional()
  @IsObject()
  allowedDomains?: string[];

  @ApiPropertyOptional({ description: 'Sessions per IP per hour' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimit?: number;

  // PCI Compliance
  @ApiPropertyOptional({ description: 'Authorized scripts for PCI 6.4.3' })
  @IsOptional()
  @IsObject()
  scriptInventory?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Content Security Policy' })
  @IsOptional()
  @IsObject()
  cspPolicy?: Record<string, unknown>;
}
