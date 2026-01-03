# Product Selection Page Types - Comprehensive Specifications

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Created** | December 31, 2025 |
| **Author** | Senior Product Manager |
| **Status** | Ready for Engineering Review |
| **Dependencies** | Funnel Builder, Brand Kit, Product Import, Checkout System |

---

## Executive Summary

This specification covers three new product selection page types for the funnel builder:

1. **Shopping Cart Style** - Traditional e-commerce cart review page
2. **Product Display Page (PDP)** - Single product focus with variants
3. **Bundle Builder** - Interactive multi-step bundle creation

These page types extend the existing Product Grid layout to support diverse e-commerce conversion patterns, from impulse purchases to considered bundle customization.

---

# 1. Shopping Cart Style Page

## 1.1 Overview

A traditional e-commerce cart page that allows customers to review selected items, modify quantities, apply discounts, and proceed to checkout. Inspired by Shopify, Amazon, and premium DTC brand cart experiences.

### Best Use Cases
- Post-product-selection review before checkout
- Multi-item purchases requiring quantity adjustment
- Upsell/cross-sell opportunity before payment
- Discount code redemption
- Express checkout with Apple Pay/Google Pay

---

## 1.2 User Stories

### Must Have (P0)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CART-001 | As a customer, I want to see all items in my cart with images, names, and prices so I can confirm my selections | Cart displays line items with 80x80 thumbnail, product name, variant info, unit price, line total |
| CART-002 | As a customer, I want to adjust quantities so I can buy more or fewer of an item | Quantity selector (+/-) updates line total and cart total in real-time; respects min/max constraints |
| CART-003 | As a customer, I want to remove items so I can change my mind | Remove button with confirmation; item animates out; totals recalculate |
| CART-004 | As a customer, I want to see subtotal, shipping, and total so I understand what I'll pay | Order summary shows: Subtotal, Shipping (calculated or estimate), Discounts applied, Total |
| CART-005 | As a customer, I want to apply a discount code so I can save money | Discount input with Apply button; shows success/error; discount line appears in summary |
| CART-006 | As a customer, I want to proceed to checkout so I can complete my purchase | Primary CTA "Proceed to Checkout" advances to checkout stage |

### Should Have (P1)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CART-101 | As a customer, I want to save items for later so I can consider them without removing from cart | "Save for Later" moves item to separate section; can restore to cart |
| CART-102 | As a customer, I want express checkout options so I can pay faster | Apple Pay, Google Pay, PayPal buttons below main CTA |
| CART-103 | As a customer, I want to see product recommendations so I can discover related items | "You may also like" section with 4 product cards |
| CART-104 | As a customer, I want to continue shopping so I can add more items | "Continue Shopping" link returns to previous stage or product grid |
| CART-105 | As a customer, I want real-time shipping estimates so I know delivery costs | Shipping calculator based on ZIP/postal code |

### Could Have (P2)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CART-201 | As a customer, I want to see estimated delivery date so I know when items arrive | Shows "Est. delivery: Dec 5-8" based on shipping method |
| CART-202 | As a customer, I want gift wrap options so I can send items as gifts | Gift wrap checkbox with additional fee |
| CART-203 | As a customer, I want to add order notes so I can provide special instructions | Order notes textarea (optional) |
| CART-204 | As a customer, I want to see stock warnings so I know if items are limited | "Only 3 left!" warning on low-stock items |
| CART-205 | As a merchant, I want cart reservation timers so customers feel urgency | "Reserved for 15:00" countdown; configurable duration |

### Won't Have (Future)
- Multi-cart support (save multiple carts)
- Cart sharing via URL
- Recurring/subscription add from cart
- In-cart product configuration (build-your-own)

---

## 1.3 Feature Requirements

### 1.3.1 Cart Line Items

```typescript
interface CartLineItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variantLabel?: string; // "Size: M, Color: Blue"
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  originalPrice?: number; // For strike-through pricing
  maxQuantity?: number;
  minQuantity?: number;
  stockLevel?: number;
  isSavedForLater?: boolean;
}
```

**Acceptance Criteria:**
- Line items render in order added (most recent first optional)
- Variant info shows in formatted label
- Price shows currency symbol from funnel settings
- Line total = unitPrice x quantity
- Images are lazy-loaded with skeleton placeholders

### 1.3.2 Quantity Controls

**Acceptance Criteria:**
- Minus button disabled at minQuantity (default 1)
- Plus button disabled at maxQuantity or stockLevel
- Direct input allowed with validation
- Debounce updates (300ms) to prevent rapid API calls
- Optimistic UI update with rollback on error
- Shows "Max qty reached" tooltip at limit

### 1.3.3 Order Summary

```typescript
interface CartSummary {
  subtotal: number;
  shippingEstimate?: number;
  shippingMethod?: string;
  discountAmount?: number;
  discountCode?: string;
  taxEstimate?: number;
  total: number;
  itemCount: number;
  savings?: number;
}
```

**Acceptance Criteria:**
- Subtotal = sum of all line totals
- Shipping shows "Calculated at checkout" if not known
- Tax shows only if funnel has tax estimation enabled
- Total is bold and prominent
- Shows item count in header ("Your Cart (3 items)")

### 1.3.4 Discount Code

**Acceptance Criteria:**
- Input field with "Apply" button
- Loading state while validating
- Success: Green checkmark, discount line in summary, input disabled
- Error: Red border, inline error message
- "Remove" option after successful application
- Supports percentage and fixed-amount discounts

### 1.3.5 Express Checkout

**Acceptance Criteria:**
- Shows only if payment methods configured in funnel
- Apple Pay: Shows on Safari/iOS only (feature detection)
- Google Pay: Shows on Chrome/Android
- PayPal: Always available if configured
- Express buttons initiate payment flow directly (skip address if stored)

---

## 1.4 Data Model Requirements

### Database Schema Extensions

