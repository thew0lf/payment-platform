-- Priority 1 Performance Indexes (DBA Review Recommendations)
-- These partial indexes optimize common query patterns for cart recovery,
-- session cleanup, and cart expiration background jobs.

-- 1. Abandoned cart recovery candidates
-- Optimizes: Finding carts eligible for recovery email campaigns
-- Usage: Background job that sends recovery emails to abandoned carts
CREATE INDEX idx_carts_recovery_candidates
ON carts ("companyId", "abandonedAt", "recoveryEmailSent")
WHERE status = 'ABANDONED' AND "recoveryEmailSent" = false;

-- 2. Session cleanup index
-- Optimizes: Finding expired active sessions for cleanup jobs
-- Usage: Background job that expires/cleans up stale sessions
CREATE INDEX idx_cross_site_sessions_cleanup
ON cross_site_sessions ("expiresAt")
WHERE status = 'ACTIVE';

-- 3. Cart expiration index
-- Optimizes: Finding active carts that have passed their expiration time
-- Usage: Background job that marks expired carts
CREATE INDEX idx_carts_expiration
ON carts ("expiresAt")
WHERE status = 'ACTIVE' AND "expiresAt" IS NOT NULL;
