# Cart Theming & Product Catalog Integration Plan

## Executive Summary

This document outlines a comprehensive plan to integrate custom cart theming with landing pages, similar to how Shopify allows merchants to customize their cart experience. The goal is to enable companies to create branded, cohesive shopping experiences from landing page to checkout.

---

## Part 1: Product Manager Perspective

### Market Research: How Shopify Does It

Based on research of Shopify's 2025 cart customization approach:

| Feature | Shopify Approach | Our Opportunity |
|---------|-----------------|-----------------|
| **Cart Templates** | Liquid templates (cart.liquid, cart-template.liquid) in themes | JSON-based cart theme config stored per landing page |
| **Cart Drawer vs Page** | Both supported - drawer for quick view, page for detailed upsells | Start with drawer, add full-page cart later |
| **Modular Sections** | main-cart-items.liquid, main-cart-footer.liquid | Component-based theming (header, items, footer, empty state) |
| **AI Customization** | 2025 Horizon themes - text prompt generates design blocks | Phase 2: AI-suggested themes based on brand colors |
| **Custom Liquid** | Direct HTML/CSS/Liquid injection | Custom CSS field + predefined theme variables |
| **Line Items** | product.remote_details for remote products | productSnapshot for point-in-time data |

### User Stories

**As a company owner, I want to...**

1. **Match cart to my brand** - "My landing page is coffee-themed with warm browns, but the cart is generic gray. It feels disconnected."

2. **Control the cart experience** - "I want the checkout button to be red (urgent) while the rest of my brand is calm blue."

3. **Choose which products appear** - "I only want to show 3 products on this landing page, not my entire catalog."

4. **Use pre-built themes** - "I don't have design skills. Give me something that looks good automatically."

5. **Customize without code** - "I want to tweak colors and fonts without writing CSS."

### Feature Prioritization (MoSCoW)

| Priority | Feature | Rationale |
|----------|---------|-----------|
| **Must Have** | Cart theme inherits landing page colors | Basic brand consistency |
| **Must Have** | Product catalog per landing page | Control what's shown |
| **Must Have** | 9 cart theme presets (matching landing page themes) | Quick setup |
| **Should Have** | Cart-specific color overrides | Differentiate cart from page |
| **Should Have** | Cart drawer animation options | Modern UX |
| **Should Have** | Empty state customization | Brand voice |
| **Could Have** | Custom CSS injection | Power users |
| **Could Have** | Cart drawer position (left/right/bottom) | Flexibility |
| **Won't Have (Phase 1)** | AI-generated themes | Requires Bedrock integration |
| **Won't Have (Phase 1)** | Full-page cart layout | Drawer-only initially |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cart theme adoption | 70% of new landing pages use custom cart theme | Count of pages with non-default theme |
| Conversion lift | 5% increase in cart-to-checkout rate | A/B test default vs themed carts |
| Time to configure | < 2 minutes to apply cart theme | User session tracking |
| Support tickets | < 10% of cart tickets relate to theming | Support ticket tagging |

---

## Part 2: Senior Architect Perspective

### Current State Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CURRENT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LandingPage                          Cart                               │
│  ├── theme: LandingPageTheme          ├── Hard-coded Tailwind classes   │
│  ├── colorScheme: JSON                ├── Single CSS var: --lp-primary  │
│  └── typography: JSON                 └── No theme inheritance          │
│                                                                          │
│  BrandKit (in Funnel.settings)        CartDrawer Component              │
│  ├── colors                           ├── bg-gray-50 (hard-coded)       │
│  ├── typography                       ├── bg-white (hard-coded)         │
│  └── logos                            └── text-gray-900 (hard-coded)    │
│                                                                          │
│  GAP: No connection between landing page theme and cart styling         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROPOSED ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LandingPage                                                             │
│  ├── theme: LandingPageTheme                                             │
│  ├── colorScheme: JSON                                                   │
│  ├── typography: JSON                                                    │
│  └── cartTheme: CartTheme (NEW)  ◄──────────────────────────────┐       │
│       ├── preset: CartThemePreset                                │       │
│       ├── colors: CartColors                                     │       │
│       ├── layout: CartLayout                                     │       │
│       └── content: CartContent                                   │       │
│                                                                  │       │
│  CartThemeProvider (NEW)                                         │       │
│  ├── Resolves theme from landing page                            │       │
│  ├── Generates CSS variables                                     │       │
│  └── Provides theme context to cart components                   │       │
│                                                                  │       │
│  CartDrawer (UPDATED)                                            │       │
│  ├── Consumes CartThemeContext                         ──────────┘       │
│  ├── Uses CSS variables for all colors                                   │
│  └── Applies dynamic classes based on theme                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Product Catalog Association

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT CATALOG DESIGN                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Company                                                                 │
│  └── products[] (all products)                                          │
│                                                                          │
│  LandingPage                                                             │
│  └── productCatalog: LandingPageProductCatalog (NEW)                    │
│       ├── mode: 'ALL' | 'SELECTED' | 'CATEGORY' | 'TAG'                 │
│       ├── selectedProductIds: string[]                                   │
│       ├── categoryIds: string[]                                          │
│       ├── tagIds: string[]                                               │
│       ├── sortBy: 'MANUAL' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME'        │
│       ├── maxProducts: number | null                                     │
│       └── showOutOfStock: boolean                                        │
│                                                                          │
│  Resolution Logic:                                                       │
│  1. If mode = 'ALL': return company.products                            │
│  2. If mode = 'SELECTED': return products WHERE id IN selectedIds       │
│  3. If mode = 'CATEGORY': return products WHERE categoryId IN cats      │
│  4. If mode = 'TAG': return products WHERE tags overlap                 │
│  5. Apply sort and max limit                                             │
│  6. Filter out-of-stock if !showOutOfStock                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Visitor loads landing page                                          │
│     │                                                                   │
│     ▼                                                                   │
│  2. GET /api/public/landing-pages/:slug                                 │
│     └── Returns: landingPage + cartTheme + productCatalog               │
│     │                                                                   │
│     ▼                                                                   │
│  3. CartThemeProvider resolves theme                                    │
│     ├── Use landing page cartTheme if set                               │
│     ├── Fall back to THEME_DEFAULTS[landingPage.theme]                  │
│     └── Generate CSS variables                                          │
│     │                                                                   │
│     ▼                                                                   │
│  4. ProductCatalogProvider resolves products                            │
│     ├── Apply catalog filters (mode, categories, tags)                  │
│     ├── Sort and limit                                                  │
│     └── Filter stock status                                             │
│     │                                                                   │
│     ▼                                                                   │
│  5. Components render with themed styles                                │
│     ├── LandingPageCartDrawer uses CSS vars                             │
│     ├── Product grid shows filtered products                            │
│     └── Add to cart respects catalog constraints                        │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### API Design

