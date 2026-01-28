/*
  Warnings:

  - The `status` column on the `inventory_holds` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InventoryHoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONVERTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "inventory_holds" DROP COLUMN "status",
ADD COLUMN     "status" "InventoryHoldStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "carts_companyId_status_lastActivityAt_idx" ON "carts"("companyId", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "inventory_holds_companyId_status_idx" ON "inventory_holds"("companyId", "status");

-- CreateIndex
CREATE INDEX "inventory_holds_status_expiresAt_idx" ON "inventory_holds"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "inventory_holds_productId_variantId_status_idx" ON "inventory_holds"("productId", "variantId", "status");

-- AddForeignKey
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
