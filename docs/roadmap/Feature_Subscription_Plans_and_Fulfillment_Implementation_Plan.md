# Subscription Plans & Fulfillment System - Implementation Plan

**Senior Developer Review - December 2025**

---

## Executive Summary

This document outlines the implementation plan for a comprehensive subscription system that supports:
1. **Multi-level Plan Creation**: Organizations, Clients, AND Companies can create reusable subscription plans
2. **Standalone Plans**: Plans are independent entities attachable to any product
3. **Product Fulfillment Types**: Physical, Virtual, and Electronic products with different delivery mechanisms
4. **Shipment-Aware Billing**: Intelligent billing logic that respects shipment status
5. **Fulfillment Provider Integration**: Support for major fulfillment providers including email/SMS delivery

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Subscription Plan Models](#phase-1-subscription-plan-models)
4. [Phase 2: Product Fulfillment Types](#phase-2-product-fulfillment-types)
5. [Phase 3: Fulfillment Provider Integration](#phase-3-fulfillment-provider-integration)
6. [Phase 4: Shipment-Aware Billing Logic](#phase-4-shipment-aware-billing-logic)
7. [Phase 5: UI Implementation](#phase-5-ui-implementation)
8. [Migration Strategy](#migration-strategy)
9. [API Reference](#api-reference)
10. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### Existing Models

**Two Subscription Systems Already Exist:**

| System | Purpose | Owner | Status |
|--------|---------|-------|--------|
| `ClientSubscription` | Platform billing (Client → Avnz) | Client | 70% complete |
| `Subscription` | Product subscriptions (Customer → Company) | Company | 50% complete |

**Current Subscription Model (schema.prisma:954-1020):**
```prisma
model Subscription {
  id         String @id @default(cuid())
  companyId  String
  customerId String

  planName   String           // ❌ Inline - not linked to plan entity
  planAmount Decimal
  interval   BillingInterval

  // Trial support exists
  trialStart DateTime?
  trialEnd   DateTime?

  // Shipping exists but basic
  shippingAddressId   String?
  shippingPreferences Json
}
```

**Current Product Model (schema.prisma:557-640):**
```prisma
model Product {
  // ❌ No fulfillment type field
  // ❌ No fulfillment provider selection
  isSubscribable       Boolean  @default(true)
  subscriptionDiscount Decimal?
}
```

**Current Integration Categories:**
- ❌ No `FULFILLMENT` category
- ❌ No fulfillment providers (ShipStation, ShipMonk, etc.)
- ✅ EMAIL exists (`AWS_SES`, `SENDGRID`)
- ✅ SMS exists (`AWS_SNS`, `TWILIO`)

### Key Gaps to Address

1. **No Standalone Plan Entity** - Plans are inline on subscriptions
2. **No Multi-Level Plan Ownership** - Only company-scoped
3. **No Product Fulfillment Type** - Can't distinguish physical vs digital
4. **No Fulfillment Provider Link** - Products don't specify how to fulfill
5. **No Shipment-Aware Billing** - Charging doesn't consider delivery status

---

## Architecture Overview

### Entity Hierarchy for Plans

```
ORGANIZATION (avnz.io)
│
├── SubscriptionPlan (org-level templates)
│   └── Can be "adopted" by Clients/Companies
│
├── CLIENTS
│   ├── SubscriptionPlan (client-level plans)
│   │   └── Can be shared with their Companies
│   │
│   └── COMPANIES
│       ├── SubscriptionPlan (company-level plans)
│       │
│       └── Products
│           ├── fulfillmentType: PHYSICAL | VIRTUAL | ELECTRONIC
│           ├── fulfillmentProviderId (for PHYSICAL/ELECTRONIC)
│           └── attachedPlanId (link to SubscriptionPlan)
```

### Product Fulfillment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PHYSICAL  │     │   VIRTUAL   │     │ ELECTRONIC  │
│   (coffee)  │     │ (insurance) │     │  (e-book)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Fulfillment  │    │   No-Op      │    │ Fulfillment  │
│  Provider:   │    │ (Instant)    │    │  Provider:   │
│ - ShipStation│    │              │    │ - AWS SES    │
│ - ShipMonk   │    │              │    │ - Twilio SMS │
│ - Stamps.com │    │              │    │ - SendGrid   │
│ - FBA        │    │              │    │              │
└──────┬───────┘    └──────────────┘    └──────┬───────┘
       │                                       │
       ▼                                       ▼
┌──────────────┐                        ┌──────────────┐
│  Shipment    │                        │  Delivery    │
│  Created     │                        │  Sent        │
│  (tracking)  │                        │  (email/sms) │
└──────────────┘                        └──────────────┘
```

### Billing Logic Flow

```
Subscription Rebill Scheduled
        │
        ▼
┌───────────────────────┐
│ Check Product Type    │
└───────────┬───────────┘
            │
    ┌───────┴───────────────────┐
    │                           │
    ▼                           ▼
┌────────────┐          ┌─────────────────┐
│ VIRTUAL or │          │ PHYSICAL        │
│ ELECTRONIC │          │ (requires ship) │
└─────┬──────┘          └────────┬────────┘
      │                          │
      ▼                          ▼
┌────────────┐          ┌─────────────────┐
│ Charge     │          │ Check Previous  │
│ Immediately│          │ Shipment Status │
└────────────┘          └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
            ┌──────────────┐          ┌──────────────┐
            │ Not Shipped  │          │  Delivered   │
            │ Yet          │          │              │
            └──────┬───────┘          └──────┬───────┘
                   │                         │
                   ▼                         ▼
            ┌──────────────┐          ┌──────────────┐
            │ DELAY Charge │          │ Wait X days  │
            │ (poll daily) │          │ post-delivery│
            └──────────────┘          └──────┬───────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │ Charge Now   │
                                      └──────────────┘
```

---

## Phase 1: Subscription Plan Models

### 1.1 New Prisma Models

```prisma
// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION PLAN - Standalone, Multi-Level, Reusable
// ═══════════════════════════════════════════════════════════════

enum SubscriptionPlanScope {
  ORGANIZATION    // Platform-wide templates
  CLIENT          // Client-level plans
  COMPANY         // Company-level plans
}

enum SubscriptionPlanStatus {
  DRAFT           // Not yet published
  ACTIVE          // Available for use
  ARCHIVED        // Hidden but existing subscriptions continue
  DEPRECATED      // Sunset - no new subscriptions
}

model SubscriptionPlan {
  id        String @id @default(cuid())

  // ─────────────────────────────────────────────────────────────
  // OWNERSHIP (exactly one of these set based on scope)
  // ─────────────────────────────────────────────────────────────
  scope           SubscriptionPlanScope
  organizationId  String?
  clientId        String?
  companyId       String?

  // ─────────────────────────────────────────────────────────────
  // PLAN IDENTIFICATION
  // ─────────────────────────────────────────────────────────────
  name            String          // Internal name (unique within scope)
  displayName     String          // Customer-facing name
  description     String?
  shortDescription String?        // One-liner for cards

  // ─────────────────────────────────────────────────────────────
  // PRICING
  // ─────────────────────────────────────────────────────────────
  basePriceMonthly  Decimal @db.Decimal(10, 2)  // Monthly price
  basePriceAnnual   Decimal? @db.Decimal(10, 2) // Annual price (optional)
  annualDiscountPct Decimal? @db.Decimal(5, 2)  // e.g., 10.00 = 10% off
  currency          String @default("USD")

  // ─────────────────────────────────────────────────────────────
  // BILLING CYCLE
  // ─────────────────────────────────────────────────────────────
  availableIntervals BillingInterval[]  // Which intervals are offered
  defaultInterval    BillingInterval    // Default when subscribing

  // ─────────────────────────────────────────────────────────────
  // TRIAL CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  trialEnabled      Boolean @default(false)
  trialDays         Int?                    // X days trial
  trialIncludesShipment Boolean @default(false) // Ship during trial?

  // For physical products: wait for delivery before trial conversion
  trialWaitForDelivery Boolean @default(false)
  trialExtendDaysPostDelivery Int? @default(0) // Add X days after delivery

  // ─────────────────────────────────────────────────────────────
  // RECURRING CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  recurringEnabled  Boolean @default(true)
  recurringIntervalDays Int?  // Override: every X days (null = use billing interval)
  recurringIncludesShipment Boolean @default(true)

  // For physical products: wait for previous delivery before charging
  recurringWaitForDelivery Boolean @default(false)
  recurringExtendDaysPostDelivery Int? @default(0)

  // ─────────────────────────────────────────────────────────────
  // DISPLAY & MARKETING
  // ─────────────────────────────────────────────────────────────
  sortOrder         Int @default(0)
  isPublic          Boolean @default(true)  // Show on storefront
  isFeatured        Boolean @default(false) // Highlight this plan
  badgeText         String?                 // "Most Popular", "Best Value"

  // ─────────────────────────────────────────────────────────────
  // FEATURES & LIMITS (JSON for flexibility)
  // ─────────────────────────────────────────────────────────────
  features          Json @default("[]")     // Array of feature strings
  includedQuantity  Int? @default(1)        // Units per billing cycle
  maxQuantity       Int?                    // Max units allowed

  // ─────────────────────────────────────────────────────────────
  // METADATA
  // ─────────────────────────────────────────────────────────────
  metadata          Json @default("{}")

  // ─────────────────────────────────────────────────────────────
  // STATUS & TIMESTAMPS
  // ─────────────────────────────────────────────────────────────
  status            SubscriptionPlanStatus @default(DRAFT)
  publishedAt       DateTime?
  archivedAt        DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String?
  updatedBy         String?

  // Soft delete
  deletedAt         DateTime?
  deletedBy         String?
  cascadeId         String?

  // ─────────────────────────────────────────────────────────────
  // RELATIONS
  // ─────────────────────────────────────────────────────────────
  organization      Organization? @relation(fields: [organizationId], references: [id])
  client            Client?       @relation(fields: [clientId], references: [id])
  company           Company?      @relation(fields: [companyId], references: [id])

  // Products using this plan
  products          ProductSubscriptionPlan[]

  // Active subscriptions
  subscriptions     Subscription[]

  @@unique([scope, organizationId, name])
  @@unique([scope, clientId, name])
  @@unique([scope, companyId, name])
  @@index([scope, status])
  @@index([companyId, status])
  @@index([clientId, status])
  @@index([deletedAt])
  @@map("subscription_plans")
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT ↔ SUBSCRIPTION PLAN LINK
// ═══════════════════════════════════════════════════════════════

model ProductSubscriptionPlan {
  id        String @id @default(cuid())
  productId String
  planId    String

  // Override pricing for this specific product
  overridePriceMonthly Decimal? @db.Decimal(10, 2)
  overridePriceAnnual  Decimal? @db.Decimal(10, 2)

  // Override trial settings
  overrideTrialDays    Int?

  isDefault            Boolean @default(false)  // Default plan for this product
  sortOrder            Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  plan    SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@unique([productId, planId])
  @@index([planId])
  @@map("product_subscription_plans")
}
```

### 1.2 Update Existing Subscription Model

```prisma
model Subscription {
  id         String @id @default(cuid())
  companyId  String
  customerId String

  // ─────────────────────────────────────────────────────────────
  // PLAN REFERENCE (NEW - link to SubscriptionPlan entity)
  // ─────────────────────────────────────────────────────────────
  planId     String?        // Link to SubscriptionPlan (nullable for migration)

  // Keep inline fields for historical/custom subscriptions
  planName   String         // Snapshot of plan name at subscription time
  planAmount Decimal @db.Decimal(10, 2)
  currency   String @default("USD")
  interval   BillingInterval

  // ─────────────────────────────────────────────────────────────
  // PRODUCT REFERENCE (NEW - what product is being subscribed to)
  // ─────────────────────────────────────────────────────────────
  productId  String?        // Link to Product
  quantity   Int @default(1)

  // ─────────────────────────────────────────────────────────────
  // SHIPMENT-AWARE BILLING (NEW)
  // ─────────────────────────────────────────────────────────────
  lastShipmentId         String?      // Track last shipment for this subscription
  waitingForDelivery     Boolean @default(false)
  deliveredAt            DateTime?    // When last shipment was delivered
  chargeAfterDeliveryAt  DateTime?    // Calculated: deliveredAt + extendDays

  // ... existing fields ...

  // Relations
  plan            SubscriptionPlan? @relation(fields: [planId], references: [id])
  product         Product?          @relation(fields: [productId], references: [id])
  lastShipment    Shipment?         @relation("LastSubscriptionShipment", fields: [lastShipmentId], references: [id])
}
```

---

## Phase 2: Product Fulfillment Types

### 2.1 New Enums

```prisma
// ═══════════════════════════════════════════════════════════════
// PRODUCT FULFILLMENT
// ═══════════════════════════════════════════════════════════════

enum ProductFulfillmentType {
  PHYSICAL      // Tangible goods - requires shipping (coffee, widgets)
  VIRTUAL       // Intangible - no fulfillment needed (insurance, warranty)
  ELECTRONIC    // Digital goods - delivered via email/SMS (e-books, codes)
}

enum ElectronicDeliveryMethod {
  EMAIL         // Send via email
  SMS           // Send via SMS
  EMAIL_AND_SMS // Send via both
  DOWNLOAD_LINK // Provide download URL
}
```

### 2.2 Update Product Model

```prisma
model Product {
  id        String @id @default(cuid())
  companyId String

  // ... existing fields ...

  // ═══════════════════════════════════════════════════════════════
  // FULFILLMENT CONFIGURATION (NEW)
  // ═══════════════════════════════════════════════════════════════

  fulfillmentType    ProductFulfillmentType @default(PHYSICAL)

  // For PHYSICAL products
  fulfillmentProviderId String?    // Link to configured fulfillment integration
  requiresShipping      Boolean @default(true)
  shippingWeight        Decimal? @db.Decimal(10, 2)
  shippingWeightUnit    String @default("oz")
  shippingDimensions    Json?      // { length, width, height, unit }

  // For ELECTRONIC products
  electronicDeliveryMethod ElectronicDeliveryMethod?
  electronicDeliveryProviderId String?  // Email/SMS integration to use
  electronicContent     Json?      // { fileUrl, accessCode, instructions }

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION SETTINGS (ENHANCED)
  // ═══════════════════════════════════════════════════════════════

  isSubscribable       Boolean @default(true)
  subscriptionDiscount Decimal? @db.Decimal(5, 2)
  defaultPlanId        String?   // Default subscription plan

  // ═══════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════

  fulfillmentProvider       ClientIntegration? @relation("ProductFulfillment", fields: [fulfillmentProviderId], references: [id])
  electronicDeliveryProvider ClientIntegration? @relation("ProductElectronicDelivery", fields: [electronicDeliveryProviderId], references: [id])
  defaultPlan               SubscriptionPlan?  @relation("ProductDefaultPlan", fields: [defaultPlanId], references: [id])
  subscriptionPlans         ProductSubscriptionPlan[]
  subscriptions             Subscription[]

  // ... existing relations ...
}
```

---

## Phase 3: Fulfillment Provider Integration

### 3.1 New Integration Category & Providers

```typescript
// Update: apps/api/src/integrations/types/integration.types.ts

export enum IntegrationCategory {
  // ... existing categories ...

  // NEW
  FULFILLMENT = 'FULFILLMENT',        // Physical shipping providers
  DIGITAL_DELIVERY = 'DIGITAL_DELIVERY', // Electronic content delivery
}

export enum IntegrationProvider {
  // ... existing providers ...

  // ═══════════════════════════════════════════════════════════════
  // FULFILLMENT PROVIDERS (NEW)
  // ═══════════════════════════════════════════════════════════════

  // Major 3PL / Fulfillment Services
  SHIPSTATION = 'SHIPSTATION',
  SHIPMONK = 'SHIPMONK',
  SHIPBOB = 'SHIPBOB',
  DELIVERR = 'DELIVERR',
  FULFILLMENT_BY_AMAZON = 'FULFILLMENT_BY_AMAZON',

  // Direct Carrier Integrations
  STAMPS_COM = 'STAMPS_COM',
  EASYPOST = 'EASYPOST',
  SHIPPO = 'SHIPPO',
  PIRATE_SHIP = 'PIRATE_SHIP',

  // Warehouse Management
  SKUVAULT = 'SKUVAULT',
  ORDORO = 'ORDORO',

  // ═══════════════════════════════════════════════════════════════
  // DIGITAL DELIVERY PROVIDERS (use existing email/SMS)
  // ═══════════════════════════════════════════════════════════════
  // AWS_SES - already exists (email)
  // SENDGRID - already exists (email)
  // AWS_SNS - already exists (SMS)
  // TWILIO - already exists (SMS)
}
```

### 3.2 Provider Credential Schemas

```typescript
// New credential interfaces

export interface ShipStationCredentials {
  apiKey: string;
  apiSecret: string;
  storeId?: string;
}

export interface ShipMonkCredentials {
  apiKey: string;
  warehouseId: string;
}

export interface ShipBobCredentials {
  apiToken: string;
  channelId: string;
}

export interface FBACredentials {
  sellerId: string;
  mwsAuthToken: string;
  accessKeyId: string;
  secretAccessKey: string;
  marketplaceId: string;
}

export interface EasyPostCredentials {
  apiKey: string;
  testApiKey?: string;
}

export interface StampsComCredentials {
  integrationId: string;
  username: string;
  password: string;
}

export interface ShippoCredentials {
  apiToken: string;
}
```

### 3.3 Integration Definitions

```typescript
// Add to: apps/api/src/integrations/services/integration-definitions.ts

export const fulfillmentIntegrationDefinitions: IntegrationDefinition[] = [
  {
    id: 'shipstation',
    provider: IntegrationProvider.SHIPSTATION,
    category: IntegrationCategory.FULFILLMENT,
    name: 'ShipStation',
    description: 'Multi-carrier shipping platform with automation and analytics',
    logoUrl: '/integrations/shipstation.svg',
    documentationUrl: 'https://www.shipstation.com/docs/',
    isOrgOnly: false,
    isClientAllowed: true,
    isPlatformOffered: false,
    authType: AuthType.API_KEY,
    credentialSchema: {
      type: 'object',
      required: ['apiKey', 'apiSecret'],
      properties: {
        apiKey: { type: 'string', title: 'API Key', description: 'ShipStation API Key' },
        apiSecret: { type: 'string', title: 'API Secret', format: 'password' },
        storeId: { type: 'string', title: 'Store ID (optional)' },
      },
    },
    requiredCompliance: [],
    status: 'active',
  },
  {
    id: 'shipmonk',
    provider: IntegrationProvider.SHIPMONK,
    category: IntegrationCategory.FULFILLMENT,
    name: 'ShipMonk',
    description: 'End-to-end fulfillment and warehouse management',
    logoUrl: '/integrations/shipmonk.svg',
    isOrgOnly: false,
    isClientAllowed: true,
    isPlatformOffered: false,
    authType: AuthType.API_KEY,
    credentialSchema: {
      type: 'object',
      required: ['apiKey', 'warehouseId'],
      properties: {
        apiKey: { type: 'string', title: 'API Key', format: 'password' },
        warehouseId: { type: 'string', title: 'Warehouse ID' },
      },
    },
    requiredCompliance: [],
    status: 'active',
  },
  {
    id: 'shipbob',
    provider: IntegrationProvider.SHIPBOB,
    category: IntegrationCategory.FULFILLMENT,
    name: 'ShipBob',
    description: 'Global fulfillment network with 2-day shipping',
    logoUrl: '/integrations/shipbob.svg',
    isOrgOnly: false,
    isClientAllowed: true,
    isPlatformOffered: false,
    authType: AuthType.API_KEY,
    credentialSchema: {
      type: 'object',
      required: ['apiToken', 'channelId'],
      properties: {
        apiToken: { type: 'string', title: 'API Token', format: 'password' },
        channelId: { type: 'string', title: 'Channel ID' },
      },
    },
    requiredCompliance: [],
    status: 'active',
  },
  {
    id: 'fba',
    provider: IntegrationProvider.FULFILLMENT_BY_AMAZON,
    category: IntegrationCategory.FULFILLMENT,
    name: 'Fulfillment by Amazon (FBA)',
    description: 'Amazon\'s world-class fulfillment network',
    logoUrl: '/integrations/amazon-fba.svg',
    isOrgOnly: false,
    isClientAllowed: true,
    isPlatformOffered: false,
    authType: AuthType.CUSTOM,
    credentialSchema: {
      type: 'object',
      required: ['sellerId', 'accessKeyId', 'secretAccessKey', 'marketplaceId'],
      properties: {
        sellerId: { type: 'string', title: 'Seller ID' },
        mwsAuthToken: { type: 'string', title: 'MWS Auth Token', format: 'password' },
        accessKeyId: { type: 'string', title: 'AWS Access Key ID' },
        secretAccessKey: { type: 'string', title: 'AWS Secret Access Key', format: 'password' },
        marketplaceId: { type: 'string', title: 'Marketplace ID', default: 'ATVPDKIKX0DER' },
      },
    },
    requiredCompliance: [],
    status: 'active',
  },
  {
    id: 'easypost',
    provider: IntegrationProvider.EASYPOST,
    category: IntegrationCategory.FULFILLMENT,
    name: 'EasyPost',
    description: 'Multi-carrier shipping API with rate shopping',
    logoUrl: '/integrations/easypost.svg',
    isOrgOnly: false,
    isClientAllowed: true,
    isPlatformOffered: false,
    authType: AuthType.API_KEY,
    credentialSchema: {
      type: 'object',
      required: ['apiKey'],
      properties: {
        apiKey: { type: 'string', title: 'API Key', format: 'password' },
        testApiKey: { type: 'string', title: 'Test API Key (optional)', format: 'password' },
      },
    },
    requiredCompliance: [],
    status: 'active',
  },
  {
    id: 'stamps',
    provider: IntegrationProvider.STAMPS_COM,
    category: IntegrationCategory.FULFILLMENT,
    name: 'Stamps.com',
    description: 'USPS postage and shipping integration',
    logoUrl: '/integrations/stamps.svg',
    isOrgOnly: false,
    isClientAllowed: true,
    isPlatformOffered: false,
    authType: AuthType.BASIC_AUTH,
    credentialSchema: {
      type: 'object',
      required: ['integrationId', 'username', 'password'],
      properties: {
        integrationId: { type: 'string', title: 'Integration ID' },
        username: { type: 'string', title: 'Username' },
        password: { type: 'string', title: 'Password', format: 'password' },
      },
    },
    requiredCompliance: [],
    status: 'active',
  },
  {
    id: 'shippo',
    provider: IntegrationProvider.SHIPPO,
    category: IntegrationCategory.FULFILLMENT,
    name: 'Shippo',
    description: 'Multi-carrier shipping with discounted rates',
    logoUrl: '/integrations/shippo.svg',
    isOrgOnly: false,
    isClientAllowed: true,
    isPlatformOffered: false,
    authType: AuthType.API_KEY,
    credentialSchema: {
      type: 'object',
      required: ['apiToken'],
      properties: {
        apiToken: { type: 'string', title: 'API Token', format: 'password' },
      },
    },
    requiredCompliance: [],
    status: 'active',
  },
];
```

---

## Phase 4: Shipment-Aware Billing Logic

### 4.1 Billing Decision Tree

```typescript
// apps/api/src/subscriptions/services/subscription-billing.service.ts

interface BillingDecision {
  shouldCharge: boolean;
  reason: string;
  delayUntil?: Date;
  nextCheckAt?: Date;
}

export class SubscriptionBillingService {

  /**
   * Determine if a subscription should be charged
   * Implements shipment-aware billing logic
   */
  async evaluateBilling(subscription: Subscription): Promise<BillingDecision> {
    const product = await this.getProduct(subscription.productId);
    const plan = await this.getPlan(subscription.planId);

    // ─────────────────────────────────────────────────────────────
    // VIRTUAL PRODUCTS - Always charge on schedule
    // ─────────────────────────────────────────────────────────────
    if (product.fulfillmentType === 'VIRTUAL') {
      return {
        shouldCharge: true,
        reason: 'Virtual product - no shipment dependency',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // ELECTRONIC PRODUCTS - Always charge on schedule
    // ─────────────────────────────────────────────────────────────
    if (product.fulfillmentType === 'ELECTRONIC') {
      return {
        shouldCharge: true,
        reason: 'Electronic product - instant delivery',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // PHYSICAL PRODUCTS - Check shipment status
    // ─────────────────────────────────────────────────────────────

    const isTrial = subscription.status === 'TRIALING';
    const waitForDelivery = isTrial
      ? plan.trialWaitForDelivery
      : plan.recurringWaitForDelivery;
    const extendDays = isTrial
      ? plan.trialExtendDaysPostDelivery
      : plan.recurringExtendDaysPostDelivery;

    // If plan doesn't require waiting for delivery, charge now
    if (!waitForDelivery) {
      return {
        shouldCharge: true,
        reason: 'Plan does not require waiting for delivery',
      };
    }

    // Check previous shipment status
    const lastShipment = await this.getLastShipment(subscription.id);

    // No previous shipment? This is first billing, proceed
    if (!lastShipment) {
      return {
        shouldCharge: true,
        reason: 'First billing - no previous shipment to wait for',
      };
    }

    // Shipment not yet shipped?
    if (lastShipment.status === 'PENDING' || lastShipment.status === 'PROCESSING') {
      return {
        shouldCharge: false,
        reason: 'Previous shipment not yet shipped',
        nextCheckAt: addDays(new Date(), 1), // Check again tomorrow
      };
    }

    // Shipment in transit?
    if (lastShipment.status === 'IN_TRANSIT' || lastShipment.status === 'SHIPPED') {
      return {
        shouldCharge: false,
        reason: 'Previous shipment in transit',
        nextCheckAt: addDays(new Date(), 1),
      };
    }

    // Shipment delivered!
    if (lastShipment.status === 'DELIVERED') {
      const deliveredAt = lastShipment.deliveredAt;
      const chargeAfter = addDays(deliveredAt, extendDays || 0);

      if (new Date() >= chargeAfter) {
        return {
          shouldCharge: true,
          reason: `Delivered + ${extendDays} day extension passed`,
        };
      } else {
        return {
          shouldCharge: false,
          reason: `Waiting ${extendDays} days post-delivery`,
          delayUntil: chargeAfter,
          nextCheckAt: chargeAfter,
        };
      }
    }

    // Edge case: shipment returned/cancelled
    return {
      shouldCharge: false,
      reason: 'Shipment status requires review',
      nextCheckAt: addDays(new Date(), 1),
    };
  }
}
```

### 4.2 Trial Conversion Logic

```typescript
/**
 * Handle trial to paid conversion
 * For physical products: wait for delivery + extend days
 */
async evaluateTrialConversion(subscription: Subscription): Promise<BillingDecision> {
  const product = await this.getProduct(subscription.productId);
  const plan = await this.getPlan(subscription.planId);

  const trialEndDate = subscription.trialEnd;

  // Trial not ended yet
  if (new Date() < trialEndDate) {
    return {
      shouldCharge: false,
      reason: 'Trial period active',
      nextCheckAt: trialEndDate,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // VIRTUAL/ELECTRONIC - Convert immediately at trial end
  // ─────────────────────────────────────────────────────────────
  if (product.fulfillmentType !== 'PHYSICAL') {
    return {
      shouldCharge: true,
      reason: 'Trial ended - non-physical product',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // PHYSICAL - Check if we should wait for delivery
  // ─────────────────────────────────────────────────────────────
  if (!plan.trialWaitForDelivery) {
    return {
      shouldCharge: true,
      reason: 'Trial ended - no delivery wait required',
    };
  }

  // Find trial shipment
  const trialShipment = await this.findTrialShipment(subscription.id);

  if (!trialShipment) {
    // No shipment during trial - proceed with charge
    return {
      shouldCharge: true,
      reason: 'Trial ended - no trial shipment to wait for',
    };
  }

  // Wait for delivery + extension
  return this.evaluateShipmentDelivery(
    trialShipment,
    plan.trialExtendDaysPostDelivery || 0
  );
}
```

### 4.3 Subscription Rebill Job

```typescript
// apps/api/src/subscriptions/jobs/subscription-rebill.job.ts

@Injectable()
export class SubscriptionRebillJob {
  private readonly logger = new Logger(SubscriptionRebillJob.name);

  constructor(
    private readonly billingService: SubscriptionBillingService,
    private readonly paymentService: PaymentService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Run daily to process subscription rebills
   * Cron: 0 6 * * * (6 AM daily)
   */
  @Cron('0 6 * * *')
  async processRebills() {
    this.logger.log('Starting subscription rebill processing...');

    // Get subscriptions due for rebilling
    const dueSubscriptions = await this.subscriptionService.findDueForRebill();

    for (const subscription of dueSubscriptions) {
      try {
        const decision = await this.billingService.evaluateBilling(subscription);

        if (decision.shouldCharge) {
          await this.processCharge(subscription);
        } else {
          await this.deferCharge(subscription, decision);
        }
      } catch (error) {
        this.logger.error(
          `Failed to process rebill for subscription ${subscription.id}`,
          error.stack
        );
      }
    }

    this.logger.log('Subscription rebill processing complete');
  }

  private async processCharge(subscription: Subscription) {
    // Create rebill record
    const rebill = await this.subscriptionService.createRebill(subscription);

    // Process payment
    const result = await this.paymentService.chargeSubscription(subscription);

    if (result.success) {
      await this.subscriptionService.markRebillSuccess(rebill.id, result.transactionId);
      await this.subscriptionService.advanceBillingPeriod(subscription.id);

      // Create order/shipment if applicable
      if (subscription.product?.fulfillmentType === 'PHYSICAL') {
        await this.createSubscriptionOrder(subscription);
      }

      if (subscription.product?.fulfillmentType === 'ELECTRONIC') {
        await this.deliverElectronicContent(subscription);
      }
    } else {
      await this.subscriptionService.markRebillFailed(
        rebill.id,
        result.error,
        result.code
      );

      // Schedule retry based on dunning schedule
      await this.scheduleRetry(subscription, rebill);
    }
  }

  private async deferCharge(subscription: Subscription, decision: BillingDecision) {
    this.logger.log(
      `Deferred charge for subscription ${subscription.id}: ${decision.reason}`
    );

    // Update subscription with next check date
    await this.subscriptionService.setNextBillingCheck(
      subscription.id,
      decision.nextCheckAt
    );

    // Create audit log
    await this.auditService.log({
      action: 'SUBSCRIPTION_CHARGE_DEFERRED',
      resourceType: 'Subscription',
      resourceId: subscription.id,
      metadata: {
        reason: decision.reason,
        delayUntil: decision.delayUntil,
        nextCheckAt: decision.nextCheckAt,
      },
    });
  }
}
```

---

## Phase 5: UI Implementation

### 5.1 New Pages

| Route | Purpose | Components |
|-------|---------|------------|
| `/settings/billing/plans` | Plan management (existing) | Enhanced for multi-level |
| `/products/[id]/subscription` | Product subscription settings | Plan attachment, fulfillment config |
| `/subscriptions` | Customer subscriptions list | Subscription management |
| `/subscriptions/[id]` | Subscription detail | Status, shipments, rebills |
| `/settings/integrations/fulfillment` | Fulfillment providers | Provider configuration |

### 5.2 Plan Management Enhancements

```tsx
// apps/admin-dashboard/src/app/(dashboard)/settings/billing/plans/page.tsx

// Add scope selector based on user level
const availableScopes = useMemo(() => {
  const scopes: SubscriptionPlanScope[] = [];

  if (user.scopeType === 'ORGANIZATION') {
    scopes.push('ORGANIZATION', 'CLIENT', 'COMPANY');
  } else if (user.scopeType === 'CLIENT') {
    scopes.push('CLIENT', 'COMPANY');
  } else if (user.scopeType === 'COMPANY') {
    scopes.push('COMPANY');
  }

  return scopes;
}, [user.scopeType]);

// Plan creation form includes:
// - Trial configuration (days, includes shipment, wait for delivery)
// - Recurring configuration (interval, wait for delivery, extend days)
// - Scope selection (org/client/company)
```

### 5.3 Product Fulfillment Configuration

```tsx
// apps/admin-dashboard/src/components/products/fulfillment-config.tsx

interface FulfillmentConfigProps {
  product: Product;
  onUpdate: (config: FulfillmentConfig) => void;
}

export function FulfillmentConfig({ product, onUpdate }: FulfillmentConfigProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Type */}
        <div>
          <Label>Product Type</Label>
          <Select value={product.fulfillmentType} onValueChange={handleTypeChange}>
            <SelectItem value="PHYSICAL">
              <Package className="w-4 h-4 mr-2" />
              Physical - Requires shipping
            </SelectItem>
            <SelectItem value="VIRTUAL">
              <Cloud className="w-4 h-4 mr-2" />
              Virtual - No fulfillment needed
            </SelectItem>
            <SelectItem value="ELECTRONIC">
              <Mail className="w-4 h-4 mr-2" />
              Electronic - Digital delivery
            </SelectItem>
          </Select>
        </div>

        {/* Physical product options */}
        {product.fulfillmentType === 'PHYSICAL' && (
          <>
            <div>
              <Label>Fulfillment Provider</Label>
              <FulfillmentProviderSelect
                value={product.fulfillmentProviderId}
                onChange={handleProviderChange}
              />
            </div>
            <ShippingDimensionsForm product={product} />
          </>
        )}

        {/* Electronic product options */}
        {product.fulfillmentType === 'ELECTRONIC' && (
          <>
            <div>
              <Label>Delivery Method</Label>
              <Select value={product.electronicDeliveryMethod}>
                <SelectItem value="EMAIL">Email Only</SelectItem>
                <SelectItem value="SMS">SMS Only</SelectItem>
                <SelectItem value="EMAIL_AND_SMS">Both Email & SMS</SelectItem>
                <SelectItem value="DOWNLOAD_LINK">Download Link</SelectItem>
              </Select>
            </div>
            <div>
              <Label>Delivery Provider</Label>
              <EmailSmsProviderSelect
                method={product.electronicDeliveryMethod}
                value={product.electronicDeliveryProviderId}
                onChange={handleDeliveryProviderChange}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Migration Strategy

### Step 1: Schema Migration

```sql
-- Migration: 2024_12_02_add_subscription_plans

-- 1. Create SubscriptionPlan table
CREATE TABLE subscription_plans (
  id VARCHAR(30) PRIMARY KEY,
  scope VARCHAR(20) NOT NULL,
  organization_id VARCHAR(30),
  client_id VARCHAR(30),
  company_id VARCHAR(30),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  -- ... all fields ...
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add fulfillment fields to Product
ALTER TABLE products ADD COLUMN fulfillment_type VARCHAR(20) DEFAULT 'PHYSICAL';
ALTER TABLE products ADD COLUMN fulfillment_provider_id VARCHAR(30);
ALTER TABLE products ADD COLUMN electronic_delivery_method VARCHAR(20);
-- ... other fields ...

-- 3. Add plan reference to Subscription
ALTER TABLE subscriptions ADD COLUMN plan_id VARCHAR(30);
ALTER TABLE subscriptions ADD COLUMN product_id VARCHAR(30);
ALTER TABLE subscriptions ADD COLUMN waiting_for_delivery BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN delivered_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN charge_after_delivery_at TIMESTAMP;
```

### Step 2: Data Migration

```typescript
// Migrate existing inline plans to SubscriptionPlan entities
async migrateExistingPlans() {
  const subscriptions = await prisma.subscription.findMany({
    where: { planId: null },
    distinct: ['planName', 'planAmount', 'interval', 'companyId'],
  });

  for (const sub of subscriptions) {
    // Create SubscriptionPlan from inline data
    const plan = await prisma.subscriptionPlan.create({
      data: {
        scope: 'COMPANY',
        companyId: sub.companyId,
        name: sub.planName.toLowerCase().replace(/\s+/g, '-'),
        displayName: sub.planName,
        basePriceMonthly: sub.planAmount,
        currency: sub.currency,
        defaultInterval: sub.interval,
        availableIntervals: [sub.interval],
        status: 'ACTIVE',
      },
    });

    // Link subscriptions to new plan
    await prisma.subscription.updateMany({
      where: {
        planName: sub.planName,
        planAmount: sub.planAmount,
        interval: sub.interval,
        companyId: sub.companyId,
      },
      data: { planId: plan.id },
    });
  }
}
```

---

## API Reference

### Subscription Plans API

```
# List plans (scoped to user access)
GET /api/subscription-plans
  ?scope=ORGANIZATION|CLIENT|COMPANY
  &status=ACTIVE|DRAFT|ARCHIVED
  &includeArchived=true

# Get single plan
GET /api/subscription-plans/:id

# Create plan
POST /api/subscription-plans
{
  "scope": "COMPANY",
  "name": "monthly-premium",
  "displayName": "Premium Monthly",
  "basePriceMonthly": 29.99,
  "trialEnabled": true,
  "trialDays": 14,
  "trialIncludesShipment": true,
  "trialWaitForDelivery": true,
  "trialExtendDaysPostDelivery": 3,
  "recurringWaitForDelivery": true,
  "recurringExtendDaysPostDelivery": 5
}

# Update plan
PATCH /api/subscription-plans/:id

# Archive plan (soft delete)
DELETE /api/subscription-plans/:id

# Attach plan to product
POST /api/subscription-plans/:planId/products/:productId

# Detach plan from product
DELETE /api/subscription-plans/:planId/products/:productId
```

### Fulfillment Integrations API

```
# List available fulfillment providers
GET /api/integrations/definitions?category=FULFILLMENT

# List configured fulfillment integrations
GET /api/integrations?category=FULFILLMENT

# Configure fulfillment provider
POST /api/integrations
{
  "provider": "SHIPSTATION",
  "name": "Main ShipStation",
  "mode": "OWN",
  "credentials": {
    "apiKey": "xxx",
    "apiSecret": "xxx"
  }
}

# Test fulfillment provider
POST /api/integrations/:id/test
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('SubscriptionBillingService', () => {
  describe('evaluateBilling', () => {
    it('should charge immediately for VIRTUAL products', async () => {
      const subscription = createMockSubscription({
        product: { fulfillmentType: 'VIRTUAL' }
      });
      const decision = await service.evaluateBilling(subscription);
      expect(decision.shouldCharge).toBe(true);
    });

    it('should defer charge when shipment not delivered', async () => {
      const subscription = createMockSubscription({
        product: { fulfillmentType: 'PHYSICAL' },
        plan: { recurringWaitForDelivery: true },
        lastShipment: { status: 'IN_TRANSIT' },
      });
      const decision = await service.evaluateBilling(subscription);
      expect(decision.shouldCharge).toBe(false);
    });

    it('should charge after delivery + extend days', async () => {
      const deliveredAt = subDays(new Date(), 10);
      const subscription = createMockSubscription({
        product: { fulfillmentType: 'PHYSICAL' },
        plan: {
          recurringWaitForDelivery: true,
          recurringExtendDaysPostDelivery: 5,
        },
        lastShipment: {
          status: 'DELIVERED',
          deliveredAt,
        },
      });
      const decision = await service.evaluateBilling(subscription);
      expect(decision.shouldCharge).toBe(true);
    });
  });
});
```

### E2E Tests

```typescript
describe('Subscription Lifecycle', () => {
  it('should handle full subscription with physical product', async () => {
    // 1. Create subscription with trial
    const subscription = await api.post('/subscriptions', {
      productId: physicalProduct.id,
      planId: plan.id,
      customerId: customer.id,
    });
    expect(subscription.status).toBe('TRIALING');

    // 2. Simulate shipment creation
    const shipment = await api.post('/shipments', {
      orderId: subscription.trialOrderId,
    });

    // 3. Trial ends but shipment not delivered - should not charge
    await advanceTime(plan.trialDays);
    await runRebillJob();
    const updated = await api.get(`/subscriptions/${subscription.id}`);
    expect(updated.status).toBe('TRIALING'); // Still trialing

    // 4. Shipment delivered - should start extend period
    await updateShipmentStatus(shipment.id, 'DELIVERED');
    await runRebillJob();

    // 5. Extend days pass - should convert to active
    await advanceTime(plan.trialExtendDaysPostDelivery + 1);
    await runRebillJob();
    const converted = await api.get(`/subscriptions/${subscription.id}`);
    expect(converted.status).toBe('ACTIVE');
  });
});
```

---

## Implementation Timeline

| Phase | Tasks | Est. Duration |
|-------|-------|---------------|
| **Phase 1** | Subscription Plan models, migration | 3-4 days |
| **Phase 2** | Product fulfillment types, enums | 2 days |
| **Phase 3** | Fulfillment provider definitions | 2-3 days |
| **Phase 4** | Shipment-aware billing logic | 4-5 days |
| **Phase 5** | UI implementation | 4-5 days |
| **Testing** | Unit + E2E tests | 3 days |
| **Documentation** | API docs, migration guide | 1-2 days |

**Total Estimated: 3-4 weeks**

---

## Open Questions for Product

1. **Plan Inheritance**: Can a Company use a Client-level plan without copying it?
2. **Price Overrides**: When a product is attached to a plan, can the price be overridden per-product?
3. **Shipment Tracking Webhook**: Which fulfillment providers support delivery status webhooks?
4. **Trial Shipment Policy**: If trial shipment is returned, should trial be extended or cancelled?
5. **Electronic Delivery Retry**: If email/SMS delivery fails, how many retries before escalation?

---

*Document Version: 1.0*
*Created: December 2, 2025*
*Author: Claude Code (Senior Developer Review)*
