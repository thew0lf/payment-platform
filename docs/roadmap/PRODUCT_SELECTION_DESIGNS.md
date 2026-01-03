# Product Selection Page Designs

## Overview

This document outlines the different Product Selection page types available in the funnel builder, inspired by industry leaders like Shopify, Amazon, and premium DTC brands.

---

## Page Types

### 1. **Product Grid** (Current Default)
Standard grid layout for browsing multiple products.

```
+--------------------------------------------------+
|  [Search Bar]                    [Filter] [Sort] |
+--------------------------------------------------+
| +--------+ +--------+ +--------+ +--------+      |
| | Image  | | Image  | | Image  | | Image  |      |
| | Name   | | Name   | | Name   | | Name   |      |
| | $49.99 | | $49.99 | | $49.99 | | $49.99 |      |
| | [Add]  | | [Add]  | | [Add]  | | [Add]  |      |
| +--------+ +--------+ +--------+ +--------+      |
+--------------------------------------------------+
|           [Continue to Checkout]                 |
+--------------------------------------------------+
```

**Best for:** Catalogs with 8-50 products, browsing experience

---

### 2. **Shopping Cart Style** (NEW)
Traditional e-commerce cart page layout (Shopify, Amazon inspired).

```
+--------------------------------------------------+
|                    YOUR CART (3 items)           |
+--------------------------------------------------+
| +-----------------------------------------------+|
| | [Image] | Product Name              Qty Price ||
| |  80x80  | Variant: Size M, Color   [-][2][+]  ||
| |         | $49.99 each                $99.98   ||
| |         | [Remove] [Save for Later]           ||
| +-----------------------------------------------+|
| +-----------------------------------------------+|
| | [Image] | Product Name              [-][1][+] ||
| |  80x80  | $29.99                      $29.99  ||
| +-----------------------------------------------+|
+--------------------------------------------------+
| [Continue Shopping]                              |
|                                                  |
|                          Subtotal:      $129.97  |
|                          Shipping:    Calculated |
|                          Discount Code: [____]   |
|                          ----------------------  |
|                          TOTAL:         $129.97  |
|                                                  |
|               [PROCEED TO CHECKOUT]              |
|               Apple Pay | Google Pay | PayPal    |
+--------------------------------------------------+
```

**Features:**
- Line item display with thumbnails
- Inline quantity adjusters
- Remove/Save for later actions
- Discount code input
- Order summary sidebar
- Express checkout buttons

**Best for:** Post-selection review, upsell opportunities

---

### 3. **Product Display Page (PDP)** (NEW)
Single product focus page (Shopify product page inspired).

```
+--------------------------------------------------+
| [< Back to Products]                             |
+--------------------------------------------------+
| +-------------------+ +-------------------------+|
| |                   | | Product Name            ||
| |  [Main Image]     | | ★★★★☆ (247 reviews)    ||
| |                   | |                         ||
| |                   | | $49.99  $69.99  -29%    ||
| +-------------------+ |                         ||
| [◉][○][○][○]         | Size: [S] [M] [L] [XL]  ||
|                       | Color: [●][●][●]        ||
|                       |                         ||
|                       | Qty: [-] [1] [+]        ||
|                       |                         ||
|                       | [===ADD TO CART===]     ||
|                       | [♡ Add to Wishlist]     ||
|                       |                         ||
|                       | ✓ Free shipping $50+    ||
|                       | ✓ 30-day returns        ||
|                       | ✓ Secure checkout       ||
+--------------------------------------------------+
| DESCRIPTION | REVIEWS | SHIPPING                 |
+--------------------------------------------------+
| Product description text...                      |
| • Feature 1                                      |
| • Feature 2                                      |
| • Feature 3                                      |
+--------------------------------------------------+
| CUSTOMERS ALSO BOUGHT                            |
| +------+ +------+ +------+ +------+             |
| | Prod | | Prod | | Prod | | Prod |             |
| +------+ +------+ +------+ +------+             |
+--------------------------------------------------+
```

