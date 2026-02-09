-- Phase 4 Feature Enhancements Migration
-- Tasks #26, #28, #29, #30, #31

-- Task #28: Track A/B variant on Lead record
-- Add variantId column to leads table for direct variant-based lead analysis
ALTER TABLE "leads" ADD COLUMN "variantId" TEXT;

-- Add index for variant-based queries
CREATE INDEX "leads_variantId_idx" ON "leads"("variantId");

-- Task #29: Discount code performance tracking
-- Add discount tracking fields to funnel_sessions
ALTER TABLE "funnel_sessions" ADD COLUMN "discountCode" TEXT;
ALTER TABLE "funnel_sessions" ADD COLUMN "discountAmount" DECIMAL(10,2);

-- Add index for discount code performance analysis
CREATE INDEX "funnel_sessions_discountCode_idx" ON "funnel_sessions"("discountCode");