```prisma
// Add to FunnelSession - cart data storage
model FunnelSession {
  // ... existing fields ...

  // Enhanced cart data
  cartItems      Json    @default("[]")  // CartLineItem[]
  savedForLater  Json    @default("[]")  // CartLineItem[]
  discountCode   String?
  discountAmount Decimal? @db.Decimal(10, 2)
  discountType   String?  // 'percentage' | 'fixed' | 'shipping'
  cartReservedAt DateTime?
  cartExpiresAt  DateTime?
}

// Discount codes (company-level)
model DiscountCode {
  id          String   @id @default(cuid())
  companyId   String
  code        String
  type        DiscountType
  value       Decimal  @db.Decimal(10, 2)
  minPurchase Decimal? @db.Decimal(10, 2)
  maxUses     Int?
  usedCount   Int      @default(0)
  startDate   DateTime?
  endDate     DateTime?
  productIds  String[] // Empty = all products
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, code])
  @@index([companyId, isActive])
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}
```

### Session Data Structure

```typescript
interface CartSessionData {
  items: CartLineItem[];
  savedForLater: CartLineItem[];
  discount?: {
    code: string;
    type: 'percentage' | 'fixed' | 'shipping';
    amount: number;
  };
  shippingEstimate?: {
    postalCode: string;
    country: string;
    method: string;
    cost: number;
  };
  reservedAt?: string;
  expiresAt?: string;
}
```

---

## 1.5 API Endpoint Requirements

### Cart Operations

```
# Cart Management
PATCH  /api/f/sessions/:token/cart              # Update cart (add/remove/update items)
POST   /api/f/sessions/:token/cart/discount     # Apply discount code
DELETE /api/f/sessions/:token/cart/discount     # Remove discount code
POST   /api/f/sessions/:token/cart/save-item    # Save item for later
POST   /api/f/sessions/:token/cart/restore-item # Restore item from saved
GET    /api/f/sessions/:token/cart/shipping     # Get shipping estimates
POST   /api/f/sessions/:token/cart/reserve      # Reserve cart (start timer)

# Discount Validation (internal)
POST   /api/discounts/validate                  # Validate discount code
```

### Request/Response Examples

```typescript
// PATCH /api/f/sessions/:token/cart
interface UpdateCartRequest {
  action: 'add' | 'remove' | 'update';
  item?: {
    productId: string;
    variantId?: string;
    quantity: number;
  };
  itemId?: string; // For remove/update
}

interface UpdateCartResponse {
  items: CartLineItem[];
  summary: CartSummary;
}

// POST /api/f/sessions/:token/cart/discount
interface ApplyDiscountRequest {
  code: string;
}

interface ApplyDiscountResponse {
  success: boolean;
  discount?: {
    code: string;
    type: string;
    amount: number;
    description: string; // "20% off" or "$10 off"
  };
  error?: string; // "Invalid code" | "Expired" | "Minimum not met"
  newTotal: number;
}
```

---

## 1.6 Analytics Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `cart_viewed` | Cart page loads | `item_count`, `cart_value`, `discount_applied` |
| `cart_item_quantity_changed` | Quantity updated | `product_id`, `old_quantity`, `new_quantity`, `line_total` |
| `cart_item_removed` | Item removed | `product_id`, `variant_id`, `price`, `reason` (optional) |
| `cart_item_saved` | Saved for later | `product_id`, `variant_id` |
| `cart_item_restored` | Restored from saved | `product_id`, `variant_id` |
| `discount_applied` | Discount successful | `code`, `type`, `amount`, `cart_total` |
| `discount_failed` | Discount rejected | `code`, `error_reason` |
| `shipping_estimated` | Shipping calculated | `postal_code`, `method`, `cost` |
| `express_checkout_clicked` | Express pay clicked | `method` (apple_pay/google_pay/paypal) |
| `checkout_initiated` | Proceed to checkout | `item_count`, `cart_value`, `has_discount` |
| `continue_shopping_clicked` | Continue shopping | `item_count`, `cart_value` |

---

## 1.7 Integration Points

### Brand Kit Integration
- Primary color: CTA buttons, links
- Secondary color: Accents, hover states
- Typography: Headings (product names), body (descriptions)
- Logo: Header display (optional)

### Intervention System
- **Social Proof**: "Sarah from NYC just purchased this" notifications
- **Urgency**: "Cart reserved for 15:00" timer (if enabled)
- **Scarcity**: "Only 3 left!" on low-stock items

### Checkout Integration
- Cart data passed to checkout stage via session
- Discount code validated again at checkout (security)
- Express checkout bypasses cart → checkout stage transition

---

## 1.8 Configuration Options

```typescript
interface ShoppingCartConfig {
  pageType: 'cart';

  layout: {
    showProductImages: boolean;
    imageSize: 'small' | 'medium'; // 60x60 or 80x80
    showVariantDetails: boolean;
    showStockLevel: boolean;
  };

  features: {
    quantityAdjustment: boolean;
    saveForLater: boolean;
    discountCode: boolean;
    shippingEstimator: boolean;
    expressCheckout: boolean;
    orderNotes: boolean;
    giftWrap: boolean;
  };

  recommendations: {
    enabled: boolean;
    title: string; // "You may also like"
    maxItems: number; // 4
    source: 'related' | 'bestsellers' | 'manual';
    productIds?: string[];
  };

  cartReservation: {
    enabled: boolean;
    duration: number; // minutes
    warningAt: number; // minutes before expiry
  };

  cta: {
    text: string; // "Proceed to Checkout"
    continueShoppingText: string; // "Continue Shopping"
    continueShoppingUrl?: string; // Override default
  };
}
```

---

## 1.9 Success Metrics (KPIs)

| Metric | Definition | Target |
|--------|------------|--------|
| **Cart Completion Rate** | Sessions that proceed to checkout / Cart views | > 65% |
| **Discount Redemption Rate** | Discounts applied / Cart views | 15-25% |
| **Items per Cart** | Average items in completed carts | > 2.0 |
| **Cart Abandonment Rate** | Cart views - Checkouts / Cart views | < 35% |
| **Express Checkout Usage** | Express checkout clicks / Total checkouts | > 20% |
| **Save for Later Conversion** | Saved items eventually purchased / Saved items | > 30% |
| **Upsell Acceptance Rate** | Recommendation clicks / Recommendation views | > 5% |

---

## 1.10 MVP vs Full Implementation

### MVP (Phase 1) - 2 weeks
- [ ] Cart line item display with images
- [ ] Quantity adjustment (+/-)
- [ ] Remove item functionality
- [ ] Order summary (subtotal, total)
- [ ] Basic discount code (percentage/fixed)
- [ ] Proceed to checkout CTA
- [ ] Continue shopping link
- [ ] Mobile responsive layout

