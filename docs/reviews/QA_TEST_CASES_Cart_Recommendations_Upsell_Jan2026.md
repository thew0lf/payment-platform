# QA Test Cases - Cart Theme, Recommendations & Upsell Modules (January 2026)

## Test Scope

This document covers manual QA test cases for the following newly implemented modules:
1. Cart Theme Module - Theming, presets, product catalog configuration
2. Recommendations Module - Also bought, you might like, frequently viewed, tracking
3. Upsell Module - Bulk discounts, subscriptions, targeting rules, impressions

**QA Lead:** Senior QA Engineer
**Test Environment:** Staging
**Browser Matrix:** Chrome, Firefox, Safari, Edge, Mobile Safari, Mobile Chrome

---

## 1. Cart Theme Module (`/api/landing-pages/:id/cart-theme`)

### 1.1 Get Cart Theme Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CTH-001 | Get cart theme for landing page | GET `/api/landing-pages/:id/cart-theme` | Returns CartTheme object with preset, colors, layout, content | P1 |
| CTH-002 | Get cart theme for invalid landing page | GET `/api/landing-pages/invalid-id/cart-theme` | 404 Not Found - "Landing page not found" | P1 |
| CTH-003 | Get cart theme returns default when no customization | GET cart theme for new landing page | Returns STARTER preset defaults | P2 |
| CTH-004 | Get cart theme returns merged customizations | GET cart theme after partial update | Custom values merged with preset defaults | P1 |
| CTH-005 | Get cart theme for soft-deleted landing page | GET cart theme for deleted page | 404 Not Found | P2 |

### 1.2 Update Cart Theme Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CTH-010 | Update cart theme - unauthenticated | PATCH without auth token | 401 Unauthorized | P1 |
| CTH-011 | Update cart theme - valid preset change | PATCH with `{ preset: "LUXE" }` | Theme updated, colors/layout match LUXE preset | P1 |
| CTH-012 | Update cart theme - partial colors | PATCH with `{ colors: { primaryButton: "#FF5500" } }` | Only primaryButton changed, other colors from preset | P1 |
| CTH-013 | Update cart theme - invalid color format | PATCH with `{ colors: { primaryButton: "invalid" } }` | 400 Bad Request - "Invalid color format" | P1 |
| CTH-014 | Update cart theme - valid hex colors | PATCH with `{ colors: { primaryButton: "#ff5500", badge: "#AABBCC" } }` | Both colors accepted (case insensitive) | P2 |
| CTH-015 | Update cart theme - layout changes | PATCH with `{ layout: { width: "wide", position: "left" } }` | Layout updated successfully | P1 |
| CTH-016 | Update cart theme - content changes | PATCH with `{ content: { headerTitle: "My Cart" } }` | Content updated successfully | P1 |
| CTH-017 | Update cart theme - custom CSS | PATCH with `{ customCss: ".cart { margin: 10px; }" }` | Custom CSS saved | P2 |
| CTH-018 | Update cart theme - wrong company | PATCH for landing page not owned by user's company | 403 Forbidden or 404 Not Found | P1 |
| CTH-019 | Update cart theme - org user without company context | PATCH as org admin without companyId | 403 Forbidden - "Company context required" | P1 |
| CTH-020 | Update cart theme - company user | PATCH as company user | Theme updated for user's company | P1 |

### 1.3 Reset Cart Theme Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CTH-030 | Reset cart theme - unauthenticated | DELETE without auth token | 401 Unauthorized | P1 |
| CTH-031 | Reset cart theme - success | DELETE `/api/landing-pages/:id/cart-theme` | Theme reset to preset default, all customizations removed | P1 |
| CTH-032 | Reset cart theme - wrong company | DELETE for landing page not owned by user | 403 Forbidden or 404 | P1 |
| CTH-033 | Reset preserves preset selection | Reset after LUXE preset was set | Returns LUXE defaults (preset preserved) | P2 |

