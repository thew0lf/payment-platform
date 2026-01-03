# Multi-Site E-Commerce Architecture Specification

**Version:** 1.0
**Last Updated:** December 31, 2025
**Authors:** Head of Design, CMO, Product Manager
**Status:** Draft Specification

---

## Executive Summary

This specification defines a comprehensive multi-site e-commerce architecture that enables merchants to operate multiple sites with distinct purposes under a single company account. Each site type serves a specific business function while sharing core resources (products, customers, orders, inventory).

### Business Architecture Example

For client "startup@tandgconsulting.com":

| Site | Domain | Type | Purpose |
|------|--------|------|---------|
| **Always 305** | always305.com | Storefront | Traditional e-commerce (Shopify-style) |
| **Is It 305** | isit305.com | Funnel | Conversion-optimized landing/sales flows |
| **Try Is It 305** | try.isit305.com | Trial | Lead capture, free trial, freemium flows |

---

## Part 1: Site Type Definitions

### 1.1 Storefront Site

**Purpose:** Full-featured e-commerce shopping experience for browsing and purchasing products.

**Inspired by:** Shopify, BigCommerce, Amazon

**Key Characteristics:**
- Multi-product browsing experience
- Category navigation with filters
- Shopping cart persistence
- Customer accounts with order history
- SEO-optimized for organic discovery
- Supports upsells, cross-sells, recommendations

**Primary User Journey:**
```
Homepage → Browse/Search → Category/Collection → PDP → Cart → Checkout → Account
```

**Use Cases:**
- General retail storefronts
- Catalog browsing
- Returning customer purchases
- Gift purchases
- B2B ordering portals

---

### 1.2 Funnel Site

**Purpose:** Conversion-optimized flows that guide visitors through a predetermined path to purchase.

**Inspired by:** ClickFunnels, Leadpages, direct-response marketing

**Key Characteristics:**
- Single-path user journey (no distractions)
- Landing page → Product → Checkout flow
- Limited navigation (progress bar only)
- Optimized for paid traffic (Facebook, Google Ads)
- Exit-intent interventions
- A/B testing built-in

**Primary User Journey:**
```
Landing Page → Product Selection → Checkout → Upsell/Downsell → Thank You
```

**Use Cases:**
- Product launches
- Flash sales
- Subscription offers
- High-ticket item sales
- Affiliate/influencer campaigns

---

### 1.3 Trial Site

**Purpose:** Lead generation and trial/freemium customer acquisition.

**Inspired by:** SaaS trial flows, sample/demo programs, newsletter signups

**Key Characteristics:**
- Lead capture focused (email-first)
- Free trial or sample offerings
- Progressive profiling (collect data over time)
- Nurture sequence integration
- Low-friction entry points
- Gamification elements (referrals, waitlists)

**Primary User Journey:**
```
Landing → Email Capture → Progressive Profile → Trial Activation → Conversion Offer
```

**Use Cases:**
- Product samples
- Free trial programs
- Waitlist/early access
- Newsletter subscriptions
- Referral programs
- Freemium-to-paid conversion

---

## Part 2: Page Types by Site Type

### 2.1 Complete Page Type Matrix

| Page Type | Storefront | Funnel | Trial | Description |
|-----------|------------|--------|-------|-------------|
| **Homepage** | Required | - | Optional | Main entry point with featured products |
| **Product Grid** | Required | Optional | - | Browsable product catalog |
| **Product Display (PDP)** | Required | Required | Optional | Detailed product view |
| **Shopping Cart** | Required | - | - | Persistent cart management |
| **Collection Page** | Required | - | - | Category/collection browsing |
| **Search Results** | Required | - | - | Product search results |
| **Landing Page** | Optional | Required | Required | Conversion-focused entry page |
| **Checkout** | Required | Required | Optional | Payment processing |
| **Bundle Builder** | Optional | Optional | - | Interactive bundle creation |
| **Comparison Grid** | Optional | Optional | - | Side-by-side comparison |
| **Quick Shop Carousel** | Optional | Optional | - | Mobile swipe shopping |
| **Lead Capture Form** | Optional | - | Required | Email/info collection |
| **Trial Signup** | - | - | Required | Free trial activation |
| **Waitlist Page** | Optional | Optional | Required | Waitlist/early access |
| **Account Dashboard** | Required | Optional | Optional | Customer portal |
| **Order History** | Required | Optional | - | Past orders view |
| **Wishlist** | Optional | - | - | Saved items |
| **Thank You Page** | Required | Required | Required | Post-conversion confirmation |
| **Upsell Page** | Optional | Required | - | Post-purchase offers |
| **Downsell Page** | - | Required | - | Alternative offer |
| **Blog/Content** | Optional | - | Optional | Content marketing |

### 2.2 Page Type Definitions

#### 2.2.1 Product Grid Page

**Purpose:** Browse multiple products in a catalog layout

**Configuration Options:**
```typescript
interface ProductGridConfig {
  layout: {
    columns: 2 | 3 | 4;
    cardStyle: 'minimal' | 'detailed' | 'image-focus';
    itemsPerPage: number;
    infiniteScroll: boolean;
  };
  filters: {
    enabled: boolean;
    position: 'sidebar' | 'top' | 'drawer';
    options: ('price' | 'category' | 'tags' | 'availability' | 'rating')[];
  };
  sorting: {
    enabled: boolean;
    options: ('featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating')[];
    default: string;
  };
  quickView: boolean;
  quickAdd: boolean;
}
```

**Site Type Usage:**
- **Storefront:** Primary catalog experience with full filtering/sorting
- **Funnel:** Simplified grid for curated products (limited filtering)

---

#### 2.2.2 Product Display Page (PDP)

**Purpose:** Showcase a single product with full details and purchase options

**Configuration Options:**
```typescript
interface ProductDisplayConfig {
  layout: 'classic' | 'gallery-focus' | 'video-hero' | 'storytelling';
  imageGallery: {
    position: 'left' | 'right' | 'top';
    thumbnailPosition: 'bottom' | 'side';
    zoom: 'hover' | 'click' | 'lightbox';
    video: boolean;
    ar: boolean; // Augmented reality
  };
  variantSelector: {
    style: 'dropdown' | 'buttons' | 'swatches';
    showInventory: boolean;
    lowStockThreshold: number;
  };
  sections: {
    description: { tabbed: boolean };
    reviews: { enabled: boolean; summary: boolean };
    specifications: { enabled: boolean };
    shipping: { enabled: boolean };
    warranty: { enabled: boolean };
  };
  relatedProducts: {
    enabled: boolean;
    type: 'also-bought' | 'similar' | 'recently-viewed' | 'manual';
    count: number;
  };
  trustElements: {
    badges: string[];
    guarantee: string;
    reviews: boolean;
  };
}
```