### Full Implementation (Phase 2) - 2 weeks
- [ ] Save for later functionality
- [ ] Express checkout (Apple Pay, Google Pay, PayPal)
- [ ] Product recommendations section
- [ ] Shipping estimator
- [ ] Cart reservation timer
- [ ] Stock level warnings
- [ ] Free shipping threshold indicator
- [ ] Gift wrap option
- [ ] Order notes field

---

## 1.11 Engineering Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| **Backend** | | |
| Cart session data model | 3 days | Schema, migrations, types |
| Cart API endpoints | 4 days | CRUD, discount validation |
| Discount code system | 3 days | Code management, validation |
| Shipping estimation | 2 days | ZIP-based calculation |
| **Frontend** | | |
| Cart page component | 5 days | Layout, line items, responsive |
| Quantity controls | 1 day | Debounce, validation |
| Order summary widget | 2 days | Dynamic calculations |
| Discount input | 1 day | Validation, feedback |
| Express checkout buttons | 2 days | Payment provider integration |
| Recommendations section | 2 days | Product cards, API |
| **Testing** | | |
| Unit tests | 3 days | Services, components |
| E2E tests | 2 days | Cart flow scenarios |
| **Total** | **30 days** | ~1.5 sprints |

---

## 1.12 Dependencies and Risks

### Dependencies
| Dependency | Owner | Status | Impact |
|------------|-------|--------|--------|
| Product Image Service | API Team | Complete | Required for thumbnails |
| Payment Provider Integration | Integrations | Complete | Required for express checkout |
| Funnel Session System | Funnels Team | Complete | Required for cart storage |
| Discount Code Admin UI | Admin Team | Not Started | Blocking discount feature |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Express checkout complexity | Medium | High | Start with PayPal only, add Apple/Google later |
| Discount abuse | Low | Medium | Rate limiting, fraud detection |
| Cart sync issues (multi-tab) | Medium | Low | Last-write-wins with conflict toast |
| Performance with large carts | Low | Medium | Virtual scrolling for 50+ items |

---

# 2. Product Display Page (PDP)

## 2.1 Overview

A single product focus page inspired by Shopify product pages. Features large image gallery, variant selection, detailed product information, and social proof elements. Ideal for hero product funnels or detailed product exploration.

### Best Use Cases
- Single product funnels
- High-value products requiring detailed information
- Products with multiple variants (size, color)
- Products with strong visual appeal
- Products benefiting from reviews and social proof

---

## 2.2 User Stories

### Must Have (P0)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| PDP-001 | As a customer, I want to see large product images so I can examine the product | Main image 500x500 min with zoom capability; gallery thumbnails below |
| PDP-002 | As a customer, I want to select product variants so I can choose the right option | Variant selectors (size, color) with visual feedback; updates price/image |
| PDP-003 | As a customer, I want to see product price clearly so I know what I'll pay | Price prominently displayed; shows compare-at price with discount badge |
| PDP-004 | As a customer, I want to select quantity so I can buy multiple | Quantity picker with +/- buttons; respects stock limits |
| PDP-005 | As a customer, I want to add to cart or buy now so I can purchase | Primary "Add to Cart" CTA; optional "Buy Now" for direct checkout |
| PDP-006 | As a customer, I want to read product description so I understand what I'm buying | Description tab with formatted content; supports markdown |

### Should Have (P1)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| PDP-101 | As a customer, I want to see customer reviews so I can trust the product | Star rating, review count, sample reviews; "See all reviews" link |
| PDP-102 | As a customer, I want to see trust badges so I feel confident purchasing | Free shipping, returns, secure checkout badges |
| PDP-103 | As a customer, I want tabbed content so I can explore details, reviews, shipping | Tabs: Description, Reviews, Shipping & Returns |
| PDP-104 | As a customer, I want to see "Customers also bought" so I can discover related products | 4 product cards with quick add |
| PDP-105 | As a customer, I want to add to wishlist so I can save for later | Heart icon to save; shows confirmation |
| PDP-106 | As a customer, I want to zoom on images so I can see details | Click-to-zoom modal or inline zoom on hover |

### Could Have (P2)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| PDP-201 | As a customer, I want 360-degree view so I can see all angles | Spin viewer or image sequence |
| PDP-202 | As a customer, I want video content so I can see product in action | Video thumbnail in gallery; modal player |
| PDP-203 | As a customer, I want size guide so I know which size to pick | Size chart modal with measurements |
| PDP-204 | As a customer, I want to share product so I can show friends | Social share buttons (copy link, Twitter, Facebook) |
| PDP-205 | As a customer, I want sticky add-to-cart on mobile so it's always accessible | Fixed bottom CTA on mobile when scrolled past main CTA |

### Won't Have (Future)
- AR try-on
- Live video shopping
- Product customization builder
- Bundle building from PDP

---

## 2.3 Feature Requirements

### 2.3.1 Image Gallery

```typescript
interface ProductGallery {
  images: ProductImage[];
  selectedIndex: number;
  zoomEnabled: boolean;
  videoUrls?: string[];
}

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  variantIds?: string[]; // Images specific to variants
}
```

**Acceptance Criteria:**
- Main image: 500x500px minimum, responsive up to full-width mobile
- Thumbnails: 60x60px, scrollable if > 5
- Click thumbnail to switch main image
- Swipe on mobile for navigation
- Lazy load off-screen images
- Zoom: 2x magnification on hover (desktop) or pinch (mobile)
- Video: Plays inline or in modal; shows play icon overlay

### 2.3.2 Variant Selection

```typescript
interface VariantSelector {
  optionName: string; // "Size", "Color"
  optionType: 'dropdown' | 'swatch' | 'button-group';
  values: VariantValue[];
  selectedValue?: string;
}

interface VariantValue {
  value: string;
  label: string;
  available: boolean;
  swatchColor?: string; // For color swatches
  swatchImage?: string; // For pattern swatches
  priceModifier?: number;
}
```