### 1.4 Cart Theme Preview Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CTH-040 | Get cart theme preview | GET `/api/landing-pages/:id/cart-theme/preview` | Returns theme + cssVariables object | P2 |
| CTH-041 | Preview includes all CSS variables | Get preview after theme update | All 20+ CSS variables present (--cart-bg, --cart-primary-btn, etc.) | P2 |
| CTH-042 | CSS variables match theme colors | Compare cssVariables to theme.colors | Values match (e.g., --cart-bg = colors.background) | P2 |

### 1.5 Theme Presets Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CTH-050 | Get all theme presets | GET `/api/landing-pages/cart-themes/presets` | Returns 9 presets with name, description, preview colors | P1 |
| CTH-051 | All presets have required fields | Check each preset | Each has preset, name, description, preview.primaryColor, preview.backgroundColor | P2 |
| CTH-052 | Preset names are user-friendly | Check name format | Names are title-cased (e.g., "Starter", "Artisan", "Velocity") | P3 |

### 1.6 Generate Theme from Colors Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CTH-060 | Generate theme - light mode | POST with `{ primaryColor: "#FF5500", mode: "light" }` | Returns CartTheme with STARTER base, custom primary colors | P2 |
| CTH-061 | Generate theme - dark mode | POST with `{ primaryColor: "#FF5500", mode: "dark" }` | Returns CartTheme with LUXE base (dark), custom primary colors | P2 |
| CTH-062 | Generate theme - default mode | POST with `{ primaryColor: "#FF5500" }` (no mode) | Defaults to light mode | P3 |
| CTH-063 | Generated theme has custom accent colors | Check returned theme | primaryButton, iconHover, badge all use provided primaryColor | P2 |

---

## 2. Product Catalog Configuration (`/api/landing-pages/:id/product-catalog`)

### 2.1 Get Product Catalog Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CAT-001 | Get product catalog | GET `/api/landing-pages/:id/product-catalog` | Returns ProductCatalog config | P1 |
| CAT-002 | Get product catalog - invalid landing page | GET with invalid ID | 404 Not Found | P1 |
| CAT-003 | Default catalog mode is ALL | GET for new landing page | mode = "ALL", maxProducts = null | P2 |

### 2.2 Update Product Catalog Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CAT-010 | Update catalog mode to SELECTED | PATCH with `{ mode: "SELECTED", selectedProductIds: ["prod1", "prod2"] }` | Mode and products updated | P1 |
| CAT-011 | Update catalog mode to CATEGORY | PATCH with `{ mode: "CATEGORY", categoryIds: ["cat1"] }` | Category filter applied | P1 |
| CAT-012 | Update catalog mode to TAG | PATCH with `{ mode: "TAG", tagIds: ["tag1"] }` | Tag filter applied | P1 |
| CAT-013 | Update sort order | PATCH with `{ sortBy: "PRICE_ASC" }` | Products sorted by price ascending | P1 |
| CAT-014 | Update max products | PATCH with `{ maxProducts: 10 }` | Limits displayed products to 10 | P2 |
| CAT-015 | Toggle showOutOfStock | PATCH with `{ showOutOfStock: false }` | Out of stock products hidden | P1 |
| CAT-016 | Toggle showPrices | PATCH with `{ showPrices: false }` | Prices hidden in catalog | P2 |
| CAT-017 | Toggle showCompareAtPrice | PATCH with `{ showCompareAtPrice: false }` | Compare/strikethrough prices hidden | P2 |
| CAT-018 | Update catalog - unauthenticated | PATCH without auth | 401 Unauthorized | P1 |
| CAT-019 | Update catalog - wrong company | PATCH for different company's page | 403/404 | P1 |

