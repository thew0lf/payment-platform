-- CreateEnum
CREATE TYPE "PartnershipType" AS ENUM ('AFFILIATE', 'AMBASSADOR', 'INFLUENCER', 'RESELLER', 'REFERRAL');

-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AffiliateTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "AffiliatePayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "AffiliatePayoutMethod" AS ENUM ('PAYPAL', 'BANK_TRANSFER', 'CHECK', 'CRYPTO', 'STORE_CREDIT');

-- CreateEnum
CREATE TYPE "ClickStatus" AS ENUM ('VALID', 'DUPLICATE', 'SUSPICIOUS', 'FRAUD', 'BOT');

-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVERSED', 'DISPUTED');

-- CreateTable
CREATE TABLE "affiliate_partners" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "socialMedia" JSONB,
    "affiliateCode" TEXT NOT NULL,
    "partnershipType" "PartnershipType" NOT NULL DEFAULT 'AFFILIATE',
    "status" "AffiliateStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "tier" "AffiliateTier" NOT NULL DEFAULT 'BRONZE',
    "commissionRate" DOUBLE PRECISION,
    "commissionFlat" DOUBLE PRECISION,
    "secondTierRate" DOUBLE PRECISION,
    "cookieDurationDays" INTEGER,
    "customTerms" JSONB,
    "payoutMethod" "AffiliatePayoutMethod" NOT NULL DEFAULT 'PAYPAL',
    "payoutThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "payoutDetails" JSONB,
    "taxId" TEXT,
    "w9OnFile" BOOLEAN NOT NULL DEFAULT false,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicationData" JSONB,
    "applicationNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "affiliate_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "shortCode" TEXT,
    "campaign" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "subId1" TEXT,
    "subId2" TEXT,
    "subId3" TEXT,
    "subId4" TEXT,
    "subId5" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "maxClicks" INTEGER,
    "maxConversions" INTEGER,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddressHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "subId1" TEXT,
    "subId2" TEXT,
    "subId3" TEXT,
    "subId4" TEXT,
    "subId5" TEXT,
    "status" "ClickStatus" NOT NULL DEFAULT 'VALID',
    "fraudScore" DOUBLE PRECISION,
    "fraudReasons" TEXT[],
    "isUnique" BOOLEAN NOT NULL DEFAULT true,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "idempotencyKey" TEXT,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_conversions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "linkId" TEXT,
    "companyId" TEXT NOT NULL,
    "clickId" TEXT,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "secondTierAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attributionWindow" INTEGER NOT NULL,
    "isFirstPurchase" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "status" "ConversionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectReason" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "reversalAmount" DOUBLE PRECISION,
    "idempotencyKey" TEXT,
    "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_payouts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "AffiliatePayoutMethod" NOT NULL,
    "status" "AffiliatePayoutStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "conversionsCount" INTEGER NOT NULL,
    "reversalsCount" INTEGER NOT NULL DEFAULT 0,
    "reversalsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionId" TEXT,
    "paymentDetails" JSONB,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "invoiceNumber" TEXT,
    "invoiceUrl" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_creatives" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "size" TEXT,
    "assetUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "htmlCode" TEXT,
    "defaultLinkId" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "affiliate_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_program_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "programName" TEXT NOT NULL DEFAULT 'Affiliate Program',
    "programDescription" TEXT,
    "defaultCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultCommissionFlat" DOUBLE PRECISION,
    "defaultSecondTierRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "defaultCookieDurationDays" INTEGER NOT NULL DEFAULT 30,
    "tierThresholds" JSONB NOT NULL DEFAULT '{"silver": 10, "gold": 50, "platinum": 200, "diamond": 1000}',
    "minimumPayoutThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "payoutFrequency" TEXT NOT NULL DEFAULT 'monthly',
    "automaticPayouts" BOOLEAN NOT NULL DEFAULT false,
    "attributionWindowDays" INTEGER NOT NULL DEFAULT 30,
    "lastClickAttribution" BOOLEAN NOT NULL DEFAULT true,
    "deduplicationWindowMins" INTEGER NOT NULL DEFAULT 60,
    "fraudScoreThreshold" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "requireManualApproval" BOOLEAN NOT NULL DEFAULT true,
    "holdPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "termsUrl" TEXT,
    "privacyUrl" TEXT,
    "customTerms" TEXT,
    "requireW9" BOOLEAN NOT NULL DEFAULT false,
    "requireTaxId" BOOLEAN NOT NULL DEFAULT false,
    "portalLogoUrl" TEXT,
    "portalTheme" JSONB,
    "welcomeMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_program_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_applications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "socialMedia" JSONB,
    "howDidYouHear" TEXT,
    "promotionMethods" TEXT[],
    "estimatedReach" TEXT,
    "relevantExperience" TEXT,
    "additionalNotes" TEXT,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "affiliatePartnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_partners_affiliateCode_key" ON "affiliate_partners"("affiliateCode");

-- CreateIndex
CREATE INDEX "affiliate_partners_companyId_status_idx" ON "affiliate_partners"("companyId", "status");

-- CreateIndex
CREATE INDEX "affiliate_partners_companyId_tier_idx" ON "affiliate_partners"("companyId", "tier");

-- CreateIndex
CREATE INDEX "affiliate_partners_companyId_partnershipType_idx" ON "affiliate_partners"("companyId", "partnershipType");

-- CreateIndex
CREATE INDEX "affiliate_partners_status_createdAt_idx" ON "affiliate_partners"("status", "createdAt");

-- CreateIndex
CREATE INDEX "affiliate_partners_affiliateCode_idx" ON "affiliate_partners"("affiliateCode");