**Site Type Usage:**
- **Storefront:** Full PDP with all sections, navigation to related products
- **Funnel:** Focused PDP with minimal distractions, strong CTA
- **Trial:** Sample/trial-focused PDP with "Try Free" CTA

---

#### 2.2.3 Shopping Cart Page

**Purpose:** Manage selected items before checkout

**Configuration Options:**
```typescript
interface ShoppingCartConfig {
  layout: 'full-page' | 'drawer' | 'modal' | 'mini-cart';
  features: {
    quantityAdjust: boolean;
    removeItem: boolean;
    saveForLater: boolean;
    moveToWishlist: boolean;
    estimateShipping: boolean;
    discountCode: boolean;
    giftOptions: boolean;
  };
  upsells: {
    enabled: boolean;
    position: 'above-total' | 'below-items' | 'sidebar';
    type: 'frequently-bought' | 'threshold-unlock' | 'bundle-suggest';
  };
  expressCheckout: {
    applePay: boolean;
    googlePay: boolean;
    paypal: boolean;
    shopPay: boolean;
  };
  orderSummary: {
    showTax: boolean;
    showShipping: boolean;
    showSavings: boolean;
  };
}
```

**Site Type Usage:**
- **Storefront:** Full cart with all features, cross-sells, save for later
- **Funnel:** Not applicable (direct to checkout from product)
- **Trial:** Not applicable

---

#### 2.2.4 Bundle Builder Page

**Purpose:** Interactive experience to create custom product bundles

**Configuration Options:**
```typescript
interface BundleBuilderConfig {
  steps: {
    id: string;
    name: string;
    selectionType: 'single' | 'multiple';
    required: boolean;
    minItems?: number;
    maxItems?: number;
    products: string[]; // Product IDs available for this step
  }[];
  pricing: {
    showIndividualPrices: boolean;
    showSavings: boolean;
    discountType: 'percentage' | 'fixed' | 'tiered';
    discountValue: number;
  };
  visualization: {
    showBundlePreview: boolean;
    animatedAdds: boolean;
    progressIndicator: boolean;
  };
}
```

**Site Type Usage:**
- **Storefront:** Subscription box builders, gift sets
- **Funnel:** High-AOV bundle offers with time pressure

---

### 2.3 Page Type to Site Type Mapping Schema

```typescript
interface SiteTypeConfig {
  siteType: 'storefront' | 'funnel' | 'trial';

  // Required pages that must be configured
  requiredPages: PageType[];

  // Optional pages that can be added
  optionalPages: PageType[];

  // Pages not available for this site type
  disabledPages: PageType[];

  // Default navigation structure
  defaultNavigation: NavigationConfig;

  // Site-specific settings
  siteSettings: SiteSettings;
}

const SITE_TYPE_CONFIGS: Record<string, SiteTypeConfig> = {
  storefront: {
    siteType: 'storefront',
    requiredPages: ['homepage', 'product-grid', 'pdp', 'cart', 'checkout', 'thank-you'],
    optionalPages: ['collection', 'search', 'bundle-builder', 'comparison', 'account', 'wishlist', 'blog'],
    disabledPages: ['downsell', 'waitlist'],
    defaultNavigation: {
      header: true,
      footer: true,
      breadcrumbs: true,
      search: true,
      cart: true,
      account: true,
    },
    siteSettings: {
      persistentCart: true,
      customerAccounts: true,
      seoOptimized: true,
      exitIntent: false,
    },
  },
  funnel: {
    siteType: 'funnel',
    requiredPages: ['landing', 'checkout', 'thank-you'],
    optionalPages: ['pdp', 'product-grid', 'upsell', 'downsell', 'bundle-builder'],
    disabledPages: ['homepage', 'cart', 'collection', 'search', 'account', 'wishlist', 'blog'],
    defaultNavigation: {
      header: false,
      footer: false,
      breadcrumbs: false,
      search: false,
      cart: false,
      account: false,
      progressBar: true,
    },
    siteSettings: {
      persistentCart: false,
      customerAccounts: false,
      seoOptimized: false,
      exitIntent: true,
      abTesting: true,
    },
  },
  trial: {
    siteType: 'trial',
    requiredPages: ['landing', 'lead-capture', 'trial-signup', 'thank-you'],
    optionalPages: ['pdp', 'waitlist', 'account'],
    disabledPages: ['cart', 'collection', 'search', 'upsell', 'downsell', 'bundle-builder'],
    defaultNavigation: {
      header: true,
      footer: true,
      breadcrumbs: false,
      search: false,
      cart: false,
      account: true,
    },
    siteSettings: {
      persistentCart: false,
      customerAccounts: true,
      seoOptimized: true,
      exitIntent: true,
      progressiveProfileEnabled: true,
    },
  },
};
```

---

## Part 3: Design System (Head of Design)

### 3.1 Visual Consistency Across Site Types

**Design Philosophy:**
All sites within a company share the same Brand Kit foundation while allowing site-specific customization layers. This ensures brand cohesion while optimizing each site for its purpose.

#### 3.1.1 Design Token Hierarchy

```
Company Brand Kit (Base Layer)
    ├── Storefront Theme (Extended)
    │   ├── Homepage Customization
    │   ├── Category Page Customization
    │   └── PDP Customization
    ├── Funnel Theme (Focused)
    │   ├── Landing Customization
    │   └── Checkout Customization
    └── Trial Theme (Welcoming)
        ├── Lead Capture Customization
        └── Trial Activation Customization
```

#### 3.1.2 Brand Kit Integration

```typescript
interface SiteBrandKit extends BrandKit {
  // Inherit from company Brand Kit
  base: BrandKit;

  // Site-specific overrides
  overrides: {
    // Optional: Override specific colors for this site
    colors?: Partial<BrandKitColors>;
    // Optional: Different logo for this site
    logos?: Partial<BrandKitLogo>;
    // Optional: Different typography for this site
    typography?: Partial<BrandKitTypography>;
  };

  // Site-specific additions
  siteSpecific: {
    // Site favicon (if different from company)
    favicon?: string;
    // Site-specific accent color (e.g., trial sites might be more playful)
    siteAccent?: string;
    // Social proof color scheme
    socialProofStyle?: 'minimal' | 'bold' | 'playful';
  };
}
```

### 3.2 Component Library Requirements

#### 3.2.1 Shared Components (All Site Types)

| Component | Description | Variants |
|-----------|-------------|----------|
| Button | Primary action button | primary, secondary, ghost, destructive |
| Input | Form input field | text, email, password, number, tel |
| Select | Dropdown selection | single, multi, searchable |
| Card | Content container | product, feature, testimonial, pricing |
| Badge | Status/category indicator | color variants, size variants |
| Modal | Dialog overlay | sizes: sm, md, lg, full |
| Toast | Notification | success, error, warning, info |
| Skeleton | Loading placeholder | line, circle, rectangle |
| Image | Optimized image | lazy, priority, blur placeholder |
| Icon | SVG icon system | Heroicons set |

