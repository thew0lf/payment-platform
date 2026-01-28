'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';

// ============================================================================
// TYPES (mirrored from API types)
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

export interface CartColors {
  background: string;
  headerBackground: string;
  footerBackground: string;
  border: string;
  itemBackground: string;
  itemBorder: string;
  headingText: string;
  bodyText: string;
  mutedText: string;
  primaryButton: string;
  primaryButtonText: string;
  secondaryButton: string;
  secondaryButtonText: string;
  iconColor: string;
  iconHover: string;
  badge: string;
  badgeText: string;
  error: string;
  success: string;
}

export interface CartLayout {
  position: 'right' | 'left' | 'bottom';
  width: 'narrow' | 'medium' | 'wide';
  animation: 'slide' | 'fade' | 'scale';
  animationDuration: number;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  shadow: 'none' | 'light' | 'medium' | 'heavy';
  backdropBlur: boolean;
  itemLayout: 'compact' | 'comfortable' | 'spacious';
  showItemImages: boolean;
  imageSize: 'small' | 'medium' | 'large';
  imageBorderRadius: 'none' | 'small' | 'medium' | 'rounded';
}

export interface CartContent {
  headerTitle: string;
  showItemCount: boolean;
  emptyTitle: string;
  emptySubtitle: string;
  emptyButtonText: string;
  showEmptyIcon: boolean;
  subtotalLabel: string;
  shippingNote: string;
  checkoutButtonText: string;
  showSecurityBadge: boolean;
  securityText: string;
  showPaymentIcons: boolean;
  showRecommendations: boolean;
  recommendationsTitle: string;
}

export interface CartTheme {
  preset: CartThemePreset;
  colors: CartColors;
  layout: CartLayout;
  content: CartContent;
  customCss?: string;
}

// ============================================================================
// DEFAULT THEME
// ============================================================================

const DEFAULT_COLORS: CartColors = {
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

const DEFAULT_LAYOUT: CartLayout = {
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

const DEFAULT_CONTENT: CartContent = {
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
};

const DEFAULT_THEME: CartTheme = {
  preset: 'STARTER',
  colors: DEFAULT_COLORS,
  layout: DEFAULT_LAYOUT,
  content: DEFAULT_CONTENT,
};

// ============================================================================
// LAYOUT VALUE MAPPINGS
// ============================================================================

const WIDTH_VALUES: Record<CartLayout['width'], string> = {
  narrow: '360px',
  medium: '400px',
  wide: '480px',
};

const RADIUS_VALUES: Record<CartLayout['borderRadius'], string> = {
  none: '0',
  small: '8px',
  medium: '12px',
  large: '16px',
};

const IMAGE_SIZE_VALUES: Record<CartLayout['imageSize'], string> = {
  small: '48px',
  medium: '64px',
  large: '80px',
};

const IMAGE_RADIUS_VALUES: Record<CartLayout['imageBorderRadius'], string> = {
  none: '0',
  small: '4px',
  medium: '8px',
  rounded: '50%',
};

const SHADOW_VALUES: Record<CartLayout['shadow'], string> = {
  none: 'none',
  light: '0 4px 6px -1px rgba(0,0,0,0.1)',
  medium: '0 10px 15px -3px rgba(0,0,0,0.1)',
  heavy: '0 25px 50px -12px rgba(0,0,0,0.25)',
};

// ============================================================================
// CONTEXT
// ============================================================================

interface CartThemeContextValue {
  theme: CartTheme;
  colors: CartColors;
  layout: CartLayout;
  content: CartContent;
  cssVariables: Record<string, string>;
  getStyles: () => React.CSSProperties;
  // Helper functions
  getWidthValue: () => string;
  getRadiusValue: () => string;
  getImageSizeValue: () => string;
  getImageRadiusValue: () => string;
  getShadowValue: () => string;
}

const CartThemeContext = createContext<CartThemeContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface CartThemeProviderProps {
  children: ReactNode;
  theme?: Partial<CartTheme>;
}

export function CartThemeProvider({ children, theme }: CartThemeProviderProps) {
  const resolvedTheme = useMemo<CartTheme>(() => {
    if (!theme) return DEFAULT_THEME;

    return {
      preset: theme.preset || DEFAULT_THEME.preset,
      colors: { ...DEFAULT_COLORS, ...theme.colors },
      layout: { ...DEFAULT_LAYOUT, ...theme.layout },
      content: { ...DEFAULT_CONTENT, ...theme.content },
      customCss: theme.customCss,
    };
  }, [theme]);

  const cssVariables = useMemo<Record<string, string>>(() => {
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
      '--cart-width': WIDTH_VALUES[layout.width],
      '--cart-radius': RADIUS_VALUES[layout.borderRadius],
      '--cart-animation-duration': `${layout.animationDuration}ms`,
      '--cart-image-size': IMAGE_SIZE_VALUES[layout.imageSize],
      '--cart-shadow': SHADOW_VALUES[layout.shadow],
    };
  }, [resolvedTheme]);

  const value = useMemo<CartThemeContextValue>(
    () => ({
      theme: resolvedTheme,
      colors: resolvedTheme.colors,
      layout: resolvedTheme.layout,
      content: resolvedTheme.content,
      cssVariables,
      getStyles: () => cssVariables as React.CSSProperties,
      getWidthValue: () => WIDTH_VALUES[resolvedTheme.layout.width],
      getRadiusValue: () => RADIUS_VALUES[resolvedTheme.layout.borderRadius],
      getImageSizeValue: () => IMAGE_SIZE_VALUES[resolvedTheme.layout.imageSize],
      getImageRadiusValue: () =>
        IMAGE_RADIUS_VALUES[resolvedTheme.layout.imageBorderRadius],
      getShadowValue: () => SHADOW_VALUES[resolvedTheme.layout.shadow],
    }),
    [resolvedTheme, cssVariables],
  );

  return (
    <CartThemeContext.Provider value={value}>
      <div style={cssVariables as React.CSSProperties}>{children}</div>
    </CartThemeContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useCartTheme(): CartThemeContextValue {
  const context = useContext(CartThemeContext);

  if (!context) {
    throw new Error('useCartTheme must be used within CartThemeProvider');
  }

  return context;
}

// ============================================================================
// EXPORT DEFAULTS
// ============================================================================

export { DEFAULT_THEME, DEFAULT_COLORS, DEFAULT_LAYOUT, DEFAULT_CONTENT };
