'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2,
  Lock,
  Shield,
  CreditCard,
  Check,
  AlertCircle,
  Truck,
  Package,
  Star,
  Coffee,
  ArrowRight,
  ChevronRight,
  Plus,
  Minus,
  Leaf,
  Box,
} from 'lucide-react';
import {
  funnelCheckoutApi,
  FunnelCheckoutSummary,
  FunnelCheckoutResult,
  getCheckoutErrorMessage,
} from '@/lib/api/funnels';
import { COUNTRIES, getCountryByCode } from '@/lib/address-data';
import { AddressAutocomplete } from '@/components/address';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface HeroSection {
  id: string;
  type: 'hero';
  config: {
    headline: string;
    subheadline: string;
    backgroundImage?: string;
  };
}

interface FeaturesSection {
  id: string;
  type: 'features';
  config: {
    title: string;
    features: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
}

interface TestimonialsSection {
  id: string;
  type: 'testimonials';
  config: {
    title: string;
    testimonials: Array<{
      name: string;
      text: string;
      rating?: number;
      role?: string;
    }>;
  };
}

interface CtaSection {
  id: string;
  type: 'cta';
  config: {
    headline: string;
    subheadline: string;
    benefits?: string[];
  };
}

type Section = HeroSection | FeaturesSection | TestimonialsSection | CtaSection;

interface LandingStageConfig {
  cta?: {
    text: string;
    style?: string;
  };
  layout?: string;
  sections?: Section[];
}

interface ProductSelectionConfig {
  source?: {
    type: string;
    productIds?: string[];
  };
  selection?: {
    mode: string;
    minItems?: number;
    maxItems?: number;
    allowQuantity?: boolean;
  };
  display?: {
    showPrices?: boolean;
    showDescription?: boolean;
    showQuantity?: boolean;
  };
  cta?: {
    text: string;
    position?: string;
  };
}

interface CheckoutConfig {
  layout?: string;
  fields?: Record<string, unknown>;
  payment?: {
    methods?: Array<{ type: string; enabled: boolean }>;
  };
  trust?: {
    showSecurityBadges?: boolean;
    showGuarantee?: boolean;
    guaranteeText?: string;
  };
}

interface FunnelStage {
  id: string;
  name: string;
  type: 'LANDING' | 'PRODUCT_SELECTION' | 'CHECKOUT' | 'UPSELL' | 'THANK_YOU';
  order: number;
  config: LandingStageConfig | ProductSelectionConfig | CheckoutConfig;
}

interface PublicFunnel {
  id: string;
  name: string;
  slug: string;
  seoUrl: string;
  description?: string;
  companyId: string;
  settings: {
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      fontFamily?: string;
    };
    [key: string]: unknown;
  };
  stages: FunnelStage[];
  company: {
    id: string;
    name: string;
    logo?: string;
  };
}

