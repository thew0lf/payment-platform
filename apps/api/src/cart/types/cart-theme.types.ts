/**
 * Cart Theme Types
 * Defines theming configuration for cart drawer UI
 */

// ============================================================================
// CART THEME PRESETS
// ============================================================================

export type CartThemePreset =
  | 'STARTER'
  | 'ARTISAN'
  | 'VELOCITY'
  | 'LUXE'
  | 'WELLNESS'
  | 'FOODIE'
  | 'PROFESSIONAL'
  | 'CREATOR'
  | 'MARKETPLACE';

// ============================================================================
// CART COLORS
// ============================================================================

export interface CartColors {
  // Container
  background: string;
  headerBackground: string;
  footerBackground: string;
  border: string;

  // Items
  itemBackground: string;
  itemBorder: string;

  // Text
  headingText: string;
  bodyText: string;
  mutedText: string;

  // Interactive
  primaryButton: string;
  primaryButtonText: string;
  secondaryButton: string;
  secondaryButtonText: string;

  // Accents
  iconColor: string;
  iconHover: string;
  badge: string;
  badgeText: string;

  // States
  error: string;
  success: string;
}

// ============================================================================
// CART LAYOUT
// ============================================================================

export type CartPosition = 'right' | 'left' | 'bottom';
export type CartWidth = 'narrow' | 'medium' | 'wide';
export type CartAnimation = 'slide' | 'fade' | 'scale';
export type CartBorderRadius = 'none' | 'small' | 'medium' | 'large';
export type CartShadow = 'none' | 'light' | 'medium' | 'heavy';
export type CartItemLayout = 'compact' | 'comfortable' | 'spacious';
export type CartImageSize = 'small' | 'medium' | 'large';
export type CartImageRadius = 'none' | 'small' | 'medium' | 'rounded';

export interface CartLayout {
  // Drawer behavior
  position: CartPosition;
  width: CartWidth;

  // Animations
  animation: CartAnimation;
  animationDuration: number; // ms, 200-500

  // Styling
  borderRadius: CartBorderRadius;
  shadow: CartShadow;
  backdropBlur: boolean;

  // Item display
  itemLayout: CartItemLayout;
  showItemImages: boolean;
  imageSize: CartImageSize;
  imageBorderRadius: CartImageRadius;
}

// ============================================================================
// CART CONTENT
// ============================================================================

export interface CartContent {
  // Header
  headerTitle: string;
  showItemCount: boolean;

  // Empty state
  emptyTitle: string;
  emptySubtitle: string;
  emptyButtonText: string;
  showEmptyIcon: boolean;

  // Footer
  subtotalLabel: string;
  shippingNote: string;
  checkoutButtonText: string;

  // Trust signals
  showSecurityBadge: boolean;
  securityText: string;
  showPaymentIcons: boolean;

  // Recommendations (Phase 2)
  showRecommendations: boolean;
  recommendationsTitle: string;
}

// ============================================================================
// COMPLETE CART THEME
// ============================================================================

export interface CartTheme {
  preset: CartThemePreset;
  colors: CartColors;
  layout: CartLayout;
  content: CartContent;
  customCss?: string;
  updatedAt?: string;
}

// ============================================================================
// PRODUCT CATALOG TYPES
// ============================================================================

export type CatalogMode = 'ALL' | 'SELECTED' | 'CATEGORY' | 'TAG';
export type CatalogSort =
  | 'MANUAL'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'NEWEST';

export interface ProductCatalog {
  mode: CatalogMode;
  selectedProductIds: string[];
  categoryIds: string[];
  tagIds: string[];
  sortBy: CatalogSort;
  maxProducts: number | null;
  showOutOfStock: boolean;
  showPrices: boolean;
  showCompareAtPrice: boolean;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CART_COLORS: CartColors = {
  background: '#F9FAFB',
  headerBackground: '#FFFFFF',
  footerBackground: '#FFFFFF',
  border: '#E5E7EB',
  itemBackground: '#FFFFFF',
  itemBorder: '#F3F4F6',
  headingText: '#111827',
  bodyText: '#4B5563',
  mutedText: '#9CA3AF',
  primaryButton: '#6366F1',
  primaryButtonText: '#FFFFFF',
  secondaryButton: '#F3F4F6',
  secondaryButtonText: '#374151',
  iconColor: '#6B7280',
  iconHover: '#111827',
  badge: '#6366F1',
  badgeText: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
};

export const DEFAULT_CART_LAYOUT: CartLayout = {
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
};

export const DEFAULT_CART_CONTENT: CartContent = {
  headerTitle: 'Your Cart',
  showItemCount: true,
  emptyTitle: 'Your cart is empty',
  emptySubtitle: "Looks like you haven't found anything yet. Let's fix that!",
  emptyButtonText: 'Continue Shopping',
  showEmptyIcon: true,
  subtotalLabel: 'Subtotal',
  shippingNote: 'Shipping + taxes calculated at checkout',
  checkoutButtonText: 'Secure Checkout →',
  showSecurityBadge: true,
  securityText: 'Secure checkout - your data is protected',
  showPaymentIcons: false,
  showRecommendations: false,
  recommendationsTitle: 'You might also like',
};

export const DEFAULT_CART_THEME: CartTheme = {
  preset: 'STARTER',
  colors: DEFAULT_CART_COLORS,
  layout: DEFAULT_CART_LAYOUT,
  content: DEFAULT_CART_CONTENT,
};

export const DEFAULT_PRODUCT_CATALOG: ProductCatalog = {
  mode: 'ALL',
  selectedProductIds: [],
  categoryIds: [],
  tagIds: [],
  sortBy: 'MANUAL',
  maxProducts: null,
  showOutOfStock: false,
  showPrices: true,
  showCompareAtPrice: true,
};

// ============================================================================
// LAYOUT VALUE MAPPINGS
// ============================================================================

export const CART_WIDTH_VALUES: Record<CartWidth, string> = {
  narrow: '360px',
  medium: '400px',
  wide: '480px',
};

export const CART_RADIUS_VALUES: Record<CartBorderRadius, string> = {
  none: '0',
  small: '8px',
  medium: '12px',
  large: '16px',
};

export const CART_IMAGE_SIZE_VALUES: Record<CartImageSize, string> = {
  small: '48px',
  medium: '64px',
  large: '80px',
};

export const CART_IMAGE_RADIUS_VALUES: Record<CartImageRadius, string> = {
  none: '0',
  small: '4px',
  medium: '8px',
  rounded: '50%',
};