**Acceptance Criteria:**
- Size: Button group (S, M, L, XL) or dropdown for many sizes
- Color: Swatches with checkmark on selected
- Unavailable variants: Grayed out with strikethrough
- Selection updates: Price, main image (if variant-specific), stock level
- Cross-variant availability: If Size M + Color Blue unavailable, show

### 2.3.3 Pricing Display

```typescript
interface PricingDisplay {
  price: number;
  compareAtPrice?: number;
  discountPercentage?: number;
  currency: string;
  priceRange?: { // For variants with different prices
    min: number;
    max: number;
  };
}
```

**Acceptance Criteria:**
- Regular price: Large, bold typography
- Compare-at price: Strikethrough, smaller, gray
- Discount badge: "-20%" or "SALE" badge
- Price range: "From $29.99" when variants differ
- Selected variant updates displayed price

### 2.3.4 Trust Badges

```typescript
interface TrustBadge {
  icon: string;
  text: string;
  tooltip?: string;
}

const DEFAULT_TRUST_BADGES: TrustBadge[] = [
  { icon: 'truck', text: 'Free shipping over $50' },
  { icon: 'refresh', text: '30-day returns' },
  { icon: 'shield', text: 'Secure checkout' },
  { icon: 'credit-card', text: '100% money-back guarantee' },
];
```

**Acceptance Criteria:**
- Icons + text in horizontal or vertical list
- Configurable per funnel
- Hover tooltip for extended info
- Matches brand kit colors

### 2.3.5 Tabbed Content

**Tabs:**
1. **Description** - Rich text product description
2. **Reviews** - Star ratings, review count, sample reviews
3. **Shipping** - Shipping info, return policy

**Acceptance Criteria:**
- Tabs horizontally scrollable on mobile
- Active tab has underline indicator
- Content lazy-loaded when tab activated
- Deep linking support: `/f/slug?tab=reviews`

---

## 2.4 Data Model Requirements

### Schema Extensions

```prisma
// Extend existing Product model (if needed)
model Product {
  // ... existing fields ...

  // PDP-specific content
  shortDescription String?  @db.Text
  longDescription  String?  @db.Text  // Markdown supported
  sizeChart        Json?    // Size chart data
  faqItems         Json?    // FAQ Q&A pairs

  // SEO
  metaTitle        String?
  metaDescription  String?

  // Media
  videoUrls        String[]

  // Social proof
  reviewSummary    Json?    // Cached: { average, count, distribution }
}

// Product Reviews (if not already exists)
model ProductReview {
  id          String   @id @default(cuid())
  productId   String
  companyId   String
  customerId  String?
  rating      Int      // 1-5
  title       String?
  content     String?  @db.Text
  authorName  String
  verified    Boolean  @default(false)
  helpful     Int      @default(0)
  status      ReviewStatus @default(PENDING)
  createdAt   DateTime @default(now())

  product     Product  @relation(fields: [productId], references: [id])
  company     Company  @relation(fields: [companyId], references: [id])

  @@index([productId, status])
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## 2.5 API Endpoint Requirements

```
# Product Data
GET    /api/f/:funnelId/products/:productId     # Get product for PDP
GET    /api/f/:funnelId/products/:productId/reviews  # Get paginated reviews
GET    /api/f/:funnelId/products/:productId/related  # Get related products

# Session Actions
POST   /api/f/sessions/:token/cart/add          # Add to cart
POST   /api/f/sessions/:token/wishlist/add      # Add to wishlist
POST   /api/f/sessions/:token/checkout/product  # Buy now (direct checkout)
```

### Response Example

```typescript
// GET /api/f/:funnelId/products/:productId
interface PDPProductResponse {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;

  // Pricing
  price: number;
  compareAtPrice?: number;
  currency: string;

  // Media
  images: {
    id: string;
    url: string;
    thumbnailUrl: string;
    alt: string;
    variantIds?: string[];
  }[];
  videoUrls?: string[];

  // Variants
  options: {
    name: string;
    values: string[];
    type: 'dropdown' | 'swatch' | 'buttons';
  }[];
  variants: {
    id: string;
    options: Record<string, string>; // { size: 'M', color: 'Blue' }
    price: number;
    compareAtPrice?: number;
    stockLevel: number;
    available: boolean;
    imageId?: string;
  }[];

  // Reviews
  reviewSummary: {
    average: number;
    count: number;
    distribution: number[]; // [5, 4, 3, 2, 1] star counts
  };

  // Content
  tabs: {
    description: string; // Markdown
    shipping: string;
    faq?: { question: string; answer: string }[];
  };

  // Related
  relatedProductIds: string[];
}
```

---

## 2.6 Analytics Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `product_viewed` | PDP loads | `product_id`, `variant_id`, `price`, `source` |
| `variant_selected` | Variant changed | `product_id`, `variant_id`, `option_name`, `value` |
| `image_zoomed` | Zoom activated | `product_id`, `image_index` |
| `gallery_navigated` | Image changed | `product_id`, `from_index`, `to_index`, `method` (click/swipe) |
| `video_played` | Video starts | `product_id`, `video_url`, `duration` |
| `tab_viewed` | Tab clicked | `product_id`, `tab_name` |
| `reviews_viewed` | Reviews tab or scroll | `product_id`, `review_count` |
| `review_helpful_clicked` | Helpful vote | `product_id`, `review_id` |
| `add_to_cart_clicked` | Add to cart | `product_id`, `variant_id`, `quantity`, `price` |
| `buy_now_clicked` | Buy now | `product_id`, `variant_id`, `quantity`, `price` |
| `wishlist_added` | Added to wishlist | `product_id`, `variant_id` |
| `related_product_clicked` | Recommendation click | `source_product_id`, `clicked_product_id`, `position` |
| `share_clicked` | Share button | `product_id`, `platform` |

---

## 2.7 Integration Points

### Brand Kit Integration
- Primary color: CTA buttons, price text, active tab
- Secondary color: Borders, inactive states
- Accent color: Sale badge, wishlist heart
- Typography: Product name (heading font), description (body font)
- Logo: Header (optional)

### Intervention System
- **Social Proof**: "247 people bought this today" indicator
- **Urgency**: "Sale ends in 2:30:00" countdown
- **Scarcity**: "Only 5 left in stock!" warning

### Review System Integration
- Fetch reviews from ProductReview model
- Display star distribution chart
- Show verified purchase badges
- Filter by rating

---

## 2.8 Configuration Options

```typescript
interface PDPConfig {
  pageType: 'pdp';

