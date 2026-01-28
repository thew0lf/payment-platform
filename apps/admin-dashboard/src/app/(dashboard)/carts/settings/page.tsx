'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Palette,
  Save,
  RotateCcw,
  Eye,
  Check,
  Layout,
  Type,
  Sparkles,
  ShoppingCart,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { apiRequest } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type CartThemePreset =
  | 'STARTER'
  | 'ARTISAN'
  | 'VELOCITY'
  | 'LUXE'
  | 'WELLNESS'
  | 'FOODIE'
  | 'PROFESSIONAL'
  | 'CREATOR'
  | 'MARKETPLACE';

interface CartColors {
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

interface CartLayout {
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

interface CartContent {
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

interface CartTheme {
  preset: CartThemePreset;
  colors: CartColors;
  layout: CartLayout;
  content: CartContent;
  customCss?: string;
}

// ═══════════════════════════════════════════════════════════════
// PRESET THEMES
// ═══════════════════════════════════════════════════════════════

const PRESET_INFO: Record<CartThemePreset, { name: string; description: string; gradient: string }> = {
  STARTER: { name: 'Starter', description: 'Clean, minimal design for any brand', gradient: 'from-gray-500 to-gray-600' },
  ARTISAN: { name: 'Artisan', description: 'Warm, handcrafted feel for boutique shops', gradient: 'from-amber-600 to-orange-600' },
  VELOCITY: { name: 'Velocity', description: 'Bold, high-energy for sports & tech', gradient: 'from-blue-600 to-cyan-500' },
  LUXE: { name: 'Luxe', description: 'Elegant, premium feel for luxury brands', gradient: 'from-purple-600 to-pink-500' },
  WELLNESS: { name: 'Wellness', description: 'Calm, natural aesthetic for health products', gradient: 'from-green-500 to-emerald-500' },
  FOODIE: { name: 'Foodie', description: 'Appetizing colors for food & beverage', gradient: 'from-red-500 to-orange-500' },
  PROFESSIONAL: { name: 'Professional', description: 'Corporate, trustworthy for B2B', gradient: 'from-slate-600 to-slate-700' },
  CREATOR: { name: 'Creator', description: 'Vibrant, creative for digital products', gradient: 'from-violet-500 to-fuchsia-500' },
  MARKETPLACE: { name: 'Marketplace', description: 'Familiar, conversion-focused design', gradient: 'from-yellow-500 to-amber-500' },
};

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

// ═══════════════════════════════════════════════════════════════
// FULL PRESET THEMES (mirrors backend cart-theme-presets.ts)
// ═══════════════════════════════════════════════════════════════

const CART_THEME_PRESETS: Record<CartThemePreset, CartTheme> = {
  STARTER: {
    preset: 'STARTER',
    colors: DEFAULT_COLORS,
    layout: { ...DEFAULT_LAYOUT, borderRadius: 'none', shadow: 'heavy' },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Your Cart',
      checkoutButtonText: 'Proceed to Checkout',
      emptySubtitle: 'Browse our products and add something you love!',
    },
  },
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
      ...DEFAULT_LAYOUT,
      borderRadius: 'small',
      shadow: 'medium',
      backdropBlur: false,
      animationDuration: 350,
    },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Your Selection',
      checkoutButtonText: 'Complete Order',
      emptyTitle: 'Nothing here yet',
      emptySubtitle: 'Discover our handcrafted collection',
      emptyButtonText: 'Explore Products',
      recommendationsTitle: 'More from our collection',
    },
  },
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
      ...DEFAULT_LAYOUT,
      borderRadius: 'medium',
      shadow: 'heavy',
      animation: 'scale',
      animationDuration: 250,
    },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Your Gear',
      checkoutButtonText: 'Checkout Now',
      emptySubtitle: 'Your cart is ready for action',
      emptyButtonText: 'Start Shopping',
      securityText: 'Fast & secure checkout',
    },
  },
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
      ...DEFAULT_LAYOUT,
      width: 'wide',
      borderRadius: 'none',
      animation: 'fade',
      animationDuration: 400,
      itemLayout: 'spacious',
      imageSize: 'large',
      imageBorderRadius: 'none',
    },
    content: {
      ...DEFAULT_CONTENT,
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
      ...DEFAULT_LAYOUT,
      borderRadius: 'large',
      shadow: 'light',
      itemLayout: 'spacious',
      imageBorderRadius: 'rounded',
    },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Your Wellness Cart',
      checkoutButtonText: 'Continue to Checkout',
      emptySubtitle: 'Start your wellness journey today',
      emptyButtonText: 'Explore Products',
      securityText: 'Safe & natural checkout',
      recommendationsTitle: 'Enhance your routine',
    },
  },
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
      ...DEFAULT_LAYOUT,
      borderRadius: 'medium',
      shadow: 'medium',
      itemLayout: 'comfortable',
      imageSize: 'large',
      imageBorderRadius: 'medium',
    },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Your Order',
      checkoutButtonText: 'Place Order',
      emptyTitle: 'Your cart is hungry',
      emptySubtitle: 'Add some delicious items to get started',
      emptyButtonText: 'Browse Menu',
      securityText: 'Safe ordering - satisfaction guaranteed',
      recommendationsTitle: 'You might also enjoy',
    },
  },
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
      ...DEFAULT_LAYOUT,
      borderRadius: 'small',
      shadow: 'light',
      itemLayout: 'compact',
    },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Shopping Cart',
      checkoutButtonText: 'Proceed to Payment',
      emptySubtitle: 'Your cart is empty. Browse our catalog.',
      emptyButtonText: 'View Products',
      securityText: 'Enterprise-grade secure checkout',
      showPaymentIcons: true,
    },
  },
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
      ...DEFAULT_LAYOUT,
      borderRadius: 'large',
      shadow: 'medium',
      animation: 'scale',
      animationDuration: 300,
      imageBorderRadius: 'medium',
    },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Your Picks',
      checkoutButtonText: 'Get These Items',
      emptyTitle: 'Nothing here yet!',
      emptySubtitle: 'Find something that sparks your creativity',
      emptyButtonText: 'Discover More',
      recommendationsTitle: 'More creative picks',
    },
  },
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
      ...DEFAULT_LAYOUT,
      borderRadius: 'small',
      shadow: 'medium',
      itemLayout: 'compact',
      imageSize: 'small',
    },
    content: {
      ...DEFAULT_CONTENT,
      headerTitle: 'Cart',
      checkoutButtonText: 'Checkout',
      shippingNote: 'Shipping calculated by seller',
      showPaymentIcons: true,
      recommendationsTitle: 'More from sellers',
    },
  },
};

