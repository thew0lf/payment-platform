-- Add composite indexes for soft delete queries
-- These indexes optimize queries that filter by company and exclude deleted records

-- Customers: Most frequent query pattern
CREATE INDEX IF NOT EXISTS "Customer_companyId_deletedAt_idx" ON "Customer" ("companyId", "deletedAt");

-- Products: Frequently accessed with soft delete filter
CREATE INDEX IF NOT EXISTS "Product_companyId_deletedAt_idx" ON "Product" ("companyId", "deletedAt");

-- Orders: Common query with company filter and soft delete
CREATE INDEX IF NOT EXISTS "Order_companyId_deletedAt_idx" ON "Order" ("companyId", "deletedAt");

-- Transactions: High-frequency table
CREATE INDEX IF NOT EXISTS "Transaction_companyId_deletedAt_idx" ON "Transaction" ("companyId", "deletedAt");

-- Subscriptions: Common query pattern
CREATE INDEX IF NOT EXISTS "Subscription_companyId_deletedAt_idx" ON "Subscription" ("companyId", "deletedAt");

-- Users: Common query with status check
CREATE INDEX IF NOT EXISTS "User_companyId_deletedAt_idx" ON "User" ("companyId", "deletedAt");
CREATE INDEX IF NOT EXISTS "User_clientId_deletedAt_idx" ON "User" ("clientId", "deletedAt");

-- Companies: Client-level queries
CREATE INDEX IF NOT EXISTS "Company_clientId_deletedAt_idx" ON "Company" ("clientId", "deletedAt");

-- Clients: Organization-level queries
CREATE INDEX IF NOT EXISTS "Client_organizationId_deletedAt_idx" ON "Client" ("organizationId", "deletedAt");

-- Additional high-frequency composite indexes for common query patterns

-- Email for user lookups (unique constraint handles this but adding for completeness)
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User" ("email");

-- Transaction status queries (already exists but adding companyId composite)
CREATE INDEX IF NOT EXISTS "Transaction_companyId_paymentStatus_createdAt_idx" ON "Transaction" ("companyId", "paymentStatus", "createdAt");

-- Customer email lookup within company
CREATE INDEX IF NOT EXISTS "Customer_companyId_email_deletedAt_idx" ON "Customer" ("companyId", "email", "deletedAt");

-- Subscription status queries
CREATE INDEX IF NOT EXISTS "Subscription_companyId_status_deletedAt_idx" ON "Subscription" ("companyId", "status", "deletedAt");
