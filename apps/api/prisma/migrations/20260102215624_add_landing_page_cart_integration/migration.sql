-- CreateEnum
CREATE TYPE "CartSourceType" AS ENUM ('DIRECT', 'LANDING_PAGE', 'FUNNEL', 'EMAIL');

-- CreateEnum
CREATE TYPE "LandingPageSessionStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED');

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "landingPageId" TEXT,
ADD COLUMN     "sourceType" "CartSourceType" NOT NULL DEFAULT 'DIRECT';

-- CreateTable
CREATE TABLE "inventory_holds" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "orderId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "visitorId" TEXT,
    "ipAddressHash" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "cartId" TEXT,
    "status" "LandingPageSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "convertedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "abandonedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "landing_page_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_holds_companyId_status_idx" ON "inventory_holds"("companyId", "status");

-- CreateIndex
CREATE INDEX "inventory_holds_status_expiresAt_idx" ON "inventory_holds"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "inventory_holds_productId_variantId_status_idx" ON "inventory_holds"("productId", "variantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_holds_cartId_productId_variantId_key" ON "inventory_holds"("cartId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_sessions_sessionToken_key" ON "landing_page_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_sessions_cartId_key" ON "landing_page_sessions"("cartId");

-- CreateIndex
CREATE INDEX "landing_page_sessions_landingPageId_startedAt_idx" ON "landing_page_sessions"("landingPageId", "startedAt");

-- CreateIndex
CREATE INDEX "landing_page_sessions_landingPageId_status_idx" ON "landing_page_sessions"("landingPageId", "status");

-- CreateIndex
CREATE INDEX "landing_page_sessions_companyId_startedAt_idx" ON "landing_page_sessions"("companyId", "startedAt");

-- CreateIndex
CREATE INDEX "landing_page_sessions_companyId_convertedAt_idx" ON "landing_page_sessions"("companyId", "convertedAt");

-- CreateIndex
CREATE INDEX "landing_page_sessions_status_idx" ON "landing_page_sessions"("status");

-- CreateIndex
CREATE INDEX "carts_landingPageId_idx" ON "carts"("landingPageId");

-- CreateIndex
CREATE INDEX "carts_sourceType_companyId_status_idx" ON "carts"("sourceType", "companyId", "status");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_sessions" ADD CONSTRAINT "landing_page_sessions_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_sessions" ADD CONSTRAINT "landing_page_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_sessions" ADD CONSTRAINT "landing_page_sessions_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
