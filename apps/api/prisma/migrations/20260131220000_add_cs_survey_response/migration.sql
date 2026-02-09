-- CreateTable
CREATE TABLE "cs_survey_responses" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "categories" TEXT[],
    "wouldRecommend" BOOLEAN,
    "completionTimeMs" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cs_survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cs_survey_responses_sessionId_key" ON "cs_survey_responses"("sessionId");

-- CreateIndex
CREATE INDEX "cs_survey_responses_sessionId_idx" ON "cs_survey_responses"("sessionId");

-- CreateIndex
CREATE INDEX "cs_survey_responses_companyId_idx" ON "cs_survey_responses"("companyId");

-- CreateIndex
CREATE INDEX "cs_survey_responses_submittedAt_idx" ON "cs_survey_responses"("submittedAt");

-- CreateIndex
CREATE INDEX "cs_survey_responses_rating_idx" ON "cs_survey_responses"("rating");

-- AddForeignKey
ALTER TABLE "cs_survey_responses" ADD CONSTRAINT "cs_survey_responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cs_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
