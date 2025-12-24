-- Migration: Add Sites Model (Multi-Storefront Support)
-- Date: December 24, 2024
-- Description: Adds the sites table for multi-storefront functionality
--              and siteId foreign keys on landing_pages and funnels

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "domain" TEXT,
    "subdomain" TEXT,
    "logo" TEXT,
    "favicon" TEXT,
    "description" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "timezone" TEXT,
    "currency" TEXT,
    "locale" TEXT DEFAULT 'en',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE INDEX "sites_companyId_idx" ON "sites"("companyId");

-- CreateIndex
CREATE INDEX "sites_domain_idx" ON "sites"("domain");

-- CreateIndex
CREATE INDEX "sites_deletedAt_idx" ON "sites"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sites_companyId_slug_key" ON "sites"("companyId", "slug");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add siteId to landing_pages
ALTER TABLE "landing_pages" ADD COLUMN "siteId" TEXT;

-- AddForeignKey: landing_pages -> sites
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add siteId to funnels
ALTER TABLE "funnels" ADD COLUMN "siteId" TEXT;

-- AddForeignKey: funnels -> sites
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