  product: {
    source: 'manual' | 'dynamic'; // Manual = select product, Dynamic = from URL param
    productId?: string; // For manual
  };

  layout: {
    galleryPosition: 'left' | 'right';
    gallerySize: 'small' | 'medium' | 'large'; // 40%, 50%, 60%
    stickyGallery: boolean; // Gallery sticks on desktop scroll
  };

  gallery: {
    showThumbnails: boolean;
    thumbnailPosition: 'bottom' | 'left';
    enableZoom: boolean;
    enableVideo: boolean;
  };

  variants: {
    showColorSwatches: boolean;
    showSizeButtons: boolean;
    showStockLevel: boolean;
    lowStockThreshold: number;
  };

  pricing: {
    showCompareAt: boolean;
    showDiscountBadge: boolean;
    showSavingsAmount: boolean; // "You save $10"
  };

  trustBadges: {
    enabled: boolean;
    badges: TrustBadge[];
  };

  tabs: {
    enabled: boolean;
    showDescription: boolean;
    showReviews: boolean;
    showShipping: boolean;
    showFaq: boolean;
    defaultTab: string;
  };

  reviews: {
    enabled: boolean;
    showSummary: boolean;
    showDistribution: boolean;
    maxDisplayed: number; // Initial reviews shown
    allowLoadMore: boolean;
  };

  recommendations: {
    enabled: boolean;
    title: string;
    maxItems: number;
    source: 'related' | 'frequently_bought' | 'manual';
  };

  cta: {
    addToCartText: string;
    buyNowEnabled: boolean;
    buyNowText: string;
    wishlistEnabled: boolean;
    stickyOnMobile: boolean;
  };
}
```

---

## 2.9 Success Metrics (KPIs)

| Metric | Definition | Target |
|--------|------------|--------|
| **Add to Cart Rate** | Add to cart clicks / PDP views | > 10% |
| **Buy Now Rate** | Buy now clicks / PDP views | > 5% |
| **Gallery Engagement** | Sessions with 3+ image views / PDP views | > 40% |
| **Review Engagement** | Sessions viewing reviews tab / PDP views | > 25% |
| **Variant Selection Rate** | Sessions selecting variant / PDP views | > 60% |
| **Related Product CTR** | Related product clicks / Recommendation views | > 3% |
| **Time on Page** | Average session duration on PDP | > 60 seconds |
| **Bounce Rate** | Single-page sessions / PDP views | < 40% |

---

## 2.10 MVP vs Full Implementation

### MVP (Phase 1) - 2.5 weeks
- [ ] Image gallery with thumbnails
- [ ] Variant selection (dropdown + buttons)
- [ ] Price display with compare-at
- [ ] Quantity selector
- [ ] Add to cart button
- [ ] Product description (basic text)
- [ ] Mobile responsive layout

### Full Implementation (Phase 2) - 2.5 weeks
- [ ] Image zoom functionality
- [ ] Video support in gallery
- [ ] Tabbed content (Description, Reviews, Shipping)
- [ ] Reviews display with stars
- [ ] Trust badges
- [ ] Related products section
- [ ] Wishlist functionality
- [ ] Buy now (direct checkout)
- [ ] Sticky mobile CTA
- [ ] Share functionality

---

## 2.11 Engineering Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| **Backend** | | |
| PDP product endpoint | 2 days | Aggregated product data |
| Reviews endpoint | 2 days | Pagination, filtering |
| Related products logic | 2 days | Recommendation algorithm |
| **Frontend** | | |
| Image gallery component | 4 days | Zoom, thumbnails, video |
| Variant selector | 3 days | Swatches, availability logic |
| Tabbed content | 2 days | Tabs, lazy loading |
| Reviews section | 3 days | Stars, distribution, cards |
| Trust badges | 0.5 days | Reusable component |
| Related products | 2 days | Carousel, quick add |
| Mobile optimization | 2 days | Sticky CTA, swipe gallery |
| **Testing** | | |
| Unit tests | 3 days | Components, services |
| E2E tests | 2 days | PDP flow scenarios |
| **Total** | **27.5 days** | ~1.5 sprints |

---

## 2.12 Dependencies and Risks

### Dependencies
| Dependency | Owner | Status | Impact |
|------------|-------|--------|--------|
| Product model with variants | Products Team | Complete | Core requirement |
| Product images in S3 | Storage Team | Complete | Required for gallery |
| Review system | Products Team | Partial | Blocking reviews feature |
| Wishlist functionality | Funnels Team | Not Started | P1 feature |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Image zoom performance | Medium | Medium | Use CSS transforms, not new images |
| Variant complexity (50+ variants) | Low | High | Virtual scrolling for dropdowns |
| Video bandwidth | Medium | Medium | Lazy load, quality presets |
| Mobile gallery UX | Medium | Medium | Extensive mobile testing |

---

# 3. Bundle Builder

## 3.1 Overview

An interactive multi-step bundle creation experience inspired by Dollar Shave Club and subscription box services. Customers build custom bundles with automatic discount calculation, driving higher AOV through curated product selection.

### Best Use Cases
- Subscription boxes
- Sample/trial kits
- Custom gift bundles
- Build-your-own product sets
- Multi-category bundles (e.g., coffee + mug + subscription)

---

## 3.2 User Stories

### Must Have (P0)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| BUNDLE-001 | As a customer, I want to see bundle-building steps so I know what choices I'll make | Step indicators (1, 2, 3) with labels; current step highlighted |
| BUNDLE-002 | As a customer, I want to select a base product so I can start building | Step 1 shows base products; single selection with visual feedback |
| BUNDLE-003 | As a customer, I want to add extras/add-ons so I can customize my bundle | Step 2+ shows add-on products; supports min/max selection |
| BUNDLE-004 | As a customer, I want to see running total so I know my bundle cost | Live price updates as selections change; shows savings |
| BUNDLE-005 | As a customer, I want to see bundle savings so I know my discount | "Save 25%!" or "You save $18.75" prominently displayed |
| BUNDLE-006 | As a customer, I want to complete my bundle so I can checkout | "Get My Bundle" CTA with total price; advances to checkout |

### Should Have (P1)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| BUNDLE-101 | As a customer, I want to see compare prices so I understand value | "If purchased separately: $74.99" vs "Bundle price: $56.24" |
| BUNDLE-102 | As a customer, I want to remove selections so I can change my mind | Remove button on selected items; enforces minimum if set |
| BUNDLE-103 | As a customer, I want navigation between steps so I can go back | Previous/Next buttons; clickable step indicators |
| BUNDLE-104 | As a customer, I want to see product details so I can make informed choices | Product name, image, description, individual price |
| BUNDLE-105 | As a customer, I want preset bundles so I can choose quickly | "Popular bundle" quick-select options |

### Could Have (P2)
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| BUNDLE-201 | As a customer, I want tiered discounts so I save more with bigger bundles | Discount increases: 2 items = 10%, 4 items = 20%, 6+ = 25% |
| BUNDLE-202 | As a customer, I want to save my bundle for later so I can return | "Save bundle" creates unique URL |
| BUNDLE-203 | As a customer, I want bundle recommendations so I get good combinations | AI-powered suggestions based on selections |
| BUNDLE-204 | As a customer, I want subscription options so I can receive recurring | "Make it a subscription" toggle with frequency selection |
| BUNDLE-205 | As a merchant, I want bundle analytics so I see popular combinations | Dashboard showing top bundles, AOV, step completion |

### Won't Have (Future)
- Collaborative bundles (multiple people contribute)
- Gift bundles with recipient personalization
- Bundle comparison tool
- Bundle wishlist sharing

---

## 3.3 Feature Requirements

### 3.3.1 Step System

```typescript
interface BundleStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  type: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  products: BundleProduct[];
}

