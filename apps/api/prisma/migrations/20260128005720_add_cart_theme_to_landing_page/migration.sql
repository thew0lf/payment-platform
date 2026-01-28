-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "UpsellUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "UpsellExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CartSaveStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CONVERTED', 'EXHAUSTED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "CartInterventionStatus" AS ENUM ('SCHEDULED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UpsellType" ADD VALUE 'BULK_DISCOUNT';
ALTER TYPE "UpsellType" ADD VALUE 'SUBSCRIPTION';
ALTER TYPE "UpsellType" ADD VALUE 'FREE_SHIPPING_ADD';
ALTER TYPE "UpsellType" ADD VALUE 'FREE_GIFT_THRESHOLD';
ALTER TYPE "UpsellType" ADD VALUE 'COMPLEMENTARY';
ALTER TYPE "UpsellType" ADD VALUE 'BUNDLE_UPGRADE';
ALTER TYPE "UpsellType" ADD VALUE 'PREMIUM_VERSION';
ALTER TYPE "UpsellType" ADD VALUE 'WARRANTY';
ALTER TYPE "UpsellType" ADD VALUE 'QUANTITY_DISCOUNT';

-- AlterTable
ALTER TABLE "funnel_sessions" ADD COLUMN     "cartId" TEXT,
ADD COLUMN     "checkoutBehavior" JSONB;

-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "cartTheme" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "productCatalog" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "cart_upsell_analytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sessionToken" TEXT,
    "customerId" TEXT,
    "reason" TEXT NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "placement" TEXT NOT NULL DEFAULT 'cart_page',
    "impressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "productPrice" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "revenue" DECIMAL(10,2),

    CONSTRAINT "cart_upsell_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bulk_discounts" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tiers" JSONB NOT NULL,
    "stackWithOtherDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "maxDiscountPercent" INTEGER NOT NULL DEFAULT 30,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_bulk_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_subscription_configs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "discountTiers" JSONB NOT NULL,
    "defaultFrequency" "SubscriptionFrequency" NOT NULL DEFAULT 'MONTHLY',
    "freeShippingIncluded" BOOLEAN NOT NULL DEFAULT true,
    "eligibility" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_subscription_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_targeting_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "upsellType" "UpsellType" NOT NULL,
    "offer" JSONB NOT NULL,
    "message" TEXT NOT NULL,
    "urgency" "UpsellUrgency" NOT NULL DEFAULT 'MEDIUM',
    "placements" TEXT[],
    "maxImpressions" INTEGER,
    "maxAcceptances" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_targeting_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_impressions" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionId" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "variant" TEXT,
    "impressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "offer" JSONB NOT NULL,
    "revenue" DECIMAL(10,2),

    CONSTRAINT "upsell_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_experiments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "UpsellExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "control" JSONB NOT NULL,
    "variants" JSONB NOT NULL,
    "trafficPercent" INTEGER NOT NULL DEFAULT 100,
    "variantWeights" INTEGER[],
    "primaryMetric" TEXT NOT NULL DEFAULT 'CONVERSION',
    "minimumSampleSize" INTEGER NOT NULL DEFAULT 1000,
    "confidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_views" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "source" TEXT,
    "sourceProductId" TEXT,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "alsoBought" JSONB NOT NULL,
    "youMightLike" JSONB NOT NULL,
    "frequentlyViewed" JSONB NOT NULL,
    "global" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_impressions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "recommendedIds" TEXT[],
    "impressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clickedProductId" TEXT,
    "clickedAt" TIMESTAMP(3),
    "addedToCart" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3),

    CONSTRAINT "recommendation_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_products" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_page_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_save_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "stageConfigs" JSONB NOT NULL,
    "maxAttemptsPerCart" INTEGER NOT NULL DEFAULT 10,
    "respectUnsubscribe" BOOLEAN NOT NULL DEFAULT true,
    "blackoutHoursStart" INTEGER NOT NULL DEFAULT 22,
    "blackoutHoursEnd" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_save_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_save_attempts" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" "CartSaveStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStage" TEXT NOT NULL,
    "diagnosisReason" TEXT,
    "customerRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cartValue" DECIMAL(12,2) NOT NULL,
    "currentOffer" JSONB,
    "stageHistory" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_save_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_interventions" (
    "id" TEXT NOT NULL,
    "cartSaveAttemptId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "channels" TEXT[],
    "content" JSONB NOT NULL,
    "triggersUsed" TEXT[],
    "offerCode" TEXT,
    "offerType" TEXT,
    "offerValue" DOUBLE PRECISION,
    "offerExpiresAt" TIMESTAMP(3),
    "status" "CartInterventionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "responseType" TEXT,
    "responseAt" TIMESTAMP(3),
    "surveyAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_upsell_analytics_companyId_impressedAt_idx" ON "cart_upsell_analytics"("companyId", "impressedAt");

-- CreateIndex
CREATE INDEX "cart_upsell_analytics_cartId_idx" ON "cart_upsell_analytics"("cartId");

-- CreateIndex
CREATE INDEX "cart_upsell_analytics_productId_impressedAt_idx" ON "cart_upsell_analytics"("productId", "impressedAt");

-- CreateIndex
CREATE INDEX "cart_upsell_analytics_reason_impressedAt_idx" ON "cart_upsell_analytics"("reason", "impressedAt");

