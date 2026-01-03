-- AlterTable
ALTER TABLE "product_sales_channels" ALTER COLUMN "channelPrice" SET DATA TYPE DECIMAL(12,4);

-- CreateIndex
CREATE INDEX "product_metafield_values_productId_idx" ON "product_metafield_values"("productId");

-- CreateIndex
CREATE INDEX "product_metafield_values_definitionId_textValue_idx" ON "product_metafield_values"("definitionId", "textValue");

-- CreateIndex
CREATE INDEX "product_sales_channels_productId_isPublished_idx" ON "product_sales_channels"("productId", "isPublished");

-- CreateIndex
CREATE INDEX "product_sales_channels_channelId_isPublished_isVisible_idx" ON "product_sales_channels"("channelId", "isPublished", "isVisible");