interface BundleProduct {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  description?: string;
  isPopular?: boolean;
  maxQuantity?: number;
}

interface BundleConfig {
  steps: BundleStep[];
  discountType: 'percentage' | 'fixed' | 'tiered';
  discountValue: number; // 25 for 25%, or $10 for fixed
  tieredDiscounts?: TieredDiscount[];
  minimumItems?: number;
  maximumItems?: number;
}

interface TieredDiscount {
  minItems: number;
  maxItems?: number;
  discountPercentage: number;
}
```

**Acceptance Criteria:**
- Steps displayed as numbered indicators (1 - 2 - 3)
- Current step highlighted with brand primary color
- Completed steps show checkmark
- Step labels below/beside numbers
- Mobile: Horizontal scrollable or stacked

### 3.3.2 Product Selection

**Single Selection (Step Type: single)**
- Radio button behavior
- One selection per step
- Visual highlight on selected product
- Click anywhere on card to select

**Multiple Selection (Step Type: multiple)**
- Checkbox behavior
- Min/max enforced with visual feedback
- "Select X more" helper text
- Quantity picker if maxQuantity > 1

**Acceptance Criteria:**
- Selected state: Border highlight + checkmark overlay
- Disabled state: If max reached, unselected items gray out
- Error state: If min not met, CTA disabled with message

### 3.3.3 Bundle Summary

```typescript
interface BundleSummary {
  selections: BundleSelection[];
  subtotal: number;          // Full price if purchased separately
  discountAmount: number;
  bundlePrice: number;       // subtotal - discountAmount
  discountPercentage: number;
  itemCount: number;
}

interface BundleSelection {
  stepId: string;
  stepTitle: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}
```

**Acceptance Criteria:**
- Summary panel visible on desktop (right side)
- Summary drawer on mobile (tap to expand)
- Real-time updates as selections change
- Line items show product + price
- Savings prominently displayed with celebration styling

### 3.3.4 Discount Calculation

**Percentage Discount:**
```
bundlePrice = subtotal * (1 - discountPercentage / 100)
```

**Fixed Discount:**
```
bundlePrice = subtotal - fixedDiscount
```

**Tiered Discount:**
```
discountPercentage = getTierForItemCount(itemCount)
bundlePrice = subtotal * (1 - discountPercentage / 100)
```

**Acceptance Criteria:**
- Discount recalculated on every selection change
- Shows both percentage and dollar savings
- Tiered: Show progress to next tier ("Add 2 more for 25% off!")
- Minimum value enforced (bundlePrice never < 0)

### 3.3.5 Preset Bundles

```typescript
interface PresetBundle {
  id: string;
  name: string;
  description: string;
  selections: { stepId: string; productId: string; quantity: number }[];
  discount: number; // Override discount for preset
  isPopular: boolean;
}
```

**Acceptance Criteria:**
- Preset options shown above step 1 or as quick-select
- Clicking preset auto-fills all steps
- User can modify after selecting preset
- "Most Popular" badge on recommended preset

---

## 3.4 Data Model Requirements

### Schema Extensions

```prisma
// Bundle Configuration
model Bundle {
  id          String       @id @default(cuid())
  companyId   String
  name        String
  slug        String
  description String?

  // Configuration
  config      Json         // BundleConfig
  presets     Json?        // PresetBundle[]

  // Discount
  discountType  DiscountType
  discountValue Decimal    @db.Decimal(10, 2)

  // Status
  isActive    Boolean      @default(true)

  // Timestamps
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  company     Company      @relation(fields: [companyId], references: [id])

  @@unique([companyId, slug])
  @@index([companyId, isActive])
}

// Bundle Analytics
model BundleAnalytics {
  id            String   @id @default(cuid())
  bundleId      String
  sessionId     String?

  // Selections
  selections    Json     // { stepId, productId, quantity }[]

  // Outcome
  completed     Boolean
  totalValue    Decimal  @db.Decimal(10, 2)
  discountValue Decimal  @db.Decimal(10, 2)

  // Step analytics
  lastStepReached Int
  stepDurations   Json?  // { stepId: durationMs }[]

  createdAt     DateTime @default(now())

  @@index([bundleId])
  @@index([completed])
}
```

### Session Data

```typescript
interface BundleSessionData {
  bundleId: string;
  currentStep: number;
  selections: {
    stepId: string;
    productId: string;
    quantity: number;
  }[];
  startedAt: string;
  completedSteps: string[];
}
```

---

## 3.5 API Endpoint Requirements

```
# Bundle Data
GET    /api/f/:funnelId/bundle                   # Get bundle config
GET    /api/f/:funnelId/bundle/presets           # Get preset bundles