### 2.3 Get Products Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CAT-020 | Get resolved products | GET `/api/landing-pages/:id/products?companyId=xxx` | Returns paginated product list | P1 |
| CAT-021 | Products respect catalog mode | Set mode=SELECTED, get products | Only selected products returned | P1 |
| CAT-022 | Products respect sort order | Set sortBy=PRICE_DESC, get products | Products sorted by price descending | P1 |
| CAT-023 | Products pagination | GET with `?page=2&limit=10` | Returns page 2 with 10 items | P2 |
| CAT-024 | Products respect maxProducts | Set maxProducts=5, get products | Maximum 5 products returned | P2 |
| CAT-025 | Out of stock filtering | Set showOutOfStock=false | Out of stock products excluded | P1 |

### 2.4 Add/Remove Products Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CAT-030 | Add products to catalog | POST `/api/landing-pages/:id/product-catalog/products` with productIds | Products added to selectedProductIds | P1 |
| CAT-031 | Add duplicate products | Add already-selected product | No duplicates, idempotent | P2 |
| CAT-032 | Remove products from catalog | DELETE with productIds | Products removed from selection | P1 |
| CAT-033 | Remove non-existent products | Remove product not in selection | No error, idempotent | P3 |

### 2.5 Reorder Products Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CAT-040 | Reorder products | POST `/api/landing-pages/:id/product-catalog/reorder` with ordered productIds | Product order updated | P1 |
| CAT-041 | Reorder with partial list | Submit subset of products | Only submitted products reordered | P3 |
| CAT-042 | Reorder - unauthenticated | POST without auth | 401 Unauthorized | P1 |

---

## 3. Recommendations Module (`/api/products/:productId/recommendations`)

### 3.1 Get Product Page Recommendations Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REC-001 | Get all recommendations | GET `/api/products/:id/recommendations?companyId=xxx` | Returns alsoBought, youMightLike, frequentlyViewed sections | P1 |
| REC-002 | Get recommendations with customerId | GET with `&customerId=xxx` | Personalized recommendations returned | P1 |
| REC-003 | Get recommendations with sessionId | GET with `&sessionId=xxx` | Session-based recommendations returned | P2 |
| REC-004 | Get recommendations - invalid product | GET with invalid productId | Empty recommendations or 404 | P2 |
| REC-005 | Get recommendations - missing companyId | GET without companyId | 400 Bad Request | P1 |

### 3.2 Also Bought Recommendations Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REC-010 | Get also bought recommendations | GET `/api/products/:id/recommendations/also-bought?companyId=xxx` | Returns products frequently purchased together | P1 |
| REC-011 | Also bought respects maxResults | Check response length | Does not exceed config.alsoBought.maxResults | P2 |
| REC-012 | Also bought excludes current product | Check response | Current product not in recommendations | P1 |
| REC-013 | Also bought includes co-occurrence count | Check product objects | coOccurrenceCount field present | P3 |
| REC-014 | Also bought respects excludeCategories | Configure excluded category | Products from excluded categories not shown | P2 |

### 3.3 You Might Like Recommendations Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REC-020 | Get you might like - anonymous | GET without customerId/sessionId | Returns generic recommendations | P1 |
| REC-021 | Get you might like - logged in customer | GET with customerId | Personalized based on purchase history | P1 |
| REC-022 | Get you might like - session user | GET with sessionId | Based on browsing behavior | P2 |
| REC-023 | You might like excludes recently viewed | Check when excludeRecentlyViewed=true | Recently viewed products excluded | P2 |
| REC-024 | You might like excludes purchased | Check when excludePurchased=true | Previously purchased products excluded | P2 |
| REC-025 | You might like diversity | Check when diversityFactor high | Varied product categories returned | P3 |

### 3.4 Frequently Viewed Together Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REC-030 | Get frequently viewed together | GET `/api/products/:id/recommendations/frequently-viewed?companyId=xxx` | Returns bundles of products viewed together | P1 |
| REC-031 | Bundle includes current product | Check bundle.products | Current product included in bundle | P2 |
| REC-032 | Bundle pricing calculated | Check bundle object | individualTotal, bundlePrice, savings fields present | P1 |
| REC-033 | Bundle discount applied | Check bundlePrice vs individualTotal | Discount percentage matches config | P1 |
| REC-034 | Max bundle size respected | Check bundle.products.length | Does not exceed config.maxBundleSize | P2 |