#### 3.2.2 Site Type Specific Components

**Storefront Components:**

| Component | Purpose |
|-----------|---------|
| HeaderNavigation | Full nav with search, cart, account |
| MegaMenu | Category navigation dropdown |
| ProductCard | Grid item with quick-add |
| FilterSidebar | Category/attribute filters |
| CartDrawer | Slide-out mini cart |
| Breadcrumbs | Navigation path |
| AccountNav | Customer account sidebar |
| FooterFull | Complete footer with links |

**Funnel Components:**

| Component | Purpose |
|-----------|---------|
| ProgressBar | Step indicator |
| CountdownTimer | Urgency timer |
| StockIndicator | Scarcity display |
| SocialProofPopup | Recent purchase notification |
| ExitIntentModal | Abandonment prevention |
| UpsellCard | Post-purchase offer |
| TrustBadgeRow | Security/guarantee badges |
| MinimalFooter | Legal links only |

**Trial Components:**

| Component | Purpose |
|-----------|---------|
| LeadCaptureForm | Email/name capture |
| ProgressiveForm | Multi-step data collection |
| WaitlistCounter | Live waitlist position |
| ReferralWidget | Share-for-benefits |
| TrialProgress | Days remaining display |
| ActivationChecklist | Onboarding steps |

### 3.3 Responsive Design Patterns

#### 3.3.1 Breakpoint System

```scss
// Shared across all site types
$breakpoints: (
  'mobile': 0,        // 0-639px
  'tablet': 640px,    // 640-1023px
  'desktop': 1024px,  // 1024-1279px
  'large': 1280px,    // 1280-1535px
  'xlarge': 1536px    // 1536px+
);
```

#### 3.3.2 Mobile-First Principles

| Priority | Pattern | Implementation |
|----------|---------|----------------|
| 1 | Touch targets | Minimum 44x44px for all interactive elements |
| 2 | Thumb zone | Primary actions in bottom 1/3 of screen |
| 3 | Swipe gestures | Carousel, drawer, dismiss patterns |
| 4 | Progressive disclosure | Hide complexity behind taps |
| 5 | Fast loading | Critical CSS, lazy images, skeleton states |

#### 3.3.3 Site Type Mobile Adaptations

**Storefront Mobile:**
- Bottom tab navigation
- Sticky cart button
- Filter as full-screen drawer
- Swipeable product images
- Collapsible accordions for details

**Funnel Mobile:**
- Sticky CTA button
- Collapsible product details
- Phone-optimized forms
- Full-screen checkout
- Bottom-sheet modals

**Trial Mobile:**
- Single-field forms
- Large tap targets
- Minimal scrolling
- Clear progress indicators
- App-like experience

### 3.4 Accessibility Standards (WCAG 2.1 AA)

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Color Contrast | 4.5:1 minimum | Automated testing in design system |
| Focus States | Visible focus rings | Custom focus styles with brand colors |
| Keyboard Navigation | Full keyboard access | Tab order, arrow keys, escape |
| Screen Reader | Semantic HTML | Proper headings, labels, ARIA |
| Motion | Reduce motion support | `prefers-reduced-motion` |
| Touch Targets | 44px minimum | Applied to all buttons, links |
| Form Labels | Associated labels | `for` attribute or implicit |
| Error States | Clear identification | Color + icon + text |

---

## Part 4: Conversion Strategy (CMO)

### 4.1 Conversion Tactics by Site Type

#### 4.1.1 Storefront Conversion Strategy

**Primary Goal:** Maximize customer lifetime value through repeat purchases

**Conversion Funnel:**
```
Awareness → Interest → Desire → Action → Loyalty
```

**Key Tactics:**

| Stage | Tactic | Implementation |
|-------|--------|----------------|
| Awareness | SEO/Content | Blog, product descriptions, meta optimization |
| Interest | Social Proof | Reviews, ratings, "X bought this" |
| Desire | Personalization | Recently viewed, recommended for you |
| Action | Cart Optimization | Free shipping threshold, bundle savings |
| Loyalty | Account Benefits | Points, early access, member pricing |

**Conversion Elements Placement:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Free shipping threshold bar                 │
├─────────────────────────────────────────────────────┤
│ HOMEPAGE                                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│ │ Hero Banner │ │ Collections │ │ Featured Prods  │ │
│ │ (seasonal)  │ │ (3-4 items) │ │ (social proof)  │ │
│ └─────────────┘ └─────────────┘ └─────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Trust Badges: Shipping | Returns | Secure       │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ PRODUCT PAGE                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ★★★★☆ (247 reviews)  ·  500+ bought this week  │ │
│ │ [Product Images]     Price + Variant Selector   │ │
│ │                      [LOW STOCK: Only 3 left!]  │ │
│ │                      [ADD TO CART]              │ │
│ │                      ✓ Free shipping on $50+    │ │
│ │                      ✓ 30-day easy returns      │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ CART (Drawer/Page)                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Items in cart                                   │ │
│ │ ADD $15 MORE FOR FREE SHIPPING! [progress bar] │ │
│ │ Frequently bought together: [product] [product] │ │
│ │ [CHECKOUT] | Apple Pay | Google Pay            │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

#### 4.1.2 Funnel Conversion Strategy

**Primary Goal:** Maximize conversion rate from paid traffic

**Conversion Funnel:**
```
Click → Land → Engage → Convert → Maximize (Upsells)
```

**Key Tactics:**

| Stage | Tactic | Implementation |
|-------|--------|----------------|
| Click | Ad-to-page match | Consistent messaging, same offer |
| Land | Above-fold hook | Strong headline, social proof, CTA visible |
| Engage | Story-driven scroll | Benefits, testimonials, objection handling |
| Convert | Friction reduction | Minimal fields, express checkout |
| Maximize | Smart upsells | Relevant one-click offers |

**Conversion Elements Placement:**

