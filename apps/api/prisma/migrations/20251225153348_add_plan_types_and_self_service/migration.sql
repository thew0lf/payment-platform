-- AlterTable
ALTER TABLE "pricing_plans" ADD COLUMN     "allowSelfDowngrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowSelfUpgrade" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "annualCost" INTEGER,
ADD COLUMN     "basePlanId" TEXT,
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "planType" TEXT NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeAnnualPriceId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeProductId" TEXT;

-- CreateIndex
CREATE INDEX "pricing_plans_planType_idx" ON "pricing_plans"("planType");

-- CreateIndex
CREATE INDEX "pricing_plans_clientId_idx" ON "pricing_plans"("clientId");

-- CreateIndex
CREATE INDEX "pricing_plans_isPublic_idx" ON "pricing_plans"("isPublic");

-- AddForeignKey
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_basePlanId_fkey" FOREIGN KEY ("basePlanId") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