# Session Bundle Progress
GET    /api/f/sessions/:token/bundle             # Get current bundle state
PATCH  /api/f/sessions/:token/bundle             # Update bundle selections
POST   /api/f/sessions/:token/bundle/preset      # Apply preset bundle
POST   /api/f/sessions/:token/bundle/complete    # Complete bundle -> cart

# Analytics
POST   /api/f/sessions/:token/bundle/analytics   # Track step completion
```

### Request/Response Examples

```typescript
// GET /api/f/:funnelId/bundle
interface BundleResponse {
  id: string;
  name: string;
  description?: string;
  steps: BundleStep[];
  discountType: 'percentage' | 'fixed' | 'tiered';
  discountValue: number;
  tieredDiscounts?: TieredDiscount[];
  presets?: PresetBundle[];
}

// PATCH /api/f/sessions/:token/bundle
interface UpdateBundleRequest {
  stepId: string;
  action: 'select' | 'deselect' | 'set_quantity';
  productId: string;
  quantity?: number;
}

interface UpdateBundleResponse {
  selections: BundleSelection[];
  summary: BundleSummary;
  validation: {
    currentStep: number;
    canProceed: boolean;
    errors?: string[];
  };
}

// POST /api/f/sessions/:token/bundle/complete
interface CompleteBundleResponse {
  cartItems: CartLineItem[];
  summary: CartSummary;
  redirectTo: string; // Next stage URL
}
```

---

## 3.6 Analytics Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `bundle_started` | Bundle page loads | `bundle_id`, `step_count`, `preset_applied` |
| `bundle_step_entered` | Step navigation | `bundle_id`, `step_id`, `step_number` |
| `bundle_product_selected` | Product selected | `bundle_id`, `step_id`, `product_id`, `price` |
| `bundle_product_deselected` | Product removed | `bundle_id`, `step_id`, `product_id` |
| `bundle_quantity_changed` | Quantity updated | `bundle_id`, `product_id`, `old_qty`, `new_qty` |
| `bundle_preset_applied` | Preset selected | `bundle_id`, `preset_id`, `preset_name` |
| `bundle_tier_reached` | New discount tier | `bundle_id`, `tier`, `discount_percentage` |
| `bundle_step_completed` | Step requirements met | `bundle_id`, `step_id`, `selections_count` |
| `bundle_step_skipped` | Back/skip action | `bundle_id`, `step_id`, `reason` |
| `bundle_completed` | Bundle finalized | `bundle_id`, `item_count`, `total_value`, `savings` |
| `bundle_abandoned` | Exit without complete | `bundle_id`, `last_step`, `selections_count` |

---

## 3.7 Integration Points

### Brand Kit Integration
- Primary color: Selected state, CTAs, step indicators
- Secondary color: Unselected states, backgrounds
- Accent color: Savings badge, tier progress
- Typography: Step titles (heading), product names, prices

### Intervention System
- **Social Proof**: "1,234 customers built this bundle today"
- **Urgency**: "Bundle deal ends in 2:00:00"
- **Scarcity**: "Limited to 100 bundles per day"

### Cart Integration
- Bundle converts to cart line items
- Bundle discount applied as cart-level discount
- Bundle tracking maintained through checkout

### Subscription Integration
- Optional "Make it a subscription" toggle
- Frequency selector (Weekly, Monthly, Quarterly)
- Subscription pricing displayed

---

## 3.8 Configuration Options

```typescript
interface BundleBuilderConfig {
  pageType: 'bundle';

  bundle: {
    source: 'manual' | 'bundle_id';
    bundleId?: string;
  };

  layout: {
    stepsPosition: 'top' | 'left';
    summaryPosition: 'right' | 'bottom';
    productsPerRow: 2 | 3 | 4;
    productCardSize: 'small' | 'medium' | 'large';
  };

  steps: {
    showStepNumbers: boolean;
    showStepProgress: boolean;
    allowStepNavigation: boolean; // Click to jump
    showStepDescription: boolean;
  };

  products: {
    showImages: boolean;
    showDescriptions: boolean;
    showIndividualPrices: boolean;
    showPopularBadge: boolean;
  };

  summary: {
    showRunningTotal: boolean;
    showComparePricing: boolean;
    showSavingsPercentage: boolean;
    showSavingsAmount: boolean;
    showItemCount: boolean;
  };

  discount: {
    showTierProgress: boolean;
    showNextTierMessage: boolean;
    celebrateTierReached: boolean; // Animation/confetti
  };

  presets: {
    enabled: boolean;
    position: 'top' | 'inline';
    showPopularBadge: boolean;
  };

  subscription: {
    enabled: boolean;
    frequencies: ('weekly' | 'biweekly' | 'monthly' | 'quarterly')[];
    defaultFrequency: string;
    subscriptionDiscount: number; // Additional % off for subscription
  };