-- CreateIndex
CREATE INDEX "cart_upsell_analytics_customerId_impressedAt_idx" ON "cart_upsell_analytics"("customerId", "impressedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_bulk_discounts_productId_key" ON "product_bulk_discounts"("productId");

-- CreateIndex
CREATE INDEX "product_bulk_discounts_companyId_enabled_idx" ON "product_bulk_discounts"("companyId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "product_subscription_configs_productId_key" ON "product_subscription_configs"("productId");

-- CreateIndex
CREATE INDEX "product_subscription_configs_companyId_enabled_idx" ON "product_subscription_configs"("companyId", "enabled");

-- CreateIndex
CREATE INDEX "upsell_targeting_rules_companyId_enabled_priority_idx" ON "upsell_targeting_rules"("companyId", "enabled", "priority");

-- CreateIndex
CREATE INDEX "upsell_impressions_cartId_idx" ON "upsell_impressions"("cartId");

-- CreateIndex
CREATE INDEX "upsell_impressions_ruleId_impressedAt_idx" ON "upsell_impressions"("ruleId", "impressedAt");

-- CreateIndex
CREATE INDEX "upsell_impressions_customerId_impressedAt_idx" ON "upsell_impressions"("customerId", "impressedAt");

-- CreateIndex
CREATE INDEX "upsell_impressions_sessionId_idx" ON "upsell_impressions"("sessionId");

-- CreateIndex
CREATE INDEX "upsell_experiments_companyId_status_idx" ON "upsell_experiments"("companyId", "status");

-- CreateIndex
CREATE INDEX "product_views_productId_viewedAt_idx" ON "product_views"("productId", "viewedAt");

-- CreateIndex
CREATE INDEX "product_views_sessionId_viewedAt_idx" ON "product_views"("sessionId", "viewedAt");

-- CreateIndex
CREATE INDEX "product_views_companyId_viewedAt_idx" ON "product_views"("companyId", "viewedAt");

-- CreateIndex
CREATE INDEX "product_views_customerId_viewedAt_idx" ON "product_views"("customerId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_configs_companyId_key" ON "recommendation_configs"("companyId");

-- CreateIndex
CREATE INDEX "recommendation_impressions_companyId_type_impressedAt_idx" ON "recommendation_impressions"("companyId", "type", "impressedAt");

-- CreateIndex
CREATE INDEX "recommendation_impressions_productId_type_idx" ON "recommendation_impressions"("productId", "type");

-- CreateIndex
CREATE INDEX "recommendation_impressions_sessionId_impressedAt_idx" ON "recommendation_impressions"("sessionId", "impressedAt");

-- CreateIndex
CREATE INDEX "landing_page_products_landingPageId_sortOrder_idx" ON "landing_page_products"("landingPageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_products_landingPageId_productId_key" ON "landing_page_products"("landingPageId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_save_configs_companyId_key" ON "cart_save_configs"("companyId");

-- CreateIndex
CREATE INDEX "cart_save_attempts_cartId_idx" ON "cart_save_attempts"("cartId");

-- CreateIndex
CREATE INDEX "cart_save_attempts_companyId_status_idx" ON "cart_save_attempts"("companyId", "status");

-- CreateIndex
CREATE INDEX "cart_save_attempts_customerId_idx" ON "cart_save_attempts"("customerId");

-- CreateIndex
CREATE INDEX "cart_save_attempts_status_startedAt_idx" ON "cart_save_attempts"("status", "startedAt");

-- CreateIndex
CREATE INDEX "cart_interventions_cartSaveAttemptId_idx" ON "cart_interventions"("cartSaveAttemptId");

-- CreateIndex
CREATE INDEX "cart_interventions_cartId_idx" ON "cart_interventions"("cartId");

-- CreateIndex
CREATE INDEX "cart_interventions_status_scheduledAt_idx" ON "cart_interventions"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "cart_interventions_stage_status_idx" ON "cart_interventions"("stage", "status");

-- CreateIndex
CREATE INDEX "funnel_sessions_cartId_idx" ON "funnel_sessions"("cartId");

-- AddForeignKey
ALTER TABLE "cart_upsell_analytics" ADD CONSTRAINT "cart_upsell_analytics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_upsell_analytics" ADD CONSTRAINT "cart_upsell_analytics_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_upsell_analytics" ADD CONSTRAINT "cart_upsell_analytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_upsell_analytics" ADD CONSTRAINT "cart_upsell_analytics_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_sessions" ADD CONSTRAINT "funnel_sessions_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bulk_discounts" ADD CONSTRAINT "product_bulk_discounts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bulk_discounts" ADD CONSTRAINT "product_bulk_discounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscription_configs" ADD CONSTRAINT "product_subscription_configs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscription_configs" ADD CONSTRAINT "product_subscription_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_targeting_rules" ADD CONSTRAINT "upsell_targeting_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_impressions" ADD CONSTRAINT "upsell_impressions_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_impressions" ADD CONSTRAINT "upsell_impressions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "upsell_targeting_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_impressions" ADD CONSTRAINT "upsell_impressions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_experiments" ADD CONSTRAINT "upsell_experiments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_configs" ADD CONSTRAINT "recommendation_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_impressions" ADD CONSTRAINT "recommendation_impressions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_impressions" ADD CONSTRAINT "recommendation_impressions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_impressions" ADD CONSTRAINT "recommendation_impressions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_products" ADD CONSTRAINT "landing_page_products_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_products" ADD CONSTRAINT "landing_page_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_save_configs" ADD CONSTRAINT "cart_save_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_save_attempts" ADD CONSTRAINT "cart_save_attempts_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_save_attempts" ADD CONSTRAINT "cart_save_attempts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_save_attempts" ADD CONSTRAINT "cart_save_attempts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_interventions" ADD CONSTRAINT "cart_interventions_cartSaveAttemptId_fkey" FOREIGN KEY ("cartSaveAttemptId") REFERENCES "cart_save_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_interventions" ADD CONSTRAINT "cart_interventions_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