```
┌─────────────────────────────────────────────────────┐
│ LANDING PAGE                                        │
├─────────────────────────────────────────────────────┤
│ [URGENCY BAR: "Sale ends in 02:45:32"]             │
├─────────────────────────────────────────────────────┤
│ HERO SECTION (Above Fold)                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ "The #1 Secret to [Desired Outcome]"            │ │
│ │                                                 │ │
│ │ ★★★★★ "Changed my life!" - Verified Customer   │ │
│ │                                                 │ │
│ │ [Product Image/Video]                           │ │
│ │                                                 │ │
│ │ Was $99 → NOW $49 (50% OFF)                     │ │
│ │                                                 │ │
│ │ [==== GET YOURS NOW ====]                       │ │
│ │                                                 │ │
│ │ 🔒 30-Day Money Back Guarantee                  │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ BELOW FOLD - Progressive Revelation                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Problem → Solution → Proof → Offer              │ │
│ │ • Pain point identification                     │ │
│ │ • How our product solves it                     │ │
│ │ • Testimonials + Before/After                   │ │
│ │ • Features + Benefits                           │ │
│ │ • FAQ (objection handling)                      │ │
│ │ • Final CTA with guarantee                      │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ EXIT INTENT MODAL                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ "WAIT! Here's 10% off just for you"             │ │
│ │ [Email] [GET MY DISCOUNT]                       │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ STICKY FOOTER CTA                                   │
│ [Add to Cart - $49] ← Always visible               │
└─────────────────────────────────────────────────────┘
```

---

#### 4.1.3 Trial Conversion Strategy

**Primary Goal:** Maximize trial-to-paid conversion

**Conversion Funnel:**
```
Discover → Sign Up → Activate → Use → Convert
```

**Key Tactics:**

| Stage | Tactic | Implementation |
|-------|--------|----------------|
| Discover | Value proposition | Clear benefit statement, social proof |
| Sign Up | Low friction entry | Email-first, optional details later |
| Activate | Quick win | Immediate value delivery |
| Use | Engagement hooks | Progress, achievements, reminders |
| Convert | Upgrade triggers | Usage limits, premium features |

**Conversion Elements Placement:**

```
┌─────────────────────────────────────────────────────┐
│ TRIAL LANDING PAGE                                  │
├─────────────────────────────────────────────────────┤
│ HERO SECTION                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ "Try [Product] Free for 7 Days"                 │ │
│ │                                                 │ │
│ │ No credit card required                         │ │
│ │                                                 │ │
│ │ [Email Address]                                 │ │
│ │ [START MY FREE TRIAL]                           │ │
│ │                                                 │ │
│ │ ✓ 47,000+ happy customers                       │ │
│ │ ✓ Cancel anytime                                │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ SOCIAL PROOF SECTION                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ "Join 47,382 people who started their trial"    │ │
│ │ [Recent signups: Sarah from NYC, 2 min ago]     │ │
│ │                                                 │ │
│ │ Featured in: [Logo] [Logo] [Logo]               │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ TRIAL DASHBOARD (Post-Signup)                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Your Trial: 7 days left                         │ │
│ │ [||||||||........] 3 of 10 features used        │ │
│ │                                                 │ │
│ │ Complete setup for bonus: [Checklist]           │ │
│ │                                                 │ │
│ │ [UPGRADE NOW - Save 20%]                        │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

### 4.2 Social Proof Placement Strategy

#### 4.2.1 Social Proof Types

| Type | Description | Best For |
|------|-------------|----------|
| Reviews | Star ratings + text reviews | PDPs, storefronts |
| Testimonials | Customer quotes with photos | Landing pages, funnels |
| Purchase Velocity | "X bought this week" | PDPs, urgency |
| Live Activity | "Y viewing now" | Scarcity, FOMO |
| User Count | "Join 10,000+ customers" | Trial signups |
| Recent Activity | "Sarah from NYC just purchased" | Funnels, trials |
| Media Logos | "Featured in Forbes, TechCrunch" | Trust, trials |
| Certification | Industry badges, awards | Trust, storefronts |

#### 4.2.2 Placement by Site Type

**Storefront:**
```
Header: Trust badges (shipping, returns)
Homepage: Featured testimonials, press logos
Product Grid: Star ratings on cards
PDP: Full reviews section, purchase velocity
Cart: "Others also bought" + trust badges
Checkout: Security badges, guarantee
```

**Funnel:**
```
Landing (above fold): Star rating + review count
Landing (scroll): Full testimonials with photos
Product: "X people bought in last hour"
Checkout: Security badges + guarantee
Upsell: "Popular add-on" indicator
Throughout: Live purchase notifications (popup)
```

**Trial:**
```
Landing: User count, testimonials
Signup: Recent signups notification
Dashboard: Progress comparisons
Email: Success stories
Upgrade: Before/after testimonials
```

### 4.3 Urgency/Scarcity Placement

#### 4.3.1 Urgency Types

| Type | Implementation | Ethical Use |
|------|----------------|-------------|
| Time-limited sale | Real countdown to real end | Actual sale end time |
| Cart reservation | Session-based hold | Real inventory reservation |
| Stock level | Real inventory display | Actual stock count |
| Shipping cutoff | Order by X for delivery | Real shipping windows |
| Limited quantity | Per-customer limits | Actual policy |

#### 4.3.2 Placement by Site Type

**Storefront:**
- Sale countdown on product cards (if on sale)
- Stock level on PDP (if low)
- Shipping cutoff in cart
- Limited time offers in email/banner

**Funnel:**
- Urgency bar at top (countdown)
- Stock indicator on product section
- Cart reservation timer at checkout
- "X spots left" for limited offers

**Trial:**
- Early access countdown
- Waitlist position ("You're #42!")
- Trial expiration reminders
- Limited-time upgrade offers

### 4.4 Cross-Site Journey Optimization

#### 4.4.1 Customer Journey Map

```
TRIAL SITE → STOREFRONT → FUNNEL → REPEAT

[Trial]           [Storefront]         [Funnel]
Email signup  →   Explore catalog  →   Flash sale offer
Trial usage   →   First purchase   →   VIP early access
Convert to    →   Repeat customer  →   Limited edition
  paid                                   launch