**Features:**
- Large image gallery with zoom
- Variant selectors (size, color)
- Quantity picker
- Trust badges
- Tabbed content (description, reviews, shipping)
- "Also bought" recommendations

**Best for:** Single/hero product funnels, detailed products

---

### 4. **Comparison Grid** (NEW)
Side-by-side product comparison (Best Buy, B2B inspired).

```
+--------------------------------------------------+
| COMPARE PRODUCTS                    [Clear All]  |
+--------------------------------------------------+
|              | Product A  | Product B  | Prod C |
+--------------+------------+------------+--------|
| Image        | [Image]    | [Image]    | [Image]|
| Price        | $49.99     | $79.99     | $99.99 |
| Rating       | ★★★★☆     | ★★★★★     | ★★★☆☆ |
+--------------+------------+------------+--------|
| Size         | 10" x 8"   | 12" x 10"  | 14" x 12"|
| Weight       | 2.5 lbs    | 3.2 lbs    | 4.1 lbs|
| Material     | Aluminum   | Steel      | Titanium|
| Warranty     | 1 year     | 2 years    | 3 years|
+--------------+------------+------------+--------|
| [Add]        | [Add]      | [Add]      | [Add]  |
+--------------------------------------------------+
```

**Best for:** Technical products, B2B, considered purchases

---

### 5. **Quick Shop Carousel** (NEW)
Mobile-optimized horizontal scroll (Instagram Shop inspired).

```
+--------------------------------------------------+
|  < SHOP OUR BESTSELLERS >                        |
+--------------------------------------------------+
| +--------+   +--------+   +--------+   +--       |
| | Image  |   | Image  |   | Image  |   |        |
| |        |   |        |   |        |   |        |
| | Name   |   | Name   |   | Name   |   |        |
| | $49.99 |   | $49.99 |   | $49.99 |   |        |
| |[+Add]  |   |[+Add]  |   |[+Add]  |   |        |
| +--------+   +--------+   +--------+   +--       |
|                                          ← →     |
+--------------------------------------------------+
|      Swipe to browse • Tap to quick add          |
+--------------------------------------------------+
```

**Best for:** Mobile-first, impulse purchases, Instagram traffic

---

### 6. **Bundle Builder** (NEW)
Interactive bundle creation (Dollar Shave Club inspired).

```
+--------------------------------------------------+
| BUILD YOUR BUNDLE                    Save 25%!   |
+--------------------------------------------------+
| STEP 1: Choose your base product                 |
| +--------+  +--------+  +--------+               |
| |[●]Prod |  |[ ]Prod |  |[ ]Prod |               |
| +--------+  +--------+  +--------+               |
+--------------------------------------------------+
| STEP 2: Add 2-4 extras                           |
| +------+ +------+ +------+ +------+ +------+    |
| |[✓]   | |[✓]   | |[ ]   | |[ ]   | |[ ]   |    |
| | $10  | | $15  | | $12  | | $8   | | $20  |    |
| +------+ +------+ +------+ +------+ +------+    |
+--------------------------------------------------+
| YOUR BUNDLE SUMMARY                              |
| Base Product.................. $49.99            |
| Extra 1....................... $10.00            |
| Extra 2....................... $15.00            |
| -----------------------------------------        |
| If purchased separately: $74.99                  |
| YOUR BUNDLE PRICE: $56.24 (SAVE $18.75!)         |
|                                                  |
|        [GET MY BUNDLE - $56.24]                  |
+--------------------------------------------------+
```

**Best for:** Subscription boxes, customizable products, AOV boost

---

## Feature Matrix