#### New Endpoints

```typescript
// Cart Theme Management (part of landing page API)
PATCH /api/landing-pages/:id/cart-theme
  Body: CartThemeUpdateDto
  Response: { cartTheme: CartTheme }

GET /api/landing-pages/:id/cart-theme/preview
  Response: { cssVariables: Record<string, string>, html: string }

// Product Catalog Management
GET /api/landing-pages/:id/products
  Query: { page, limit }
  Response: { products: Product[], total: number }

PATCH /api/landing-pages/:id/product-catalog
  Body: ProductCatalogUpdateDto
  Response: { productCatalog: ProductCatalog }

POST /api/landing-pages/:id/product-catalog/reorder
  Body: { productIds: string[] }
  Response: { productCatalog: ProductCatalog }

// Cart Theme Presets
GET /api/cart-themes/presets
  Response: { presets: CartThemePreset[] }

POST /api/cart-themes/generate-from-colors
  Body: { primaryColor: string, mode: 'light' | 'dark' }
  Response: { cartTheme: CartTheme }
```

### Database Schema Changes

```prisma
// Add to LandingPage model
model LandingPage {
  // ... existing fields ...

  // Cart Theme (NEW)
  cartTheme     Json   @default("{}")  // CartTheme object

  // Product Catalog (NEW)
  productCatalog Json  @default("{}")  // ProductCatalog object
}

// Add join table for manual product selection
model LandingPageProduct {
  id            String   @id @default(cuid())
  landingPageId String
  productId     String
  sortOrder     Int      @default(0)

  landingPage   LandingPage @relation(fields: [landingPageId], references: [id], onDelete: Cascade)
  product       Product     @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([landingPageId, productId])
  @@index([landingPageId, sortOrder])
  @@map("landing_page_products")
}
```

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| XSS in custom CSS | Sanitize CSS, disallow url(), javascript: |
| Product visibility | Validate products belong to company |
| Theme injection | Validate color formats (hex only) |
| API rate limiting | Cache theme resolution per session |

---

## Part 3: Senior Developer Perspective

### Type Definitions

```typescript
// ============================================================================
// Cart Theme Types
// ============================================================================

/**
 * Cart theme preset names - match landing page themes
 */
type CartThemePreset =
  | 'STARTER'      // Clean, minimal
  | 'ARTISAN'      // Warm, handcrafted
  | 'VELOCITY'     // Bold, dynamic
  | 'LUXE'         // Elegant, premium
  | 'WELLNESS'     // Calm, natural
  | 'FOODIE'       // Appetizing
  | 'PROFESSIONAL' // Corporate
  | 'CREATOR'      // Expressive
  | 'MARKETPLACE'; // Functional

/**
 * Cart color configuration
 */
interface CartColors {
  // Container
  background: string;          // Drawer background
  headerBackground: string;    // Header area
  footerBackground: string;    // Footer area
  border: string;              // Borders and dividers

  // Items
  itemBackground: string;      // Cart item cards
  itemBorder: string;          // Item card borders

  // Text
  headingText: string;         // Headers, titles
  bodyText: string;            // Descriptions, labels
  mutedText: string;           // Secondary text

  // Interactive
  primaryButton: string;       // Checkout button background
  primaryButtonText: string;   // Checkout button text
  secondaryButton: string;     // Continue shopping, etc.
  secondaryButtonText: string;

  // Accents
  iconColor: string;           // Quantity buttons, remove icons
  iconHover: string;           // Icon hover state
  badge: string;               // Item count badge
  badgeText: string;

  // States
  error: string;               // Error messages
  success: string;             // Success states
}

/**
 * Cart layout configuration
 */
interface CartLayout {
  // Drawer behavior
  position: 'right' | 'left' | 'bottom';
  width: 'narrow' | 'medium' | 'wide';  // 360px, 400px, 480px

  // Animations
  animation: 'slide' | 'fade' | 'scale';
  animationDuration: number;  // ms, 200-500

  // Styling
  borderRadius: 'none' | 'small' | 'medium' | 'large'; // 0, 8, 12, 16px
  shadow: 'none' | 'light' | 'medium' | 'heavy';
  backdropBlur: boolean;

  // Item display
  itemLayout: 'compact' | 'comfortable' | 'spacious';
  showItemImages: boolean;
  imageSize: 'small' | 'medium' | 'large'; // 48, 64, 80px
  imageBorderRadius: 'none' | 'small' | 'medium' | 'rounded'; // 0, 4, 8, 50%
}

/**
 * Cart content customization
 */
interface CartContent {
  // Header
  headerTitle: string;              // "Your Cart", "Shopping Bag", etc.
  showItemCount: boolean;

  // Empty state
  emptyTitle: string;               // "Your cart is empty"
  emptySubtitle: string;            // "Browse our products..."
  emptyButtonText: string;          // "Continue Shopping"
  showEmptyIcon: boolean;

  // Footer
  subtotalLabel: string;            // "Subtotal"
  shippingNote: string;             // "Shipping calculated at checkout"
  checkoutButtonText: string;       // "Proceed to Checkout"

  // Trust signals
  showSecurityBadge: boolean;
  securityText: string;             // "Secure checkout - your data is protected"
  showPaymentIcons: boolean;

  // Upsells (Phase 2)
  showRecommendations: boolean;
  recommendationsTitle: string;
}

/**
 * Complete cart theme configuration
 */
interface CartTheme {
  preset: CartThemePreset;
  colors: CartColors;
  layout: CartLayout;
  content: CartContent;
  customCss?: string;              // Advanced users only
  updatedAt?: string;
}

// ============================================================================
// Product Catalog Types
// ============================================================================

type CatalogMode = 'ALL' | 'SELECTED' | 'CATEGORY' | 'TAG';
type CatalogSort = 'MANUAL' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC' | 'NAME_DESC' | 'NEWEST';

interface ProductCatalog {
  mode: CatalogMode;
  selectedProductIds: string[];    // For SELECTED mode
  categoryIds: string[];           // For CATEGORY mode
  tagIds: string[];                // For TAG mode
  sortBy: CatalogSort;
  maxProducts: number | null;      // null = unlimited
  showOutOfStock: boolean;
  showPrices: boolean;
  showCompareAtPrice: boolean;     // Show strikethrough prices
}
```