  cta: {
    text: string; // "Get My Bundle"
    showPrice: boolean; // "Get My Bundle - $56.24"
    style: 'solid' | 'gradient';
  };
}
```

---

## 3.9 Success Metrics (KPIs)

| Metric | Definition | Target |
|--------|------------|--------|
| **Bundle Completion Rate** | Bundles completed / Bundle starts | > 45% |
| **Average Bundle Value** | Total bundle revenue / Completed bundles | > $75 |
| **Items per Bundle** | Average products in completed bundles | > 4 |
| **Discount Efficiency** | Revenue retained after discount / Full price | > 75% |
| **Step Completion Rate** | Steps completed / Steps started | > 80% per step |
| **Preset Usage Rate** | Bundles using preset / Total bundles | 20-30% |
| **Subscription Opt-in** | Subscription bundles / Total bundles | > 15% |
| **Tier Upgrade Rate** | Sessions reaching higher tier / Total sessions | > 30% |

---

## 3.10 MVP vs Full Implementation

### MVP (Phase 1) - 3 weeks
- [ ] Multi-step wizard UI
- [ ] Single and multiple selection types
- [ ] Running total with percentage discount
- [ ] Bundle summary panel
- [ ] Step navigation (next/previous)
- [ ] Bundle completion -> cart conversion
- [ ] Mobile responsive layout

### Full Implementation (Phase 2) - 2 weeks
- [ ] Tiered discount system
- [ ] Preset bundles
- [ ] Quantity selection per product
- [ ] Compare pricing display
- [ ] Tier progress indicator
- [ ] Subscription option
- [ ] Save bundle for later
- [ ] Bundle analytics dashboard
- [ ] Step completion animations

---

## 3.11 Engineering Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| **Backend** | | |
| Bundle model and config | 3 days | Schema, types, validation |
| Bundle API endpoints | 3 days | CRUD, selection, completion |
| Discount calculation engine | 2 days | Percentage, fixed, tiered |
| Bundle analytics | 2 days | Event tracking, aggregation |
| **Frontend** | | |
| Step wizard component | 4 days | Navigation, progress, animations |
| Product selection grid | 3 days | Single/multiple, validation |
| Bundle summary panel | 2 days | Real-time updates, pricing |
| Preset bundles UI | 2 days | Quick-select, overlay |
| Tiered discount display | 1 day | Progress bar, messaging |
| Subscription toggle | 2 days | Frequency picker, pricing |
| Mobile optimization | 2 days | Drawer summary, step stacking |
| **Testing** | | |
| Unit tests | 3 days | Discount logic, validation |
| E2E tests | 2 days | Bundle flow scenarios |
| **Total** | **31 days** | ~1.5 sprints |

---

## 3.12 Dependencies and Risks

### Dependencies
| Dependency | Owner | Status | Impact |
|------------|-------|--------|--------|
| Bundle model in Prisma | API Team | Not Started | Blocking |
| Product selection integration | Products Team | Complete | Required |
| Subscription system | Billing Team | Partial | Blocking subscription feature |
| Cart discount integration | Checkout Team | Complete | Required for discount application |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Complex discount edge cases | High | Medium | Extensive unit testing, QA review |
| Step validation complexity | Medium | Medium | Clear error states, helper text |
| Mobile UX challenges | Medium | High | Mobile-first design, usability testing |
| Preset management overhead | Low | Low | Simple preset builder in admin |
| Subscription integration delays | Medium | Medium | Launch subscription as P2 |

---

# Cross-Cutting Concerns

## Accessibility Requirements

All three page types must meet WCAG 2.1 AA standards:

| Requirement | Shopping Cart | PDP | Bundle Builder |
|-------------|---------------|-----|----------------|
| Keyboard navigation | Tab through items, Enter to select | Tab through gallery, variants | Tab through steps and products |
| Screen reader | ARIA labels for cart items | Image alt text, variant labels | Step announcements, selection status |
| Focus management | Focus return after modal close | Focus on selected variant | Focus on current step |
| Color contrast | 4.5:1 for text, 3:1 for icons | 4.5:1 for all text | 4.5:1 for all text |
| Touch targets | 44x44px minimum | 44x44px for swatches | 44x44px for product cards |

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Cart update response | < 200ms | P95 latency |
| Image load (thumbnail) | < 100ms | P95 latency |

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Price manipulation | Server-side validation on all price calculations |
| Discount abuse | Rate limiting on discount code attempts; server validation |
| Session hijacking | Secure session tokens; HTTPS only |
| CSRF attacks | Anti-CSRF tokens on all mutations |
| XSS in product content | Sanitize all rendered content; CSP headers |

---

# Implementation Roadmap

## Phase 1: Shopping Cart + PDP MVP (5 weeks)

### Week 1-2: Shopping Cart MVP
- Backend: Cart data model, API endpoints
- Frontend: Cart layout, line items, quantity controls

### Week 3: Shopping Cart Completion
- Discount code system
- Order summary
- Continue shopping flow

### Week 4-5: PDP MVP
- Backend: PDP endpoint, variant logic
- Frontend: Gallery, variants, pricing, CTA

## Phase 2: Full Features (4 weeks)

### Week 6-7: Shopping Cart Full
- Express checkout integration
- Save for later
- Recommendations
- Cart reservation

### Week 8-9: PDP Full
- Image zoom
- Reviews integration
- Tabs system
- Related products
- Mobile optimization

## Phase 3: Bundle Builder (5 weeks)

### Week 10-12: Bundle Builder MVP
- Backend: Bundle model, config, API
- Frontend: Step wizard, selection, summary

### Week 13-14: Bundle Builder Full
- Tiered discounts
- Presets
- Subscription option
- Analytics

## Phase 4: Polish & Optimization (2 weeks)

### Week 15-16: Cross-Cutting
- Performance optimization
- Accessibility audit
- Mobile testing
- Documentation

---

# Appendix

## A. Competitive Analysis

| Feature | Shopify | Amazon | ClickFunnels | Our Platform |
|---------|---------|--------|--------------|--------------|
| Cart customization | Medium | Low | High | High |
| Express checkout | Yes | Yes | Limited | Yes |
| Discount codes | Yes | Yes | Yes | Yes |
| PDP gallery | Good | Good | Basic | Good |
| Variant UX | Excellent | Good | Basic | Good |
| Bundle builder | Limited | Limited | Yes | Yes |
| Tiered discounts | Plugin | Plugin | Yes | Yes |
| Subscription bundles | Plugin | Subscribe&Save | Yes | Yes |

## B. Glossary

| Term | Definition |
|------|------------|
| **PDP** | Product Display Page - single product focus |
| **SKU** | Stock Keeping Unit - unique product/variant identifier |
| **AOV** | Average Order Value |
| **CTR** | Click-Through Rate |
| **Express Checkout** | Payment without full address entry (Apple Pay, etc.) |
| **Tiered Discount** | Discount that increases with quantity/value |
| **Preset Bundle** | Pre-configured bundle for quick selection |

## C. Related Documents

- `/docs/roadmap/PRODUCT_SELECTION_DESIGNS.md` - Visual designs
- `/docs/roadmap/FUNNEL_BUILDER_SPECIFICATION.md` - Funnel system spec
- `/apps/api/src/funnels/types/funnel.types.ts` - Type definitions
- `/apps/api/src/funnels/services/brand-kit.service.ts` - Brand Kit integration

---

*Document Version: 1.0*
*Last Updated: December 31, 2025*
*Next Review: January 15, 2026*