### 3.5 Recommendation Tracking Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REC-040 | Track product view | POST `/api/recommendations/view` with productId, sessionId, companyId | Returns `{ success: true }` | P1 |
| REC-041 | Track view with source | POST with `source: "RECOMMENDATION"`, sourceProductId | Source data recorded | P2 |
| REC-042 | Track view with duration | POST with `duration: 45` | Duration recorded | P3 |
| REC-043 | Track view - missing required fields | POST without productId | 400 Bad Request | P1 |
| REC-044 | Track recommendation click | POST `/api/recommendations/click` with impressionId, clickedProductId | Returns `{ success: true }` | P1 |
| REC-045 | Track click - invalid impression | POST with non-existent impressionId | 400/404 error | P2 |
| REC-046 | Track add to cart | POST `/api/recommendations/add-to-cart` with impressionId | Returns `{ success: true }` | P1 |

### 3.6 Recommendation Config Admin Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REC-050 | Get recommendation config | GET `/api/admin/recommendations/config` | Returns full config with all sections | P1 |
| REC-051 | Get config - unauthenticated | GET without auth token | 401 Unauthorized | P1 |
| REC-052 | Update also bought config | PUT with `{ alsoBought: { enabled: false } }` | Also bought section disabled | P1 |
| REC-053 | Update you might like config | PUT with `{ youMightLike: { maxResults: 12 } }` | Max results updated | P1 |
| REC-054 | Update frequently viewed config | PUT with `{ frequentlyViewed: { bundleDiscountPercent: 15 } }` | Discount updated | P1 |
| REC-055 | Update global config | PUT with `{ global: { respectInventory: true } }` | Out of stock hidden globally | P1 |
| REC-056 | Update config - validation error | PUT with `{ alsoBought: { maxResults: 100 } }` (exceeds max 20) | 400 validation error | P2 |
| REC-057 | Update config - wrong company | PUT as user from different company | 403 Forbidden | P1 |

### 3.7 Recommendation Preview Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REC-060 | Preview recommendations - admin | GET `/api/admin/recommendations/preview/:productId` | Returns same format as public endpoint | P2 |
| REC-061 | Preview - unauthenticated | GET without auth | 401 Unauthorized | P1 |

---

## 4. Upsell Module (`/api/upsell`)

### 4.1 Cart Upsells Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UPS-001 | Get cart upsells | GET `/api/upsell/cart/:cartId` | Returns targeted upsells for cart | P1 |
| UPS-002 | Get cart upsells with max limit | GET with `?maxUpsells=2` | Returns max 2 upsells | P2 |
| UPS-003 | Get cart upsells with placement filter | GET with `?placements=CART_DRAWER` | Only CART_DRAWER upsells returned | P2 |
| UPS-004 | Get cart upsells - empty cart | GET for empty cart | Returns empty upsells array | P2 |
| UPS-005 | Get cart upsells - invalid cart | GET with invalid cartId | Empty upsells or 404 | P2 |

### 4.2 Targeting Rules CRUD Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UPS-010 | Get all targeting rules | GET `/api/upsell/rules` | Returns list of company's targeting rules | P1 |
| UPS-011 | Get rules - unauthenticated | GET without auth | 401 Unauthorized | P1 |
| UPS-012 | Create targeting rule | POST `/api/upsell/rules` with valid data | Rule created, returns rule object | P1 |
| UPS-013 | Create rule - missing required fields | POST without name | 400 validation error | P1 |
| UPS-014 | Create rule - all fields | POST with all optional fields populated | All fields saved correctly | P2 |
| UPS-015 | Create rule - invalid upsellType | POST with invalid enum value | 400 validation error | P2 |
| UPS-016 | Create rule - invalid urgency | POST with invalid urgency value | 400 validation error | P2 |
| UPS-017 | Update targeting rule | PUT `/api/upsell/rules/:ruleId` with changes | Rule updated | P1 |
| UPS-018 | Update rule - wrong company | PUT rule belonging to different company | 403/404 | P1 |
| UPS-019 | Delete targeting rule | DELETE `/api/upsell/rules/:ruleId` | Returns `{ success: true }` | P1 |
| UPS-020 | Delete rule - wrong company | DELETE rule from different company | 403/404 | P1 |