### Theme Presets Definition

```typescript
// apps/api/src/cart/constants/cart-theme-presets.ts

export const CART_THEME_PRESETS: Record<CartThemePreset, CartTheme> = {
  STARTER: {
    preset: 'STARTER',
    colors: {
      background: '#F9FAFB',        // gray-50
      headerBackground: '#FFFFFF',
      footerBackground: '#FFFFFF',
      border: '#E5E7EB',            // gray-200
      itemBackground: '#FFFFFF',
      itemBorder: '#F3F4F6',        // gray-100
      headingText: '#111827',       // gray-900
      bodyText: '#4B5563',          // gray-600
      mutedText: '#9CA3AF',         // gray-400
      primaryButton: '#6366F1',     // indigo-500
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#F3F4F6',
      secondaryButtonText: '#374151',
      iconColor: '#6B7280',         // gray-500
      iconHover: '#111827',
      badge: '#6366F1',
      badgeText: '#FFFFFF',
      error: '#EF4444',
      success: '#10B981',
    },
    layout: {
      position: 'right',
      width: 'medium',
      animation: 'slide',
      animationDuration: 300,
      borderRadius: 'none',
      shadow: 'heavy',
      backdropBlur: true,
      itemLayout: 'comfortable',
      showItemImages: true,
      imageSize: 'medium',
      imageBorderRadius: 'medium',
    },
    content: {
      headerTitle: 'Your Cart',
      showItemCount: true,
      emptyTitle: 'Your cart is empty',
      emptySubtitle: 'Browse our products and add something you love!',
      emptyButtonText: 'Continue Shopping',
      showEmptyIcon: true,
      subtotalLabel: 'Subtotal',
      shippingNote: 'Shipping + taxes calculated at checkout',
      checkoutButtonText: 'Proceed to Checkout',
      showSecurityBadge: true,
      securityText: 'Secure checkout - your data is protected',
      showPaymentIcons: false,
      showRecommendations: false,
      recommendationsTitle: 'You might also like',
    },
  },

  ARTISAN: {
    preset: 'ARTISAN',
    colors: {
      background: '#FEF7ED',        // Warm cream
      headerBackground: '#FFFBF5',
      footerBackground: '#FFFBF5',
      border: '#E7D5C4',            // Warm tan
      itemBackground: '#FFFBF5',
      itemBorder: '#F0E6DA',
      headingText: '#44403C',       // stone-700
      bodyText: '#78716C',          // stone-500
      mutedText: '#A8A29E',         // stone-400
      primaryButton: '#B45309',     // amber-700
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#FEF3C7',   // amber-100
      secondaryButtonText: '#92400E',
      iconColor: '#A16207',
      iconHover: '#B45309',
      badge: '#B45309',
      badgeText: '#FFFFFF',
      error: '#DC2626',
      success: '#15803D',
    },
    layout: {
      position: 'right',
      width: 'medium',
      animation: 'slide',
      animationDuration: 350,
      borderRadius: 'small',
      shadow: 'medium',
      backdropBlur: false,
      itemLayout: 'comfortable',
      showItemImages: true,
      imageSize: 'medium',
      imageBorderRadius: 'small',
    },
    content: {
      headerTitle: 'Your Selection',
      showItemCount: true,
      emptyTitle: 'Nothing here yet',
      emptySubtitle: 'Discover our handcrafted collection',
      emptyButtonText: 'Explore Products',
      showEmptyIcon: true,
      subtotalLabel: 'Subtotal',
      shippingNote: 'Shipping calculated at checkout',
      checkoutButtonText: 'Complete Order',
      showSecurityBadge: true,
      securityText: 'Safe & secure checkout',
      showPaymentIcons: false,
      showRecommendations: false,
      recommendationsTitle: 'More from our collection',
    },
  },

  LUXE: {
    preset: 'LUXE',
    colors: {
      background: '#0A0A0A',        // Near black
      headerBackground: '#171717',
      footerBackground: '#171717',
      border: '#262626',            // neutral-800
      itemBackground: '#171717',
      itemBorder: '#262626',
      headingText: '#FAFAFA',       // neutral-50
      bodyText: '#A3A3A3',          // neutral-400
      mutedText: '#737373',         // neutral-500
      primaryButton: '#CA9B52',     // Gold
      primaryButtonText: '#0A0A0A',
      secondaryButton: '#262626',
      secondaryButtonText: '#FAFAFA',
      iconColor: '#A3A3A3',
      iconHover: '#CA9B52',
      badge: '#CA9B52',
      badgeText: '#0A0A0A',
      error: '#F87171',
      success: '#4ADE80',
    },
    layout: {
      position: 'right',
      width: 'wide',
      animation: 'fade',
      animationDuration: 400,
      borderRadius: 'none',
      shadow: 'heavy',
      backdropBlur: true,
      itemLayout: 'spacious',
      showItemImages: true,
      imageSize: 'large',
      imageBorderRadius: 'none',
    },
    content: {
      headerTitle: 'Shopping Bag',
      showItemCount: true,
      emptyTitle: 'Your bag is empty',
      emptySubtitle: 'Explore our curated collection',
      emptyButtonText: 'Continue Browsing',
      showEmptyIcon: false,
      subtotalLabel: 'Subtotal',
      shippingNote: 'Complimentary shipping on orders over $500',
      checkoutButtonText: 'Checkout',
      showSecurityBadge: true,
      securityText: 'Secure payment guaranteed',
      showPaymentIcons: true,
      showRecommendations: false,
      recommendationsTitle: 'Complete your look',
    },
  },

  // ... Define remaining presets: VELOCITY, WELLNESS, FOODIE, PROFESSIONAL, CREATOR, MARKETPLACE
};
```