```

#### 4.4.2 Cross-Site Tracking

```typescript
interface CrossSiteSession {
  visitorId: string;          // Shared across sites
  sourcesite: string;         // Origin site
  journeyStage: 'trial' | 'prospect' | 'customer' | 'vip';
  touchpoints: {
    siteId: string;
    timestamp: Date;
    action: string;
    value?: number;
  }[];
  attribution: {
    firstTouch: string;       // First site visited
    lastTouch: string;        // Most recent site
    conversionSite: string;   // Where purchase happened
  };
}
```

### 4.5 A/B Testing Strategy

#### 4.5.1 Testing Priorities by Site Type

**Storefront Testing:**
| Priority | Element | Hypothesis |
|----------|---------|------------|
| 1 | Homepage hero | Different value propositions |
| 2 | Product card layout | Image size vs info visibility |
| 3 | Filter/sort defaults | Most valuable sorting |
| 4 | Cart drawer vs page | Friction reduction |
| 5 | Checkout steps | Single vs multi-step |

**Funnel Testing:**
| Priority | Element | Hypothesis |
|----------|---------|------------|
| 1 | Headline | Different angles/hooks |
| 2 | CTA button | Text, color, placement |
| 3 | Social proof format | Reviews vs testimonials |
| 4 | Price presentation | Anchoring strategies |
| 5 | Urgency level | Timer presence/absence |

**Trial Testing:**
| Priority | Element | Hypothesis |
|----------|---------|------------|
| 1 | Form fields | Minimal vs progressive |
| 2 | Trial length | 7 vs 14 vs 30 days |
| 3 | Activation flow | Checklist vs free explore |
| 4 | Upgrade timing | Early vs late offer |
| 5 | Upgrade pricing | Discount vs value-add |

#### 4.5.2 Testing Framework

```typescript
interface ABTestConfig {
  siteTypes: ('storefront' | 'funnel' | 'trial')[];
  element: string;
  hypothesis: string;
  variants: {
    id: string;
    name: string;
    config: Record<string, unknown>;
    trafficWeight: number;
  }[];
  metrics: {
    primary: 'conversion_rate' | 'aov' | 'revenue_per_visitor';
    secondary: string[];
  };
  duration: {
    minSessions: number;
    maxDays: number;
  };
  winnerSelection: 'manual' | 'auto_95' | 'auto_99';
}
```

---

## Part 5: Product Specifications (Product Manager)

### 5.1 Data Model for Multi-Site Architecture

#### 5.1.1 Enhanced Site Model

```prisma
model Site {
  id          String      @id @default(cuid())
  companyId   String
  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)

  // Site identification
  name        String      // "Always 305"
  slug        String      // "always-305"
  code        String?     @unique // 4-char code "A305"

  // Site type (NEW)
  siteType    SiteType    @default(STOREFRONT)

  // Domain configuration
  domain      String?     @unique // always305.com
  subdomain   String?     // if using platform domain

  // Branding (inherits from company, can override)
  logo        String?
  favicon     String?
  brandKit    Json?       // SiteBrandKit - overrides

  // SEO
  metaTitle       String?
  metaDescription String?
  ogImage         String?

  // Site-specific settings
  settings    Json        @default("{}")

  // Localization
  timezone    String?
  currency    String?
  locale      String?     @default("en")

  // Status
  isDefault   Boolean     @default(false)
  status      EntityStatus @default(ACTIVE)

  // Timestamps
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Relations
  funnels     Funnel[]
  landingPages LandingPage[]
  pages       SitePage[]          // NEW: Generic pages
  navigation  SiteNavigation[]    // NEW: Navigation menus

  // Analytics (NEW)
  sessions    SiteSession[]

  // Soft delete
  deletedAt   DateTime?
  deletedBy   String?
  cascadeId   String?

  @@unique([companyId, slug])
  @@index([companyId])
  @@index([domain])
  @@index([siteType])
  @@map("sites")
}

enum SiteType {
  STOREFRONT  // Traditional e-commerce
  FUNNEL      // Conversion-focused flows
  TRIAL       // Lead gen and trials
}
```

#### 5.1.2 Site Page Model

```prisma
model SitePage {
  id          String      @id @default(cuid())
  siteId      String
  site        Site        @relation(fields: [siteId], references: [id], onDelete: Cascade)

  // Page identification
  name        String      // "Homepage", "About Us"
  slug        String      // "/" for homepage, "/about"

  // Page type
  pageType    PageType

  // Configuration (polymorphic based on pageType)
  config      Json        @default("{}")

  // SEO overrides
  metaTitle       String?
  metaDescription String?

  // Status
  status      PageStatus  @default(DRAFT)
  publishedAt DateTime?

  // Timestamps
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  createdBy   String

  @@unique([siteId, slug])
  @@index([siteId])
  @@index([pageType])
  @@map("site_pages")
}

enum PageType {
  // Storefront pages
  HOMEPAGE
  PRODUCT_GRID
  PRODUCT_DISPLAY
  COLLECTION
  CART
  CHECKOUT
  ACCOUNT
  WISHLIST
  SEARCH

  // Funnel pages
  LANDING
  UPSELL
  DOWNSELL

  // Trial pages
  LEAD_CAPTURE
  TRIAL_SIGNUP
  WAITLIST

  // Shared pages
  THANK_YOU
  BUNDLE_BUILDER
  COMPARISON
  CUSTOM
}

enum PageStatus {
  DRAFT
  PUBLISHED
  SCHEDULED
  ARCHIVED
}
```

#### 5.1.3 Site Navigation Model

```prisma
model SiteNavigation {
  id          String      @id @default(cuid())
  siteId      String
  site        Site        @relation(fields: [siteId], references: [id], onDelete: Cascade)

  // Navigation identification
  name        String      // "Main Menu", "Footer Links"
  location    NavLocation // HEADER, FOOTER, MOBILE

  // Menu items (nested structure)
  items       Json        // NavigationItem[]

  // Status
  isActive    Boolean     @default(true)

  // Timestamps
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([siteId])
  @@map("site_navigations")
}

enum NavLocation {
  HEADER
  FOOTER
  MOBILE
  SIDEBAR
}
```

### 5.2 Configuration Schema

#### 5.2.1 Site Settings Schema

```typescript
interface SiteSettings {
  // General
  general: {
    defaultLocale: string;
    supportedLocales: string[];
    defaultCurrency: string;
    supportedCurrencies: string[];
  };

  // Cart behavior (storefront only)
  cart?: {
    enabled: boolean;
    type: 'drawer' | 'page' | 'mini';
    persistSession: boolean;
    expirationHours: number;
    showQuantitySelector: boolean;
  };

  // Customer accounts
  accounts: {
    enabled: boolean;
    registrationType: 'optional' | 'required' | 'disabled';
    guestCheckout: boolean;
    socialLogin: ('google' | 'facebook' | 'apple')[];
  };

  // Checkout
  checkout: {
    type: 'single-page' | 'multi-step';
    expressCheckout: {
      applePay: boolean;
      googlePay: boolean;
      paypal: boolean;
    };
    requirePhone: boolean;
    requireShipping: boolean;
    allowGifting: boolean;
  };

  // Conversion elements
  conversion: {
    exitIntent: {
      enabled: boolean;
      delay: number;        // seconds
      offerType: 'discount' | 'email-capture' | 'reminder';
    };
    socialProof: {
      liveActivity: boolean;
      purchaseVelocity: boolean;
      stockLevel: boolean;
    };
    urgency: {
      saleCountdown: boolean;
      stockWarnings: boolean;
      cartReservation: boolean;
    };
  };

  // SEO
  seo: {
    enabled: boolean;
    sitemap: boolean;
    robotsTxt: string;
    canonicalBase: string;
    structuredData: boolean;
  };