### 4.3 Targeting Rule Conditions Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UPS-030 | Rule with segment conditions | Create rule with `conditions.segments: ["BUDGET_CONSCIOUS"]` | Rule matches budget-conscious customers | P1 |
| UPS-031 | Rule with cart value conditions | Create rule with `conditions.cartValueMin: 50, cartValueMax: 100` | Rule matches carts $50-$100 | P1 |
| UPS-032 | Rule with product conditions | Create rule with `conditions.hasProduct: ["prod1"]` | Rule matches carts containing product | P1 |
| UPS-033 | Rule with exclude conditions | Create rule with `conditions.excludeProduct: ["prod2"]` | Rule doesn't match if product present | P2 |
| UPS-034 | Rule with new customer condition | Create rule with `conditions.isNewCustomer: true` | Only matches first-time buyers | P2 |
| UPS-035 | Rule with subscription condition | Create rule with `conditions.hasSubscription: false` | Matches non-subscribers | P2 |

### 4.4 Targeting Rule Offers Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UPS-040 | Rule with discount offer | Create rule with `offer.discountPercent: 15` | 15% discount applied | P1 |
| UPS-041 | Rule with free shipping offer | Create rule with `offer.freeShipping: true` | Free shipping offered | P1 |
| UPS-042 | Rule with free gift offer | Create rule with `offer.freeGift: "product-id"` | Free gift added | P2 |
| UPS-043 | Rule with bonus product offer | Create rule with `offer.bonusProduct: "product-id"` | Bonus product shown | P2 |

### 4.5 Targeting Rule Priority & Validity Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UPS-050 | Rules sorted by priority | Create rules with different priorities | Higher priority rules shown first | P1 |
| UPS-051 | Rule with future validFrom | Create rule with validFrom in future | Rule not active until date | P2 |
| UPS-052 | Rule with past validUntil | Create rule with validUntil in past | Rule no longer active | P2 |
| UPS-053 | Rule with maxImpressions | Create rule with `maxImpressions: 100` | Rule stops after 100 impressions | P2 |
| UPS-054 | Rule with maxAcceptances | Create rule with `maxAcceptances: 50` | Rule stops after 50 accepts | P2 |
| UPS-055 | Disabled rule not shown | Create rule with `enabled: false` | Rule not returned in cart upsells | P1 |

### 4.6 Impression Tracking Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UPS-060 | Record impression | POST `/api/upsell/impressions` with valid data | Returns `{ impressionId: "xxx" }` | P1 |
| UPS-061 | Record impression - all fields | POST with cartId, ruleId, sessionId, placement, variant, offer | All fields recorded | P2 |
| UPS-062 | Record impression - missing required | POST without cartId | 400 validation error | P1 |
| UPS-063 | Record acceptance | POST `/api/upsell/impressions/accept` with impressionId, revenue | Returns `{ success: true }` | P1 |
| UPS-064 | Record acceptance with revenue | POST with `revenue: 24.99` | Revenue tracked for analytics | P1 |
| UPS-065 | Record decline | POST `/api/upsell/impressions/decline` with impressionId | Returns `{ success: true }` | P1 |
| UPS-066 | Record decline - invalid impression | POST with non-existent impressionId | 400/404 error | P2 |

---

## 5. Bulk Discount Tests

