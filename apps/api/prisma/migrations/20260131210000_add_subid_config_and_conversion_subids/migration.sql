-- Add SubID configuration and custom params to AffiliateLink
ALTER TABLE "affiliate_links" ADD COLUMN "subIdConfig" JSONB;
ALTER TABLE "affiliate_links" ADD COLUMN "customParams" JSONB;

-- Add custom params to AffiliateClick
ALTER TABLE "affiliate_clicks" ADD COLUMN "customParams" JSONB;

-- Add SubID fields to AffiliateConversion for easier reporting
ALTER TABLE "affiliate_conversions" ADD COLUMN "subId1" TEXT;
ALTER TABLE "affiliate_conversions" ADD COLUMN "subId2" TEXT;
ALTER TABLE "affiliate_conversions" ADD COLUMN "subId3" TEXT;
ALTER TABLE "affiliate_conversions" ADD COLUMN "subId4" TEXT;
ALTER TABLE "affiliate_conversions" ADD COLUMN "subId5" TEXT;
ALTER TABLE "affiliate_conversions" ADD COLUMN "customParams" JSONB;

-- Add SubID indexes on AffiliateClick for performance
CREATE INDEX "affiliate_clicks_partnerId_subId1_idx" ON "affiliate_clicks"("partnerId", "subId1");
CREATE INDEX "affiliate_clicks_partnerId_subId2_idx" ON "affiliate_clicks"("partnerId", "subId2");
CREATE INDEX "affiliate_clicks_companyId_subId1_clickedAt_idx" ON "affiliate_clicks"("companyId", "subId1", "clickedAt");
CREATE INDEX "affiliate_clicks_companyId_subId2_clickedAt_idx" ON "affiliate_clicks"("companyId", "subId2", "clickedAt");

-- Add SubID indexes on AffiliateConversion for performance
CREATE INDEX "affiliate_conversions_partnerId_subId1_idx" ON "affiliate_conversions"("partnerId", "subId1");
CREATE INDEX "affiliate_conversions_partnerId_subId2_idx" ON "affiliate_conversions"("partnerId", "subId2");
CREATE INDEX "affiliate_conversions_companyId_subId1_convertedAt_idx" ON "affiliate_conversions"("companyId", "subId1", "convertedAt");
CREATE INDEX "affiliate_conversions_companyId_subId2_convertedAt_idx" ON "affiliate_conversions"("companyId", "subId2", "convertedAt");