| Feature | Grid | Cart | PDP | Compare | Carousel | Bundle |
|---------|------|------|-----|---------|----------|--------|
| Multiple products | ✓ | ✓ | ○ | ✓ | ✓ | ✓ |
| Single focus | ○ | ○ | ✓ | ○ | ○ | ○ |
| Image gallery | ○ | ○ | ✓ | ○ | ○ | ○ |
| Variant selector | △ | ✓ | ✓ | ○ | ○ | ✓ |
| Quantity adjust | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| Price comparison | △ | ○ | ✓ | ✓ | ○ | ✓ |
| Reviews | ○ | ○ | ✓ | △ | ○ | ○ |
| Recommendations | ○ | ✓ | ✓ | ○ | ○ | ○ |
| Discount code | ○ | ✓ | ○ | ○ | ○ | ○ |
| Express checkout | ○ | ✓ | ○ | ○ | ○ | ○ |
| Mobile optimized | △ | △ | ✓ | △ | ✓ | ✓ |
| One-tap add | ✓ | ○ | ✓ | ○ | ✓ | ○ |

✓ = Full support | △ = Partial | ○ = Not applicable

---

## Conversion Enhancements (All Page Types)

### Social Proof Layer
- ★ Star ratings with review count
- "X bought this week" purchase velocity
- "Y people viewing now" live indicator
- Customer photo gallery (UGC)
- Verified purchase badges

### Trust Signals
- Free shipping threshold indicator
- Return policy badge
- Secure checkout icon
- Payment method logos
- Guarantee/warranty badge

### Urgency Elements (Optional)
- Countdown timer for deals
- Low stock indicator
- Cart reservation timer
- Session-specific discount

### Smart Features
- Recently viewed products
- "Complete the look" recommendations
- Dynamic bundle suggestions
- Personalized product sorting
- Wishlist/save for later

---

## Implementation Priority

### Phase 1 (MVP)
1. ✅ Product Grid (current) - enhance with social proof
2. 🆕 Shopping Cart Style - for pre-checkout review
3. 🆕 Product Display Page - for single product funnels

### Phase 2
4. Quick Shop Carousel - for mobile optimization
5. Comparison Grid - for B2B/technical products

### Phase 3
6. Bundle Builder - for subscription/AOV optimization

---

## Technical Configuration

```typescript
interface ProductSelectionConfig {
  // Page type selector
  pageType: 'grid' | 'cart' | 'pdp' | 'compare' | 'carousel' | 'bundle';

  // Layout options per type
  layout: {
    grid: { columns: 2 | 3 | 4; cardStyle: 'minimal' | 'detailed' };
    cart: { showRecommendations: boolean; showDiscountCode: boolean };
    pdp: { galleryPosition: 'left' | 'right'; showTabs: boolean };
    compare: { maxItems: 2 | 3 | 4; attributes: string[] };
    carousel: { autoScroll: boolean; itemsVisible: number };
    bundle: { steps: number; discountPercentage: number };
  };

  // Social proof
  socialProof: {
    showRatings: boolean;
    showPurchaseCount: boolean;
    showLiveViewers: boolean;
    showUGC: boolean;
  };

  // Trust signals
  trustSignals: {
    freeShipping: { enabled: boolean; threshold: number };
    returnPolicy: string;
    secureCheckout: boolean;
    guaranteeBadge: string;
  };

  // Urgency (optional)
  urgency: {
    countdown: { enabled: boolean; endTime: Date };
    stockLevel: { enabled: boolean; threshold: number };
    cartReservation: { enabled: boolean; minutes: number };
  };
}
```

---

## Recommended Combinations by Funnel Type

| Funnel Type | Recommended Flow |
|-------------|------------------|
| **Single Product** | Landing → PDP → Checkout |
| **Small Catalog (<10)** | Landing → Grid → Checkout |
| **Large Catalog (10+)** | Landing → Grid (filtered) → Cart → Checkout |
| **Subscription Box** | Landing → Bundle Builder → Checkout |
| **Flash Sale** | Landing → Carousel (urgency) → Checkout |
| **B2B/Technical** | Landing → Compare → PDP → Cart → Checkout |
| **Impulse/Mobile** | Carousel → Quick Checkout |

---

*Last Updated: December 31, 2025*