  // Analytics
  analytics: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    tiktokPixelId?: string;
    customScripts: {
      head: string;
      body: string;
    };
  };

  // Legal
  legal: {
    termsUrl: string;
    privacyUrl: string;
    cookieConsent: boolean;
    cookieConsentType: 'banner' | 'modal';
  };
}
```

### 5.3 User Stories for Site Management

#### 5.3.1 Admin User Stories

```gherkin
Feature: Multi-Site Management

  Scenario: Create a new storefront site
    Given I am logged in as a company admin
    When I navigate to Sites management
    And I click "Create New Site"
    And I select site type "Storefront"
    And I enter site details:
      | Name        | Always 305         |
      | Domain      | always305.com      |
      | Description | Our main store     |
    And I configure storefront settings
    And I click "Create Site"
    Then a new storefront site should be created
    And default pages should be auto-generated
    And DNS verification should be initiated

  Scenario: Configure site branding
    Given I have a site "always305.com"
    When I navigate to Site Settings > Branding
    Then I should see the company Brand Kit as defaults
    And I can override specific colors for this site
    And I can upload a site-specific logo
    And changes should preview in real-time

  Scenario: Create a funnel within a site
    Given I have a site "isit305.com" of type Funnel
    When I click "Create New Funnel"
    Then the funnel should be associated with this site
    And funnel URLs should use the site's domain
    And site branding should apply to the funnel

  Scenario: Switch between sites
    Given I have multiple sites configured
    When I am in the admin dashboard
    Then I should see a site switcher in the header
    And switching sites should update the context
    And products/customers remain shared across sites
```

#### 5.3.2 Customer User Stories

```gherkin
Feature: Cross-Site Customer Experience

  Scenario: Customer discovers trial site
    Given I am a new visitor
    When I visit try.isit305.com
    Then I should see the trial landing page
    And I can sign up for a free trial
    And my account is created for the company

  Scenario: Trial customer visits main store
    Given I signed up on try.isit305.com
    When I visit always305.com
    Then I should be able to log in with my trial account
    And I should see "Welcome back" personalization
    And my trial status should be visible

  Scenario: Customer purchases from funnel
    Given I clicked a Facebook ad
    When I land on isit305.com/flash-sale
    Then I should see the funnel landing page
    And I can complete purchase without account creation
    And post-purchase, I'm invited to create account
    And that account works across all sites
```

### 5.4 Analytics Requirements

#### 5.4.1 Site-Level Analytics

```typescript
interface SiteAnalytics {
  siteId: string;
  period: 'day' | 'week' | 'month' | 'custom';

  // Traffic
  traffic: {
    sessions: number;
    uniqueVisitors: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
  };

  // Acquisition
  acquisition: {
    bySource: { source: string; sessions: number; revenue: number }[];
    byMedium: { medium: string; sessions: number; revenue: number }[];
    byCampaign: { campaign: string; sessions: number; revenue: number }[];
  };

  // Conversion
  conversion: {
    conversionRate: number;
    transactions: number;
    revenue: number;
    avgOrderValue: number;
  };

  // Site-type specific
  storefrontMetrics?: {
    productViews: number;
    addToCarts: number;
    cartAbandonRate: number;
    searchQueries: { query: string; count: number }[];
  };

  funnelMetrics?: {
    landingViews: number;
    stageProgression: { stage: string; dropoff: number }[];
    upsellAcceptRate: number;
    downsellAcceptRate: number;
  };

  trialMetrics?: {
    signups: number;
    activationRate: number;
    trialToPayRate: number;
    avgDaysToConvert: number;
  };
}
```

#### 5.4.2 Cross-Site Analytics

```typescript
interface CrossSiteAnalytics {
  companyId: string;
  period: 'day' | 'week' | 'month';

  // Overall company metrics
  overall: {
    totalRevenue: number;
    totalCustomers: number;
    avgCustomerValue: number;
  };

  // Per-site breakdown
  bySite: {
    siteId: string;
    siteName: string;
    siteType: SiteType;
    revenue: number;
    revenueShare: number;
    conversions: number;
    conversionRate: number;
  }[];

  // Cross-site journeys
  journeys: {
    path: string[];  // ["try.isit305.com", "always305.com"]
    count: number;
    avgValue: number;
    conversionRate: number;
  }[];

  // Attribution
  attribution: {
    firstTouchSite: string;
    lastTouchSite: string;
    revenue: number;
  }[];
}
```

### 5.5 MVP Scope and Roadmap

#### 5.5.1 MVP (Phase 1 - 6 weeks)

**Core Features:**
- Site model with type enum (STOREFRONT, FUNNEL, TRIAL)
- Site CRUD operations in admin
- Site switcher in dashboard
- Domain management (custom domains)
- Basic site branding (inherit + override)
- Funnel-to-site association
- Site-level analytics dashboard

**Page Types Supported:**
- Storefront: Homepage (template), Product Grid, PDP, Cart, Checkout
- Funnel: Landing, Checkout, Thank You (existing)
- Trial: Lead Capture, Thank You

**Not in MVP:**
- Bundle Builder
- Comparison Grid
- Customer accounts across sites
- A/B testing at site level
- Advanced navigation builder

#### 5.5.2 Phase 2 (4 weeks after MVP)

**Enhanced Features:**
- Full navigation builder
- Customer account linking across sites
- Cross-site analytics
- Site-level A/B testing
- Collection/category pages
- Search functionality (storefront)

**New Page Types:**
- Bundle Builder
- Wishlist
- Account pages
- Upsell/Downsell pages

#### 5.5.3 Phase 3 (4 weeks after Phase 2)

**Advanced Features:**
- Comparison Grid page type
- Progressive profiling (trial)
- Cross-site journey tracking
- Personalization engine
- Multi-currency per site
- Multi-language per site

**Integrations:**
- Google Analytics 4
- Facebook Pixel
- TikTok Pixel
- Klaviyo integration

---

## Part 6: Technical Architecture

### 6.1 Domain/Subdomain Routing

#### 6.1.1 DNS Configuration

```
Company: T&G Consulting
├── always305.com → Site ID: site_abc123 (STOREFRONT)
├── isit305.com → Site ID: site_def456 (FUNNEL)
└── try.isit305.com → Site ID: site_ghi789 (TRIAL)
```

**DNS Record Types:**
```
# Custom domain (fully owned)
always305.com     A     → Load Balancer IP
www.always305.com CNAME → always305.com

# Custom subdomain
try.isit305.com   CNAME → sites.avnz.io

# Platform subdomain (for initial setup)
always305.avnz.io CNAME → sites.avnz.io
```

#### 6.1.2 Request Routing Flow

```
Request: https://always305.com/products/coffee-blend

1. CDN/Edge (CloudFront)
   ├── Check domain → always305.com
   └── Route to company-portal app

