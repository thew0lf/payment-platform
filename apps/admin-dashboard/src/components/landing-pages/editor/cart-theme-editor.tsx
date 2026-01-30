'use client';

import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Palette,
  Layout,
  Type,
  Eye,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types (mirrored from API)
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
// Preset Definitions
// ============================================================================

const PRESET_CONFIGS: Record<CartThemePreset, { label: string; description: string; primaryColor: string }> = {
  STARTER: { label: 'Starter', description: 'Clean, modern, professional', primaryColor: '#6366F1' },
  ARTISAN: { label: 'Artisan', description: 'Warm, handcrafted, organic', primaryColor: '#92400E' },
  VELOCITY: { label: 'Velocity', description: 'Bold, energetic, dark mode', primaryColor: '#EF4444' },
  LUXE: { label: 'Luxe', description: 'Elegant, premium, sophisticated', primaryColor: '#A78BFA' },
  WELLNESS: { label: 'Wellness', description: 'Calm, natural, healing', primaryColor: '#059669' },
  FOODIE: { label: 'Foodie', description: 'Appetizing, warm, inviting', primaryColor: '#DC2626' },
  PROFESSIONAL: { label: 'Professional', description: 'Corporate, trustworthy, clean', primaryColor: '#2563EB' },
  CREATOR: { label: 'Creator', description: 'Creative, playful, bold', primaryColor: '#EC4899' },
  MARKETPLACE: { label: 'Marketplace', description: 'Versatile, marketplace-ready', primaryColor: '#0891B2' },
};

// ============================================================================
// Section Component
// ============================================================================

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="flex-1 text-left text-sm font-medium text-gray-900">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4 space-y-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// ============================================================================
// Input Components
// ============================================================================

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0"
        />
        <span className="text-xs text-gray-500 font-mono w-16">{value}</span>
      </div>
    </div>
  );
}

interface SelectInputProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectInput({ label, value, options, onChange }: SelectInputProps) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:border-blue-500 focus:outline-none"
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

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function TextInput({ label, value, onChange, placeholder }: TextInputProps) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

