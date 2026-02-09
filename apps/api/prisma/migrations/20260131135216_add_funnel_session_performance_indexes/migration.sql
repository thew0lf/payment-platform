-- Performance indexes for FunnelSession table (Tasks #12-16)
-- These indexes optimize queries for:
-- 1. Funnel analytics filtered by status and activity time
-- 2. Compliance reporting on consent acceptance
-- 3. Session activity tracking and cleanup

-- Composite index for funnel analytics queries
CREATE INDEX "funnel_sessions_funnelId_status_lastActivityAt_idx" ON "funnel_sessions"("funnelId", "status", "lastActivityAt");

-- Index for terms acceptance compliance queries
CREATE INDEX "funnel_sessions_termsAcceptedAt_idx" ON "funnel_sessions"("termsAcceptedAt");

-- Index for privacy acceptance compliance queries
CREATE INDEX "funnel_sessions_privacyAcceptedAt_idx" ON "funnel_sessions"("privacyAcceptedAt");

-- Index for session activity tracking and cleanup jobs
CREATE INDEX "funnel_sessions_lastActivityAt_idx" ON "funnel_sessions"("lastActivityAt");