### 5.1 Bulk Discount Configuration Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| BLK-001 | Get bulk discount config | Retrieve config for product | Returns tiers, enabled status, validity dates | P1 |
| BLK-002 | Create bulk discount | Create config with multiple tiers | All tiers saved correctly | P1 |
| BLK-003 | Create tier with PERCENTAGE discount | Create tier with `discountType: "PERCENTAGE", discountValue: 10` | 10% discount for quantity | P1 |
| BLK-004 | Create tier with FIXED_AMOUNT discount | Create tier with `discountType: "FIXED_AMOUNT", discountValue: 5` | $5 off per unit | P1 |
| BLK-005 | Create tier with UNIT_PRICE discount | Create tier with `discountType: "UNIT_PRICE", discountValue: 9.99` | Fixed unit price | P2 |
| BLK-006 | Update bulk discount | Update existing config | Changes saved | P1 |
| BLK-007 | Delete bulk discount | Delete config for product | Config removed, cache invalidated | P2 |
| BLK-008 | Bulk discount - wrong company | Create for product not owned | 404 Product not found | P1 |

### 5.2 Bulk Discount Calculation Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| BLK-010 | Calculate price - no discount | Quantity below first tier | Full price, tier: null | P1 |
| BLK-011 | Calculate price - first tier | Quantity matches first tier | Discount applied, tier returned | P1 |
| BLK-012 | Calculate price - highest tier | Quantity exceeds all tiers | Highest tier discount applied | P1 |
| BLK-013 | Calculate price - max discount cap | Discount exceeds maxDiscountPercent | Capped at maxDiscountPercent | P2 |
| BLK-014 | Calculate price - before validFrom | Check before validity period | No discount applied | P2 |
| BLK-015 | Calculate price - after validUntil | Check after validity expired | No discount applied | P2 |
| BLK-016 | Calculate price - disabled config | Config has enabled=false | No discount applied | P1 |

### 5.3 Bulk Upsell Recommendations Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| BLK-020 | Get bulk upsell recommendation | Get for product at quantity 1 | Recommends quantity to reach first tier | P1 |
| BLK-021 | Recommendation at tier boundary | Get at quantity 2 (tier is 3+) | Recommends adding 1 to reach tier | P1 |
| BLK-022 | Recommendation at highest tier | Get at highest tier quantity | Returns null (no higher tier) | P2 |
| BLK-023 | Recommendation includes savings | Check recommendation object | savings and savingsPercent calculated | P1 |
| BLK-024 | Recommendation includes message | Check recommendation object | Compelling message generated | P2 |
| BLK-025 | Get cart bulk recommendations | Get for multiple products | Returns top 3 by savings | P1 |

---

## 6. Subscription Upsell Tests

### 6.1 Subscription Configuration Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-001 | Get subscription config | Retrieve config for product | Returns discount tiers, frequency, eligibility | P1 |
| SUB-002 | Create subscription config | Create with custom tiers | All tiers saved | P1 |
| SUB-003 | Create config with default tiers | Create without specifying tiers | Default tiers created (WEEKLY through QUARTERLY) | P2 |
| SUB-004 | Update subscription config | Update existing config | Changes saved, cache invalidated | P1 |
| SUB-005 | Subscription config - non-subscribable product | Create for product with isSubscribable=false | Config saved but won't return offers | P2 |

### 6.2 Subscription Eligibility Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-010 | Check eligibility - anonymous | GET `/api/upsell/subscription-eligibility/:productId?companyId=xxx` | Returns eligibility based on product only | P1 |
| SUB-011 | Check eligibility - logged in customer | GET with customerId | Personalized eligibility based on history | P1 |
| SUB-012 | Eligibility - non-subscribable product | Check product with isSubscribable=false | eligible: false, reason explains why | P1 |
| SUB-013 | Eligibility - disabled config | Check product with enabled=false | eligible: false | P1 |
| SUB-014 | Eligibility - repeat customer boost | Check for customer with 2+ purchases | Higher confidence score | P2 |
| SUB-015 | Eligibility - high LTV customer | Check for customer with LTV > $200 | Higher confidence score | P2 |
| SUB-016 | Eligibility - consumable product | Check product in "coffee" category | Higher eligibility score | P2 |

