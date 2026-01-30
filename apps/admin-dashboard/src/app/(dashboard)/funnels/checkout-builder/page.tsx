'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { funnelsApi, Funnel, FunnelStage, StageType } from '@/lib/api/funnels';
import {
  ArrowLeft,
  Save,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Package,
  User,
  Truck,
  CreditCard,
  Palette,
  Settings,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  Lock,
  AlertCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label?: string;
  placeholder?: string;
}

interface PaymentMethodConfig {
  type: 'card' | 'paypal';
  enabled: boolean;
  label?: string;
}

interface CustomField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
}

interface CheckoutConfig {
  layout: 'single-page' | 'multi-step' | 'two-column' | 'one-column';
  fields: {
    customer: {
      email: FieldConfig;
      firstName: FieldConfig;
      lastName: FieldConfig;
      phone: FieldConfig;
      company: FieldConfig;
    };
    shipping: {
      enabled: boolean;
      required: boolean;
    };
    billing: {
      enabled: boolean;
      sameAsShipping: boolean;
    };
    custom: CustomField[];
  };
  payment: {
    methods: PaymentMethodConfig[];
    showOrderSummary: boolean;
    allowCoupons: boolean;
    allowGiftCards: boolean;
    showTaxEstimate: boolean;
    showShippingEstimate: boolean;
  };
  trust: {
    showSecurityBadges: boolean;
    showGuarantee: boolean;
    showTestimonial: boolean;
    guaranteeText?: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'minimal' | 'modern';
    primaryColor: string;
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
    showLogo: boolean;
  };
}