interface FunnelSession {
  id: string;
  sessionToken: string;
  status: string;
  funnelId: string;
  currentStageOrder: number;
  selectedProducts?: Array<{
    productId: string;
    quantity: number;
    price: number;
    name: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  images?: Array<{ url: string }>;
  sku?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function fetchFunnel(seoSlug: string): Promise<PublicFunnel> {
  const response = await fetch(`${API_BASE}/api/f/${seoSlug}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Funnel not found' }));
    throw new Error(error.message || 'Funnel not found');
  }
  return response.json();
}

async function startSession(funnelId: string): Promise<FunnelSession> {
  const response = await fetch(`${API_BASE}/api/f/${funnelId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error('Failed to start session');
  }
  return response.json();
}

async function fetchProductsByIds(companyId: string, productIds: string[]): Promise<Product[]> {
  // Fetch products by IDs from the public products endpoint
  try {
    const response = await fetch(`${API_BASE}/api/products/public?companyId=${companyId}&limit=50`);
    if (!response.ok) return [];
    const data = await response.json();
    const allProducts = data.items || data || [];
    // Filter to only the specified product IDs
    if (productIds.length > 0) {
      return allProducts.filter((p: Product) => productIds.includes(p.id));
    }
    return allProducts;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════

function FeatureIcon({ icon, color }: { icon: string; color: string }) {
  // Handle emoji icons
  if (icon.length <= 2 || /\p{Emoji}/u.test(icon)) {
    return <span className="text-2xl">{icon}</span>;
  }
  // Handle named icons
  const iconMap: Record<string, React.ReactNode> = {
    coffee: <Coffee className="w-6 h-6" style={{ color }} />,
    truck: <Truck className="w-6 h-6" style={{ color }} />,
    star: <Star className="w-6 h-6" style={{ color }} />,
    shield: <Shield className="w-6 h-6" style={{ color }} />,
    leaf: <Leaf className="w-6 h-6" style={{ color }} />,
    box: <Box className="w-6 h-6" style={{ color }} />,
    package: <Package className="w-6 h-6" style={{ color }} />,
  };
  return iconMap[icon.toLowerCase()] || <span className="text-2xl">{icon}</span>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PublicFunnelPage() {
  const params = useParams();
  const seoSlug = params?.seoSlug as string;

  const [funnel, setFunnel] = useState<PublicFunnel | null>(null);
  const [session, setSession] = useState<FunnelSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product selection state
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());

  // Checkout state
  const [checkoutStep, setCheckoutStep] = useState<'shipping' | 'payment' | 'complete'>('shipping');
  const [summary, setSummary] = useState<FunnelCheckoutSummary | null>(null);
  const [processing, setProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<FunnelCheckoutResult | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    firstName: '',
    lastName: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });
  const [card, setCard] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });

  // Load funnel and start session
  useEffect(() => {
    if (!seoSlug) return;

    const init = async () => {
      try {
        setLoading(true);
        const funnelData = await fetchFunnel(seoSlug);
        setFunnel(funnelData);

        // Start a new session
        const sessionData = await startSession(funnelData.id);
        setSession(sessionData);

        // Fetch products if there's a product selection stage
        const productStage = funnelData.stages.find(s => s.type === 'PRODUCT_SELECTION');
        if (productStage) {
          const config = productStage.config as ProductSelectionConfig;
          const productIds = config.source?.productIds || [];
          const productsData = await fetchProductsByIds(funnelData.companyId, productIds);
          setProducts(productsData);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [seoSlug]);

  // Sort stages by order
  const sortedStages = funnel?.stages?.slice().sort((a, b) => a.order - b.order) || [];
  const currentStage = sortedStages[currentStageIndex];
  const primaryColor = funnel?.settings?.branding?.primaryColor || '#4F46E5';

  // Advance to next stage
  const advanceStage = () => {
    if (currentStageIndex < sortedStages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Product selection handlers
  const addProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      newMap.set(productId, (prev.get(productId) || 0) + 1);
      return newMap;
    });
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      const current = prev.get(productId) || 0;
      if (current <= 1) {
        newMap.delete(productId);
      } else {
        newMap.set(productId, current - 1);
      }
      return newMap;
    });
  };

  const getSelectedTotal = () => {
    let total = 0;
    selectedProducts.forEach((qty, productId) => {
      const product = products.find(p => p.id === productId);
      if (product) total += product.price * qty;
    });
    return total;
  };

  // Checkout handlers
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.sessionToken) return;

    if (!email || !shippingAddress.firstName || !shippingAddress.lastName ||
        !shippingAddress.street1 || !shippingAddress.city || !shippingAddress.state ||
        !shippingAddress.postalCode) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      await funnelCheckoutApi.updateSession(session.sessionToken, {
        shippingAddress,
        customerInfo: { email },
        selectedProducts: Array.from(selectedProducts.entries()).map(([productId, quantity]) => {
          const product = products.find(p => p.id === productId);
          return {
            productId,
            quantity,
            price: product?.price || 0,
            name: product?.name || '',
          };
        }),
      });

      const summaryData = await funnelCheckoutApi.getCheckoutSummary(session.sessionToken);
      setSummary(summaryData);
      setCheckoutStep('payment');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.sessionToken) return;

    if (!card.number || !card.expiryMonth || !card.expiryYear || !card.cvv) {
      setError('Please fill in all card details');
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const result = await funnelCheckoutApi.processCheckout(session.sessionToken, {
        card,
        billingAddress: { ...shippingAddress, email },
        email,
        saveCard: false,
      });

      if (result.success) {
        setCheckoutResult(result);
        setCheckoutStep('complete');
      } else {
        setError(getCheckoutErrorMessage(result.errorCode, result.error));
      }
    } catch (err) {
      setError((err as Error).message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length && i < 16; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: Loading
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!funnel || !session || !currentStage) return null;

  // ─────────────────────────────────────────────────────────────
  // RENDER: Landing Stage
  // ─────────────────────────────────────────────────────────────

  if (currentStage.type === 'LANDING') {
    const config = currentStage.config as LandingStageConfig;
    const sections = config.sections || [];
    const ctaText = config.cta?.text || 'Get Started';

    const heroSection = sections.find(s => s.type === 'hero') as HeroSection | undefined;
    const featuresSection = sections.find(s => s.type === 'features') as FeaturesSection | undefined;
    const testimonialsSection = sections.find(s => s.type === 'testimonials') as TestimonialsSection | undefined;
    const ctaSection = sections.find(s => s.type === 'cta') as CtaSection | undefined;

    return (
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        {heroSection && (
          <section
            className="relative py-20 px-4 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)`
            }}
          >
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                {heroSection.config.headline}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {heroSection.config.subheadline}
              </p>
              <button
                onClick={advanceStage}
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-foreground rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                style={{ backgroundColor: primaryColor }}
              >
                {ctaText}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

        {/* Features Section */}
        {featuresSection && featuresSection.config.features.length > 0 && (
          <section className="py-16 px-4 bg-muted/50">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-foreground mb-12">
                {featuresSection.config.title}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuresSection.config.features.map((feature, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <FeatureIcon icon={feature.icon} color={primaryColor} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        {testimonialsSection && testimonialsSection.config.testimonials.length > 0 && (
          <section className="py-16 px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-foreground mb-12">
                {testimonialsSection.config.title}
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {testimonialsSection.config.testimonials.map((testimonial, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-2xl p-6">
                    {testimonial.rating && (
                      <div className="flex gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < testimonial.rating! ? 'text-amber-400 fill-amber-400' : 'text-foreground'}`}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-foreground font-semibold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        {testimonial.role && <p className="text-sm text-muted-foreground">{testimonial.role}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        {ctaSection && (
          <section className="py-16 px-4" style={{ backgroundColor: `${primaryColor}10` }}>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">{ctaSection.config.headline}</h2>
              <p className="text-lg text-muted-foreground mb-6">{ctaSection.config.subheadline}</p>
              {ctaSection.config.benefits && ctaSection.config.benefits.length > 0 && (
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {ctaSection.config.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-600" />
                      {benefit}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={advanceStage}
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-foreground rounded-xl shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                {ctaText}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border">
          <div className="max-w-5xl mx-auto text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {funnel.company.name}. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Product Selection Stage
  // ─────────────────────────────────────────────────────────────

  if (currentStage.type === 'PRODUCT_SELECTION') {
    const config = currentStage.config as ProductSelectionConfig;
    const ctaText = config.cta?.text || 'Continue to Checkout';
    const minItems = config.selection?.minItems || 1;

    return (
      <div className="min-h-screen bg-muted/50 pb-24">
        {/* Header */}
        <header className="bg-white border-b border-border sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="font-semibold text-lg text-foreground">{funnel.company.name}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">{currentStage.name}</h1>
          <p className="text-muted-foreground mb-8">Select the products you'd like to order</p>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const quantity = selectedProducts.get(product.id) || 0;
                const imageUrl = product.images?.[0]?.url || product.images?.[0];
                return (
                  <div key={product.id} className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                    {imageUrl && (
                      <div className="aspect-square bg-muted">
                        <img
                          src={typeof imageUrl === 'string' ? imageUrl : ''}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!imageUrl && (
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        <Coffee className="w-16 h-16 text-foreground" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold" style={{ color: primaryColor }}>
                            ${product.price.toFixed(2)}
                          </span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="ml-2 text-sm text-muted-foreground line-through">
                              ${product.compareAtPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {quantity === 0 ? (
                          <button
                            onClick={() => addProduct(product.id)}
                            className="px-4 py-2 text-sm font-medium text-foreground rounded-lg transition-colors hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeProduct(product.id)}
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <button
                              onClick={() => addProduct(product.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-foreground transition-colors hover:opacity-90"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Fixed Cart Summary */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {selectedProducts.size === 0
                  ? `Select at least ${minItems} item${minItems > 1 ? 's' : ''}`
                  : `${Array.from(selectedProducts.values()).reduce((a, b) => a + b, 0)} item(s) selected`}
              </p>
              <p className="text-xl font-bold text-foreground">
                ${getSelectedTotal().toFixed(2)}
              </p>
            </div>
            <button
              onClick={advanceStage}
              disabled={selectedProducts.size < minItems}
              className="px-6 py-3 text-foreground font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {ctaText}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Checkout Stage - Success
  // ─────────────────────────────────────────────────────────────

  if (currentStage.type === 'CHECKOUT' && checkoutStep === 'complete' && checkoutResult?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Check className="h-10 w-10 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-4">
            Thank you for your purchase. A confirmation email will be sent to {email}.
          </p>
          {checkoutResult.orderNumber && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-border mb-6">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="text-lg font-mono font-semibold text-foreground">{checkoutResult.orderNumber}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Checkout Stage
  // ─────────────────────────────────────────────────────────────

  if (currentStage.type === 'CHECKOUT') {
    const config = currentStage.config as CheckoutConfig;
    const showGuarantee = config.trust?.showGuarantee;
    const guaranteeText = config.trust?.guaranteeText;

    return (
      <div className="min-h-screen bg-muted/50">
        {/* Header */}
        <header className="bg-white border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="font-semibold text-lg text-foreground">{funnel.company.name}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </header>

        {/* Progress */}
        <div className="bg-white border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-8">
              {[
                { key: 'shipping', label: 'Shipping', icon: Truck },
                { key: 'payment', label: 'Payment', icon: CreditCard },
                { key: 'complete', label: 'Done', icon: Check },
              ].map((step, idx) => {
                const isActive = step.key === checkoutStep;
                const isPast = ['shipping', 'payment', 'complete'].indexOf(step.key) <
                              ['shipping', 'payment', 'complete'].indexOf(checkoutStep);
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      isActive ? 'text-foreground' : isPast ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                    }`} style={isActive ? { backgroundColor: primaryColor } : {}}>
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:block">{step.label}</span>
                    </div>
                    {idx < 2 && <div className={`w-8 h-0.5 mx-2 ${isPast ? 'bg-green-300' : 'bg-zinc-200'}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Shipping Form */}
              {checkoutStep === 'shipping' && (
                <form onSubmit={handleShippingSubmit}>
                  <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-6">Shipping Information</h2>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">First Name *</label>
                        <input
                          type="text"
                          value={shippingAddress.firstName}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={shippingAddress.lastName}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Address *</label>
                      <AddressAutocomplete
                        value={shippingAddress.street1}
                        onChange={(value) => setShippingAddress({ ...shippingAddress, street1: value })}
                        onAddressSelect={(address) => {
                          setShippingAddress({
                            ...shippingAddress,
                            street1: address.street1,
                            street2: address.street2 || '',
                            city: address.city,
                            state: address.stateCode,
                            postalCode: address.postalCode,
                            country: address.countryCode,
                          });
                        }}
                        companyId={funnel.companyId}
                        selectedCountry={shippingAddress.country}
                        placeholder="Start typing your address..."
                        className="mb-2"
                      />
                      <input
                        type="text"
                        value={shippingAddress.street2}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, street2: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                        placeholder="Apt, suite (optional)"
                      />
                    </div>

                    {/* Country */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Country *</label>
                      <select
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value, state: '' })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                        required
                      >
                        {COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code}>{country.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">City *</label>
                        <input
                          type="text"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          {getCountryByCode(shippingAddress.country)?.regionLabel || 'State'} *
                        </label>
                        <select
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          required
                        >
                          <option value="">Select {(getCountryByCode(shippingAddress.country)?.regionLabel || 'state').toLowerCase()}</option>
                          {(getCountryByCode(shippingAddress.country)?.regions || []).map((region) => (
                            <option key={region.code} value={region.code}>{region.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          {getCountryByCode(shippingAddress.country)?.postalLabel || 'ZIP'} *
                        </label>
                        <input
                          type="text"
                          value={shippingAddress.postalCode}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          placeholder={getCountryByCode(shippingAddress.country)?.postalPlaceholder || '12345'}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full px-6 py-3 text-foreground rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Continue to Payment
                    </button>
                  </div>
                </form>
              )}

              {/* Payment Form */}
              {checkoutStep === 'payment' && (
                <form onSubmit={handlePaymentSubmit}>
                  <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-6">Payment Details</h2>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Card Number *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatCardNumber(card.number)}
                          onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\s/g, '') })}
                          className="w-full pl-12 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                          required
                        />
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Month *</label>
                        <select
                          value={card.expiryMonth}
                          onChange={(e) => setCard({ ...card, expiryMonth: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          required
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Year *</label>
                        <select
                          value={card.expiryYear}
                          onChange={(e) => setCard({ ...card, expiryYear: e.target.value })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          required
                        >
                          <option value="">YYYY</option>
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                            <option key={y} value={y.toString()}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">CVV *</label>
                        <input
                          type="text"
                          value={card.cvv}
                          onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-white"
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep('shipping')}
                        className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex-1 px-6 py-3 bg-green-600 text-foreground rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                      >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        Pay {summary ? `$${summary.total.toFixed(2)}` : ''}
                      </button>
                    </div>
                  </div>

                  {/* Security & Guarantee */}
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-700">Your payment is secured with 256-bit SSL encryption</p>
                    </div>
                    {showGuarantee && guaranteeText && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-700">{guaranteeText}</p>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-border p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>

                {selectedProducts.size > 0 ? (
                  <div className="space-y-3 pb-4 border-b border-border">
                    {Array.from(selectedProducts.entries()).map(([productId, qty]) => {
                      const product = products.find(p => p.id === productId);
                      if (!product) return null;
                      return (
                        <div key={productId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{product.name} <span className="text-muted-foreground">x{qty}</span></span>
                          </div>
                          <span className="font-medium text-foreground">${(product.price * qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : summary?.items ? (
                  <div className="space-y-3 pb-4 border-b border-border">
                    {summary.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                        </div>
                        <span className="font-medium text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="py-4 space-y-2 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${summary?.subtotal?.toFixed(2) || getSelectedTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">{summary ? `$${summary.shippingAmount.toFixed(2)}` : 'Calculated next'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">{summary ? `$${summary.taxAmount.toFixed(2)}` : 'Calculated next'}</span>
                  </div>
                </div>

                <div className="flex justify-between py-4 text-lg font-semibold">
                  <span className="text-foreground">Total</span>
                  <span style={{ color: primaryColor }}>
                    ${summary?.total?.toFixed(2) || getSelectedTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Fallback for unknown stage types
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Stage type not supported: {currentStage.type}</p>
      </div>
    </div>
  );
}