### 6.3 Subscription Offer Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-020 | Get subscription offer | GET `/api/upsell/subscription-offer/:productId?companyId=xxx` | Returns offer with savings calculations | P1 |
| SUB-021 | Offer includes all discount tiers | Check offer.discountTiers | All configured frequencies present | P2 |
| SUB-022 | Offer calculates savings per order | Check offer.savingsPerOrder | Correct based on price and discount | P1 |
| SUB-023 | Offer calculates savings per year | Check offer.savingsPerYear | savingsPerOrder * orders per year | P1 |
| SUB-024 | Offer - not eligible | Check for ineligible customer | Returns null | P2 |
| SUB-025 | Recommended frequency - new customer | Check for customer with no history | Returns defaultFrequency from config | P2 |
| SUB-026 | Recommended frequency - based on history | Check for customer with repeat purchases | Frequency matches purchase pattern | P2 |

---

## 7. Access Control Tests

### 7.1 Cart Theme Access Control

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ACL-001 | Company user can update own theme | PATCH as company user for own landing page | Theme updated | P1 |
| ACL-002 | Company user cannot update other company | PATCH for different company's page | 403/404 | P1 |
| ACL-003 | Client admin can update own companies | PATCH as client admin for client's company | Theme updated | P1 |
| ACL-004 | Org admin can update any company | PATCH as org admin with companyId | Theme updated | P1 |
| ACL-005 | Public GET allowed without auth | GET cart theme without token | Theme returned | P1 |

### 7.2 Recommendations Access Control

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ACL-010 | Public recommendations allowed | GET recommendations without auth | Recommendations returned | P1 |
| ACL-011 | Admin config requires auth | GET `/api/admin/recommendations/config` without auth | 401 Unauthorized | P1 |
| ACL-012 | Admin config scoped to company | GET config as company user | Returns company's config only | P1 |

### 7.3 Upsell Access Control

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ACL-020 | Public cart upsells allowed | GET `/api/upsell/cart/:id` without auth | Upsells returned | P1 |
| ACL-021 | Rules require auth | GET `/api/upsell/rules` without auth | 401 Unauthorized | P1 |
| ACL-022 | Rules scoped to company | GET rules as company user | Returns company's rules only | P1 |
| ACL-023 | Impression tracking public | POST impressions without auth | Impression recorded | P1 |

---

## 8. Error Handling Tests

### 8.1 Validation Errors

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-001 | Invalid color format | Update theme with invalid hex | Clear error message | P1 |
| ERR-002 | Number out of range | Set maxResults > 20 | Validation error with range | P2 |
| ERR-003 | Invalid enum value | Use invalid preset name | Clear error message | P2 |
| ERR-004 | Missing required field | Omit required field | Lists missing field | P1 |
| ERR-005 | Invalid date format | Use non-ISO date string | Date parsing error | P2 |

### 8.2 Resource Errors

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-010 | Landing page not found | Update theme for non-existent page | 404 with clear message | P1 |
| ERR-011 | Product not found | Create bulk discount for invalid product | 404 | P1 |
| ERR-012 | Rule not found | Update non-existent rule | 404 | P1 |
| ERR-013 | Impression not found | Accept non-existent impression | 400/404 | P2 |

### 8.3 Permission Errors

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-020 | No company context | Update without company scope | 403 "Company context required" | P1 |
| ERR-021 | Wrong company | Access other company's resource | 403/404 | P1 |
| ERR-022 | Session expired | Use expired auth token | 401 Unauthorized | P1 |

---

## 9. Performance Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PERF-001 | Get cart theme response time | GET cart theme | Response < 200ms | P2 |
| PERF-002 | Get recommendations response time | GET full recommendations | Response < 500ms | P2 |
| PERF-003 | Get cart upsells response time | GET upsells for cart | Response < 300ms | P2 |
| PERF-004 | Track impression response time | POST impression | Response < 100ms | P2 |
| PERF-005 | Bulk calculation response time | Calculate for 50 items | Response < 200ms | P3 |
| PERF-006 | Cache effectiveness | GET same theme twice | Second request significantly faster | P3 |

