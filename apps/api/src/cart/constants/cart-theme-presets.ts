/**
 * Cart Theme Presets
 * 9 pre-built cart themes matching landing page themes
 */

import {
  CartTheme,
  CartThemePreset,
  DEFAULT_CART_LAYOUT,
  DEFAULT_CART_CONTENT,
} from '../types/cart-theme.types';

export const CART_THEME_PRESETS: Record<CartThemePreset, CartTheme> = {
  // ============================================================================
  // STARTER - Clean, minimal design
  // ============================================================================
  STARTER: {
    preset: 'STARTER',
    colors: {
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
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'none',
      shadow: 'heavy',
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Your Cart',
      checkoutButtonText: 'Proceed to Checkout',
      emptySubtitle: 'Browse our products and add something you love!',
    },
  },

  // ============================================================================
  // ARTISAN - Warm, handcrafted feel
  // ============================================================================
  ARTISAN: {
    preset: 'ARTISAN',
    colors: {
      background: '#FEF7ED',
      headerBackground: '#FFFBF5',
      footerBackground: '#FFFBF5',
      border: '#E7D5C4',
      itemBackground: '#FFFBF5',
      itemBorder: '#F0E6DA',
      headingText: '#44403C',
      bodyText: '#78716C',
      mutedText: '#A8A29E',
      primaryButton: '#B45309',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#FEF3C7',
      secondaryButtonText: '#92400E',
      iconColor: '#A16207',
      iconHover: '#B45309',
      badge: '#B45309',
      badgeText: '#FFFFFF',
      error: '#DC2626',
      success: '#15803D',
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'small',
      shadow: 'medium',
      backdropBlur: false,
      animationDuration: 350,
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Your Selection',
      checkoutButtonText: 'Complete Order',
      emptyTitle: 'Nothing here yet',
      emptySubtitle: 'Discover our handcrafted collection',
      emptyButtonText: 'Explore Products',
      recommendationsTitle: 'More from our collection',
    },
  },

  // ============================================================================
  // VELOCITY - Bold, dynamic, high-energy
  // ============================================================================
  VELOCITY: {
    preset: 'VELOCITY',
    colors: {
      background: '#0F172A',
      headerBackground: '#1E293B',
      footerBackground: '#1E293B',
      border: '#334155',
      itemBackground: '#1E293B',
      itemBorder: '#334155',
      headingText: '#F8FAFC',
      bodyText: '#CBD5E1',
      mutedText: '#94A3B8',
      primaryButton: '#F97316',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#334155',
      secondaryButtonText: '#F8FAFC',
      iconColor: '#94A3B8',
      iconHover: '#F97316',
      badge: '#F97316',
      badgeText: '#FFFFFF',
      error: '#F87171',
      success: '#4ADE80',
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'medium',
      shadow: 'heavy',
      animation: 'scale',
      animationDuration: 250,
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Your Gear',
      checkoutButtonText: 'Checkout Now',
      emptySubtitle: 'Your cart is ready for action',
      emptyButtonText: 'Start Shopping',
      securityText: 'Fast & secure checkout',
    },
  },

  // ============================================================================
  // LUXE - Elegant, premium, sophisticated
  // ============================================================================
  LUXE: {
    preset: 'LUXE',
    colors: {
      background: '#0A0A0A',
      headerBackground: '#171717',
      footerBackground: '#171717',
      border: '#262626',
      itemBackground: '#171717',
      itemBorder: '#262626',
      headingText: '#FAFAFA',
      bodyText: '#A3A3A3',
      mutedText: '#737373',
      primaryButton: '#CA9B52',
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
      ...DEFAULT_CART_LAYOUT,
      width: 'wide',
      borderRadius: 'none',
      animation: 'fade',
      animationDuration: 400,
      itemLayout: 'spacious',
      imageSize: 'large',
      imageBorderRadius: 'none',
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Shopping Bag',
      checkoutButtonText: 'Checkout',
      emptyTitle: 'Your bag is empty',
      emptySubtitle: 'Explore our curated collection',
      emptyButtonText: 'Continue Browsing',
      showEmptyIcon: false,
      shippingNote: 'Complimentary shipping on orders over $500',
      showPaymentIcons: true,
      recommendationsTitle: 'Complete your look',
    },
  },

  // ============================================================================
  // WELLNESS - Calm, natural, soothing
  // ============================================================================
  WELLNESS: {
    preset: 'WELLNESS',
    colors: {
      background: '#F0FDF4',
      headerBackground: '#FFFFFF',
      footerBackground: '#FFFFFF',
      border: '#BBF7D0',
      itemBackground: '#FFFFFF',
      itemBorder: '#DCFCE7',
      headingText: '#14532D',
      bodyText: '#166534',
      mutedText: '#4ADE80',
      primaryButton: '#16A34A',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#DCFCE7',
      secondaryButtonText: '#15803D',
      iconColor: '#22C55E',
      iconHover: '#16A34A',
      badge: '#16A34A',
      badgeText: '#FFFFFF',
      error: '#DC2626',
      success: '#16A34A',
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'large',
      shadow: 'light',
      itemLayout: 'spacious',
      imageBorderRadius: 'rounded',
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Your Wellness Cart',
      checkoutButtonText: 'Continue to Checkout',
      emptySubtitle: 'Start your wellness journey today',
      emptyButtonText: 'Explore Products',
      securityText: 'Safe & natural checkout',
      recommendationsTitle: 'Enhance your routine',
    },
  },

  // ============================================================================
  // FOODIE - Appetizing, warm, inviting
  // ============================================================================
  FOODIE: {
    preset: 'FOODIE',
    colors: {
      background: '#FEF2F2',
      headerBackground: '#FFFFFF',
      footerBackground: '#FFFFFF',
      border: '#FECACA',
      itemBackground: '#FFFFFF',
      itemBorder: '#FEE2E2',
      headingText: '#7F1D1D',
      bodyText: '#991B1B',
      mutedText: '#F87171',
      primaryButton: '#DC2626',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#FEE2E2',
      secondaryButtonText: '#B91C1C',
      iconColor: '#EF4444',
      iconHover: '#DC2626',
      badge: '#DC2626',
      badgeText: '#FFFFFF',
      error: '#B91C1C',
      success: '#16A34A',
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'medium',
      shadow: 'medium',
      itemLayout: 'comfortable',
      imageSize: 'large',
      imageBorderRadius: 'medium',
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Your Order',
      checkoutButtonText: 'Place Order',
      emptyTitle: 'Your cart is hungry',
      emptySubtitle: 'Add some delicious items to get started',
      emptyButtonText: 'Browse Menu',
      securityText: 'Safe ordering - satisfaction guaranteed',
      recommendationsTitle: 'You might also enjoy',
    },
  },

  // ============================================================================
  // PROFESSIONAL - Corporate, clean, trustworthy
  // ============================================================================
  PROFESSIONAL: {
    preset: 'PROFESSIONAL',
    colors: {
      background: '#F8FAFC',
      headerBackground: '#FFFFFF',
      footerBackground: '#FFFFFF',
      border: '#E2E8F0',
      itemBackground: '#FFFFFF',
      itemBorder: '#F1F5F9',
      headingText: '#0F172A',
      bodyText: '#475569',
      mutedText: '#94A3B8',
      primaryButton: '#1E40AF',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#E2E8F0',
      secondaryButtonText: '#1E293B',
      iconColor: '#64748B',
      iconHover: '#1E40AF',
      badge: '#1E40AF',
      badgeText: '#FFFFFF',
      error: '#DC2626',
      success: '#16A34A',
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'small',
      shadow: 'light',
      itemLayout: 'compact',
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Shopping Cart',
      checkoutButtonText: 'Proceed to Payment',
      emptySubtitle: 'Your cart is empty. Browse our catalog.',
      emptyButtonText: 'View Products',
      securityText: 'Enterprise-grade secure checkout',
      showPaymentIcons: true,
    },
  },

  // ============================================================================
  // CREATOR - Expressive, creative, vibrant
  // ============================================================================
  CREATOR: {
    preset: 'CREATOR',
    colors: {
      background: '#FAF5FF',
      headerBackground: '#FFFFFF',
      footerBackground: '#FFFFFF',
      border: '#E9D5FF',
      itemBackground: '#FFFFFF',
      itemBorder: '#F3E8FF',
      headingText: '#581C87',
      bodyText: '#7C3AED',
      mutedText: '#A78BFA',
      primaryButton: '#7C3AED',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#F3E8FF',
      secondaryButtonText: '#6D28D9',
      iconColor: '#8B5CF6',
      iconHover: '#7C3AED',
      badge: '#7C3AED',
      badgeText: '#FFFFFF',
      error: '#DC2626',
      success: '#16A34A',
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'large',
      shadow: 'medium',
      animation: 'scale',
      animationDuration: 300,
      imageBorderRadius: 'medium',
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Your Picks',
      checkoutButtonText: 'Get These Items',
      emptyTitle: 'Nothing here yet!',
      emptySubtitle: 'Find something that sparks your creativity',
      emptyButtonText: 'Discover More',
      recommendationsTitle: 'More creative picks',
    },
  },

  // ============================================================================
  // MARKETPLACE - Functional, efficient, multi-vendor
  // ============================================================================
  MARKETPLACE: {
    preset: 'MARKETPLACE',
    colors: {
      background: '#FFFFFF',
      headerBackground: '#F9FAFB',
      footerBackground: '#F9FAFB',
      border: '#E5E7EB',
      itemBackground: '#FFFFFF',
      itemBorder: '#F3F4F6',
      headingText: '#111827',
      bodyText: '#4B5563',
      mutedText: '#9CA3AF',
      primaryButton: '#2563EB',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#F3F4F6',
      secondaryButtonText: '#374151',
      iconColor: '#6B7280',
      iconHover: '#2563EB',
      badge: '#2563EB',
      badgeText: '#FFFFFF',
      error: '#DC2626',
      success: '#16A34A',
    },
    layout: {
      ...DEFAULT_CART_LAYOUT,
      borderRadius: 'small',
      shadow: 'medium',
      itemLayout: 'compact',
      imageSize: 'small',
    },
    content: {
      ...DEFAULT_CART_CONTENT,
      headerTitle: 'Cart',
      checkoutButtonText: 'Checkout',
      shippingNote: 'Shipping calculated by seller',
      showPaymentIcons: true,
      recommendationsTitle: 'More from sellers',
    },
  },
};

/**
 * Get cart theme preset by name
 */
export function getCartThemePreset(preset: CartThemePreset): CartTheme {
  return CART_THEME_PRESETS[preset] || CART_THEME_PRESETS.STARTER;
}

/**
 * Get all preset names
 */
export function getCartThemePresetNames(): CartThemePreset[] {
  return Object.keys(CART_THEME_PRESETS) as CartThemePreset[];
}

/**
 * Merge custom theme overrides with preset
 */
export function mergeCartTheme(
  preset: CartThemePreset,
  overrides?: Partial<CartTheme>,
): CartTheme {
  const base = getCartThemePreset(preset);

  if (!overrides) return base;

  return {
    ...base,
    preset: overrides.preset || base.preset,
    colors: { ...base.colors, ...overrides.colors },
    layout: { ...base.layout, ...overrides.layout },
    content: { ...base.content, ...overrides.content },
    customCss: overrides.customCss,
    updatedAt: new Date().toISOString(),
  };
}
