-- Product Import System Migration
-- Add enums, tables, and relations for product import from external fulfillment providers

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportJobPhase" AS ENUM ('QUEUED', 'FETCHING', 'MAPPING', 'CREATING', 'DOWNLOADING_IMAGES', 'UPLOADING_IMAGES', 'GENERATING_THUMBNAILS', 'FINALIZING', 'DONE');

-- Add import tracking fields to products table
ALTER TABLE "products" ADD COLUMN "importSource" TEXT;
ALTER TABLE "products" ADD COLUMN "externalId" TEXT;
ALTER TABLE "products" ADD COLUMN "externalSku" TEXT;
ALTER TABLE "products" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "product_import_jobs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "phase" "ImportJobPhase" NOT NULL DEFAULT 'QUEUED',
    "totalProducts" INTEGER NOT NULL,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "processedProducts" INTEGER NOT NULL DEFAULT 0,
    "processedImages" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentItem" TEXT,
    "estimatedSecondsRemaining" INTEGER,
    "config" JSONB NOT NULL,
    "errorLog" JSONB,
    "importedIds" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "product_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "cdnUrl" TEXT NOT NULL,
    "originalUrl" TEXT,
    "importSource" TEXT,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailSmall" TEXT,
    "thumbnailMedium" TEXT,
    "thumbnailLarge" TEXT,
    "thumbnailBytes" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "companyId" TEXT,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnailBytes" BIGINT NOT NULL DEFAULT 0,
    "month" TIMESTAMP(3) NOT NULL,
    "usageBySource" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_mapping_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mappings" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_mapping_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_import_jobs_companyId_status_idx" ON "product_import_jobs"("companyId", "status");

-- CreateIndex
CREATE INDEX "product_import_jobs_status_createdAt_idx" ON "product_import_jobs"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_s3Key_key" ON "product_images"("s3Key");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE INDEX "product_images_companyId_idx" ON "product_images"("companyId");

-- CreateIndex
CREATE INDEX "storage_usage_organizationId_idx" ON "storage_usage"("organizationId");

-- CreateIndex
CREATE INDEX "storage_usage_clientId_idx" ON "storage_usage"("clientId");

-- CreateIndex
CREATE INDEX "storage_usage_companyId_idx" ON "storage_usage"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "storage_usage_organizationId_clientId_companyId_month_key" ON "storage_usage"("organizationId", "clientId", "companyId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "field_mapping_profiles_companyId_provider_name_key" ON "field_mapping_profiles"("companyId", "provider", "name");

-- CreateIndex - Products import tracking
CREATE INDEX "products_companyId_importSource_idx" ON "products"("companyId", "importSource");

-- CreateIndex - Unique constraint for imported products
CREATE UNIQUE INDEX "products_companyId_externalId_importSource_key" ON "products"("companyId", "externalId", "importSource");

-- AddForeignKey
ALTER TABLE "product_import_jobs" ADD CONSTRAINT "product_import_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_mapping_profiles" ADD CONSTRAINT "field_mapping_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