// Layout value mappings for preview
const BORDER_RADIUS_VALUES: Record<CartLayout['borderRadius'], string> = {
  none: '0',
  small: '8px',
  medium: '12px',
  large: '16px',
};

const SHADOW_VALUES: Record<CartLayout['shadow'], string> = {
  none: 'none',
  light: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
  medium: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
  heavy: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05), 0 20px 25px rgba(0,0,0,0.15)',
};

// ═══════════════════════════════════════════════════════════════
// SKELETON COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SettingsSkeletonLoader() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="flex-1 h-[44px] rounded-md" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6 space-y-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewSkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-[500px] rounded-xl" />
      <Skeleton className="h-4 w-64 mx-auto" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function PresetCard({
  preset,
  selected,
  onClick,
}: {
  preset: CartThemePreset;
  selected: boolean;
  onClick: () => void;
}) {
  const info = PRESET_INFO[preset];
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all text-left min-h-[44px] touch-manipulation',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 bg-card'
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className={cn('w-full h-2 rounded-full bg-gradient-to-r mb-3', info.gradient)} />
      <h3 className="font-semibold text-foreground">{info.name}</h3>
      <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
    </button>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-border cursor-pointer"
      />
      <div className="flex-1">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground uppercase">{value}</p>
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
      />
    </div>
  );
}

function ToggleInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center touch-manipulation',
          value ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute w-5 h-5 bg-white rounded-full shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

// Cart Preview Component
function CartPreview({ theme }: { theme: CartTheme }) {
  const [isOpen, setIsOpen] = useState(true);

  const mockItems = [
    { id: '1', name: 'Premium Coffee Blend', price: 24.99, quantity: 2, image: '/placeholder.png' },
    { id: '2', name: 'Organic Green Tea', price: 18.50, quantity: 1, image: '/placeholder.png' },
  ];

  const subtotal = mockItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Get animation class based on theme setting
  const getAnimationClasses = () => {
    if (!isOpen) {
      switch (theme.layout.animation) {
        case 'fade':
          return 'opacity-0';
        case 'scale':
          return 'scale-95 opacity-0';
        case 'slide':
        default:
          return 'translate-x-full';
      }
    }
    switch (theme.layout.animation) {
      case 'fade':
        return 'opacity-100';
      case 'scale':
        return 'scale-100 opacity-100';
      case 'slide':
      default:
        return 'translate-x-0';
    }
  };

  return (
    <div className="relative bg-gray-900/50 rounded-xl overflow-hidden h-[500px]">
      {/* Mock Page Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 p-4">
        <div className="w-full h-4 bg-gray-700/50 rounded mb-3" />
        <div className="w-3/4 h-4 bg-gray-700/50 rounded mb-6" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-gray-700/30 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Cart Drawer Preview */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-[280px] flex flex-col transition-all',
          getAnimationClasses()
        )}
        style={{
          backgroundColor: theme.colors.background,
          borderRadius: theme.layout.position === 'right'
            ? `${BORDER_RADIUS_VALUES[theme.layout.borderRadius]} 0 0 ${BORDER_RADIUS_VALUES[theme.layout.borderRadius]}`
            : BORDER_RADIUS_VALUES[theme.layout.borderRadius],
          boxShadow: SHADOW_VALUES[theme.layout.shadow],
          transitionDuration: `${theme.layout.animationDuration}ms`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            backgroundColor: theme.colors.headerBackground,
            borderColor: theme.colors.border,
          }}
        >
          <h3 className="font-semibold text-sm" style={{ color: theme.colors.headingText }}>
            {theme.content.headerTitle}
            {theme.content.showItemCount && (
              <span className="ml-1 text-xs" style={{ color: theme.colors.mutedText }}>
                (3)
              </span>
            )}
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1"
            style={{ color: theme.colors.iconColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {mockItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 p-2 rounded-lg"
              style={{
                backgroundColor: theme.colors.itemBackground,
                border: `1px solid ${theme.colors.itemBorder}`,
              }}
            >
              {theme.layout.showItemImages && (
                <div
                  className="w-12 h-12 bg-gray-200 rounded flex-shrink-0"
                  style={{ borderRadius: theme.layout.imageBorderRadius === 'rounded' ? '50%' : '8px' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: theme.colors.headingText }}>
                  {item.name}
                </p>
                <p className="text-xs" style={{ color: theme.colors.mutedText }}>
                  Qty: {item.quantity}
                </p>
                <p className="text-xs font-semibold" style={{ color: theme.colors.bodyText }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="border-t p-3 space-y-3"
          style={{
            backgroundColor: theme.colors.footerBackground,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: theme.colors.bodyText }}>{theme.content.subtotalLabel}</span>
            <span className="font-semibold" style={{ color: theme.colors.headingText }}>
              ${subtotal.toFixed(2)}
            </span>
          </div>
          <p className="text-xs" style={{ color: theme.colors.mutedText }}>
            {theme.content.shippingNote}
          </p>
          <button
            className="w-full py-2 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: theme.colors.primaryButton,
              color: theme.colors.primaryButtonText,
            }}
          >
            {theme.content.checkoutButtonText}
          </button>
          {theme.content.showSecurityBadge && (
            <p className="text-center text-xs flex items-center justify-center gap-1" style={{ color: theme.colors.mutedText }}>
              <span>🔒</span> {theme.content.securityText}
            </p>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-4 right-4 p-2 bg-primary text-white rounded-lg shadow-lg"
        >
          <ShoppingCart className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CartSettingsPage() {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [theme, setTheme] = useState<CartTheme>(DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<CartTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'colors' | 'layout' | 'content'>('preset');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);

  // Check if company selection is required
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // Load theme on mount
  useEffect(() => {
    if (needsCompanySelection) {
      setLoading(false);
      return;
    }

    async function loadTheme() {
      try {
        const response = await apiRequest.get<{ theme: CartTheme }>(
          `/api/cart/theme${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ''}`
        );
        if (response.theme) {
          const loadedTheme = { ...DEFAULT_THEME, ...response.theme };
          setTheme(loadedTheme);
          setSavedTheme(JSON.parse(JSON.stringify(loadedTheme)));
        } else {
          setSavedTheme(JSON.parse(JSON.stringify(DEFAULT_THEME)));
        }
        initialLoadComplete.current = true;
      } catch (err: unknown) {
        console.error('Failed to load cart theme:', err);
        // Show specific error message from API if available
        const errorMessage = err instanceof Error
          ? err.message
          : (err as { message?: string })?.message;
        if (errorMessage && errorMessage.includes('access')) {
          toast.error(errorMessage);
        } else {
          toast.error('We couldn\'t load your saved theme. Using defaults instead.');
        }
        // Use defaults if not found
        setSavedTheme(JSON.parse(JSON.stringify(DEFAULT_THEME)));
        initialLoadComplete.current = true;
      } finally {
        setLoading(false);
      }
    }

    loadTheme();
  }, [selectedCompanyId, needsCompanySelection]);

  // Detect unsaved changes by comparing current theme to saved theme
  useEffect(() => {
    if (savedTheme && initialLoadComplete.current) {
      const hasChanges = JSON.stringify(theme) !== JSON.stringify(savedTheme);
      setHasUnsavedChanges(hasChanges);
    }
  }, [theme, savedTheme]);

  // beforeunload warning for browser navigation (refresh, close tab)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle navigation confirmation
  const handleNavigationAttempt = useCallback((url: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(url);
      setShowUnsavedDialog(true);
    } else {
      router.push(url);
    }
  }, [hasUnsavedChanges, router]);

  const confirmNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  }, [pendingNavigation, router]);

  const cancelNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  }, []);

  const handleSave = async () => {
    if (needsCompanySelection) {
      toast.error('Heads up! Please select a company from the sidebar first.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest.put(
        `/api/cart/theme${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ''}`,
        { theme }
      );
      toast.success('Nice! Your cart theme has been saved.');
      // Update saved theme to current theme after successful save
      setSavedTheme(JSON.parse(JSON.stringify(theme)));
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save cart theme:', err);
      toast.error('Oops! We couldn\'t save your theme. Give it another try?');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME);
    // hasUnsavedChanges will be updated automatically by the effect
    toast.info('Got it! Theme reset to defaults. Don\'t forget to save!');
  };

  const updateTheme = <K extends keyof CartTheme>(key: K, value: CartTheme[K]) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
    // hasUnsavedChanges is tracked automatically via effect
  };

  const updateColors = (key: keyof CartColors, value: string) => {
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateLayout = <K extends keyof CartLayout>(key: K, value: CartLayout[K]) => {
    setTheme((prev) => ({
      ...prev,
      layout: { ...prev.layout, [key]: value },
    }));
  };

  const updateContent = <K extends keyof CartContent>(key: K, value: CartContent[K]) => {
    setTheme((prev) => ({
      ...prev,
      content: { ...prev.content, [key]: value },
    }));
  };

  const tabs = [
    { id: 'preset', label: 'Presets', icon: Sparkles },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'content', label: 'Content', icon: Type },
  ] as const;

  if (needsCompanySelection) {
    return (
      <>
        <Header title="Cart Settings" subtitle="Customize your cart appearance" />
        <div className="p-4 md:p-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Palette className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Company</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Please select a company from the sidebar to manage cart settings.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Show loading skeleton while fetching theme data
  if (loading) {
    return (
      <>
        <Header
          title="Cart Settings"
          subtitle="Customize your cart appearance and behavior"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-[44px] w-24 rounded-lg" />
              <Skeleton className="h-[44px] w-32 rounded-lg" />
            </div>
          }
        />
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SettingsSkeletonLoader />
            <PreviewSkeletonLoader />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Cart Settings"
        subtitle="Customize your cart appearance and behavior"
        actions={
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mr-2">
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
                hasUnsavedChanges && !saving
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes that will be lost if you leave this page. Do you want to continue without saving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <button
              onClick={cancelNavigation}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation"
            >
              Stay on Page
            </button>
            <button
              onClick={confirmNavigation}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors min-h-[44px] touch-manipulation"
            >
              Leave Without Saving
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
                      activeTab === tab.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-6">
              {activeTab === 'preset' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Theme Presets</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a preset to get started quickly. You can customize colors and settings after.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(PRESET_INFO) as CartThemePreset[]).map((preset) => (
                      <PresetCard
                        key={preset}
                        preset={preset}
                        selected={theme.preset === preset}
                        onClick={() => {
                          // Apply the full preset theme (colors, layout, content)
                          const fullPreset = CART_THEME_PRESETS[preset];
                          setTheme(fullPreset);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Background Colors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ColorInput label="Background" value={theme.colors.background} onChange={(v) => updateColors('background', v)} />
                      <ColorInput label="Header" value={theme.colors.headerBackground} onChange={(v) => updateColors('headerBackground', v)} />
                      <ColorInput label="Footer" value={theme.colors.footerBackground} onChange={(v) => updateColors('footerBackground', v)} />
                      <ColorInput label="Border" value={theme.colors.border} onChange={(v) => updateColors('border', v)} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Text Colors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ColorInput label="Heading" value={theme.colors.headingText} onChange={(v) => updateColors('headingText', v)} />
                      <ColorInput label="Body" value={theme.colors.bodyText} onChange={(v) => updateColors('bodyText', v)} />
                      <ColorInput label="Muted" value={theme.colors.mutedText} onChange={(v) => updateColors('mutedText', v)} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Button Colors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ColorInput label="Primary Button" value={theme.colors.primaryButton} onChange={(v) => updateColors('primaryButton', v)} />
                      <ColorInput label="Primary Text" value={theme.colors.primaryButtonText} onChange={(v) => updateColors('primaryButtonText', v)} />
                      <ColorInput label="Secondary Button" value={theme.colors.secondaryButton} onChange={(v) => updateColors('secondaryButton', v)} />
                      <ColorInput label="Secondary Text" value={theme.colors.secondaryButtonText} onChange={(v) => updateColors('secondaryButtonText', v)} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'layout' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Drawer Settings</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectInput
                        label="Position"
                        value={theme.layout.position}
                        options={[
                          { value: 'right', label: 'Right' },
                          { value: 'left', label: 'Left' },
                          { value: 'bottom', label: 'Bottom' },
                        ]}
                        onChange={(v) => updateLayout('position', v as CartLayout['position'])}
                      />
                      <SelectInput
                        label="Width"
                        value={theme.layout.width}
                        options={[
                          { value: 'narrow', label: 'Narrow (360px)' },
                          { value: 'medium', label: 'Medium (400px)' },
                          { value: 'wide', label: 'Wide (480px)' },
                        ]}
                        onChange={(v) => updateLayout('width', v as CartLayout['width'])}
                      />
                      <SelectInput
                        label="Animation"
                        value={theme.layout.animation}
                        options={[
                          { value: 'slide', label: 'Slide' },
                          { value: 'fade', label: 'Fade' },
                          { value: 'scale', label: 'Scale' },
                        ]}
                        onChange={(v) => updateLayout('animation', v as CartLayout['animation'])}
                      />
                      <SelectInput
                        label="Border Radius"
                        value={theme.layout.borderRadius}
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'small', label: 'Small' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'large', label: 'Large' },
                        ]}
                        onChange={(v) => updateLayout('borderRadius', v as CartLayout['borderRadius'])}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Item Display</h3>
                    <div className="space-y-2">
                      <ToggleInput
                        label="Show product images"
                        value={theme.layout.showItemImages}
                        onChange={(v) => updateLayout('showItemImages', v)}
                      />
                      <ToggleInput
                        label="Backdrop blur"
                        value={theme.layout.backdropBlur}
                        onChange={(v) => updateLayout('backdropBlur', v)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <SelectInput
                        label="Image Size"
                        value={theme.layout.imageSize}
                        options={[
                          { value: 'small', label: 'Small' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'large', label: 'Large' },
                        ]}
                        onChange={(v) => updateLayout('imageSize', v as CartLayout['imageSize'])}
                      />
                      <SelectInput
                        label="Item Spacing"
                        value={theme.layout.itemLayout}
                        options={[
                          { value: 'compact', label: 'Compact' },
                          { value: 'comfortable', label: 'Comfortable' },
                          { value: 'spacious', label: 'Spacious' },
                        ]}
                        onChange={(v) => updateLayout('itemLayout', v as CartLayout['itemLayout'])}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'content' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Header</h3>
                    <div className="space-y-4">
                      <TextInput
                        label="Cart Title"
                        value={theme.content.headerTitle}
                        onChange={(v) => updateContent('headerTitle', v)}
                        placeholder="Your Cart"
                      />
                      <ToggleInput
                        label="Show item count"
                        value={theme.content.showItemCount}
                        onChange={(v) => updateContent('showItemCount', v)}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Empty State</h3>
                    <div className="space-y-4">
                      <TextInput
                        label="Empty Title"
                        value={theme.content.emptyTitle}
                        onChange={(v) => updateContent('emptyTitle', v)}
                      />
                      <TextInput
                        label="Empty Subtitle"
                        value={theme.content.emptySubtitle}
                        onChange={(v) => updateContent('emptySubtitle', v)}
                      />
                      <TextInput
                        label="Continue Shopping Button"
                        value={theme.content.emptyButtonText}
                        onChange={(v) => updateContent('emptyButtonText', v)}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Footer</h3>
                    <div className="space-y-4">
                      <TextInput
                        label="Subtotal Label"
                        value={theme.content.subtotalLabel}
                        onChange={(v) => updateContent('subtotalLabel', v)}
                      />
                      <TextInput
                        label="Shipping Note"
                        value={theme.content.shippingNote}
                        onChange={(v) => updateContent('shippingNote', v)}
                      />
                      <TextInput
                        label="Checkout Button Text"
                        value={theme.content.checkoutButtonText}
                        onChange={(v) => updateContent('checkoutButtonText', v)}
                      />
                      <ToggleInput
                        label="Show security badge"
                        value={theme.content.showSecurityBadge}
                        onChange={(v) => updateContent('showSecurityBadge', v)}
                      />
                      {theme.content.showSecurityBadge && (
                        <TextInput
                          label="Security Text"
                          value={theme.content.securityText}
                          onChange={(v) => updateContent('securityText', v)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Live Preview</h3>
            </div>
            <CartPreview theme={theme} />
            <p className="text-xs text-muted-foreground text-center">
              This preview shows how your cart will appear to customers
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