### React Context Implementation

```typescript
// apps/company-portal/src/contexts/cart-theme-context.tsx

'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { CartTheme, CartColors, CartLayout, CartContent } from '@/types/cart-theme';
import { CART_THEME_PRESETS } from '@/constants/cart-theme-presets';

interface CartThemeContextValue {
  theme: CartTheme;
  colors: CartColors;
  layout: CartLayout;
  content: CartContent;
  cssVariables: Record<string, string>;
  getStyles: () => React.CSSProperties;
}

const CartThemeContext = createContext<CartThemeContextValue | null>(null);

interface CartThemeProviderProps {
  children: ReactNode;
  landingPageTheme?: string;  // LandingPageTheme preset
  cartTheme?: Partial<CartTheme>;  // Custom overrides
}

export function CartThemeProvider({
  children,
  landingPageTheme = 'STARTER',
  cartTheme,
}: CartThemeProviderProps) {
  const resolvedTheme = useMemo(() => {
    // Start with preset based on landing page theme
    const basePreset = CART_THEME_PRESETS[landingPageTheme as keyof typeof CART_THEME_PRESETS]
      || CART_THEME_PRESETS.STARTER;

    // Merge with custom overrides
    if (!cartTheme) return basePreset;

    return {
      ...basePreset,
      preset: cartTheme.preset || basePreset.preset,
      colors: { ...basePreset.colors, ...cartTheme.colors },
      layout: { ...basePreset.layout, ...cartTheme.layout },
      content: { ...basePreset.content, ...cartTheme.content },
      customCss: cartTheme.customCss,
    };
  }, [landingPageTheme, cartTheme]);

  const cssVariables = useMemo(() => {
    const { colors, layout } = resolvedTheme;

    return {
      // Colors
      '--cart-bg': colors.background,
      '--cart-header-bg': colors.headerBackground,
      '--cart-footer-bg': colors.footerBackground,
      '--cart-border': colors.border,
      '--cart-item-bg': colors.itemBackground,
      '--cart-item-border': colors.itemBorder,
      '--cart-heading': colors.headingText,
      '--cart-body': colors.bodyText,
      '--cart-muted': colors.mutedText,
      '--cart-primary-btn': colors.primaryButton,
      '--cart-primary-btn-text': colors.primaryButtonText,
      '--cart-secondary-btn': colors.secondaryButton,
      '--cart-secondary-btn-text': colors.secondaryButtonText,
      '--cart-icon': colors.iconColor,
      '--cart-icon-hover': colors.iconHover,
      '--cart-badge': colors.badge,
      '--cart-badge-text': colors.badgeText,
      '--cart-error': colors.error,
      '--cart-success': colors.success,

      // Layout
      '--cart-width': layout.width === 'narrow' ? '360px' : layout.width === 'medium' ? '400px' : '480px',
      '--cart-radius': layout.borderRadius === 'none' ? '0' : layout.borderRadius === 'small' ? '8px' : layout.borderRadius === 'medium' ? '12px' : '16px',
      '--cart-animation-duration': `${layout.animationDuration}ms`,
      '--cart-image-size': layout.imageSize === 'small' ? '48px' : layout.imageSize === 'medium' ? '64px' : '80px',
    };
  }, [resolvedTheme]);

  const getStyles = () => cssVariables as React.CSSProperties;

  const value: CartThemeContextValue = {
    theme: resolvedTheme,
    colors: resolvedTheme.colors,
    layout: resolvedTheme.layout,
    content: resolvedTheme.content,
    cssVariables,
    getStyles,
  };

  return (
    <CartThemeContext.Provider value={value}>
      <div style={cssVariables as React.CSSProperties}>
        {children}
      </div>
    </CartThemeContext.Provider>
  );
}

export function useCartTheme() {
  const context = useContext(CartThemeContext);
  if (!context) {
    throw new Error('useCartTheme must be used within CartThemeProvider');
  }
  return context;
}
```

### Updated Cart Drawer Component

