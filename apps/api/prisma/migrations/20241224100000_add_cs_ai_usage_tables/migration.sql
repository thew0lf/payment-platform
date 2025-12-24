-- Migration: Add CS AI Usage Tracking Tables
-- Date: December 24, 2024
-- Description: Adds tables for CS AI usage tracking, pricing, and billing

-- CreateEnum
CREATE TYPE "CSAIUsageType" AS ENUM ('VOICE_CALL', 'CHAT_SESSION', 'EMAIL_SUPPORT', 'SMS_SUPPORT');

-- CreateTable
CREATE TABLE "cs_ai_usage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "csSessionId" TEXT,
    "voiceCallId" TEXT,
    "usageType" "CSAIUsageType" NOT NULL,
    "tier" "CSTier" NOT NULL,
    "channel" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "aiMessageCount" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "twilioMinutes" DECIMAL(10,4),
    "twilioCostCents" INTEGER,
    "baseCost" INTEGER NOT NULL DEFAULT 0,
    "markupCost" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "billingPeriod" TEXT,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoicedAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cs_ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs_ai_pricing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "voicePerMinuteCents" INTEGER NOT NULL DEFAULT 50,
    "chatPerMessageCents" INTEGER NOT NULL DEFAULT 5,
    "chatPerSessionCents" INTEGER NOT NULL DEFAULT 100,
    "inputTokenPrice" INTEGER NOT NULL DEFAULT 3,
    "outputTokenPrice" INTEGER NOT NULL DEFAULT 15,
    "aiRepMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "aiManagerMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "humanAgentMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "monthlyMinutesAllowance" INTEGER NOT NULL DEFAULT 100,
    "monthlyMessagesAllowance" INTEGER NOT NULL DEFAULT 500,
    "overageVoicePerMinuteCents" INTEGER NOT NULL DEFAULT 75,
    "overageChatPerMessageCents" INTEGER NOT NULL DEFAULT 8,
    "csAIEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cs_ai_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs_ai_usage_summary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalVoiceMinutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalVoiceCalls" INTEGER NOT NULL DEFAULT 0,
    "voiceCostCents" INTEGER NOT NULL DEFAULT 0,
    "totalChatSessions" INTEGER NOT NULL DEFAULT 0,
    "totalChatMessages" INTEGER NOT NULL DEFAULT 0,
    "chatCostCents" INTEGER NOT NULL DEFAULT 0,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "aiTokenCostCents" INTEGER NOT NULL DEFAULT 0,
    "aiRepMinutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "aiManagerMinutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "humanAgentMinutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalBaseCost" INTEGER NOT NULL DEFAULT 0,
    "totalMarkupCost" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "allowanceUsedMinutes" INTEGER NOT NULL DEFAULT 0,
    "allowanceUsedMessages" INTEGER NOT NULL DEFAULT 0,
    "overageMinutes" INTEGER NOT NULL DEFAULT 0,
    "overageMessages" INTEGER NOT NULL DEFAULT 0,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoicedAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cs_ai_usage_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cs_ai_usage_companyId_occurredAt_idx" ON "cs_ai_usage"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "cs_ai_usage_clientId_billingPeriod_idx" ON "cs_ai_usage"("clientId", "billingPeriod");

-- CreateIndex
CREATE INDEX "cs_ai_usage_usageType_occurredAt_idx" ON "cs_ai_usage"("usageType", "occurredAt");

-- CreateIndex
CREATE INDEX "cs_ai_usage_invoiced_idx" ON "cs_ai_usage"("invoiced");

-- CreateIndex
CREATE UNIQUE INDEX "cs_ai_pricing_organizationId_key" ON "cs_ai_pricing"("organizationId");

-- CreateIndex
CREATE INDEX "cs_ai_usage_summary_clientId_periodStart_idx" ON "cs_ai_usage_summary"("clientId", "periodStart");

-- CreateIndex
CREATE INDEX "cs_ai_usage_summary_invoiced_idx" ON "cs_ai_usage_summary"("invoiced");

-- CreateIndex
CREATE UNIQUE INDEX "cs_ai_usage_summary_companyId_periodStart_key" ON "cs_ai_usage_summary"("companyId", "periodStart");

-- AddForeignKey
ALTER TABLE "cs_ai_usage" ADD CONSTRAINT "cs_ai_usage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cs_ai_usage" ADD CONSTRAINT "cs_ai_usage_csSessionId_fkey" FOREIGN KEY ("csSessionId") REFERENCES "cs_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cs_ai_usage" ADD CONSTRAINT "cs_ai_usage_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "voice_calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cs_ai_pricing" ADD CONSTRAINT "cs_ai_pricing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cs_ai_usage_summary" ADD CONSTRAINT "cs_ai_usage_summary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