-- CreateIndex
CREATE INDEX "affiliate_partners_deletedAt_idx" ON "affiliate_partners"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_partners_companyId_email_key" ON "affiliate_partners"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_partners_companyId_affiliateCode_key" ON "affiliate_partners"("companyId", "affiliateCode");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_trackingCode_key" ON "affiliate_links"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_shortCode_key" ON "affiliate_links"("shortCode");

-- CreateIndex
CREATE INDEX "affiliate_links_partnerId_isActive_idx" ON "affiliate_links"("partnerId", "isActive");

-- CreateIndex
CREATE INDEX "affiliate_links_companyId_isActive_idx" ON "affiliate_links"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "affiliate_links_trackingCode_idx" ON "affiliate_links"("trackingCode");

-- CreateIndex
CREATE INDEX "affiliate_links_shortCode_idx" ON "affiliate_links"("shortCode");

-- CreateIndex
CREATE INDEX "affiliate_links_campaign_idx" ON "affiliate_links"("campaign");

-- CreateIndex
CREATE INDEX "affiliate_links_deletedAt_idx" ON "affiliate_links"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_clicks_idempotencyKey_key" ON "affiliate_clicks"("idempotencyKey");

-- CreateIndex
CREATE INDEX "affiliate_clicks_partnerId_clickedAt_idx" ON "affiliate_clicks"("partnerId", "clickedAt");

-- CreateIndex
CREATE INDEX "affiliate_clicks_linkId_clickedAt_idx" ON "affiliate_clicks"("linkId", "clickedAt");

-- CreateIndex
CREATE INDEX "affiliate_clicks_companyId_clickedAt_idx" ON "affiliate_clicks"("companyId", "clickedAt");

-- CreateIndex
CREATE INDEX "affiliate_clicks_visitorId_idx" ON "affiliate_clicks"("visitorId");

-- CreateIndex
CREATE INDEX "affiliate_clicks_ipAddressHash_clickedAt_idx" ON "affiliate_clicks"("ipAddressHash", "clickedAt");

-- CreateIndex
CREATE INDEX "affiliate_clicks_status_clickedAt_idx" ON "affiliate_clicks"("status", "clickedAt");

-- CreateIndex
CREATE INDEX "affiliate_clicks_idempotencyKey_idx" ON "affiliate_clicks"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_conversions_orderId_key" ON "affiliate_conversions"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_conversions_idempotencyKey_key" ON "affiliate_conversions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "affiliate_conversions_partnerId_status_idx" ON "affiliate_conversions"("partnerId", "status");

-- CreateIndex
CREATE INDEX "affiliate_conversions_partnerId_convertedAt_idx" ON "affiliate_conversions"("partnerId", "convertedAt");

-- CreateIndex
CREATE INDEX "affiliate_conversions_companyId_status_idx" ON "affiliate_conversions"("companyId", "status");

-- CreateIndex
CREATE INDEX "affiliate_conversions_companyId_convertedAt_idx" ON "affiliate_conversions"("companyId", "convertedAt");

-- CreateIndex
CREATE INDEX "affiliate_conversions_orderId_idx" ON "affiliate_conversions"("orderId");

-- CreateIndex
CREATE INDEX "affiliate_conversions_customerId_idx" ON "affiliate_conversions"("customerId");

-- CreateIndex
CREATE INDEX "affiliate_conversions_status_convertedAt_idx" ON "affiliate_conversions"("status", "convertedAt");

-- CreateIndex
CREATE INDEX "affiliate_conversions_idempotencyKey_idx" ON "affiliate_conversions"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_payouts_invoiceNumber_key" ON "affiliate_payouts"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_payouts_idempotencyKey_key" ON "affiliate_payouts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "affiliate_payouts_partnerId_status_idx" ON "affiliate_payouts"("partnerId", "status");

-- CreateIndex
CREATE INDEX "affiliate_payouts_partnerId_periodEnd_idx" ON "affiliate_payouts"("partnerId", "periodEnd");

-- CreateIndex
CREATE INDEX "affiliate_payouts_companyId_status_idx" ON "affiliate_payouts"("companyId", "status");

-- CreateIndex
CREATE INDEX "affiliate_payouts_status_createdAt_idx" ON "affiliate_payouts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "affiliate_payouts_invoiceNumber_idx" ON "affiliate_payouts"("invoiceNumber");

-- CreateIndex
CREATE INDEX "affiliate_payouts_idempotencyKey_idx" ON "affiliate_payouts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "affiliate_creatives_companyId_isActive_idx" ON "affiliate_creatives"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "affiliate_creatives_partnerId_isActive_idx" ON "affiliate_creatives"("partnerId", "isActive");

-- CreateIndex
CREATE INDEX "affiliate_creatives_type_isActive_idx" ON "affiliate_creatives"("type", "isActive");

-- CreateIndex
CREATE INDEX "affiliate_creatives_deletedAt_idx" ON "affiliate_creatives"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_program_configs_companyId_key" ON "affiliate_program_configs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_applications_affiliatePartnerId_key" ON "affiliate_applications"("affiliatePartnerId");

-- CreateIndex
CREATE INDEX "affiliate_applications_companyId_status_idx" ON "affiliate_applications"("companyId", "status");

-- CreateIndex
CREATE INDEX "affiliate_applications_email_idx" ON "affiliate_applications"("email");

-- CreateIndex
CREATE INDEX "affiliate_applications_status_createdAt_idx" ON "affiliate_applications"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "affiliate_partners" ADD CONSTRAINT "affiliate_partners_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "affiliate_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_creatives" ADD CONSTRAINT "affiliate_creatives_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_creatives" ADD CONSTRAINT "affiliate_creatives_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_program_configs" ADD CONSTRAINT "affiliate_program_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
