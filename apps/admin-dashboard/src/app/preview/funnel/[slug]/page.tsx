'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { funnelTemplatesApi, FunnelTemplate } from '@/lib/api/funnels';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Layout,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  Package,
  Lock,
  Shield,
  Star,
  Play,
  ChevronRight,
  Check,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE PREVIEW
// ═══════════════════════════════════════════════════════════════

interface LandingPreviewProps {
  config: Record<string, unknown>;
  onContinue: () => void;
}

function LandingPreview({ config, onContinue }: LandingPreviewProps) {
  const headline = (config.headline as string) || 'Welcome to Our Store';
  const subheadline = (config.subheadline as string) || 'Discover amazing products at great prices';
  const ctaText = (config.ctaText as string) || 'Get Started';
  const layout = (config.layout as string) || 'hero-cta';

  return (
    <div className="min-h-[600px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{headline}</h1>
        <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl mx-auto">{subheadline}</p>

        {layout === 'video-hero' && (
          <div className="aspect-video max-w-2xl mx-auto mb-10 bg-black/20 rounded-2xl flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}

        {layout === 'feature-grid' && (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Feature {i}</h3>
                <p className="text-sm text-white/70">Description of this amazing feature</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors shadow-xl"
        >
          {ctaText}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT SELECTION PREVIEW
// ═══════════════════════════════════════════════════════════════

interface ProductSelectionPreviewProps {
  config: Record<string, unknown>;
  onContinue: () => void;
}

const sampleProducts = [
  { id: '1', name: 'Premium Product', price: 79.99, image: '📦' },
  { id: '2', name: 'Standard Product', price: 49.99, image: '📦' },
  { id: '3', name: 'Basic Product', price: 29.99, image: '📦' },
  { id: '4', name: 'Deluxe Product', price: 99.99, image: '📦' },
];

function ProductSelectionPreview({ config, onContinue }: ProductSelectionPreviewProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const layout = (config.layout as string) || 'grid';
  const display = (config.display as Record<string, boolean>) || { showPrices: true, showDescription: true };
  const selection = (config.selection as Record<string, unknown>) || { mode: 'multiple' };

  const handleSelect = (productId: string) => {
    if (selection.mode === 'single') {
      setSelected([productId]);
    } else {
      setSelected((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
    }
  };

  if (layout === 'comparison') {
    return (
      <div className="min-h-[600px] bg-gray-50 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Choose Your Plan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {sampleProducts.slice(0, 3).map((product, index) => (
              <div
                key={product.id}
                onClick={() => handleSelect(product.id)}
                className={`bg-white rounded-2xl p-6 cursor-pointer transition-all ${
                  selected.includes(product.id)
                    ? 'ring-2 ring-indigo-500 shadow-lg'
                    : 'shadow hover:shadow-md'
                } ${index === 1 ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {index === 1 && (
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                <div className="text-3xl font-bold text-indigo-600 mb-4">
                  ${product.price}
                  <span className="text-sm text-gray-500 font-normal">/mo</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {[1, 2, 3].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500" />
                      Feature {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    selected.includes(product.id)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selected.includes(product.id) ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={onContinue}
                className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue to Checkout
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Select Products</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sampleProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleSelect(product.id)}
              className={`bg-white rounded-2xl p-4 cursor-pointer transition-all ${
                selected.includes(product.id)
                  ? 'ring-2 ring-indigo-500 shadow-lg'
                  : 'shadow hover:shadow-md'
              }`}
            >
              <div className="aspect-square bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-4xl">
                {product.image}
              </div>
              <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
              {display.showDescription && (
                <p className="text-xs text-gray-500 mb-2">Product description goes here</p>
              )}
              {display.showPrices && (
                <p className="font-bold text-indigo-600">${product.price}</p>
              )}
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={onContinue}
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue ({selected.length} selected)
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHECKOUT PREVIEW
// ═══════════════════════════════════════════════════════════════

interface CheckoutPreviewProps {
  config: Record<string, unknown>;
  onComplete: () => void;
}

function CheckoutPreview({ config, onComplete }: CheckoutPreviewProps) {
  const layout = (config.layout as string) || 'two-column';
  const fields = (config.fields as Record<string, unknown>) || {};
  const payment = (config.payment as Record<string, unknown>) || {};
  const trust = (config.trust as Record<string, unknown>) || {};

  const customerFields = (fields.customer as Record<string, { enabled: boolean; required: boolean }>) || {
    email: { enabled: true, required: true },
    firstName: { enabled: true, required: true },
    lastName: { enabled: true, required: true },
  };
  const shippingEnabled = (fields.shipping as { enabled: boolean })?.enabled ?? true;

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm';

  return (
    <div className="min-h-[600px] bg-gray-50 py-12 px-6">
      <div className={`max-w-4xl mx-auto ${layout === 'two-column' ? 'grid md:grid-cols-5 gap-8' : ''}`}>
        {/* Form */}
        <div className={layout === 'two-column' ? 'md:col-span-3' : ''}>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Checkout</h2>

            {/* Contact */}
            <div className="mb-6">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Contact Information</h3>
              <div className="space-y-3">
                {customerFields.email?.enabled && (
                  <input type="email" placeholder="Email" className={inputClass} />
                )}
                <div className="grid grid-cols-2 gap-3">
                  {customerFields.firstName?.enabled && (
                    <input type="text" placeholder="First Name" className={inputClass} />
                  )}
                  {customerFields.lastName?.enabled && (
                    <input type="text" placeholder="Last Name" className={inputClass} />
                  )}
                </div>
              </div>
            </div>

            {/* Shipping */}
            {shippingEnabled && (
              <div className="mb-6">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">Shipping Address</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Address" className={inputClass} />
                  <div className="grid grid-cols-3 gap-3">
                    <input type="text" placeholder="City" className={inputClass} />
                    <input type="text" placeholder="State" className={inputClass} />
                    <input type="text" placeholder="ZIP" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="mb-6">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Payment</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Card Number" className={inputClass} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="MM / YY" className={inputClass} />
                  <input type="text" placeholder="CVV" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Coupon */}
            {(payment.allowCoupons as boolean) && (
              <div className="mb-6">
                <div className="flex gap-2">
                  <input type="text" placeholder="Discount code" className={`flex-1 ${inputClass}`} />
                  <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Trust */}
            {((trust.showSecurityBadges as boolean) || (trust.showGuarantee as boolean)) && (
              <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-200 mt-6">
                {(trust.showSecurityBadges as boolean) && (
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secure checkout</span>
                  </div>
                )}
                {(trust.showGuarantee as boolean) && (
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{(trust.guaranteeText as string) || 'Money-back guarantee'}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onComplete}
              className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Complete Order - $99.00
            </button>
          </div>
        </div>

        {/* Order Summary */}
        {layout === 'two-column' && (payment.showOrderSummary as boolean) !== false && (
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="flex gap-4 pb-4 border-b border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Sample Product</p>
                  <p className="text-xs text-gray-500">Qty: 1</p>
                </div>
                <p className="font-medium text-sm">$79.00</p>
              </div>
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>$79.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>$5.99</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>$6.51</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>$91.50</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// THANK YOU PREVIEW
// ═══════════════════════════════════════════════════════════════

interface ThankYouPreviewProps {
  config: Record<string, unknown>;
}

function ThankYouPreview({ config }: ThankYouPreviewProps) {
  const headline = (config.headline as string) || 'Thank You!';
  const message = (config.message as string) || 'Your order has been confirmed.';

  return (
    <div className="min-h-[600px] bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{headline}</h2>
        <p className="text-lg text-gray-600 mb-8">{message}</p>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Order Number</p>
          <p className="text-xl font-mono font-bold text-gray-900">A-000-000-001</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PREVIEW PAGE
// ═══════════════════════════════════════════════════════════════

export default function TemplatePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [template, setTemplate] = useState<FunnelTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const data = await funnelTemplatesApi.getBySlug(slug);
      setTemplate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleContinue = () => {
    const stages = (template?.config as { stages?: unknown[] })?.stages;
    if (stages && currentStage < stages.length - 1) {
      setCurrentStage(currentStage + 1);
    }
  };

  const handleBack = () => {
    if (currentStage > 0) {
      setCurrentStage(currentStage - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Layout className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-gray-500">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Template Not Found</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/funnels/templates')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Browse Templates
          </button>
        </div>
      </div>
    );
  }

  const config = template.config as { stages?: Array<{ type: string; config: Record<string, unknown> }> };
  const stages = config.stages || [];
  const currentStageData = stages[currentStage];

  const deviceWidths = {
    desktop: 'max-w-full',
    tablet: 'max-w-[768px]',
    mobile: 'max-w-[375px]',
  };

  const renderStage = () => {
    if (!currentStageData) {
      // Component template (single stage)
      const componentConfig = template.config as { type: string; config: Record<string, unknown> };
      const stageType = componentConfig.type;
      const stageConfig = componentConfig.config || {};

      switch (stageType) {
        case 'LANDING':
          return <LandingPreview config={stageConfig} onContinue={() => {}} />;
        case 'PRODUCT_SELECTION':
          return <ProductSelectionPreview config={stageConfig} onContinue={() => {}} />;
        case 'CHECKOUT':
          return <CheckoutPreview config={stageConfig} onComplete={() => {}} />;
        case 'THANK_YOU':
          return <ThankYouPreview config={stageConfig} />;
        default:
          return <div className="p-8 text-center text-gray-500">Preview not available</div>;
      }
    }

    switch (currentStageData.type) {
      case 'LANDING':
        return <LandingPreview config={currentStageData.config || {}} onContinue={handleContinue} />;
      case 'PRODUCT_SELECTION':
        return <ProductSelectionPreview config={currentStageData.config || {}} onContinue={handleContinue} />;
      case 'CHECKOUT':
        return <CheckoutPreview config={currentStageData.config || {}} onComplete={handleContinue} />;
      case 'THANK_YOU':
        return <ThankYouPreview config={currentStageData.config || {}} />;
      default:
        return <div className="p-8 text-center text-gray-500">Preview not available for {currentStageData.type}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/funnels/templates')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{template.name}</h1>
            <p className="text-xs text-gray-500">Template Preview</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stage Progress */}
          {stages.length > 0 && (
            <div className="hidden md:flex items-center gap-2 mr-4">
              {stages.map((stage, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStage(index)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    index === currentStage
                      ? 'bg-indigo-100 text-indigo-700'
                      : index < currentStage
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {stage.type.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          {/* Device Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={`p-2 rounded-md transition-colors ${device === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <Monitor className={`w-4 h-4 ${device === 'desktop' ? 'text-indigo-600' : 'text-gray-500'}`} />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`p-2 rounded-md transition-colors ${device === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <Tablet className={`w-4 h-4 ${device === 'tablet' ? 'text-indigo-600' : 'text-gray-500'}`} />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`p-2 rounded-md transition-colors ${device === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <Smartphone className={`w-4 h-4 ${device === 'mobile' ? 'text-indigo-600' : 'text-gray-500'}`} />
            </button>
          </div>

          <button
            onClick={() => router.push('/funnels/templates')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Use This Template
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className={`${deviceWidths[device]} mx-auto`}>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {renderStage()}
          </div>
        </div>

        {/* Stage Navigation (Mobile) */}
        {stages.length > 1 && (
          <div className="flex md:hidden justify-center gap-2 mt-4">
            <button
              onClick={handleBack}
              disabled={currentStage === 0}
              className="px-4 py-2 bg-white rounded-lg font-medium text-gray-700 disabled:opacity-50"
            >
              Back
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              {currentStage + 1} / {stages.length}
            </span>
            <button
              onClick={handleContinue}
              disabled={currentStage === stages.length - 1}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
