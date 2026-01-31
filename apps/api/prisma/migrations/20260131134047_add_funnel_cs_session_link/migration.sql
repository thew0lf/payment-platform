-- AlterTable
ALTER TABLE "funnel_sessions" ADD COLUMN     "csSessionId" TEXT,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "funnel_sessions_csSessionId_idx" ON "funnel_sessions"("csSessionId");

-- AddForeignKey
ALTER TABLE "funnel_sessions" ADD CONSTRAINT "funnel_sessions_csSessionId_fkey" FOREIGN KEY ("csSessionId") REFERENCES "cs_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