const defaultConfig: CheckoutConfig = {
  layout: 'two-column',
  fields: {
    customer: {
      email: { enabled: true, required: true, label: 'Email', placeholder: 'email@example.com' },
      firstName: { enabled: true, required: true, label: 'First Name', placeholder: 'John' },
      lastName: { enabled: true, required: true, label: 'Last Name', placeholder: 'Doe' },
      phone: { enabled: true, required: false, label: 'Phone', placeholder: '(555) 123-4567' },
      company: { enabled: false, required: false, label: 'Company', placeholder: 'Company name' },
    },
    shipping: { enabled: true, required: true },
    billing: { enabled: true, sameAsShipping: true },
    custom: [],
  },
  payment: {
    methods: [
      { type: 'card', enabled: true, label: 'Credit Card' },
      { type: 'paypal', enabled: false, label: 'PayPal' },
    ],
    showOrderSummary: true,
    allowCoupons: true,
    allowGiftCards: false,
    showTaxEstimate: true,
    showShippingEstimate: true,
  },
  trust: {
    showSecurityBadges: true,
    showGuarantee: true,
    showTestimonial: false,
    guaranteeText: '30-day money-back guarantee',
  },
  appearance: {
    theme: 'light',
    primaryColor: '#4F46E5',
    borderRadius: 'lg',
    showLogo: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════════════

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOGGLE FIELD
// ═══════════════════════════════════════════════════════════════

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          ${checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════
// FIELD CONFIG ROW
// ═══════════════════════════════════════════════════════════════

interface FieldConfigRowProps {
  field: FieldConfig;
  label: string;
  onUpdate: (field: FieldConfig) => void;
}

function FieldConfigRow({ field, label, onUpdate }: FieldConfigRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdate({ ...field, enabled: !field.enabled })}
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            field.enabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
          }`}
        >
          {field.enabled && <Check className="w-3 h-3" />}
        </button>
        <span className={`text-sm ${field.enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {label}
        </span>
      </div>
      {field.enabled && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">Required</span>
        </label>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT METHOD ROW
// ═══════════════════════════════════════════════════════════════

interface PaymentMethodRowProps {
  method: PaymentMethodConfig;
  onUpdate: (method: PaymentMethodConfig) => void;
}

function PaymentMethodRow({ method, onUpdate }: PaymentMethodRowProps) {
  const icons: Record<string, string> = {
    card: '💳',
    paypal: '🅿️',
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdate({ ...method, enabled: !method.enabled })}
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            method.enabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
          }`}
        >
          {method.enabled && <Check className="w-3 h-3" />}
        </button>
        <span className="text-lg">{icons[method.type] || '💰'}</span>
        <span className={`text-sm ${method.enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {method.label}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIVE PREVIEW
// ═══════════════════════════════════════════════════════════════

interface PreviewProduct {
  name: string;
  price: number;
  quantity: number;
}

interface LivePreviewProps {
  config: CheckoutConfig;
  device: 'desktop' | 'tablet' | 'mobile';
  products?: PreviewProduct[];
}

// Default sample product for preview when no products are configured
const DEFAULT_PREVIEW_PRODUCT: PreviewProduct = {
  name: 'Preview Product',
  price: 79.00,
  quantity: 1,
};

const LivePreview = React.memo(function LivePreview({ config, device, products = [] }: LivePreviewProps) {
  // Use provided products or fallback to default
  const displayProducts = products.length > 0 ? products : [DEFAULT_PREVIEW_PRODUCT];
  const deviceWidths = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  const borderRadiusClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-2xl',
  };

  const themeClasses = {
    light: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
    dark: 'bg-gray-900 text-gray-100',
    minimal: 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
    modern: 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100',
  };

  const inputClass = `w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${borderRadiusClass[config.appearance.borderRadius]} focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm`;
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  return (
    <div className={`${deviceWidths[device]} max-w-full mx-auto transition-all duration-300`}>
      <div
        className={`${themeClasses[config.appearance.theme]} ${borderRadiusClass[config.appearance.borderRadius]} shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700`}
      >
        {/* Header */}
        {config.appearance.showLogo && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground text-sm font-bold"
                style={{ backgroundColor: config.appearance.primaryColor }}
              >
                S
              </div>
              <span className="font-semibold">Store Name</span>
            </div>
          </div>
        )}

        <div className={`p-6 ${config.layout === 'two-column' && device === 'desktop' ? 'grid grid-cols-5 gap-8' : ''}`}>
          {/* Main Form */}
          <div className={config.layout === 'two-column' && device === 'desktop' ? 'col-span-3' : ''}>
            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="space-y-4">
                {config.fields.customer.email.enabled && (
                  <div>
                    <label className={labelClass}>
                      {config.fields.customer.email.label}
                      {config.fields.customer.email.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="email"
                      placeholder={config.fields.customer.email.placeholder}
                      className={inputClass}
                      disabled
                    />
                  </div>
                )}
                <div className={`grid ${device === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  {config.fields.customer.firstName.enabled && (
                    <div>
                      <label className={labelClass}>
                        {config.fields.customer.firstName.label}
                        {config.fields.customer.firstName.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={config.fields.customer.firstName.placeholder}
                        className={inputClass}
                        disabled
                      />
                    </div>
                  )}
                  {config.fields.customer.lastName.enabled && (
                    <div>
                      <label className={labelClass}>
                        {config.fields.customer.lastName.label}
                        {config.fields.customer.lastName.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={config.fields.customer.lastName.placeholder}
                        className={inputClass}
                        disabled
                      />
                    </div>
                  )}
                </div>
                {config.fields.customer.phone.enabled && (
                  <div>
                    <label className={labelClass}>
                      {config.fields.customer.phone.label}
                      {config.fields.customer.phone.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="tel"
                      placeholder={config.fields.customer.phone.placeholder}
                      className={inputClass}
                      disabled
                    />
                  </div>
                )}
                {config.fields.customer.company.enabled && (
                  <div>
                    <label className={labelClass}>
                      {config.fields.customer.company.label}
                      {config.fields.customer.company.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={config.fields.customer.company.placeholder}
                      className={inputClass}
                      disabled
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Shipping */}
            {config.fields.shipping.enabled && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Address" className={inputClass} disabled />
                  <div className={`grid ${device === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                    <input type="text" placeholder="City" className={inputClass} disabled />
                    <input type="text" placeholder="State" className={inputClass} disabled />
                    <input type="text" placeholder="ZIP" className={inputClass} disabled />
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Payment</h3>

              {/* Payment Method Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {config.payment.methods.filter(m => m.enabled).map((method) => (
                  <button
                    key={method.type}
                    className={`px-4 py-2 text-sm font-medium ${borderRadiusClass[config.appearance.borderRadius]} border transition-colors ${
                      method.type === 'card'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    disabled
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {/* Card Form */}
              {config.payment.methods.find(m => m.type === 'card')?.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className={inputClass}
                      disabled
                    />
                  </div>
                  <div className={`grid ${device === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <label className={labelClass}>Expiry</label>
                      <input type="text" placeholder="MM / YY" className={inputClass} disabled />
                    </div>
                    <div>
                      <label className={labelClass}>CVV</label>
                      <input type="text" placeholder="123" className={inputClass} disabled />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Coupon */}
            {config.payment.allowCoupons && (
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Discount code"
                    className={`flex-1 ${inputClass}`}
                    disabled
                  />
                  <button
                    className={`px-4 py-2.5 border border-gray-300 dark:border-gray-600 ${borderRadiusClass[config.appearance.borderRadius]} text-sm font-medium text-gray-700 dark:text-gray-300`}
                    disabled
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Trust Elements */}
            {(config.trust.showSecurityBadges || config.trust.showGuarantee) && (
              <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                {config.trust.showSecurityBadges && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secure checkout</span>
                  </div>
                )}
                {config.trust.showGuarantee && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{config.trust.guaranteeText || 'Money-back guarantee'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Pay Button */}
            {(() => {
              const subtotal = displayProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
              const shipping = config.payment.showShippingEstimate ? 5.99 : 0;
              const tax = config.payment.showTaxEstimate ? subtotal * 0.0825 : 0;
              const total = subtotal + shipping + tax;
              return (
                <button
                  className={`w-full py-3.5 text-foreground font-medium ${borderRadiusClass[config.appearance.borderRadius]} transition-colors`}
                  style={{ backgroundColor: config.appearance.primaryColor }}
                  disabled
                >
                  Pay ${total.toFixed(2)}
                </button>
              );
            })()}
          </div>

          {/* Order Summary (Two Column) */}
          {config.layout === 'two-column' && device === 'desktop' && config.payment.showOrderSummary && (() => {
            const subtotal = displayProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
            const shipping = config.payment.showShippingEstimate ? 5.99 : 0;
            const tax = config.payment.showTaxEstimate ? subtotal * 0.0825 : 0;
            const total = subtotal + shipping + tax;

            return (
              <div className="col-span-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Order Summary</h3>

                {/* Products */}
                {displayProducts.map((product, index) => (
                  <div key={index} className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-600 mb-4 last:mb-0">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {product.quantity}</p>
                    </div>
                    <p className="font-medium text-sm">${(product.price * product.quantity).toFixed(2)}</p>
                  </div>
                ))}

                {/* Totals */}
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {config.payment.showShippingEstimate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                      <span>${shipping.toFixed(2)}</span>
                    </div>
                  )}
                  {config.payment.showTaxEstimate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Test Mode Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Test Mode - No real charges</span>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// MAIN BUILDER CONTENT
// ═══════════════════════════════════════════════════════════════

function CheckoutBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompanyId } = useHierarchy();

  const funnelId = searchParams?.get('funnelId') ?? null;
  const stageId = searchParams?.get('stageId') ?? null;

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [stage, setStage] = useState<FunnelStage | null>(null);
  const [config, setConfig] = useState<CheckoutConfig>(defaultConfig);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (funnelId) {
        const funnelData = await funnelsApi.get(funnelId, selectedCompanyId || undefined);
        setFunnel(funnelData);

        // Extract products from funnel stages (product selection stage contains products)
        const extractedProducts: PreviewProduct[] = [];
        for (const s of funnelData.stages) {
          const stageConfig = s.config as Record<string, unknown> | null;
          if (stageConfig?.products && Array.isArray(stageConfig.products)) {
            for (const p of stageConfig.products) {
              if (p && typeof p === 'object' && 'name' in p && 'price' in p) {
                extractedProducts.push({
                  name: String(p.name),
                  price: Number(p.price) || 0,
                  quantity: Number(p.quantity) || 1,
                });
              }
            }
          }
        }
        setPreviewProducts(extractedProducts);

        if (stageId) {
          const stageData = funnelData.stages.find(s => s.id === stageId);
          if (stageData) {
            setStage(stageData);
            // Load existing config if available
            if (stageData.config && Object.keys(stageData.config).length > 0) {
              setConfig({ ...defaultConfig, ...stageData.config as unknown as Partial<CheckoutConfig> });
            }
          }
        } else {
          // Find the checkout stage
          const checkoutStage = funnelData.stages.find(s => s.type === StageType.CHECKOUT);
          if (checkoutStage) {
            setStage(checkoutStage);
            if (checkoutStage.config && Object.keys(checkoutStage.config).length > 0) {
              setConfig({ ...defaultConfig, ...checkoutStage.config as unknown as Partial<CheckoutConfig> });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load funnel:', error);
      toast.error('Failed to load funnel data');
    } finally {
      setLoading(false);
    }
  }, [funnelId, stageId, selectedCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateConfig = useCallback(<K extends keyof CheckoutConfig>(
    key: K,
    value: CheckoutConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!funnel || !stage) {
      toast.error('No checkout stage found');
      return;
    }

    try {
      setSaving(true);
      await funnelsApi.updateStage(
        funnel.id,
        stage.id,
        { config: config as unknown as Record<string, unknown> },
        selectedCompanyId || undefined
      );
      setHasChanges(false);
      toast.success('Checkout configuration saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading checkout builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(funnelId ? `/funnels/builder?id=${funnelId}` : '/funnels')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-gray-100">Checkout Builder</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{funnel?.name || 'Configure checkout'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Device Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={`p-2 rounded-md transition-colors ${device === 'desktop' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title="Desktop"
            >
              <Monitor className={`w-4 h-4 ${device === 'desktop' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`p-2 rounded-md transition-colors ${device === 'tablet' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title="Tablet"
            >
              <Tablet className={`w-4 h-4 ${device === 'tablet' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`p-2 rounded-md transition-colors ${device === 'mobile' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title="Mobile"
            >
              <Smartphone className={`w-4 h-4 ${device === 'mobile' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              hasChanges
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Configuration */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto shrink-0">
          {/* Layout Section */}
          <Section title="Layout" icon={Settings} defaultOpen={true}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Checkout Style</label>
              <div className="grid grid-cols-2 gap-2">
                {(['two-column', 'single-page', 'multi-step', 'one-column'] as const).map((layout) => (
                  <button
                    key={layout}
                    onClick={() => updateConfig('layout', layout)}
                    className={`p-3 text-xs font-medium rounded-lg border-2 transition-colors ${
                      config.layout === layout
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {layout.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Customer Fields Section */}
          <Section title="Customer Fields" icon={User}>
            <div className="space-y-2">
              <FieldConfigRow
                label="Email"
                field={config.fields.customer.email}
                onUpdate={(f) => updateConfig('fields', {
                  ...config.fields,
                  customer: { ...config.fields.customer, email: f }
                })}
              />
              <FieldConfigRow
                label="First Name"
                field={config.fields.customer.firstName}
                onUpdate={(f) => updateConfig('fields', {
                  ...config.fields,
                  customer: { ...config.fields.customer, firstName: f }
                })}
              />
              <FieldConfigRow
                label="Last Name"
                field={config.fields.customer.lastName}
                onUpdate={(f) => updateConfig('fields', {
                  ...config.fields,
                  customer: { ...config.fields.customer, lastName: f }
                })}
              />
              <FieldConfigRow
                label="Phone"
                field={config.fields.customer.phone}
                onUpdate={(f) => updateConfig('fields', {
                  ...config.fields,
                  customer: { ...config.fields.customer, phone: f }
                })}
              />
              <FieldConfigRow
                label="Company"
                field={config.fields.customer.company}
                onUpdate={(f) => updateConfig('fields', {
                  ...config.fields,
                  customer: { ...config.fields.customer, company: f }
                })}
              />
            </div>
          </Section>

          {/* Shipping Section */}
          <Section title="Shipping" icon={Truck}>
            <div className="space-y-4">
              <Toggle
                label="Collect shipping address"
                description="Required for physical products"
                checked={config.fields.shipping.enabled}
                onChange={(checked) => updateConfig('fields', {
                  ...config.fields,
                  shipping: { ...config.fields.shipping, enabled: checked }
                })}
              />
              {config.fields.shipping.enabled && (
                <Toggle
                  label="Billing same as shipping"
                  checked={config.fields.billing.sameAsShipping}
                  onChange={(checked) => updateConfig('fields', {
                    ...config.fields,
                    billing: { ...config.fields.billing, sameAsShipping: checked }
                  })}
                />
              )}
            </div>
          </Section>

          {/* Payment Methods Section */}
          <Section title="Payment Methods" icon={CreditCard}>
            <div className="space-y-2">
              {config.payment.methods.map((method, index) => (
                <PaymentMethodRow
                  key={method.type}
                  method={method}
                  onUpdate={(updated) => {
                    const newMethods = [...config.payment.methods];
                    newMethods[index] = updated;
                    updateConfig('payment', { ...config.payment, methods: newMethods });
                  }}
                />
              ))}
            </div>
            <div className="pt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 mt-4">
              <Toggle
                label="Show order summary"
                checked={config.payment.showOrderSummary}
                onChange={(checked) => updateConfig('payment', { ...config.payment, showOrderSummary: checked })}
              />
              <Toggle
                label="Allow coupon codes"
                checked={config.payment.allowCoupons}
                onChange={(checked) => updateConfig('payment', { ...config.payment, allowCoupons: checked })}
              />
              <Toggle
                label="Show tax estimate"
                checked={config.payment.showTaxEstimate}
                onChange={(checked) => updateConfig('payment', { ...config.payment, showTaxEstimate: checked })}
              />
              <Toggle
                label="Show shipping estimate"
                checked={config.payment.showShippingEstimate}
                onChange={(checked) => updateConfig('payment', { ...config.payment, showShippingEstimate: checked })}
              />
            </div>
          </Section>

          {/* Trust Elements Section */}
          <Section title="Trust & Security" icon={Shield}>
            <div className="space-y-4">
              <Toggle
                label="Show security badges"
                description="SSL and secure checkout icons"
                checked={config.trust.showSecurityBadges}
                onChange={(checked) => updateConfig('trust', { ...config.trust, showSecurityBadges: checked })}
              />
              <Toggle
                label="Show guarantee"
                checked={config.trust.showGuarantee}
                onChange={(checked) => updateConfig('trust', { ...config.trust, showGuarantee: checked })}
              />
              {config.trust.showGuarantee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Guarantee Text</label>
                  <input
                    type="text"
                    value={config.trust.guaranteeText || ''}
                    onChange={(e) => updateConfig('trust', { ...config.trust, guaranteeText: e.target.value })}
                    placeholder="30-day money-back guarantee"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Appearance Section */}
          <Section title="Appearance" icon={Palette}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['light', 'dark', 'minimal', 'modern'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateConfig('appearance', { ...config.appearance, theme })}
                      className={`p-2 text-xs font-medium rounded-lg border-2 capitalize transition-colors ${
                        config.appearance.theme === theme
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.appearance.primaryColor}
                    onChange={(e) => updateConfig('appearance', { ...config.appearance, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.appearance.primaryColor}
                    onChange={(e) => updateConfig('appearance', { ...config.appearance, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Border Radius</label>
                <div className="flex gap-2">
                  {(['none', 'sm', 'md', 'lg', 'full'] as const).map((radius) => (
                    <button
                      key={radius}
                      onClick={() => updateConfig('appearance', { ...config.appearance, borderRadius: radius })}
                      className={`flex-1 p-2 text-xs font-medium rounded-lg border-2 transition-colors ${
                        config.appearance.borderRadius === radius
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {radius}
                    </button>
                  ))}
                </div>
              </div>

              <Toggle
                label="Show logo"
                checked={config.appearance.showLogo}
                onChange={(checked) => updateConfig('appearance', { ...config.appearance, showLogo: checked })}
              />
            </div>
          </Section>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-8 overflow-y-auto">
          <div className="mb-4 text-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Live Preview - {device.charAt(0).toUpperCase() + device.slice(1)}
            </span>
          </div>
          <LivePreview config={config} device={device} products={previewProducts} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default function CheckoutBuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Loading...</div>}>
      <CheckoutBuilderContent />
    </Suspense>
  );
}
