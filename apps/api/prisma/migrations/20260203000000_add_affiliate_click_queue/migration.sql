-- CreateEnum
CREATE TYPE "ClickQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "affiliate_click_queue" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subId1" VARCHAR(100),
    "subId2" VARCHAR(100),
    "subId3" VARCHAR(100),
    "subId4" VARCHAR(100),
    "subId5" VARCHAR(100),
    "customParams" JSONB,
    "status" "ClickQueueStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddressHash" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "isUnique" BOOLEAN,
    "fraudScore" DOUBLE PRECISION,
    "fraudReasons" TEXT[],
    "visitorId" TEXT,
    "idempotencyKey" TEXT,

    CONSTRAINT "affiliate_click_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_click_queue_status_queuedAt_idx" ON "affiliate_click_queue"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "affiliate_click_queue_companyId_queuedAt_idx" ON "affiliate_click_queue"("companyId", "queuedAt");

-- CreateIndex
CREATE INDEX "affiliate_click_queue_queuedAt_idx" ON "affiliate_click_queue"("queuedAt");
