-- CreateEnum
CREATE TYPE "MerchantRiskLevel" AS ENUM ('LOW', 'STANDARD', 'ELEVATED', 'HIGH', 'VERY_HIGH', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MerchantAccountStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'GOOD_STANDING', 'UNDER_REVIEW', 'RESTRICTED', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "GatewayTermsVersion" AS ENUM ('V1_0', 'V2_0', 'V2_1');

-- CreateEnum
CREATE TYPE "ReserveTransactionType" AS ENUM ('HOLD', 'RELEASE', 'CHARGEBACK_DEBIT', 'ADJUSTMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "ChargebackStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'REPRESENTMENT', 'WON', 'LOST', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ChargebackReason" AS ENUM ('FRAUD', 'NOT_RECOGNIZED', 'NOT_RECEIVED', 'NOT_AS_DESCRIBED', 'DUPLICATE', 'CANCELED', 'CREDIT_NOT_ISSUED', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskAssessmentType" AS ENUM ('INITIAL', 'PERIODIC', 'TRIGGERED', 'MANUAL');

-- CreateTable
CREATE TABLE "gateway_pricing_tiers" (
    "id" TEXT NOT NULL,
    "platformIntegrationId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "riskLevel" "MerchantRiskLevel" NOT NULL,
    "applicationFee" INTEGER NOT NULL DEFAULT 0,
    "isFounderPricing" BOOLEAN NOT NULL DEFAULT false,
    "transactionPercentage" DECIMAL(5,4) NOT NULL,
    "transactionFlat" INTEGER NOT NULL,
    "chargebackFee" INTEGER NOT NULL,
    "chargebackReviewFee" INTEGER NOT NULL DEFAULT 0,
    "reservePercentage" DECIMAL(5,4) NOT NULL,
    "reserveHoldDays" INTEGER NOT NULL,
    "reserveCap" INTEGER,
    "setupFee" INTEGER,
    "monthlyFee" INTEGER,
    "monthlyMinimum" INTEGER,
    "securityDepositMin" INTEGER,
    "securityDepositMax" INTEGER,
    "chargebackThreshold" DECIMAL(5,4) NOT NULL DEFAULT 0.01,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_terms_documents" (
    "id" TEXT NOT NULL,
    "platformIntegrationId" TEXT NOT NULL,
    "version" "GatewayTermsVersion" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "applicableRiskLevels" "MerchantRiskLevel"[],
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "gateway_terms_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_terms_acceptances" (
    "id" TEXT NOT NULL,
    "termsDocumentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedBy" TEXT NOT NULL,
    "acceptorName" TEXT NOT NULL,
    "acceptorTitle" TEXT,
    "acceptorEmail" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "acceptanceMethod" TEXT NOT NULL DEFAULT 'ELECTRONIC',
    "signatureHash" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_risk_profiles" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platformIntegrationId" TEXT NOT NULL,
    "riskLevel" "MerchantRiskLevel" NOT NULL DEFAULT 'STANDARD',
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "accountStatus" "MerchantAccountStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "pricingTierId" TEXT,
    "mccCode" TEXT,
    "mccDescription" TEXT,
    "businessType" TEXT,
    "businessAge" INTEGER,
    "annualVolume" INTEGER,
    "averageTicket" INTEGER,
    "totalProcessed" BIGINT NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "chargebackCount" INTEGER NOT NULL DEFAULT 0,
    "chargebackRatio" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "refundRatio" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "reserveBalance" BIGINT NOT NULL DEFAULT 0,
    "reserveHeldTotal" BIGINT NOT NULL DEFAULT 0,
    "reserveReleasedTotal" BIGINT NOT NULL DEFAULT 0,
    "securityDeposit" INTEGER NOT NULL DEFAULT 0,
    "securityDepositPaid" INTEGER NOT NULL DEFAULT 0,
    "securityDepositPaidAt" TIMESTAMP(3),
    "isHighRiskMCC" BOOLEAN NOT NULL DEFAULT false,
    "hasChargebackHistory" BOOLEAN NOT NULL DEFAULT false,
    "hasComplianceIssues" BOOLEAN NOT NULL DEFAULT false,
    "requiresMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "reviewFrequency" INTEGER NOT NULL DEFAULT 90,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "merchant_risk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "merchantRiskProfileId" TEXT NOT NULL,
    "assessmentType" "RiskAssessmentType" NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessedBy" TEXT,
    "previousRiskLevel" "MerchantRiskLevel" NOT NULL,
    "newRiskLevel" "MerchantRiskLevel" NOT NULL,
    "previousRiskScore" INTEGER NOT NULL,
    "newRiskScore" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "aiModel" TEXT,
    "aiConfidence" DECIMAL(5,4),
    "aiExplanation" TEXT,
    "reasoning" TEXT,
    "recommendedActions" TEXT[],
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserve_transactions" (
    "id" TEXT NOT NULL,
    "merchantRiskProfileId" TEXT NOT NULL,
    "type" "ReserveTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "relatedTransactionId" TEXT,
    "relatedChargebackId" TEXT,
    "scheduledReleaseDate" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "description" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "reserve_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargeback_records" (
    "id" TEXT NOT NULL,
    "merchantRiskProfileId" TEXT NOT NULL,
    "chargebackId" TEXT NOT NULL,
    "transactionId" TEXT,
    "orderId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fee" INTEGER NOT NULL,
    "reason" "ChargebackReason" NOT NULL,
    "reasonCode" TEXT,
    "reasonDescription" TEXT,
    "status" "ChargebackStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "respondByDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "representmentSubmittedAt" TIMESTAMP(3),
    "representmentEvidence" JSONB,
    "representmentNotes" TEXT,
    "outcomeDate" TIMESTAMP(3),
    "outcomeAmount" INTEGER,
    "outcomeFee" INTEGER,
    "impactedReserve" BOOLEAN NOT NULL DEFAULT false,
    "reserveDebitAmount" INTEGER,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chargeback_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcc_code_references" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isHighRisk" BOOLEAN NOT NULL DEFAULT false,
    "defaultRiskLevel" "MerchantRiskLevel" NOT NULL DEFAULT 'STANDARD',
    "requiresEnhancedReview" BOOLEAN NOT NULL DEFAULT false,
    "prohibited" BOOLEAN NOT NULL DEFAULT false,
    "restrictedCountries" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcc_code_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gateway_pricing_tiers_platformIntegrationId_idx" ON "gateway_pricing_tiers"("platformIntegrationId");

-- CreateIndex
CREATE INDEX "gateway_pricing_tiers_riskLevel_idx" ON "gateway_pricing_tiers"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_pricing_tiers_platformIntegrationId_riskLevel_key" ON "gateway_pricing_tiers"("platformIntegrationId", "riskLevel");

-- CreateIndex
CREATE INDEX "gateway_terms_documents_platformIntegrationId_idx" ON "gateway_terms_documents"("platformIntegrationId");

-- CreateIndex
CREATE INDEX "gateway_terms_documents_isActive_isCurrent_idx" ON "gateway_terms_documents"("isActive", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_terms_documents_platformIntegrationId_version_key" ON "gateway_terms_documents"("platformIntegrationId", "version");

-- CreateIndex
CREATE INDEX "gateway_terms_acceptances_clientId_idx" ON "gateway_terms_acceptances"("clientId");

-- CreateIndex
CREATE INDEX "gateway_terms_acceptances_acceptedAt_idx" ON "gateway_terms_acceptances"("acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_terms_acceptances_termsDocumentId_clientId_key" ON "gateway_terms_acceptances"("termsDocumentId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_risk_profiles_clientId_key" ON "merchant_risk_profiles"("clientId");

-- CreateIndex
CREATE INDEX "merchant_risk_profiles_clientId_idx" ON "merchant_risk_profiles"("clientId");

-- CreateIndex
CREATE INDEX "merchant_risk_profiles_platformIntegrationId_idx" ON "merchant_risk_profiles"("platformIntegrationId");

-- CreateIndex
CREATE INDEX "merchant_risk_profiles_riskLevel_idx" ON "merchant_risk_profiles"("riskLevel");

-- CreateIndex
CREATE INDEX "merchant_risk_profiles_accountStatus_idx" ON "merchant_risk_profiles"("accountStatus");

-- CreateIndex
CREATE INDEX "risk_assessments_merchantRiskProfileId_idx" ON "risk_assessments"("merchantRiskProfileId");

-- CreateIndex
CREATE INDEX "risk_assessments_assessmentDate_idx" ON "risk_assessments"("assessmentDate");

-- CreateIndex
CREATE INDEX "risk_assessments_assessmentType_idx" ON "risk_assessments"("assessmentType");

-- CreateIndex
CREATE INDEX "reserve_transactions_merchantRiskProfileId_idx" ON "reserve_transactions"("merchantRiskProfileId");

-- CreateIndex
CREATE INDEX "reserve_transactions_type_idx" ON "reserve_transactions"("type");

-- CreateIndex
CREATE INDEX "reserve_transactions_scheduledReleaseDate_idx" ON "reserve_transactions"("scheduledReleaseDate");

-- CreateIndex
CREATE INDEX "reserve_transactions_createdAt_idx" ON "reserve_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chargeback_records_chargebackId_key" ON "chargeback_records"("chargebackId");

-- CreateIndex
CREATE INDEX "chargeback_records_merchantRiskProfileId_idx" ON "chargeback_records"("merchantRiskProfileId");

-- CreateIndex
CREATE INDEX "chargeback_records_status_idx" ON "chargeback_records"("status");

-- CreateIndex
CREATE INDEX "chargeback_records_receivedAt_idx" ON "chargeback_records"("receivedAt");

-- CreateIndex
CREATE INDEX "chargeback_records_transactionId_idx" ON "chargeback_records"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "mcc_code_references_code_key" ON "mcc_code_references"("code");

-- CreateIndex
CREATE INDEX "mcc_code_references_isHighRisk_idx" ON "mcc_code_references"("isHighRisk");

-- CreateIndex
CREATE INDEX "mcc_code_references_category_idx" ON "mcc_code_references"("category");

-- AddForeignKey
ALTER TABLE "gateway_pricing_tiers" ADD CONSTRAINT "gateway_pricing_tiers_platformIntegrationId_fkey" FOREIGN KEY ("platformIntegrationId") REFERENCES "platform_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_terms_documents" ADD CONSTRAINT "gateway_terms_documents_platformIntegrationId_fkey" FOREIGN KEY ("platformIntegrationId") REFERENCES "platform_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_terms_acceptances" ADD CONSTRAINT "gateway_terms_acceptances_termsDocumentId_fkey" FOREIGN KEY ("termsDocumentId") REFERENCES "gateway_terms_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_terms_acceptances" ADD CONSTRAINT "gateway_terms_acceptances_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_risk_profiles" ADD CONSTRAINT "merchant_risk_profiles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_risk_profiles" ADD CONSTRAINT "merchant_risk_profiles_platformIntegrationId_fkey" FOREIGN KEY ("platformIntegrationId") REFERENCES "platform_integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_risk_profiles" ADD CONSTRAINT "merchant_risk_profiles_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "gateway_pricing_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_merchantRiskProfileId_fkey" FOREIGN KEY ("merchantRiskProfileId") REFERENCES "merchant_risk_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserve_transactions" ADD CONSTRAINT "reserve_transactions_merchantRiskProfileId_fkey" FOREIGN KEY ("merchantRiskProfileId") REFERENCES "merchant_risk_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserve_transactions" ADD CONSTRAINT "reserve_transactions_relatedChargebackId_fkey" FOREIGN KEY ("relatedChargebackId") REFERENCES "chargeback_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargeback_records" ADD CONSTRAINT "chargeback_records_merchantRiskProfileId_fkey" FOREIGN KEY ("merchantRiskProfileId") REFERENCES "merchant_risk_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
