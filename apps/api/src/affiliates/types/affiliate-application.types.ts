/**
 * Affiliate Application Types
 *
 * Types for the affiliate application/registration process.
 */

export interface SocialMediaProfiles {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  facebook?: string;
  blog?: string;
  podcast?: string;
  other?: string;
}

export interface AffiliateApplicationData {
  // Step 1: Contact Information
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;

  // Step 2: Business Details
  companyName?: string;
  website?: string;
  socialMedia?: SocialMediaProfiles;

  // Step 3: Traffic & Experience
  howDidYouHear?: string;
  promotionMethods: string[];
  estimatedReach?: string;
  relevantExperience?: string;
  additionalNotes?: string;

  // Step 4: Agreement
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
}

export interface AffiliateApplicationResult {
  success: boolean;
  applicationId: string;
  message: string;
  estimatedReviewDays?: number;
  referenceNumber?: string;
}

export interface AffiliateApplicationSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
  companyName?: string;
  website?: string;
}

export interface AffiliateProgramPublicInfo {
  companyName: string;
  companyLogo?: string;
  programName: string;
  programDescription?: string;
  defaultCommissionRate: number;
  cookieDurationDays: number;
  minimumPayoutThreshold: number;
  termsUrl?: string;
  privacyUrl?: string;
}

export const PROMOTION_METHODS = [
  { value: 'content_blog', label: 'Blog / Content Marketing' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email_marketing', label: 'Email Marketing' },
  { value: 'youtube', label: 'YouTube / Video' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'paid_ads', label: 'Paid Advertising' },
  { value: 'seo', label: 'SEO / Organic Search' },
  { value: 'influencer', label: 'Influencer Marketing' },
  { value: 'affiliate_network', label: 'Affiliate Networks' },
  { value: 'community', label: 'Community / Forums' },
  { value: 'other', label: 'Other' },
] as const;

export const ESTIMATED_REACH_OPTIONS = [
  { value: 'under_1k', label: 'Under 1,000' },
  { value: '1k_5k', label: '1,000 - 5,000' },
  { value: '5k_10k', label: '5,000 - 10,000' },
  { value: '10k_50k', label: '10,000 - 50,000' },
  { value: '50k_100k', label: '50,000 - 100,000' },
  { value: '100k_500k', label: '100,000 - 500,000' },
  { value: '500k_1m', label: '500,000 - 1 Million' },
  { value: 'over_1m', label: 'Over 1 Million' },
] as const;

export const HOW_DID_YOU_HEAR_OPTIONS = [
  { value: 'google', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'friend_referral', label: 'Friend / Colleague Referral' },
  { value: 'blog_article', label: 'Blog / Article' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'affiliate_network', label: 'Affiliate Network' },
  { value: 'existing_customer', label: 'Already a Customer' },
  { value: 'other', label: 'Other' },
] as const;