```typescript
// apps/company-portal/src/components/landing-page/landing-page-cart-drawer.tsx

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';
import { useCartTheme } from '@/contexts/cart-theme-context';

function CartItemRow({ item, onUpdateQuantity, onRemove }) {
  const { colors, layout, content } = useCartTheme();

  return (
    <div
      className="flex gap-4 p-4 rounded-lg border transition-colors"
      style={{
        backgroundColor: 'var(--cart-item-bg)',
        borderColor: 'var(--cart-item-border)',
      }}
    >
      {/* Image */}
      {layout.showItemImages && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: 'var(--cart-image-size)',
            height: 'var(--cart-image-size)',
            borderRadius: layout.imageBorderRadius === 'rounded' ? '50%' :
              layout.imageBorderRadius === 'none' ? '0' :
              layout.imageBorderRadius === 'small' ? '4px' : '8px',
            backgroundColor: 'var(--cart-border)',
          }}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <PlaceholderIcon />
          )}
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4
          className="font-medium truncate"
          style={{ color: 'var(--cart-heading)' }}
        >
          {item.name}
        </h4>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--cart-body)' }}
        >
          {formatPrice(item.price)} each
        </p>

        {/* Quantity controls */}
        <div className="flex items-center gap-2 mt-2">
          <QuantityButton
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <MinusIcon />
          </QuantityButton>
          <span
            className="w-8 text-center font-medium"
            style={{ color: 'var(--cart-heading)' }}
          >
            {item.quantity}
          </span>
          <QuantityButton onClick={() => onUpdateQuantity(item.quantity + 1)}>
            <PlusIcon />
          </QuantityButton>
        </div>
      </div>

      {/* Price and remove */}
      <div className="flex flex-col items-end justify-between">
        <span
          className="font-semibold"
          style={{ color: 'var(--cart-heading)' }}
        >
          {formatPrice(item.price * item.quantity)}
        </span>
        <RemoveButton onClick={onRemove} itemName={item.name} />
      </div>
    </div>
  );
}

export function LandingPageCartDrawer() {
  const { theme, colors, layout, content, cssVariables } = useCartTheme();
  const { isCartDrawerOpen, closeCartDrawer, localCart, cartTotal, cartCount } = useLandingPage();

  // Get animation class based on layout
  const getAnimationClass = () => {
    if (!isCartDrawerOpen) {
      return layout.position === 'bottom' ? 'translate-y-full' :
             layout.position === 'left' ? '-translate-x-full' : 'translate-x-full';
    }
    return 'translate-x-0 translate-y-0';
  };

  // Get position class
  const getPositionClass = () => {
    switch (layout.position) {
      case 'left': return 'left-0 top-0 h-full';
      case 'bottom': return 'bottom-0 left-0 w-full h-[85vh]';
      default: return 'right-0 top-0 h-full';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 transition-opacity
          ${layout.backdropBlur ? 'backdrop-blur-sm' : ''}
          ${isCartDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          transitionDuration: 'var(--cart-animation-duration)',
        }}
        onClick={closeCartDrawer}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={content.headerTitle}
        className={`
          fixed z-50 flex flex-col
          transition-transform ease-out
          ${getPositionClass()}
          ${getAnimationClass()}
        `}
        style={{
          width: layout.position === 'bottom' ? '100%' : 'var(--cart-width)',
          backgroundColor: 'var(--cart-bg)',
          borderRadius: 'var(--cart-radius)',
          transitionDuration: 'var(--cart-animation-duration)',
          boxShadow: layout.shadow === 'none' ? 'none' :
            layout.shadow === 'light' ? '0 4px 6px -1px rgba(0,0,0,0.1)' :
            layout.shadow === 'medium' ? '0 10px 15px -3px rgba(0,0,0,0.1)' :
            '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b"
          style={{
            backgroundColor: 'var(--cart-header-bg)',
            borderColor: 'var(--cart-border)',
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--cart-heading)' }}
          >
            {content.headerTitle}
            {content.showItemCount && cartCount > 0 && (
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: 'var(--cart-muted)' }}
              >
                ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <CloseButton onClick={closeCartDrawer} />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {localCart.length === 0 ? (
            <EmptyState content={content} onClose={closeCartDrawer} />
          ) : (
            <div
              className={`space-y-${layout.itemLayout === 'compact' ? '2' : layout.itemLayout === 'comfortable' ? '3' : '4'}`}
            >
              {localCart.map((item) => (
                <CartItemRow
                  key={`${item.productId}-${item.variantId || ''}`}
                  item={item}
                  onUpdateQuantity={(qty) => handleUpdateQuantity(item.productId, qty)}
                  onRemove={() => handleRemove(item.productId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {localCart.length > 0 && (
          <footer
            className="flex-shrink-0 border-t p-4 space-y-4"
            style={{
              backgroundColor: 'var(--cart-footer-bg)',
              borderColor: 'var(--cart-border)',
            }}
          >
            {/* Subtotal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--cart-body)' }}>{content.subtotalLabel}</span>
                <span className="font-semibold" style={{ color: 'var(--cart-heading)' }}>
                  {formatPrice(cartTotal)}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--cart-muted)' }}>
                {content.shippingNote}
              </p>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full min-h-[52px] px-6 py-3 font-semibold rounded-lg transition-all duration-200 touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--cart-primary-btn)',
                color: 'var(--cart-primary-btn-text)',
              }}
            >
              {content.checkoutButtonText}
              <ArrowRightIcon />
            </button>

            {/* Security Badge */}
            {content.showSecurityBadge && (
              <div
                className="flex items-center justify-center gap-1.5 text-xs"
                style={{ color: 'var(--cart-muted)' }}
              >
                <LockIcon />
                <span>{content.securityText}</span>
              </div>
            )}
          </footer>
        )}
      </div>
    </>
  );
}
```

### Admin Dashboard Cart Theme Editor