2. Company Portal (Next.js)
   ├── Middleware: Extract domain
   ├── Lookup: domain → siteId
   ├── Set: siteContext in request
   └── Route to appropriate page component

3. Page Component
   ├── Fetch site config (cached)
   ├── Apply site branding
   └── Render appropriate layout
```

#### 6.1.3 Routing Implementation

```typescript
// apps/company-portal/middleware.ts

import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const path = request.nextUrl.pathname;

  // Lookup site by domain
  const site = await getSiteByDomain(hostname);

  if (!site) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // Add site context to headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-site-id', site.id);
  response.headers.set('x-site-type', site.siteType);
  response.headers.set('x-company-id', site.companyId);

  // Route based on site type and path
  return routeForSiteType(site, path, response);
}

async function routeForSiteType(site: Site, path: string, response: NextResponse) {
  switch (site.siteType) {
    case 'STOREFRONT':
      // Storefront paths: /, /products, /collections, /cart, /checkout
      return handleStorefrontRoute(site, path, response);

    case 'FUNNEL':
      // Funnel paths: /f/{shortId}, /checkout, /upsell, /thank-you
      return handleFunnelRoute(site, path, response);

    case 'TRIAL':
      // Trial paths: /, /signup, /dashboard, /upgrade
      return handleTrialRoute(site, path, response);

    default:
      return response;
  }
}
```

### 6.2 Shared vs Site-Specific Components

#### 6.2.1 Component Architecture

```
apps/company-portal/src/
├── components/
│   ├── shared/           # Used across all site types
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Image.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   │
│   ├── storefront/       # Storefront-specific
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── FilterSidebar.tsx
│   │   └── ...
│   │
│   ├── funnel/           # Funnel-specific
│   │   ├── ProgressBar.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── ExitIntentModal.tsx
│   │   ├── UpsellCard.tsx
│   │   └── ...
│   │
│   ├── trial/            # Trial-specific
│   │   ├── LeadCaptureForm.tsx
│   │   ├── TrialProgress.tsx
│   │   ├── WaitlistCounter.tsx
│   │   └── ...
│   │
│   └── layouts/          # Layout wrappers
│       ├── StorefrontLayout.tsx
│       ├── FunnelLayout.tsx
│       └── TrialLayout.tsx
```

#### 6.2.2 Layout Selection

```typescript
// apps/company-portal/src/app/layout.tsx

import { useSiteContext } from '@/contexts/site-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { site } = useSiteContext();

  const Layout = getLayoutForSiteType(site.siteType);

  return (
    <html lang={site.locale || 'en'}>
      <head>
        <SiteMeta site={site} />
        <SiteBranding brandKit={site.brandKit} />
      </head>
      <body>
        <Layout site={site}>
          {children}
        </Layout>
      </body>
    </html>
  );
}

function getLayoutForSiteType(siteType: SiteType) {
  switch (siteType) {
    case 'STOREFRONT':
      return StorefrontLayout;
    case 'FUNNEL':
      return FunnelLayout;
    case 'TRIAL':
      return TrialLayout;
    default:
      return StorefrontLayout;
  }
}
```

### 6.3 Brand Kit Inheritance

#### 6.3.1 Brand Kit Resolution

```typescript
/**
 * Resolve brand kit for a site by merging:
 * 1. Company default Brand Kit (base)
 * 2. Site-specific overrides (if any)
 */
function resolveSiteBrandKit(company: Company, site: Site): BrandKit {
  const companyBrandKit = company.settings?.brandKit as BrandKit || getDefaultBrandKit();
  const siteOverrides = site.brandKit as Partial<BrandKit> || {};

  return {
    logos: {
      ...companyBrandKit.logos,
      ...siteOverrides.logos,
    },
    colors: {
      ...companyBrandKit.colors,
      ...siteOverrides.colors,
    },
    typography: {
      ...companyBrandKit.typography,
      ...siteOverrides.typography,
    },
    faviconUrl: siteOverrides.faviconUrl || companyBrandKit.faviconUrl,
    preset: siteOverrides.preset || companyBrandKit.preset,
  };
}
```

#### 6.3.2 CSS Custom Properties

```typescript
// Generate CSS custom properties from Brand Kit
function generateCSSVariables(brandKit: BrandKit): string {
  return `
    :root {
      /* Colors */
      --color-primary: ${brandKit.colors.primary};
      --color-secondary: ${brandKit.colors.secondary || brandKit.colors.primary};
      --color-accent: ${brandKit.colors.accent || brandKit.colors.primary};
      --color-background: ${brandKit.colors.background || '#ffffff'};
      --color-text: ${brandKit.colors.text || '#1f2937'};
      --color-success: ${brandKit.colors.success || '#10b981'};
      --color-warning: ${brandKit.colors.warning || '#f59e0b'};
      --color-error: ${brandKit.colors.error || '#ef4444'};

      /* Typography */
      --font-heading: ${brandKit.typography.headingFont || 'Inter'}, sans-serif;
      --font-body: ${brandKit.typography.bodyFont || 'Inter'}, sans-serif;
      --font-size-base: ${brandKit.typography.baseFontSize || 16}px;
      --heading-scale: ${brandKit.typography.headingScale || 1.25};
    }
  `;
}
```

### 6.4 Session Handling Across Sites

#### 6.4.1 Shared Customer Identity

```typescript
interface CrossSiteSession {
  // Shared identity
  visitorId: string;          // First-party cookie (per company domain group)
  customerId?: string;        // If logged in

  // Site-specific context
  currentSiteId: string;
  currentSiteType: SiteType;

  // Cart (storefront only, shared across storefronts)
  cart?: {
    items: CartItem[];
    updatedAt: Date;
  };

  // Funnel session (funnel sites only)
  funnelSession?: {
    funnelId: string;
    sessionToken: string;
    currentStage: number;
  };

  // Trial progress (trial sites only)
  trialSession?: {
    trialId: string;
    daysRemaining: number;
    activationStatus: string;
  };

