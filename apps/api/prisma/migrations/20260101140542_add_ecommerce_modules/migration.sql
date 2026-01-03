-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('STOREFRONT', 'FUNNEL', 'TRIAL', 'MARKETPLACE', 'B2B_PORTAL');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED', 'MERGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CrossSiteSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'MERGED', 'REVOKED');

-- AlterEnum
ALTER TYPE "AIFeature" ADD VALUE 'LOGO_GENERATION';

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "cartExpirationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "checkoutMode" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "enableBundleBuilder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableCart" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableCompare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableQuickView" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableWishlist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "guestCheckout" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxCompareItems" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "type" "SiteType" NOT NULL DEFAULT 'STOREFRONT';

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "sessionToken" TEXT,
    "visitorId" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "discountCodes" JSONB NOT NULL DEFAULT '[]',
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "recoveryEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "recoveryEmailSentAt" TIMESTAMP(3),
    "recoveryClicks" INTEGER NOT NULL DEFAULT 0,
    "mergedIntoCartId" TEXT,
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "orderId" TEXT,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "giftMessage" TEXT,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAtSave" DECIMAL(10,2) NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "sessionToken" TEXT,
    "name" TEXT NOT NULL DEFAULT 'My Wishlist',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sharedUrl" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productSnapshot" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_comparisons" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "sessionToken" TEXT,
    "visitorId" TEXT,
    "name" TEXT,
    "shareToken" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "mergedIntoComparisonId" TEXT,
    "mergedAt" TIMESTAMP(3),

    CONSTRAINT "product_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_comparison_items" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productSnapshot" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_comparison_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_site_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "visitorId" TEXT,
    "customerId" TEXT,
    "status" "CrossSiteSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "dataReferences" JSONB NOT NULL DEFAULT '[]',
    "deviceInfo" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_site_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_sessionToken_key" ON "carts"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "carts_orderId_key" ON "carts"("orderId");

-- CreateIndex
CREATE INDEX "carts_companyId_status_idx" ON "carts"("companyId", "status");

-- CreateIndex
CREATE INDEX "carts_companyId_customerId_idx" ON "carts"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "carts_sessionToken_idx" ON "carts"("sessionToken");

-- CreateIndex
CREATE INDEX "carts_visitorId_idx" ON "carts"("visitorId");

-- CreateIndex
CREATE INDEX "carts_status_expiresAt_idx" ON "carts"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "carts_companyId_siteId_status_idx" ON "carts"("companyId", "siteId", "status");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex
CREATE INDEX "saved_cart_items_cartId_idx" ON "saved_cart_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_cart_items_cartId_productId_variantId_key" ON "saved_cart_items"("cartId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_sessionToken_key" ON "wishlists"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_sharedUrl_key" ON "wishlists"("sharedUrl");

-- CreateIndex
CREATE INDEX "wishlists_companyId_idx" ON "wishlists"("companyId");

-- CreateIndex
CREATE INDEX "wishlists_customerId_idx" ON "wishlists"("customerId");

-- CreateIndex
CREATE INDEX "wishlists_siteId_idx" ON "wishlists"("siteId");

-- CreateIndex
CREATE INDEX "wishlists_sharedUrl_idx" ON "wishlists"("sharedUrl");

-- CreateIndex
CREATE INDEX "wishlist_items_wishlistId_idx" ON "wishlist_items"("wishlistId");

-- CreateIndex
CREATE INDEX "wishlist_items_productId_idx" ON "wishlist_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_wishlistId_productId_variantId_key" ON "wishlist_items"("wishlistId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "product_comparisons_sessionToken_key" ON "product_comparisons"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "product_comparisons_shareToken_key" ON "product_comparisons"("shareToken");

-- CreateIndex
CREATE INDEX "product_comparisons_companyId_idx" ON "product_comparisons"("companyId");

-- CreateIndex
CREATE INDEX "product_comparisons_companyId_customerId_idx" ON "product_comparisons"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "product_comparisons_sessionToken_idx" ON "product_comparisons"("sessionToken");

-- CreateIndex
CREATE INDEX "product_comparisons_visitorId_idx" ON "product_comparisons"("visitorId");

-- CreateIndex
CREATE INDEX "product_comparisons_shareToken_idx" ON "product_comparisons"("shareToken");

-- CreateIndex
CREATE INDEX "product_comparisons_companyId_siteId_idx" ON "product_comparisons"("companyId", "siteId");

-- CreateIndex
CREATE INDEX "product_comparisons_expiresAt_idx" ON "product_comparisons"("expiresAt");

-- CreateIndex
CREATE INDEX "product_comparison_items_comparisonId_idx" ON "product_comparison_items"("comparisonId");

-- CreateIndex
CREATE INDEX "product_comparison_items_productId_idx" ON "product_comparison_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_comparison_items_comparisonId_productId_variantId_key" ON "product_comparison_items"("comparisonId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "cross_site_sessions_sessionToken_key" ON "cross_site_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "cross_site_sessions_companyId_idx" ON "cross_site_sessions"("companyId");

-- CreateIndex
CREATE INDEX "cross_site_sessions_customerId_idx" ON "cross_site_sessions"("customerId");

-- CreateIndex
CREATE INDEX "cross_site_sessions_sessionToken_idx" ON "cross_site_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "cross_site_sessions_status_idx" ON "cross_site_sessions"("status");

-- CreateIndex
CREATE INDEX "cross_site_sessions_expiresAt_idx" ON "cross_site_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_cart_items" ADD CONSTRAINT "saved_cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_cart_items" ADD CONSTRAINT "saved_cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_comparisons" ADD CONSTRAINT "product_comparisons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_comparisons" ADD CONSTRAINT "product_comparisons_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_comparisons" ADD CONSTRAINT "product_comparisons_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_comparison_items" ADD CONSTRAINT "product_comparison_items_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "product_comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_comparison_items" ADD CONSTRAINT "product_comparison_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_site_sessions" ADD CONSTRAINT "cross_site_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_site_sessions" ADD CONSTRAINT "cross_site_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