```typescript
// apps/admin-dashboard/src/components/landing-pages/cart-theme-editor.tsx

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { CartTheme, CartThemePreset } from '@/types/cart-theme';
import { CART_THEME_PRESETS } from '@/constants/cart-theme-presets';

interface CartThemeEditorProps {
  value: CartTheme;
  onChange: (theme: CartTheme) => void;
  landingPageTheme: string;
}

export function CartThemeEditor({ value, onChange, landingPageTheme }: CartThemeEditorProps) {
  const [activeTab, setActiveTab] = useState('preset');
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePresetChange = (preset: CartThemePreset) => {
    const presetTheme = CART_THEME_PRESETS[preset];
    onChange(presetTheme);
  };

  const handleColorChange = (key: keyof CartColors, color: string) => {
    onChange({
      ...value,
      colors: { ...value.colors, [key]: color },
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preset">Preset</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        {/* Preset Tab */}
        <TabsContent value="preset" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a preset that matches your brand. The cart will automatically
            inherit colors from your landing page theme ({landingPageTheme}).
          </p>

          <div className="grid grid-cols-3 gap-4">
            {Object.entries(CART_THEME_PRESETS).map(([key, preset]) => (
              <PresetCard
                key={key}
                preset={key as CartThemePreset}
                colors={preset.colors}
                selected={value.preset === key}
                onClick={() => handlePresetChange(key as CartThemePreset)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ColorSection title="Container">
              <ColorPicker label="Background" value={value.colors.background} onChange={(c) => handleColorChange('background', c)} />
              <ColorPicker label="Header" value={value.colors.headerBackground} onChange={(c) => handleColorChange('headerBackground', c)} />
              <ColorPicker label="Footer" value={value.colors.footerBackground} onChange={(c) => handleColorChange('footerBackground', c)} />
              <ColorPicker label="Border" value={value.colors.border} onChange={(c) => handleColorChange('border', c)} />
            </ColorSection>

            <ColorSection title="Text">
              <ColorPicker label="Headings" value={value.colors.headingText} onChange={(c) => handleColorChange('headingText', c)} />
              <ColorPicker label="Body" value={value.colors.bodyText} onChange={(c) => handleColorChange('bodyText', c)} />
              <ColorPicker label="Muted" value={value.colors.mutedText} onChange={(c) => handleColorChange('mutedText', c)} />
            </ColorSection>

            <ColorSection title="Buttons">
              <ColorPicker label="Primary BG" value={value.colors.primaryButton} onChange={(c) => handleColorChange('primaryButton', c)} />
              <ColorPicker label="Primary Text" value={value.colors.primaryButtonText} onChange={(c) => handleColorChange('primaryButtonText', c)} />
              <ColorPicker label="Secondary BG" value={value.colors.secondaryButton} onChange={(c) => handleColorChange('secondaryButton', c)} />
            </ColorSection>

            <ColorSection title="Accents">
              <ColorPicker label="Icons" value={value.colors.iconColor} onChange={(c) => handleColorChange('iconColor', c)} />
              <ColorPicker label="Badge" value={value.colors.badge} onChange={(c) => handleColorChange('badge', c)} />
              <ColorPicker label="Success" value={value.colors.success} onChange={(c) => handleColorChange('success', c)} />
              <ColorPicker label="Error" value={value.colors.error} onChange={(c) => handleColorChange('error', c)} />
            </ColorSection>
          </div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Drawer Position</Label>
              <Select value={value.layout.position} onValueChange={(v) => onChange({ ...value, layout: { ...value.layout, position: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Right (Default)</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="bottom">Bottom Sheet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Width</Label>
              <Select value={value.layout.width} onValueChange={(v) => onChange({ ...value, layout: { ...value.layout, width: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow (360px)</SelectItem>
                  <SelectItem value="medium">Medium (400px)</SelectItem>
                  <SelectItem value="wide">Wide (480px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Animation</Label>
              <Select value={value.layout.animation} onValueChange={(v) => onChange({ ...value, layout: { ...value.layout, animation: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Shadow</Label>
              <Select value={value.layout.shadow} onValueChange={(v) => onChange({ ...value, layout: { ...value.layout, shadow: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Backdrop Blur</Label>
              <p className="text-sm text-muted-foreground">Apply blur effect to page behind cart</p>
            </div>
            <Switch checked={value.layout.backdropBlur} onCheckedChange={(v) => onChange({ ...value, layout: { ...value.layout, backdropBlur: v } })} />
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Header Title</Label>
              <Input value={value.content.headerTitle} onChange={(e) => onChange({ ...value, content: { ...value.content, headerTitle: e.target.value } })} placeholder="Your Cart" />
            </div>

            <div>
              <Label>Checkout Button Text</Label>
              <Input value={value.content.checkoutButtonText} onChange={(e) => onChange({ ...value, content: { ...value.content, checkoutButtonText: e.target.value } })} placeholder="Proceed to Checkout" />
            </div>

            <div>
              <Label>Empty Cart Title</Label>
              <Input value={value.content.emptyTitle} onChange={(e) => onChange({ ...value, content: { ...value.content, emptyTitle: e.target.value } })} placeholder="Your cart is empty" />
            </div>

            <div>
              <Label>Empty Cart Subtitle</Label>
              <Input value={value.content.emptySubtitle} onChange={(e) => onChange({ ...value, content: { ...value.content, emptySubtitle: e.target.value } })} placeholder="Browse our products..." />
            </div>

            <div>
              <Label>Security Badge Text</Label>
              <Input value={value.content.securityText} onChange={(e) => onChange({ ...value, content: { ...value.content, securityText: e.target.value } })} placeholder="Secure checkout - your data is protected" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Show Item Count</Label>
              <Switch checked={value.content.showItemCount} onCheckedChange={(v) => onChange({ ...value, content: { ...value.content, showItemCount: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Security Badge</Label>
              <Switch checked={value.content.showSecurityBadge} onCheckedChange={(v) => onChange({ ...value, content: { ...value.content, showSecurityBadge: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Empty Cart Icon</Label>
              <Switch checked={value.content.showEmptyIcon} onCheckedChange={(v) => onChange({ ...value, content: { ...value.content, showEmptyIcon: v } })} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Button */}
      <Button
        variant="outline"
        className="w-full min-h-[44px] touch-manipulation"
        onClick={() => setPreviewOpen(true)}
      >
        Preview Cart Theme
      </Button>

      {/* Live Preview Modal */}
      {previewOpen && (
        <CartThemePreviewModal
          theme={value}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
```

### Product Catalog Editor