  // Analytics
  firstTouchSite: string;
  touchpoints: {
    siteId: string;
    timestamp: Date;
    action: string;
  }[];
}
```

#### 6.4.2 Cookie Strategy

```typescript
// Cookie configuration for cross-site sessions
const COOKIE_CONFIG = {
  // First-party visitor ID (set on root domain)
  visitorId: {
    name: 'avnz_vid',
    domain: '.isit305.com',  // Covers isit305.com and try.isit305.com
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: 'lax',
    httpOnly: true,
    secure: true,
  },

  // Auth token (if logged in)
  authToken: {
    name: 'avnz_token',
    domain: '.isit305.com',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    sameSite: 'lax',
    httpOnly: true,
    secure: true,
  },

  // Cart (storefront)
  cart: {
    name: 'avnz_cart',
    domain: '.isit305.com',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    sameSite: 'lax',
    httpOnly: false,  // Needs JS access
    secure: true,
  },
};
```

### 6.5 SEO Considerations

#### 6.5.1 Site Type SEO Strategy

| Site Type | SEO Priority | Strategy |
|-----------|--------------|----------|
| Storefront | High | Full SEO: sitemap, meta, structured data, indexable |
| Funnel | Low | Noindex (paid traffic), minimal meta for social |
| Trial | Medium | Targeted landing pages, lead magnets indexable |

#### 6.5.2 Technical SEO Implementation

```typescript
// Storefront SEO headers
function getStorefrontSEO(page: SitePage, site: Site): SEOMeta {
  return {
    title: page.metaTitle || `${page.name} | ${site.name}`,
    description: page.metaDescription || site.metaDescription,
    canonical: `https://${site.domain}${page.slug}`,
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      url: `https://${site.domain}${page.slug}`,
      title: page.metaTitle,
      description: page.metaDescription,
      image: site.ogImage,
    },
    structuredData: generateStructuredData(page, site),
  };
}

// Funnel SEO headers (minimal, noindex)
function getFunnelSEO(funnel: Funnel, site: Site): SEOMeta {
  return {
    title: funnel.settings.seo?.title || funnel.name,
    description: funnel.settings.seo?.description,
    robots: 'noindex, nofollow',  // Don't index funnels
    openGraph: {
      type: 'website',
      title: funnel.settings.seo?.title,
      description: funnel.settings.seo?.description,
      image: funnel.settings.seo?.ogImage,
    },
  };
}

// Trial SEO headers (targeted)
function getTrialSEO(page: SitePage, site: Site): SEOMeta {
  return {
    title: page.metaTitle || `Try ${site.name} Free`,
    description: page.metaDescription,
    canonical: `https://${site.domain}${page.slug}`,
    robots: page.pageType === 'LEAD_CAPTURE' ? 'index, follow' : 'noindex',
    openGraph: {
      type: 'website',
      title: page.metaTitle,
      description: page.metaDescription,
      image: site.ogImage,
    },
  };
}
```

#### 6.5.3 Sitemap Generation

```typescript
// Generate sitemap per site
async function generateSitemap(site: Site): Promise<string> {
  const pages = await getIndexablePages(site.id);
  const products = site.siteType === 'STOREFRONT'
    ? await getIndexableProducts(site.companyId)
    : [];
  const collections = site.siteType === 'STOREFRONT'
    ? await getCollections(site.companyId)
    : [];

  const urls = [
    // Pages
    ...pages.map(page => ({
      loc: `https://${site.domain}${page.slug}`,
      lastmod: page.updatedAt,
      changefreq: 'weekly',
      priority: page.slug === '/' ? '1.0' : '0.8',
    })),
    // Products (storefront only)
    ...products.map(product => ({
      loc: `https://${site.domain}/products/${product.slug}`,
      lastmod: product.updatedAt,
      changefreq: 'daily',
      priority: '0.7',
    })),
    // Collections (storefront only)
    ...collections.map(collection => ({
      loc: `https://${site.domain}/collections/${collection.slug}`,
      lastmod: collection.updatedAt,
      changefreq: 'weekly',
      priority: '0.6',
    })),
  ];

  return generateXMLSitemap(urls);
}
```

---

## Part 7: Implementation Checklist

### 7.1 Phase 1 MVP Checklist

**Backend (API):**
- [ ] Add SiteType enum to Prisma schema
- [ ] Enhance Site model with siteType field
- [ ] Create SitePage model
- [ ] Create SiteNavigation model
- [ ] Site CRUD endpoints
- [ ] Site page CRUD endpoints
- [ ] Domain verification endpoint
- [ ] Site branding endpoint (get resolved brand kit)

**Admin Dashboard:**
- [ ] Site management page (/sites)
- [ ] Create site modal with type selection
- [ ] Site settings page
- [ ] Site branding page (override company defaults)
- [ ] Site switcher component in header
- [ ] Site analytics dashboard

**Company Portal:**
- [ ] Middleware for domain-based routing
- [ ] Site context provider
- [ ] Storefront layout
- [ ] Funnel layout (existing, enhance)
- [ ] Trial layout
- [ ] Homepage component (storefront)
- [ ] Product grid component (storefront)
- [ ] Lead capture component (trial)

**Infrastructure:**
- [ ] Domain verification system
- [ ] SSL certificate automation
- [ ] CDN configuration for custom domains

### 7.2 Database Migrations

```sql
-- Migration: Add SiteType enum and update Site model

-- 1. Create SiteType enum
CREATE TYPE "SiteType" AS ENUM ('STOREFRONT', 'FUNNEL', 'TRIAL');

-- 2. Add siteType column with default
ALTER TABLE "sites" ADD COLUMN "site_type" "SiteType" NOT NULL DEFAULT 'STOREFRONT';

-- 3. Create PageType enum
CREATE TYPE "PageType" AS ENUM (
  'HOMEPAGE', 'PRODUCT_GRID', 'PRODUCT_DISPLAY', 'COLLECTION',
  'CART', 'CHECKOUT', 'ACCOUNT', 'WISHLIST', 'SEARCH',
  'LANDING', 'UPSELL', 'DOWNSELL',
  'LEAD_CAPTURE', 'TRIAL_SIGNUP', 'WAITLIST',
  'THANK_YOU', 'BUNDLE_BUILDER', 'COMPARISON', 'CUSTOM'
);

-- 4. Create site_pages table
CREATE TABLE "site_pages" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_ulid(),
  "site_id" TEXT NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "page_type" "PageType" NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}',
  "meta_title" TEXT,
  "meta_description" TEXT,
  "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_by" TEXT NOT NULL,
  UNIQUE("site_id", "slug")
);

CREATE INDEX "site_pages_site_id_idx" ON "site_pages"("site_id");
CREATE INDEX "site_pages_page_type_idx" ON "site_pages"("page_type");
```

---

## Part 8: Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Site** | A distinct web property with its own domain and purpose |
| **Storefront** | Traditional e-commerce site for browsing and purchasing |
| **Funnel** | Conversion-optimized flow for paid traffic |
| **Trial** | Lead generation site for trials and signups |
| **Brand Kit** | Company-level branding configuration |
| **Page Type** | Predefined page template with specific purpose |
| **Cross-Site Session** | Shared customer identity across sites |

### B. Related Documents

- PRODUCT_SELECTION_DESIGNS.md - Page type design specifications
- FUNNEL_BUILDER_SPECIFICATION.md - Existing funnel architecture
- Brand Kit Feature - Brand management documentation

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-31 | Design/CMO/PM Team | Initial specification |

---

*This specification is a living document and will be updated as the multi-site architecture evolves.*
