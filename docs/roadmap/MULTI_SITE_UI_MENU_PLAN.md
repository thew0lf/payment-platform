# Multi-Site E-Commerce UI/UX Plan

## Document Purpose

This document outlines the UI/UX strategy for implementing multi-site e-commerce features across the AVNZ Payment Platform. It covers admin dashboard navigation changes, new management pages, and Company Portal shopping experiences.

**Last Updated:** December 31, 2025
**Status:** Planning
**Related Schema Models:** `Site`, `Cart`, `CartItem`, `SavedCartItem`

---

## Table of Contents

1. [Admin Dashboard Menu Updates](#1-admin-dashboard-menu-updates)
2. [Sites Management Page](#2-sites-management-page)
3. [Carts Management Page](#3-carts-management-page)
4. [Domain Management](#4-domain-management)
5. [Company Portal Updates](#5-company-portal-updates)
6. [Responsive Considerations](#6-responsive-considerations)
7. [Implementation Priority](#7-implementation-priority)

---

## 1. Admin Dashboard Menu Updates

### 1.1 Current Navigation Structure

The sidebar navigation is organized into 8 sections defined in `/apps/admin-dashboard/src/lib/navigation.ts`:

```
1. Insights (expanded by default)
2. Organization (ORG/CLIENT only)
3. Operations (expanded by default)
4. Commerce
5. AI & Automation
6. Vendors (ORG only)
7. Gateway Risk (ORG only)
8. Settings
```

### 1.2 Proposed Menu Changes

#### Organization Section Updates

Add Carts management to the Organization section since carts are cross-site and company-scoped:

```typescript
// In navigationSections - Organization section
{
  id: 'organization',
  label: 'Organization',
  icon: Building,
  defaultExpanded: false,
  requiredScopes: ['ORGANIZATION', 'CLIENT'],
  items: [
    { id: 'clients', label: 'Clients', href: '/clients', icon: Building, requiredScopes: ['ORGANIZATION'] },
    { id: 'companies', label: 'Companies', href: '/companies', icon: Building2 },
    { id: 'sites', label: 'Sites', href: '/sites', icon: Store },  // Already exists
    { id: 'domains', label: 'Domains', href: '/sites/domains', icon: Globe },  // NEW
    { id: 'carts', label: 'Carts', href: '/carts', icon: ShoppingCart },  // NEW - moved from Operations
    { id: 'admin-billing', label: 'Billing Management', href: '/admin/billing', icon: Wallet, requiredScopes: ['ORGANIZATION'] },
  ],
}
```

#### Commerce Section Updates

Add site-aware commerce features:

```typescript
// In navigationSections - Commerce section
{
  id: 'commerce',
  label: 'Commerce',
  icon: ShoppingBag,
  defaultExpanded: false,
  items: [
    { id: 'products', label: 'Products', href: '/products', icon: ShoppingBag, badgeKey: 'lowStock' },
    { id: 'import-products', label: 'Import Products', href: '/products/import', icon: Upload },
    { id: 'subscription-plans', label: 'Subscription Plans', href: '/subscription-plans', icon: Repeat },
    { id: 'categories', label: 'Categories', href: '/products/categories', icon: FolderTree },
    { id: 'tags', label: 'Tags', href: '/products/tags', icon: Tags },
    { id: 'collections', label: 'Collections', href: '/products/collections', icon: Layers },
    { id: 'reviews', label: 'Reviews', href: '/reviews', icon: Star },
    { id: 'funnels', label: 'Funnels', href: '/funnels', icon: Workflow },
    { id: 'leads', label: 'Leads', href: '/leads', icon: UserPlus },
    { id: 'landing-pages', label: 'Landing Pages', href: '/landing-pages', icon: FileText },
    { id: 'abandoned-carts', label: 'Abandoned Carts', href: '/carts/abandoned', icon: ShoppingCart },  // NEW
  ],
}
```

### 1.3 New Icon Imports

Add these Lucide icons to `/apps/admin-dashboard/src/lib/navigation.ts`:

```typescript
import {
  // ... existing imports
  Globe,           // For Domains
  ShoppingCart,    // Already imported - reuse for Carts
  Timer,           // For cart recovery countdown
  Mail,            // For recovery emails
} from 'lucide-react';

// Add to iconMap
export const iconMap: Record<string, LucideIcon> = {
  // ... existing icons
  Globe,
  Timer,
  Mail,
};
```

### 1.4 Badge Updates

Update the `NavBadges` interface to include cart-related badges:

```typescript
export interface NavBadges {
  orders: number;
  fulfillment: number;
  lowStock: number;
  abandonedCarts: number;  // NEW - count of carts needing recovery
  activeCarts: number;     // NEW - count of active carts (optional)
}
```

### 1.5 Mobile Tab Bar Updates

Update `/apps/admin-dashboard/src/components/layout/mobile-tab-bar.tsx`:

```typescript
// Add to moreItems array
const moreItems = [
  // ... existing items
  { id: 'sites', label: 'Sites', href: '/sites', icon: Store },
  { id: 'carts', label: 'Carts', href: '/carts', icon: ShoppingCart },
  // ... rest of items
];
```

---

## 2. Sites Management Page

### 2.1 Current Implementation

The Sites page already exists at `/apps/admin-dashboard/src/app/(dashboard)/sites/page.tsx` with:
- List view with search and filters
- Site creation/editing modal
- Status management
- Company filtering

### 2.2 Enhanced Sites Page

#### Site Type Filter Addition

```
+------------------------------------------------------------------+
|  Sites                                              [+ Add Site]  |
|  12 sites . 10 active                                            |
+------------------------------------------------------------------+
|  [Search by name, code, domain...]  [Filter] [Type v] [Refresh]  |
|                                                                   |
|  Types: [All] [Storefront] [Funnel] [Trial] [Marketplace] [B2B]  |
+------------------------------------------------------------------+
```

**ASCII Wireframe - Site Type Tabs:**
```
+------------------------------------------------------------------------+
|  [All (12)]  [Storefront (5)]  [Funnel (4)]  [Trial (2)]  [B2B (1)]   |
+------------------------------------------------------------------------+
```

#### Enhanced Site Card (Mobile)

```
+----------------------------------------+
| [S] Site Name              [*Default]  |
|     SITE                   [Active]    |
|----------------------------------------|
| Company: Brew Coffee (BREW)            |
| Type: Storefront                       |
| Domain: shop.brewcoffee.com [Verified] |
|----------------------------------------|
| [Layers] 3 funnels  [Cart] 12 carts    |
| [FileText] 5 pages  [Users] 1.2k views |
|----------------------------------------|
|    [Edit]    [Default]    [Delete]     |
+----------------------------------------+
```

### 2.3 Site Detail Page

Create new route: `/sites/[id]/page.tsx`

**ASCII Wireframe - Site Detail:**
```
+------------------------------------------------------------------------+
|  < Back to Sites                                                        |
|                                                                         |
|  +------------------+  Site Name                           [Edit Site]  |
|  |                  |  SITE . Storefront . Active                       |
|  |   Site Logo      |                                                   |
|  |                  |  Created Dec 15, 2025 . Last updated 2 days ago  |
|  +------------------+                                                   |
+------------------------------------------------------------------------+

+------------------------+  +------------------------+  +----------------+
|  Overview              |  |  Settings              |  |  Analytics     |
+------------------------+  +------------------------+  +----------------+

+------------------------------------------------------------------------+
|  Domains                                              [+ Add Domain]   |
|------------------------------------------------------------------------|
|  [Globe] shop.brewcoffee.com          Primary    [Verified]   [...]    |
|  [Globe] store.brewcoffee.com         Alias      [Pending]    [...]    |
+------------------------------------------------------------------------+

+--------------------------------+  +------------------------------------+
|  E-Commerce Features           |  |  Quick Stats                       |
|--------------------------------|  |------------------------------------|
|  [x] Shopping Cart             |  |  Active Carts: 12                  |
|  [x] Wishlist                  |  |  Conversions Today: 8              |
|  [ ] Product Compare           |  |  Abandoned (24h): 3                |
|  [x] Quick View                |  |  Avg Cart Value: $127.50           |
|  [ ] Bundle Builder            |  +------------------------------------+
|--------------------------------|
|  Guest Checkout: Enabled       |
|  Cart Expiration: 30 days      |
+--------------------------------+
```

### 2.4 Site Creation Wizard

Multi-step wizard for creating new sites:

**Step 1: Site Type Selection**
```
+------------------------------------------------------------------------+
|                         Create New Site                                 |
|                         Step 1 of 4: Choose Type                        |
+------------------------------------------------------------------------+

+--------------------+  +--------------------+  +--------------------+
|  [Store Icon]      |  |  [Funnel Icon]     |  |  [Trial Icon]      |
|                    |  |                    |  |                    |
|  Storefront        |  |  Sales Funnel      |  |  Trial Site        |
|                    |  |                    |  |                    |
|  Full e-commerce   |  |  High-converting   |  |  Limited-time      |
|  experience with   |  |  sales pages for   |  |  promotional       |
|  cart & checkout   |  |  specific offers   |  |  campaigns         |
+--------------------+  +--------------------+  +--------------------+

+--------------------+  +--------------------+
|  [Market Icon]     |  |  [B2B Icon]        |
|                    |  |                    |
|  Marketplace       |  |  B2B Portal        |
|                    |  |                    |
|  Multi-vendor      |  |  Business customer |
|  platform with     |  |  self-service      |
|  seller storefronts|  |  portal            |
+--------------------+  +--------------------+

                                              [Cancel]  [Next: Details >]
```

**Step 2: Basic Details**
```
+------------------------------------------------------------------------+
|                         Create New Site                                 |
|                         Step 2 of 4: Basic Details                      |
+------------------------------------------------------------------------+

|  Site Name *                                                            |
|  +------------------------------------------------------------------+  |
|  |  My Awesome Store                                                 |  |
|  +------------------------------------------------------------------+  |

|  Company *                                                              |
|  +------------------------------------------------------------------+  |
|  |  Brew Coffee Co (BREW)                                      [v]  |  |
|  +------------------------------------------------------------------+  |

|  Description                                                            |
|  +------------------------------------------------------------------+  |
|  |  Our main retail storefront for coffee products...               |  |
|  |                                                                   |  |
|  +------------------------------------------------------------------+  |

                                      [< Back]  [Cancel]  [Next: Domain >]
```

**Step 3: Domain Setup**
```
+------------------------------------------------------------------------+
|                         Create New Site                                 |
|                         Step 3 of 4: Domain Setup                       |
+------------------------------------------------------------------------+

|  Choose your domain setup:                                              |
|                                                                         |
|  ( ) Use Platform Subdomain (Free)                                      |
|      +--------------------------------------------------------------+  |
|      |  my-store                          .sites.avnz.io            |  |
|      +--------------------------------------------------------------+  |
|                                                                         |
|  (o) Use Custom Domain                                                  |
|      +--------------------------------------------------------------+  |
|      |  shop.mycompany.com                                          |  |
|      +--------------------------------------------------------------+  |
|                                                                         |
|      [!] Custom domains require DNS configuration. We'll guide you.    |
|                                                                         |
|      Domain Pricing:                                                    |
|      +----------------------------------------------------------+      |
|      | Founders Plan: Included (1 custom domain)                 |      |
|      | Additional domains: $5/month each                         |      |
|      +----------------------------------------------------------+      |

                                   [< Back]  [Cancel]  [Next: Features >]
```

**Step 4: E-Commerce Features**
```
+------------------------------------------------------------------------+
|                         Create New Site                                 |
|                         Step 4 of 4: E-Commerce Features                |
+------------------------------------------------------------------------+

|  Shopping Features                                                      |
|  +------------------------------------------------------------------+  |
|  |  [x] Shopping Cart           Enable cart functionality           |  |
|  |  [x] Wishlist               Save products for later              |  |
|  |  [ ] Product Compare        Compare up to 4 products             |  |
|  |  [x] Quick View             Preview products in modal            |  |
|  |  [ ] Bundle Builder         Create custom product bundles        |  |
|  +------------------------------------------------------------------+  |

|  Checkout Options                                                       |
|  +------------------------------------------------------------------+  |
|  |  [x] Guest Checkout         Allow checkout without account       |  |
|  |  [x] Express Checkout       One-click purchase for logged in     |  |
|  |  [ ] Quote Requests         B2B quote functionality              |  |
|  +------------------------------------------------------------------+  |

|  Cart Settings                                                          |
|  +------------------------------------------------------------------+  |
|  |  Cart Expiration:  [30] days                                     |  |
|  |  Abandoned Cart Recovery Email:  [x] Enabled                     |  |
|  |  Send after:  [1] hour                                           |  |
|  +------------------------------------------------------------------+  |

                              [< Back]  [Cancel]  [Create Site]
```

---

## 3. Carts Management Page

### 3.1 Carts List Page

Route: `/carts/page.tsx`

**ASCII Wireframe - Carts Management:**
```
+------------------------------------------------------------------------+
|  Carts                                                    [Export CSV]  |
|  247 carts . $31,250 potential revenue                                  |
+------------------------------------------------------------------------+

+------------------------+  +------------------------+  +----------------+
|  Active Carts          |  |  Abandoned Carts       |  |  Converted     |
|  127                   |  |  89                    |  |  31            |
|  $15,875 value         |  |  $12,450 recoverable   |  |  $2,925 today  |
+------------------------+  +------------------------+  +----------------+

+------------------------------------------------------------------------+
|  [Search customer, email, cart ID...]  [Site v] [Status v] [Refresh]   |
+------------------------------------------------------------------------+

+---+------------------+----------------+--------+----------+------------+
| # | Customer         | Site           | Items  | Total    | Status     |
+---+------------------+----------------+--------+----------+------------+
| 1 | john@example.com | Main Store     | 3      | $127.50  | [Active]   |
|   | John Smith       |                |        | Updated  | Expires in |
|   |                  |                |        | 2h ago   | 29 days    |
+---+------------------+----------------+--------+----------+------------+
| 2 | (Guest)          | Coffee Funnel  | 1      | $45.00   | [Abandoned]|
|   | Session: a3f2... |                |        | Updated  | Recovery   |
|   |                  |                |        | 25h ago  | Sent       |
+---+------------------+----------------+--------+----------+------------+
| 3 | jane@company.com | B2B Portal     | 8      | $1,250   | [Active]   |
|   | Jane Doe         |                |        | Updated  | Saved for  |
|   | Company Inc.     |                |        | 1d ago   | later      |
+---+------------------+----------------+--------+----------+------------+

                          [< Prev]  Page 1 of 13  [Next >]
```

### 3.2 Cart Status Badges

```typescript
const CART_STATUS_CONFIG: Record<CartStatus, StatusConfig> = {
  ACTIVE: {
    label: 'Active',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    icon: ShoppingCart
  },
  ABANDONED: {
    label: 'Abandoned',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    icon: AlertTriangle
  },
  CONVERTED: {
    label: 'Converted',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: CheckCircle2
  },
  MERGED: {
    label: 'Merged',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: GitMerge
  },
  EXPIRED: {
    label: 'Expired',
    color: 'bg-muted text-muted-foreground border-border',
    icon: Clock
  },
};
```

### 3.3 Cart Detail View

Route: `/carts/[id]/page.tsx`

**ASCII Wireframe - Cart Detail:**
```
+------------------------------------------------------------------------+
|  < Back to Carts                                                        |
|                                                                         |
|  Cart #CAR-2024-0001                             [Send Recovery Email]  |
|  Active . Updated 2 hours ago                    [Convert to Order]     |
+------------------------------------------------------------------------+

+------------------------------------+  +--------------------------------+
|  Customer                          |  |  Cart Summary                  |
|------------------------------------|  |--------------------------------|
|  [Avatar] John Smith               |  |  Subtotal:       $115.00      |
|           john@example.com         |  |  Discount:       -$10.00      |
|           +1 (555) 123-4567        |  |  Shipping:        $12.50      |
|                                    |  |  Tax:              $9.45      |
|  View Customer Profile >           |  |--------------------------------|
+------------------------------------+  |  Total:          $126.95      |
                                        +--------------------------------+
+------------------------------------+
|  Site                              |
|------------------------------------|
|  [Store] Main Store                |
|          shop.brewcoffee.com       |
+------------------------------------+

+------------------------------------------------------------------------+
|  Cart Items (3)                                                         |
|------------------------------------------------------------------------|
|  +------------+  Ethiopian Yirgacheffe              Qty: 2    $45.00   |
|  |            |  12oz Whole Bean                                        |
|  |   [IMG]    |  SKU: COFF-ETH-12                                      |
|  +------------+                                                         |
|------------------------------------------------------------------------|
|  +------------+  Chemex Pour Over                   Qty: 1    $65.00   |
|  |            |  8-Cup Classic                                          |
|  |   [IMG]    |  SKU: BREW-CHE-08                                      |
|  +------------+                                                         |
|------------------------------------------------------------------------|
|  +------------+  Paper Filters                      Qty: 1     $5.00   |
|  |            |  100 Pack                                               |
|  |   [IMG]    |  SKU: FILT-PAP-100                                     |
|  +------------+                                                         |
+------------------------------------------------------------------------+

+------------------------------------------------------------------------+
|  Cart Activity                                                          |
|------------------------------------------------------------------------|
|  [Clock] Cart created                              Dec 28, 2025 2:15pm |
|  [Plus]  Added Ethiopian Yirgacheffe x1            Dec 28, 2025 2:16pm |
|  [Plus]  Added Chemex Pour Over                    Dec 28, 2025 2:18pm |
|  [Edit]  Updated Ethiopian quantity to 2           Dec 28, 2025 2:20pm |
|  [Plus]  Added Paper Filters                       Dec 28, 2025 2:21pm |
|  [Disc]  Applied discount code: WELCOME10          Dec 28, 2025 2:22pm |
+------------------------------------------------------------------------+
```

### 3.4 Abandoned Cart Recovery Page

Route: `/carts/abandoned/page.tsx`

**ASCII Wireframe - Abandoned Carts:**
```
+------------------------------------------------------------------------+
|  Abandoned Cart Recovery                                                |
|  89 carts . $12,450 recoverable                    [Recovery Settings]  |
+------------------------------------------------------------------------+

+------------------------+  +------------------------+  +----------------+
|  Pending Recovery      |  |  Recovery Sent         |  |  Recovered     |
|  45                    |  |  32                    |  |  12            |
|  Send emails now >     |  |  Awaiting response     |  |  $1,850 value  |
+------------------------+  +------------------------+  +----------------+

+------------------------------------------------------------------------+
|  Filters: [Time since abandoned v] [Cart value v] [Recovery status v]  |
+------------------------------------------------------------------------+

+---+------------------+----------+---------+------------------+---------+
| [ ] Customer        | Value    | Abandon | Recovery Status  | Action  |
+---+------------------+----------+---------+------------------+---------+
| [x] john@test.com   | $127.50  | 2h ago  | Not sent         | [Send]  |
| [x] jane@work.com   | $89.00   | 4h ago  | Not sent         | [Send]  |
| [ ] guest-a3f2...   | $45.00   | 25h ago | Sent 24h ago     | [Resend]|
| [ ] mike@shop.com   | $350.00  | 3d ago  | Sent 2 days ago  | [Call]  |
+---+------------------+----------+---------+------------------+---------+

                      [Select All]  [Send Recovery Email to Selected]
```

### 3.5 Cart Metrics Dashboard

Add to main Carts page or as expandable section:

```
+------------------------------------------------------------------------+
|  Cart Analytics (Last 30 Days)                                          |
+------------------------------------------------------------------------+

+--------------------+  +--------------------+  +--------------------+
|  Conversion Rate   |  |  Avg Cart Value    |  |  Abandonment Rate  |
|  ████████░░        |  |                    |  |  ████░░░░░░        |
|  24.5%             |  |  $127.50           |  |  36.2%             |
|  +2.3% vs last mo  |  |  +$12.30 vs last   |  |  -4.1% vs last mo  |
+--------------------+  +--------------------+  +--------------------+

+----------------------------------------+
|  Carts by Stage                        |
|----------------------------------------|
|  Browsing    ████████████  45          |
|  Added Items ██████████    38          |
|  Checkout    ████          15          |
|  Payment     ██            8           |
|  Abandoned   ████████      32          |
+----------------------------------------+
```

---

## 4. Domain Management

### 4.1 Domains List Page

Route: `/sites/domains/page.tsx`

**ASCII Wireframe - Domains Management:**
```
+------------------------------------------------------------------------+
|  Domains                                             [+ Add Domain]     |
|  8 domains . 6 verified . 2 pending                                     |
+------------------------------------------------------------------------+

+------------------------------------------------------------------------+
|  [Search domain...]                          [Site v] [Status v]        |
+------------------------------------------------------------------------+

+---+------------------------+------------------+----------+-------------+
| # | Domain                 | Site             | Status   | SSL         |
+---+------------------------+------------------+----------+-------------+
| 1 | shop.brewcoffee.com    | Main Store       | Verified | [Lock] Valid|
|   |                        | Primary          |          | Exp: 90 days|
+---+------------------------+------------------+----------+-------------+
| 2 | store.brewcoffee.com   | Main Store       | Pending  | Awaiting    |
|   |                        | Alias            |          | DNS setup   |
+---+------------------------+------------------+----------+-------------+
| 3 | funnel.brewcoffee.com  | Coffee Funnel    | Verified | [Lock] Valid|
|   |                        | Primary          |          | Exp: 45 days|
+---+------------------------+------------------+----------+-------------+

                            [< Prev]  Page 1 of 1  [Next >]
```

### 4.2 Domain Setup Wizard

**Step 1: Enter Domain**
```
+------------------------------------------------------------------------+
|                         Add Custom Domain                               |
|                         Step 1 of 3: Enter Domain                       |
+------------------------------------------------------------------------+

|  Enter your custom domain:                                              |
|  +------------------------------------------------------------------+  |
|  |  shop.mycompany.com                                              |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  This domain will be used for:                                          |
|  +------------------------------------------------------------------+  |
|  |  Main Store                                                 [v]  |  |
|  +------------------------------------------------------------------+  |

                                              [Cancel]  [Next: DNS Setup >]
```

**Step 2: DNS Configuration**
```
+------------------------------------------------------------------------+
|                         Add Custom Domain                               |
|                         Step 2 of 3: DNS Configuration                  |
+------------------------------------------------------------------------+

|  Add these DNS records at your domain registrar:                        |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  |  Record Type: CNAME                                              |  |
|  |  Host/Name:   shop                                               |  |
|  |  Value:       proxy.avnz.io                          [Copy]      |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  |  Record Type: TXT                                                |  |
|  |  Host/Name:   _avnz-verify.shop                                  |  |
|  |  Value:       avnz-site-verification=abc123def456    [Copy]      |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  [!] DNS changes can take up to 48 hours to propagate.                 |
|                                                                         |
|  Common Registrar Guides:                                               |
|  [GoDaddy]  [Namecheap]  [Cloudflare]  [Route53]                       |

                                  [< Back]  [Cancel]  [Verify DNS]
```

**Step 3: Verification**
```
+------------------------------------------------------------------------+
|                         Add Custom Domain                               |
|                         Step 3 of 3: Verification                       |
+------------------------------------------------------------------------+

|  Checking DNS configuration...                                          |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  |  CNAME Record                                                    |  |
|  |  [Spinner] Checking...                                           |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  |  TXT Verification Record                                         |  |
|  |  [Spinner] Checking...                                           |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  |  SSL Certificate                                                 |  |
|  |  [ ] Waiting for DNS verification                                |  |
|  +------------------------------------------------------------------+  |

                                      [< Back]  [Cancel]  [Check Again]
```

**Verification Success:**
```
+------------------------------------------------------------------------+
|                         Domain Added Successfully!                      |
+------------------------------------------------------------------------+

|  [CheckCircle - Green]                                                  |
|                                                                         |
|  shop.mycompany.com is now active!                                      |
|                                                                         |
|  +------------------------------------------------------------------+  |
|  |  [Check] CNAME Record        Verified                            |  |
|  |  [Check] TXT Verification    Verified                            |  |
|  |  [Check] SSL Certificate     Issued                              |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
|  Your site is now accessible at:                                        |
|  https://shop.mycompany.com                                             |

                                             [View Site]  [Go to Domains]
```

### 4.3 SSL Status Indicators

```typescript
const SSL_STATUS_CONFIG = {
  valid: {
    icon: Lock,
    color: 'text-green-400',
    label: 'SSL Valid',
  },
  expiring: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    label: 'Expiring Soon',
  },
  expired: {
    icon: XCircle,
    color: 'text-red-400',
    label: 'SSL Expired',
  },
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    label: 'Pending',
  },
};
```

### 4.4 Domain Pricing Tier Display

```
+------------------------------------------------------------------------+
|  Domain Pricing                                                         |
+------------------------------------------------------------------------+

+------------------------+  +------------------------+  +----------------+
|  Founders Plan         |  |  Basic Plan            |  |  Enterprise    |
|  FREE                  |  |  $5/month per domain   |  |  Unlimited     |
|------------------------|  |------------------------|  |----------------|
|  1 custom domain       |  |  Unlimited domains     |  |  White-label   |
|  included              |  |  SSL included          |  |  Custom SSL    |
|                        |  |                        |  |  Priority DNS  |
+------------------------+  +------------------------+  +----------------+
```

---

## 5. Company Portal Updates

### 5.1 Shopping Cart Page Layout

Route: `/cart/page.tsx` in Company Portal

**ASCII Wireframe - Full Cart Page:**
```
+------------------------------------------------------------------------+
|  [Logo]                                    [Account] [Cart (3)]        |
+------------------------------------------------------------------------+

+------------------------------------------------------------------------+
|  Shopping Cart                                                          |
|  3 items                                                                |
+------------------------------------------------------------------------+

+---------------------------------------------------+  +-----------------+
|  Cart Items                                       |  |  Order Summary  |
|---------------------------------------------------|  |-----------------|
|  +--------+  Ethiopian Yirgacheffe    [-] 2 [+]  |  |  Subtotal:      |
|  |        |  12oz Whole Bean                      |  |  $115.00        |
|  | [IMG]  |  $22.50 each                          |  |                 |
|  |        |                        $45.00 [X]    |  |  Shipping:      |
|  +--------+                                       |  |  Calculated at  |
|---------------------------------------------------|  |  checkout       |
|  +--------+  Chemex Pour Over         [-] 1 [+]  |  |                 |
|  |        |  8-Cup Classic                        |  |-----------------|
|  | [IMG]  |  $65.00 each                          |  |  Estimated:     |
|  |        |                        $65.00 [X]    |  |  $115.00        |
|  +--------+                                       |  |                 |
|---------------------------------------------------|  |  [Checkout]     |
|  +--------+  Paper Filters            [-] 1 [+]  |  |                 |
|  |        |  100 Pack                             |  |  or             |
|  | [IMG]  |  $5.00 each                           |  |  [PayPal]       |
|  |        |                         $5.00 [X]    |  |  [Apple Pay]    |
|  +--------+                                       |  |                 |
+---------------------------------------------------+  +-----------------+

+------------------------------------------------------------------------+
|  [< Continue Shopping]                        [Apply Discount Code]     |
+------------------------------------------------------------------------+
```

### 5.2 Mini-Cart Component

**ASCII Wireframe - Mini-Cart Dropdown:**
```
                                    +---------------------------+
                                    |  Your Cart (3)            |
                                    |---------------------------|
                                    |  +----+  Ethiopian...     |
                                    |  |IMG |  2 x $22.50       |
                                    |  +----+                   |
                                    |  +----+  Chemex Pour...   |
                                    |  |IMG |  1 x $65.00       |
                                    |  +----+                   |
                                    |  +----+  Paper Filters    |
                                    |  |IMG |  1 x $5.00        |
                                    |  +----+                   |
                                    |---------------------------|
                                    |  Subtotal:    $115.00     |
                                    |                           |
                                    |  [View Cart] [Checkout]   |
                                    +---------------------------+
```

### 5.3 Cart Drawer/Sidebar

**ASCII Wireframe - Cart Drawer (Right Side):**
```
+--------------------------------------------------------+  +-------------+
|                                                        |  |  Your Cart  |
|                                                        |  |  3 items    |
|                                                        |  |-------------|
|                                                        |  |  +----+     |
|                   Main Page Content                    |  |  |IMG |     |
|                                                        |  |  +----+     |
|                                                        |  |  Ethiopian  |
|                                                        |  |  2 x $22.50 |
|                                                        |  |  [-] 2 [+]  |
|                                                        |  |             |
|                                                        |  |  +----+     |
|                                                        |  |  |IMG |     |
|                                                        |  |  +----+     |
|                                                        |  |  Chemex     |
|                                                        |  |  1 x $65.00 |
|                                                        |  |  [-] 1 [+]  |
|                                                        |  |             |
|                                                        |  |  +----+     |
|                                                        |  |  |IMG |     |
|                                                        |  |  +----+     |
|                                                        |  |  Filters    |
|                                                        |  |  1 x $5.00  |
|                                                        |  |  [-] 1 [+]  |
|                                                        |  |-------------|
|                                                        |  |  Subtotal   |
|                                                        |  |  $115.00    |
|                                                        |  |             |
|                                                        |  | [Checkout]  |
+--------------------------------------------------------+  +-------------+
```

### 5.4 Product Detail Page (PDP) Layout

**ASCII Wireframe - Product Detail:**
```
+------------------------------------------------------------------------+
|  [Logo]                          [Search]    [Account] [Cart (3)]      |
+------------------------------------------------------------------------+
|  Home > Coffee > Single Origin > Ethiopian Yirgacheffe                  |
+------------------------------------------------------------------------+

+----------------------------------+  +----------------------------------+
|                                  |  |  Ethiopian Yirgacheffe           |
|                                  |  |  Single Origin Coffee            |
|                                  |  |                                  |
|         [Product Image]          |  |  $22.50                          |
|                                  |  |  ★★★★★ (127 reviews)             |
|                                  |  |                                  |
|                                  |  |  Bright, fruity, with notes of   |
|                                  |  |  blueberry and citrus. Grown in  |
|                                  |  |  the highlands of Ethiopia.      |
|                                  |  |                                  |
+----------------------------------+  |  Size:                           |
|  [Thumb] [Thumb] [Thumb] [Thumb] |  |  [8oz] [12oz *] [2lb]            |
+----------------------------------+  |                                  |
                                      |  Grind:                          |
                                      |  [Whole Bean *] [Ground] [Fine]  |
                                      |                                  |
                                      |  Quantity:                       |
                                      |  [-] 1 [+]                       |
                                      |                                  |
                                      |  [Add to Cart - $22.50]          |
                                      |  [Buy Now]                       |
                                      |                                  |
                                      |  [Heart] Add to Wishlist         |
                                      |  [Compare] Add to Compare        |
                                      +----------------------------------+

+------------------------------------------------------------------------+
|  Description  |  Reviews (127)  |  Shipping  |                         |
|---------------|-----------------|------------|                         |
|                                                                         |
|  Sourced from the renowned Yirgacheffe region in Ethiopia, this        |
|  exceptional coffee offers a complex flavor profile...                  |
+------------------------------------------------------------------------+
```

### 5.5 Quick View Modal

**ASCII Wireframe - Quick View:**
```
+------------------------------------------------------------------------+
|                                                                    [X]  |
|  +----------------------------------+  +---------------------------+   |
|  |                                  |  |  Ethiopian Yirgacheffe    |   |
|  |                                  |  |  $22.50                   |   |
|  |         [Product Image]          |  |  ★★★★★ (127 reviews)      |   |
|  |                                  |  |                           |   |
|  |                                  |  |  Size: [8oz][12oz*][2lb]  |   |
|  |                                  |  |                           |   |
|  +----------------------------------+  |  Qty: [-] 1 [+]           |   |
|                                        |                           |   |
|                                        |  [Add to Cart]            |   |
|                                        |  [View Full Details]      |   |
|                                        +---------------------------+   |
+------------------------------------------------------------------------+
```

---

## 6. Responsive Considerations

### 6.1 Mobile Cart Experience

**Mobile Cart Page:**
```
+------------------------+
|  [<] Shopping Cart     |
+------------------------+
|  3 items               |
+------------------------+
|  +----+  Ethiopian     |
|  |IMG |  Yirgacheffe   |
|  +----+  2 x $22.50    |
|          [-] 2 [+] [X] |
+------------------------+
|  +----+  Chemex        |
|  |IMG |  Pour Over     |
|  +----+  1 x $65.00    |
|          [-] 1 [+] [X] |
+------------------------+
|  +----+  Paper         |
|  |IMG |  Filters       |
|  +----+  1 x $5.00     |
|          [-] 1 [+] [X] |
+------------------------+

+------------------------+
|  Subtotal:    $115.00  |
|  Shipping: Calculated  |
|                        |
|  [Checkout - $115.00]  |
|                        |
|  [Continue Shopping]   |
+------------------------+
```

**Mobile Mini-Cart (Bottom Sheet):**
```
+------------------------+
|        [Handle]        |
+------------------------+
|  Your Cart (3)    [X]  |
+------------------------+
|  +----+ Ethiopian x2   |
|  |IMG | $45.00         |
|  +----+                |
|  +----+ Chemex x1      |
|  |IMG | $65.00         |
|  +----+                |
|  +----+ Filters x1     |
|  |IMG | $5.00          |
|  +----+                |
+------------------------+
|  Total: $115.00        |
|  [Checkout]            |
+------------------------+
```

### 6.2 Touch-Friendly Interactions

All interactive elements must meet these requirements:

| Element | Min Size | Touch Target | Spacing |
|---------|----------|--------------|---------|
| Buttons | 44x44px | `min-h-[44px]` | 8px between |
| Quantity +/- | 44x44px | `touch-manipulation` | 4px between |
| Cart Item Remove | 44x44px | Clear tap zone | 12px from edges |
| Swipe to Delete | Full width | Left swipe gesture | - |

### 6.3 Mobile Storefront Navigation

**Mobile Header with Cart:**
```
+------------------------+
| [=] [Logo]      [Cart] |
|              (3)       |
+------------------------+
```

**Mobile Bottom Navigation (Storefront):**
```
+-------------------------------------------+
| [Home] [Shop] [Cart] [Search] [Account]   |
|   3 items in cart shown as badge          |
+-------------------------------------------+
```

### 6.4 Responsive Breakpoints

Following existing platform patterns:

```css
/* Mobile First */
@media (min-width: 640px) { /* sm: Tablet */ }
@media (min-width: 768px) { /* md: Small Desktop */ }
@media (min-width: 1024px) { /* lg: Desktop */ }
@media (min-width: 1280px) { /* xl: Large Desktop */ }
```

**Cart Layout Breakpoints:**
- Mobile (<640px): Single column, stacked layout
- Tablet (640-1023px): Two column, cart items + summary side by side
- Desktop (1024px+): Full layout with sidebar

---

## 7. Implementation Priority

### Phase 1: Core Infrastructure (Week 1-2)

1. **Update Navigation** (High Priority)
   - Add Carts and Domains to navigation.ts
   - Update mobile-tab-bar.tsx
   - Add new icon imports

2. **Carts API Client** (High Priority)
   - Create `/lib/api/carts.ts`
   - Define TypeScript interfaces
   - Implement CRUD operations

3. **Domains API Client** (High Priority)
   - Create `/lib/api/domains.ts`
   - DNS verification endpoints
   - SSL status endpoints

### Phase 2: Admin Dashboard Pages (Week 2-3)

4. **Carts Management Page** (High Priority)
   - List view with filters
   - Cart detail view
   - Status management

5. **Abandoned Carts Page** (Medium Priority)
   - Recovery email triggers
   - Bulk actions
   - Analytics integration

6. **Domains Management Page** (Medium Priority)
   - Domain list view
   - DNS setup wizard
   - SSL status display

### Phase 3: Enhanced Sites Management (Week 3-4)

7. **Site Detail Page** (Medium Priority)
   - Overview with e-commerce settings
   - Domain management section
   - Cart analytics widget

8. **Site Creation Wizard** (Medium Priority)
   - Multi-step form
   - Site type selection
   - E-commerce feature toggles

### Phase 4: Company Portal Cart Experience (Week 4-5)

9. **Shopping Cart Page** (High Priority)
   - Full cart view
   - Quantity management
   - Discount code input

10. **Mini-Cart Component** (High Priority)
    - Dropdown on desktop
    - Bottom sheet on mobile
    - Real-time updates

11. **Cart Drawer** (Medium Priority)
    - Slide-in panel
    - Quick edit functionality
    - Checkout shortcut

### Phase 5: Polish & Mobile (Week 5-6)

12. **Mobile Cart Experience** (High Priority)
    - Touch-optimized interactions
    - Swipe gestures
    - Bottom sheet cart

13. **Quick View Modal** (Low Priority)
    - Product preview
    - Add to cart inline
    - Variant selection

---

## File Structure Reference

### Admin Dashboard New Files

```
apps/admin-dashboard/src/
├── app/(dashboard)/
│   ├── carts/
│   │   ├── page.tsx           # Carts list
│   │   ├── [id]/
│   │   │   └── page.tsx       # Cart detail
│   │   └── abandoned/
│   │       └── page.tsx       # Abandoned carts
│   └── sites/
│       ├── page.tsx           # Sites list (existing)
│       ├── [id]/
│       │   └── page.tsx       # Site detail (new)
│       └── domains/
│           └── page.tsx       # Domains management
├── components/
│   ├── carts/
│   │   ├── cart-status-badge.tsx
│   │   ├── cart-item-row.tsx
│   │   ├── cart-summary.tsx
│   │   └── recovery-modal.tsx
│   ├── sites/
│   │   ├── site-type-selector.tsx
│   │   ├── site-features-form.tsx
│   │   └── site-wizard.tsx
│   └── domains/
│       ├── domain-status-badge.tsx
│       ├── dns-setup-wizard.tsx
│       └── ssl-status-indicator.tsx
└── lib/api/
    ├── carts.ts
    └── domains.ts
```

### Company Portal New Files

```
apps/company-portal/src/
├── app/
│   └── cart/
│       └── page.tsx           # Full cart page
├── components/
│   ├── cart/
│   │   ├── cart-page.tsx
│   │   ├── cart-item.tsx
│   │   ├── cart-summary.tsx
│   │   ├── quantity-selector.tsx
│   │   └── discount-input.tsx
│   ├── mini-cart/
│   │   ├── mini-cart-dropdown.tsx
│   │   └── mini-cart-sheet.tsx
│   ├── cart-drawer/
│   │   └── cart-drawer.tsx
│   └── quick-view/
│       └── quick-view-modal.tsx
├── contexts/
│   └── cart-context.tsx
└── hooks/
    └── use-cart.ts
```

---

## Related Documents

- [Database Schema](/apps/api/prisma/schema.prisma) - Site, Cart, CartItem models
- [Navigation Config](/apps/admin-dashboard/src/lib/navigation.ts) - Menu structure
- [Sites Page](/apps/admin-dashboard/src/app/(dashboard)/sites/page.tsx) - Current implementation
- [Mobile Tab Bar](/apps/admin-dashboard/src/components/layout/mobile-tab-bar.tsx) - Mobile navigation
- [Funnel Builder Spec](/docs/roadmap/FUNNEL_BUILDER_SPECIFICATION.md) - Related funnel patterns

---

*Document Version: 1.0*
*Author: Claude Code*
*Review Status: Draft - Pending Team Review*