```typescript
// apps/admin-dashboard/src/components/landing-pages/product-catalog-editor.tsx

'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ProductCatalog, CatalogMode } from '@/types/product-catalog';
import { Product } from '@/types/product';

interface ProductCatalogEditorProps {
  value: ProductCatalog;
  onChange: (catalog: ProductCatalog) => void;
  companyId: string;
}

export function ProductCatalogEditor({ value, onChange, companyId }: ProductCatalogEditorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch company products, categories, tags
    Promise.all([
      fetchProducts(companyId),
      fetchCategories(companyId),
      fetchTags(companyId),
    ]).then(([p, c, t]) => {
      setProducts(p);
      setCategories(c);
      setTags(t);
      setLoading(false);
    });
  }, [companyId]);

  const handleModeChange = (mode: CatalogMode) => {
    onChange({ ...value, mode });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(value.selectedProductIds);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    onChange({ ...value, selectedProductIds: reordered, sortBy: 'MANUAL' });
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="space-y-4">
        <Label>Product Selection Mode</Label>
        <div className="grid grid-cols-2 gap-4">
          <ModeCard
            mode="ALL"
            title="All Products"
            description="Show entire catalog"
            selected={value.mode === 'ALL'}
            onClick={() => handleModeChange('ALL')}
          />
          <ModeCard
            mode="SELECTED"
            title="Selected Products"
            description="Choose specific products"
            selected={value.mode === 'SELECTED'}
            onClick={() => handleModeChange('SELECTED')}
          />
          <ModeCard
            mode="CATEGORY"
            title="By Category"
            description="Filter by product categories"
            selected={value.mode === 'CATEGORY'}
            onClick={() => handleModeChange('CATEGORY')}
          />
          <ModeCard
            mode="TAG"
            title="By Tags"
            description="Filter by product tags"
            selected={value.mode === 'TAG'}
            onClick={() => handleModeChange('TAG')}
          />
        </div>
      </div>

      {/* Mode-specific config */}
      {value.mode === 'SELECTED' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Selected Products ({value.selectedProductIds.length})</Label>
            <Button variant="outline" size="sm" onClick={() => setShowProductPicker(true)}>
              Add Products
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="products">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {value.selectedProductIds.map((productId, index) => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return null;

                    return (
                      <Draggable key={productId} draggableId={productId} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border bg-background
                              ${snapshot.isDragging ? 'shadow-lg' : ''}
                            `}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab">
                              <GripVerticalIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <img
                              src={product.images[0] || '/placeholder.svg'}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-sm text-muted-foreground">${product.price}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                onChange({
                                  ...value,
                                  selectedProductIds: value.selectedProductIds.filter(id => id !== productId),
                                });
                              }}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {value.mode === 'CATEGORY' && (
        <div className="space-y-4">
          <Label>Select Categories</Label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2">
                <Checkbox
                  checked={value.categoryIds.includes(category.id)}
                  onCheckedChange={(checked) => {
                    onChange({
                      ...value,
                      categoryIds: checked
                        ? [...value.categoryIds, category.id]
                        : value.categoryIds.filter(id => id !== category.id),
                    });
                  }}
                />
                <Label className="text-sm">{category.name}</Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {value.mode === 'TAG' && (
        <div className="space-y-4">
          <Label>Select Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Badge
                key={tag.id}
                variant={value.tagIds.includes(tag.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  onChange({
                    ...value,
                    tagIds: value.tagIds.includes(tag.id)
                      ? value.tagIds.filter(id => id !== tag.id)
                      : [...value.tagIds, tag.id],
                  });
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Common Settings */}
      <div className="space-y-4 pt-4 border-t">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Sort By</Label>
            <Select value={value.sortBy} onValueChange={(v) => onChange({ ...value, sortBy: v as CatalogSort })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual Order</SelectItem>
                <SelectItem value="PRICE_ASC">Price: Low to High</SelectItem>
                <SelectItem value="PRICE_DESC">Price: High to Low</SelectItem>
                <SelectItem value="NAME_ASC">Name: A to Z</SelectItem>
                <SelectItem value="NAME_DESC">Name: Z to A</SelectItem>
                <SelectItem value="NEWEST">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Max Products</Label>
            <Input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={value.maxProducts || ''}
              onChange={(e) => onChange({ ...value, maxProducts: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Out of Stock</Label>
            <p className="text-sm text-muted-foreground">Display products with zero inventory</p>
          </div>
          <Switch
            checked={value.showOutOfStock}
            onCheckedChange={(v) => onChange({ ...value, showOutOfStock: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Prices</Label>
            <p className="text-sm text-muted-foreground">Display product prices</p>
          </div>
          <Switch
            checked={value.showPrices}
            onCheckedChange={(v) => onChange({ ...value, showPrices: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Compare-at Price</Label>
            <p className="text-sm text-muted-foreground">Show original price with strikethrough</p>
          </div>
          <Switch
            checked={value.showCompareAtPrice}
            onCheckedChange={(v) => onChange({ ...value, showCompareAtPrice: v })}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Part 4: Implementation Phases

### Phase 1: Foundation (Week 1-2)

| Task | Owner | Deliverable |
|------|-------|-------------|
| Define CartTheme TypeScript types | Developer | `types/cart-theme.ts` |
| Create 9 cart theme presets | Developer | `constants/cart-theme-presets.ts` |
| Add cartTheme field to LandingPage | Developer | Prisma migration |
| Add productCatalog field to LandingPage | Developer | Prisma migration |
| Create LandingPageProduct join table | Developer | Prisma migration |
| Update landing page API to include cart theme | Developer | Updated endpoints |

### Phase 2: Backend Services (Week 2-3)

| Task | Owner | Deliverable |
|------|-------|-------------|
| CartThemeService (validate, resolve) | Developer | `cart-theme.service.ts` |
| ProductCatalogService (filter, sort) | Developer | `product-catalog.service.ts` |
| Update LandingPagesController | Developer | New endpoints |
| Unit tests for services | Developer | Test files |

### Phase 3: Frontend Context (Week 3-4)

| Task | Owner | Deliverable |
|------|-------|-------------|
| CartThemeProvider context | Developer | `cart-theme-context.tsx` |
| ProductCatalogProvider context | Developer | `product-catalog-context.tsx` |
| CSS variable generation | Developer | Utility functions |
| Update LandingPageContext integration | Developer | Context updates |

### Phase 4: Component Updates (Week 4-5)

| Task | Owner | Deliverable |
|------|-------|-------------|
| Update LandingPageCartDrawer | Developer | Themed component |
| Update CartItemRow | Developer | Themed component |
| Update EmptyState | Developer | Themed component |
| Update checkout footer | Developer | Themed component |
| Mobile responsiveness testing | QA | Test report |

### Phase 5: Admin Dashboard (Week 5-6)

| Task | Owner | Deliverable |
|------|-------|-------------|
| CartThemeEditor component | Developer | Editor UI |
| ProductCatalogEditor component | Developer | Drag-drop UI |
| Preview modal | Developer | Live preview |
| Integration with landing page edit page | Developer | Tab integration |

### Phase 6: Testing & Launch (Week 6-7)

| Task | Owner | Deliverable |
|------|-------|-------------|
| E2E tests for cart theming | QA | Playwright tests |
| Accessibility audit | QA | WCAG compliance |
| Performance testing | Developer | Lighthouse scores |
| Documentation | Developer | User guide |
| Beta rollout | PM | 10% traffic |
| Full launch | PM | 100% traffic |

---

## Part 5: Design Mockups

### Cart Theme Presets Gallery

```
┌─────────────────────────────────────────────────────────────────┐
│  Choose a Cart Theme                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                    │
│  │ ░░░░░░░░░ │  │ ▓▓▓▓▓▓▓▓▓ │  │ ▒▒▒▒▒▒▒▒▒ │                    │
│  │ ░ STARTER │  │ ▓ ARTISAN │  │ ▒ LUXE    │                    │
│  │ ░░░░░░░░░ │  │ ▓▓▓▓▓▓▓▓▓ │  │ ▒▒▒▒▒▒▒▒▒ │                    │
│  │ [■■■■■■] │  │ [■■■■■■] │  │ [■■■■■■] │                    │
│  └───────────┘  └───────────┘  └───────────┘                    │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                    │
│  │ ▲▲▲▲▲▲▲▲▲ │  │ ●●●●●●●●● │  │ ◆◆◆◆◆◆◆◆◆ │                    │
│  │ ▲ VELOCITY│  │ ● WELLNESS│  │ ◆ FOODIE  │                    │
│  │ ▲▲▲▲▲▲▲▲▲ │  │ ●●●●●●●●● │  │ ◆◆◆◆◆◆◆◆◆ │                    │
│  │ [■■■■■■] │  │ [■■■■■■] │  │ [■■■■■■] │                    │
│  └───────────┘  └───────────┘  └───────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Color Customization Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Colors                                               [Preview] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Container                    │  Text                           │
│  ────────────────────────────│──────────────────────────────── │
│  Background   [■] #F9FAFB    │  Headings   [■] #111827         │
│  Header       [■] #FFFFFF    │  Body       [■] #4B5563         │
│  Footer       [■] #FFFFFF    │  Muted      [■] #9CA3AF         │
│  Borders      [■] #E5E7EB    │                                  │
│                               │                                  │
│  Buttons                      │  Accents                        │
│  ────────────────────────────│──────────────────────────────── │
│  Primary BG   [■] #6366F1    │  Icons      [■] #6B7280         │
│  Primary Text [■] #FFFFFF    │  Badge      [■] #6366F1         │
│  Secondary BG [■] #F3F4F6    │  Success    [■] #10B981         │
│  Secondary    [■] #374151    │  Error      [■] #EF4444         │
│                                                                  │
│  [Reset to Preset]                    [Apply Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

### Product Catalog Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Product Catalog                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Selection Mode                                                  │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │ ○ All Products │  │ ● Selected     │                         │
│  │   (47 items)   │  │   (3 items)    │                         │
│  └────────────────┘  └────────────────┘                         │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │ ○ By Category  │  │ ○ By Tags      │                         │
│  │                │  │                │                         │
│  └────────────────┘  └────────────────┘                         │
│                                                                  │
│  Selected Products (drag to reorder)              [+ Add]       │
│  ─────────────────────────────────────────────────────────      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ≡  [img] Signature Blend Coffee          $24.99    [×] │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ≡  [img] Colombian Single Origin         $18.99    [×] │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ≡  [img] Espresso Roast                  $22.99    [×] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Settings                                                        │
│  ─────────────────────────────────────────────────────────      │
│  Sort: [Manual Order ▼]    Max: [___] (empty = unlimited)       │
│                                                                  │
│  [✓] Show prices          [✓] Show compare-at price             │
│  [ ] Show out of stock products                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

This plan provides a comprehensive approach to cart theming and product catalog management, inspired by Shopify's flexible customization system but designed for our multi-tenant architecture.

**Key differentiators from Shopify:**
1. **JSON-based themes** instead of Liquid templates (easier for non-developers)
2. **9 pre-built presets** matching landing page themes (instant setup)
3. **Company-level inheritance** (brand consistency across pages)
4. **Real-time preview** in admin dashboard
5. **Drag-and-drop product ordering** for manual curation

**Expected outcomes:**
- Cohesive brand experience from landing page to checkout
- Reduced friction in cart configuration (< 2 minutes)
- Increased conversion rates through brand trust
- Scalable architecture for future enhancements (AI themes, upsells)

---

*Document Version: 1.0*
*Created: January 2026*
*Authors: Product, Architecture, Engineering*

Sources:
- [Shopify Cart Template Documentation](https://shopify.dev/docs/storefronts/themes/architecture/templates/cart)
- [Shopify Cart Page Customization Guide 2025](https://ecommerce.folio3.com/blog/customize-cart-page-shopify/)
- [Shopify Theme Developer Cheatsheet 2025](https://www.codilar.com/shopify-theme-developer-cheatsheet-2025-edition/)
- [Shopify Customization 2026](https://www.shopify.com/blog/customizing-store-theme)