interface ToggleInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleInput({ label, checked, onChange }: ToggleInputProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

interface RangeInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function RangeInput({ label, value, min, max, step = 1, onChange, unit = 'ms' }: RangeInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-600">{label}</label>
        <span className="text-xs text-gray-500 font-mono">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

// ============================================================================
// Main Editor Component
// ============================================================================

interface CartThemeEditorProps {
  theme: CartTheme;
  onChange: (theme: CartTheme) => void;
  onReset?: () => void;
}

export function CartThemeEditor({ theme, onChange, onReset }: CartThemeEditorProps) {
  const updateColors = (key: keyof CartColors, value: string) => {
    onChange({
      ...theme,
      colors: { ...theme.colors, [key]: value },
    });
  };

  const updateLayout = <K extends keyof CartLayout>(key: K, value: CartLayout[K]) => {
    onChange({
      ...theme,
      layout: { ...theme.layout, [key]: value },
    });
  };

  const updateContent = <K extends keyof CartContent>(key: K, value: CartContent[K]) => {
    onChange({
      ...theme,
      content: { ...theme.content, [key]: value },
    });
  };

  const applyPreset = (preset: CartThemePreset) => {
    // In a real implementation, this would fetch the full preset config from the API
    onChange({
      ...theme,
      preset,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Cart Theme</h3>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-900 rounded hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Preset Selector */}
      <Section title="Theme Preset" icon={Sparkles}>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PRESET_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => applyPreset(key as CartThemePreset)}
              className={cn(
                'p-2 rounded-lg border text-xs transition-all',
                theme.preset === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              )}
            >
              <div
                className="w-full h-3 rounded mb-1"
                style={{ backgroundColor: config.primaryColor }}
              />
              <span className="text-gray-900 font-medium">{config.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Colors Section */}
      <Section title="Colors" icon={Palette}>
        <div className="space-y-3">
          <p className="text-xs text-gray-600">Container</p>
          <ColorInput label="Background" value={theme.colors.background} onChange={(v) => updateColors('background', v)} />
          <ColorInput label="Header" value={theme.colors.headerBackground} onChange={(v) => updateColors('headerBackground', v)} />
          <ColorInput label="Footer" value={theme.colors.footerBackground} onChange={(v) => updateColors('footerBackground', v)} />
          <ColorInput label="Border" value={theme.colors.border} onChange={(v) => updateColors('border', v)} />

          <hr className="border-gray-200" />
          <p className="text-xs text-gray-600">Text</p>
          <ColorInput label="Headings" value={theme.colors.headingText} onChange={(v) => updateColors('headingText', v)} />
          <ColorInput label="Body" value={theme.colors.bodyText} onChange={(v) => updateColors('bodyText', v)} />
          <ColorInput label="Muted" value={theme.colors.mutedText} onChange={(v) => updateColors('mutedText', v)} />

          <hr className="border-gray-200" />
          <p className="text-xs text-gray-600">Buttons</p>
          <ColorInput label="Primary Button" value={theme.colors.primaryButton} onChange={(v) => updateColors('primaryButton', v)} />
          <ColorInput label="Primary Text" value={theme.colors.primaryButtonText} onChange={(v) => updateColors('primaryButtonText', v)} />
          <ColorInput label="Secondary Button" value={theme.colors.secondaryButton} onChange={(v) => updateColors('secondaryButton', v)} />
          <ColorInput label="Secondary Text" value={theme.colors.secondaryButtonText} onChange={(v) => updateColors('secondaryButtonText', v)} />
        </div>
      </Section>

      {/* Layout Section */}
      <Section title="Layout" icon={Layout}>
        <SelectInput
          label="Position"
          value={theme.layout.position}
          options={[
            { value: 'right', label: 'Right (Default)' },
            { value: 'left', label: 'Left' },
            { value: 'bottom', label: 'Bottom Sheet' },
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
        <RangeInput
          label="Animation Speed"
          value={theme.layout.animationDuration}
          min={150}
          max={500}
          step={50}
          onChange={(v) => updateLayout('animationDuration', v)}
        />
        <SelectInput
          label="Border Radius"
          value={theme.layout.borderRadius}
          options={[
            { value: 'none', label: 'None' },
            { value: 'small', label: 'Small (8px)' },
            { value: 'medium', label: 'Medium (12px)' },
            { value: 'large', label: 'Large (16px)' },
          ]}
          onChange={(v) => updateLayout('borderRadius', v as CartLayout['borderRadius'])}
        />
        <SelectInput
          label="Shadow"
          value={theme.layout.shadow}
          options={[
            { value: 'none', label: 'None' },
            { value: 'light', label: 'Light' },
            { value: 'medium', label: 'Medium' },
            { value: 'heavy', label: 'Heavy' },
          ]}
          onChange={(v) => updateLayout('shadow', v as CartLayout['shadow'])}
        />
        <ToggleInput
          label="Backdrop Blur"
          checked={theme.layout.backdropBlur}
          onChange={(v) => updateLayout('backdropBlur', v)}
        />

        <hr className="border-gray-200" />
        <p className="text-xs text-gray-600">Item Display</p>
        <SelectInput
          label="Item Layout"
          value={theme.layout.itemLayout}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'spacious', label: 'Spacious' },
          ]}
          onChange={(v) => updateLayout('itemLayout', v as CartLayout['itemLayout'])}
        />
        <ToggleInput
          label="Show Images"
          checked={theme.layout.showItemImages}
          onChange={(v) => updateLayout('showItemImages', v)}
        />
        <SelectInput
          label="Image Size"
          value={theme.layout.imageSize}
          options={[
            { value: 'small', label: 'Small (48px)' },
            { value: 'medium', label: 'Medium (64px)' },
            { value: 'large', label: 'Large (80px)' },
          ]}
          onChange={(v) => updateLayout('imageSize', v as CartLayout['imageSize'])}
        />
      </Section>

      {/* Content Section */}
      <Section title="Content" icon={Type}>
        <TextInput
          label="Header Title"
          value={theme.content.headerTitle}
          onChange={(v) => updateContent('headerTitle', v)}
          placeholder="Your Cart"
        />
        <ToggleInput
          label="Show Item Count"
          checked={theme.content.showItemCount}
          onChange={(v) => updateContent('showItemCount', v)}
        />

        <hr className="border-gray-200" />
        <p className="text-xs text-gray-600">Empty State</p>
        <TextInput
          label="Empty Title"
          value={theme.content.emptyTitle}
          onChange={(v) => updateContent('emptyTitle', v)}
          placeholder="Your cart is empty"
        />
        <TextInput
          label="Empty Subtitle"
          value={theme.content.emptySubtitle}
          onChange={(v) => updateContent('emptySubtitle', v)}
          placeholder="Browse our products..."
        />
        <TextInput
          label="Empty Button Text"
          value={theme.content.emptyButtonText}
          onChange={(v) => updateContent('emptyButtonText', v)}
          placeholder="Continue Shopping"
        />
        <ToggleInput
          label="Show Empty Icon"
          checked={theme.content.showEmptyIcon}
          onChange={(v) => updateContent('showEmptyIcon', v)}
        />

        <hr className="border-gray-200" />
        <p className="text-xs text-gray-600">Footer</p>
        <TextInput
          label="Subtotal Label"
          value={theme.content.subtotalLabel}
          onChange={(v) => updateContent('subtotalLabel', v)}
          placeholder="Subtotal"
        />
        <TextInput
          label="Shipping Note"
          value={theme.content.shippingNote}
          onChange={(v) => updateContent('shippingNote', v)}
          placeholder="Shipping calculated at checkout"
        />
        <TextInput
          label="Checkout Button"
          value={theme.content.checkoutButtonText}
          onChange={(v) => updateContent('checkoutButtonText', v)}
          placeholder="Proceed to Checkout"
        />

        <hr className="border-gray-200" />
        <p className="text-xs text-gray-600">Trust Signals</p>
        <ToggleInput
          label="Security Badge"
          checked={theme.content.showSecurityBadge}
          onChange={(v) => updateContent('showSecurityBadge', v)}
        />
        <TextInput
          label="Security Text"
          value={theme.content.securityText}
          onChange={(v) => updateContent('securityText', v)}
          placeholder="Secure checkout"
        />
        <ToggleInput
          label="Payment Icons"
          checked={theme.content.showPaymentIcons}
          onChange={(v) => updateContent('showPaymentIcons', v)}
        />
      </Section>

      {/* Custom CSS Section */}
      <Section title="Custom CSS" icon={Eye} defaultOpen={false}>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Additional Styles</label>
          <textarea
            value={theme.customCss || ''}
            onChange={(e) => onChange({ ...theme, customCss: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm font-mono resize-none focus:border-blue-500 focus:outline-none"
            rows={6}
            placeholder="/* Custom cart styles */&#10;.cart-drawer { }&#10;.cart-item { }"
          />
        </div>
      </Section>
    </div>
  );
}

export default CartThemeEditor;