---

## 10. Cross-Browser Testing Matrix

| Feature | Chrome | Firefox | Safari | Edge | iOS Safari | Android Chrome |
|---------|--------|---------|--------|------|------------|----------------|
| Cart Theme API | Required | Required | Required | Optional | Required | Required |
| Recommendations API | Required | Required | Required | Optional | Required | Required |
| Upsell API | Required | Required | Required | Optional | Required | Required |
| Tracking APIs | Required | Required | Required | Optional | Required | Required |

---

## 11. Data Integrity Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| DATA-001 | Theme persistence | Update theme, reload page | Theme preserved | P1 |
| DATA-002 | Config persistence | Update recommendation config, reload | Config preserved | P1 |
| DATA-003 | Impression tracking accuracy | Track 10 impressions, check count | All 10 recorded | P1 |
| DATA-004 | Acceptance revenue tracking | Accept with revenue, check analytics | Revenue correctly attributed | P1 |
| DATA-005 | Cache invalidation | Update config, immediate get | Updated values returned | P1 |

---

## Sign-off Checklist

- [ ] All P1 tests passed
- [ ] All P2 tests passed or documented as known issues
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Performance acceptable
- [ ] Security tests passed

**QA Sign-off:** _________________ **Date:** _________________

**Verdict:** [ ] APPROVED FOR RELEASE | [ ] BLOCKED - See Issues

---

## Appendix: Test Data Requirements

### Required Test Users
- Organization Admin (access to all companies)
- Client Admin (access to client's companies only)
- Company User (access to single company)

### Required Test Data
- Landing pages with different theme presets
- Products with bulk discount configurations
- Products with subscription configurations (isSubscribable=true)
- Products in different categories (coffee, consumables, etc.)
- Customers with purchase history (for personalization tests)
- Customers with repeat purchases of same product
- Active carts with various items and values
- Targeting rules with different conditions and offers
- Impression records for tracking tests

### Required API Endpoints

**Cart Theme:**
- `GET /api/landing-pages/:id/cart-theme`
- `PATCH /api/landing-pages/:id/cart-theme`
- `DELETE /api/landing-pages/:id/cart-theme`
- `GET /api/landing-pages/:id/cart-theme/preview`
- `GET /api/landing-pages/cart-themes/presets`
- `POST /api/landing-pages/cart-themes/generate`
- `GET /api/landing-pages/:id/product-catalog`
- `PATCH /api/landing-pages/:id/product-catalog`
- `GET /api/landing-pages/:id/products`
- `POST /api/landing-pages/:id/product-catalog/products`
- `DELETE /api/landing-pages/:id/product-catalog/products`
- `POST /api/landing-pages/:id/product-catalog/reorder`

**Recommendations:**
- `GET /api/products/:productId/recommendations`
- `GET /api/products/:productId/recommendations/also-bought`
- `GET /api/products/:productId/recommendations/you-might-like`
- `GET /api/products/:productId/recommendations/frequently-viewed`
- `POST /api/recommendations/view`
- `POST /api/recommendations/click`
- `POST /api/recommendations/add-to-cart`
- `GET /api/admin/recommendations/config`
- `PUT /api/admin/recommendations/config`
- `GET /api/admin/recommendations/preview/:productId`

**Upsell:**
- `GET /api/upsell/cart/:cartId`
- `GET /api/upsell/rules`
- `POST /api/upsell/rules`
- `PUT /api/upsell/rules/:ruleId`
- `DELETE /api/upsell/rules/:ruleId`
- `POST /api/upsell/impressions`
- `POST /api/upsell/impressions/accept`
- `POST /api/upsell/impressions/decline`
- `GET /api/upsell/subscription-eligibility/:productId`
- `GET /api/upsell/subscription-offer/:productId`

---

*Document Version: 1.0*
*Last Updated: January 27, 2026*
*Prepared by: Senior QA Engineer*
