-- CreateEnum
CREATE TYPE "MetafieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'DATE', 'COLOR', 'URL');

-- CreateEnum
CREATE TYPE "SalesChannelType" AS ENUM ('ONLINE_STORE', 'POS', 'WHOLESALE', 'MARKETPLACE', 'SOCIAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "category_metafield_definitions" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MetafieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "validation" JSONB,
    "helpText" TEXT,
    "placeholder" TEXT,
    "defaultValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "category_metafield_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_metafield_values" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "textValue" TEXT,
    "numberValue" DECIMAL(20,6),
    "booleanValue" BOOLEAN,
    "dateValue" TIMESTAMP(3),
    "jsonValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_metafield_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_channels" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "SalesChannelType" NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "sales_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sales_channels" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "channelPrice" DECIMAL(10,2),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sales_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_metafield_definitions_categoryId_isActive_idx" ON "category_metafield_definitions"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "category_metafield_definitions_deletedAt_idx" ON "category_metafield_definitions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "category_metafield_definitions_categoryId_key_deletedAt_key" ON "category_metafield_definitions"("categoryId", "key", "deletedAt");

-- CreateIndex
CREATE INDEX "product_metafield_values_definitionId_idx" ON "product_metafield_values"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "product_metafield_values_productId_definitionId_key" ON "product_metafield_values"("productId", "definitionId");

-- CreateIndex
CREATE INDEX "sales_channels_companyId_isActive_idx" ON "sales_channels"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "sales_channels_type_idx" ON "sales_channels"("type");

-- CreateIndex
CREATE INDEX "sales_channels_deletedAt_idx" ON "sales_channels"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sales_channels_companyId_slug_deletedAt_key" ON "sales_channels"("companyId", "slug", "deletedAt");

-- CreateIndex
CREATE INDEX "product_sales_channels_channelId_idx" ON "product_sales_channels"("channelId");

-- CreateIndex
CREATE INDEX "product_sales_channels_isPublished_idx" ON "product_sales_channels"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "product_sales_channels_productId_channelId_key" ON "product_sales_channels"("productId", "channelId");

-- AddForeignKey
ALTER TABLE "category_metafield_definitions" ADD CONSTRAINT "category_metafield_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_metafield_definitions" ADD CONSTRAINT "category_metafield_definitions_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_metafield_values" ADD CONSTRAINT "product_metafield_values_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_metafield_values" ADD CONSTRAINT "product_metafield_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "category_metafield_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channels" ADD CONSTRAINT "sales_channels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channels" ADD CONSTRAINT "sales_channels_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_channels" ADD CONSTRAINT "product_sales_channels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_channels" ADD CONSTRAINT "product_sales_channels_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "sales_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
