-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE_OFF', 'FIXED_AMOUNT_OFF', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'FREE_GIFT');

-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('CART', 'PRODUCT', 'CATEGORY', 'SHIPPING');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('SALES_TAX', 'VAT', 'GST', 'HST', 'PST', 'CONSUMPTION');

-- CreateEnum
CREATE TYPE "ShippingRuleType" AS ENUM ('FLAT_RATE', 'PER_ITEM', 'WEIGHT_BASED', 'PRICE_BASED', 'FREE', 'CALCULATED');

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "scope" "PromotionScope" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minimumOrderAmount" DECIMAL(10,2),
    "maximumDiscount" DECIMAL(10,2),
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "getProductId" TEXT,
    "maxUsesTotal" INTEGER,
    "maxUsesPerCustomer" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "targeting" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usages" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "cartId" TEXT,
    "orderId" TEXT,
    "customerId" TEXT,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "taxType" "TaxType" NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "isCompound" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "exemptCategories" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "countries" TEXT[],
    "states" TEXT[],
    "zipCodes" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rules" (
    "id" TEXT NOT NULL,
    "shippingZoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "carrier" TEXT,
    "serviceCode" TEXT,
    "type" "ShippingRuleType" NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "perItemRate" DECIMAL(10,2),
    "perWeightUnitRate" DECIMAL(10,2),
    "weightUnit" TEXT NOT NULL DEFAULT 'lb',
    "freeShippingThreshold" DECIMAL(10,2),
    "minWeight" DECIMAL(10,2),
    "maxWeight" DECIMAL(10,2),
    "minOrderTotal" DECIMAL(10,2),
    "maxOrderTotal" DECIMAL(10,2),
    "estimatedDaysMin" INTEGER,
    "estimatedDaysMax" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_promotions" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_companyId_isActive_idx" ON "promotions"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "promotions_code_idx" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_startsAt_expiresAt_idx" ON "promotions"("startsAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_companyId_code_key" ON "promotions"("companyId", "code");

-- CreateIndex
CREATE INDEX "promotion_usages_promotionId_idx" ON "promotion_usages"("promotionId");

-- CreateIndex
CREATE INDEX "promotion_usages_customerId_idx" ON "promotion_usages"("customerId");

-- CreateIndex
CREATE INDEX "promotion_usages_orderId_idx" ON "promotion_usages"("orderId");

-- CreateIndex
CREATE INDEX "tax_rates_companyId_isActive_idx" ON "tax_rates"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "tax_rates_country_state_idx" ON "tax_rates"("country", "state");

-- CreateIndex
CREATE INDEX "tax_rates_country_state_city_idx" ON "tax_rates"("country", "state", "city");

-- CreateIndex
CREATE INDEX "shipping_zones_companyId_isActive_idx" ON "shipping_zones"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "shipping_zones_priority_idx" ON "shipping_zones"("priority");

-- CreateIndex
CREATE INDEX "shipping_rules_shippingZoneId_isActive_idx" ON "shipping_rules"("shippingZoneId", "isActive");

-- CreateIndex
CREATE INDEX "shipping_rules_sortOrder_idx" ON "shipping_rules"("sortOrder");

-- CreateIndex
CREATE INDEX "cart_promotions_cartId_idx" ON "cart_promotions"("cartId");

-- CreateIndex
CREATE INDEX "cart_promotions_promotionId_idx" ON "cart_promotions"("promotionId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_promotions_cartId_promotionId_key" ON "cart_promotions"("cartId", "promotionId");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rules" ADD CONSTRAINT "shipping_rules_shippingZoneId_fkey" FOREIGN KEY ("shippingZoneId") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
