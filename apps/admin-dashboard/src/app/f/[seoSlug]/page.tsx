'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFunnelUrlSync } from '@/hooks/use-funnel-url-sync';
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
  ChevronDown,
  Plus,
  Minus,
  Leaf,
  Box,
  Sparkles,
  Zap,
  Heart,
  Award,
  Clock,
  Users,
  ThumbsUp,
  Quote,
  HelpCircle,
  Sun,
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
    backgroundVideo?: string;
    suggestedImageKeywords?: string[];
    ctaText?: string;
  };
}

// Stock image mapping for fallback hero images
const STOCK_HERO_IMAGES: Record<string, { url: string; alt: string }> = {
  'winter': {
    url: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=1920&q=80',
    alt: 'Winter mountain landscape with snow',
  },
  'coffee': {
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=80',
    alt: 'Artisan coffee being poured',
  },
  'ecommerce': {
    url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80',
    alt: 'Shopping cart with colorful products',
  },
  'technology': {
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80',
    alt: 'Modern technology abstract',
  },
  'business': {
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80',
    alt: 'Professional business workspace',
  },
  'fitness': {
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80',
    alt: 'Modern gym with equipment',
  },
  'food': {
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80',
    alt: 'Delicious gourmet food spread',
  },
  'nature': {
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
    alt: 'Beautiful forest with sunlight',
  },
  'sale': {
    url: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1920&q=80',
    alt: 'Colorful sale shopping bags',
  },
  'default': {
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
    alt: 'Abstract gradient background',
  },
};

// Resolve hero image from keywords
function resolveHeroImage(keywords?: string[]): { url: string; alt: string } | null {
  if (!keywords || keywords.length === 0) return null;

  const normalizedKeywords = keywords.map(k => k.toLowerCase());

  // Try to match keywords to stock images
  for (const keyword of normalizedKeywords) {
    for (const [category, image] of Object.entries(STOCK_HERO_IMAGES)) {
      if (keyword.includes(category) || category.includes(keyword)) {
        return image;
      }
    }

    // Specific keyword matching
    if (keyword.includes('winter') || keyword.includes('snow') || keyword.includes('cold') || keyword.includes('holiday')) {
      return STOCK_HERO_IMAGES['winter'];
    }
    if (keyword.includes('coffee') || keyword.includes('cafe') || keyword.includes('brew') || keyword.includes('roast')) {
      return STOCK_HERO_IMAGES['coffee'];
    }
    if (keyword.includes('shop') || keyword.includes('store') || keyword.includes('buy') || keyword.includes('cart')) {
      return STOCK_HERO_IMAGES['ecommerce'];
    }
    if (keyword.includes('tech') || keyword.includes('software') || keyword.includes('digital') || keyword.includes('saas')) {
      return STOCK_HERO_IMAGES['technology'];
    }
    if (keyword.includes('sale') || keyword.includes('discount') || keyword.includes('deal') || keyword.includes('offer')) {
      return STOCK_HERO_IMAGES['sale'];
    }
  }

  return STOCK_HERO_IMAGES['default'];
}

interface FeaturesSection {
  id: string;
  type: 'features';
  config: {
    title?: string;
    sectionTitle?: string; // AI uses sectionTitle
    features?: Array<{
      icon?: string;
      iconSuggestion?: string; // AI uses iconSuggestion
      title: string;
      description: string;
    }>;
    benefits?: Array<{ // AI uses benefits instead of features
      icon?: string;
      iconSuggestion?: string;
      title: string;
      description: string;
    }>;
  };
}

interface TestimonialsSection {
  id: string;
  type: 'testimonials';
  config: {
    title?: string;
    sectionTitle?: string; // AI uses sectionTitle
    testimonials?: Array<{
      name: string;
      text: string;
      rating?: number;
      role?: string;
    }>;
    testimonialPrompts?: string[]; // AI generates prompts
    statsToHighlight?: string[]; // AI generates stats
  };
}

interface FaqSection {
  id: string;
  type: 'faq';
  config: {
    title?: string;
    sectionTitle?: string;
    items?: Array<{
      question: string;
      answer: string;
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
    buttonText?: string;
    urgencyText?: string;
  };
}

type Section = HeroSection | FeaturesSection | TestimonialsSection | FaqSection | CtaSection;

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
  if (!icon) {
    return <Sparkles className="w-6 h-6" style={{ color }} />;
  }
  // Handle emoji icons
  if (icon.length <= 2 || /\p{Emoji}/u.test(icon)) {
    return <span className="text-2xl">{icon}</span>;
  }
  // Handle named icons - normalize to lowercase and handle variations
  const iconKey = icon.toLowerCase().replace(/[-_]/g, '');
  const iconMap: Record<string, React.ReactNode> = {
    coffee: <Coffee className="w-6 h-6" style={{ color }} />,
    coffeebean: <Coffee className="w-6 h-6" style={{ color }} />,
    truck: <Truck className="w-6 h-6" style={{ color }} />,
    star: <Star className="w-6 h-6" style={{ color }} />,
    shield: <Shield className="w-6 h-6" style={{ color }} />,
    leaf: <Leaf className="w-6 h-6" style={{ color }} />,
    box: <Box className="w-6 h-6" style={{ color }} />,
    package: <Package className="w-6 h-6" style={{ color }} />,
    sparkles: <Sparkles className="w-6 h-6" style={{ color }} />,
    zap: <Zap className="w-6 h-6" style={{ color }} />,
    heart: <Heart className="w-6 h-6" style={{ color }} />,
    award: <Award className="w-6 h-6" style={{ color }} />,
    clock: <Clock className="w-6 h-6" style={{ color }} />,
    users: <Users className="w-6 h-6" style={{ color }} />,
    thumbsup: <ThumbsUp className="w-6 h-6" style={{ color }} />,
    check: <Check className="w-6 h-6" style={{ color }} />,
    sun: <Sun className="w-6 h-6" style={{ color }} />,
    sunrise: <Sun className="w-6 h-6" style={{ color }} />,
    palmtree: <Leaf className="w-6 h-6" style={{ color }} />, // Fallback
    yinyang: <Sparkles className="w-6 h-6" style={{ color }} />, // Fallback for balance
  };
  return iconMap[iconKey] || <Sparkles className="w-6 h-6" style={{ color }} />;
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

  // URL sync for browser navigation (back/forward/refresh)
  useFunnelUrlSync({
    stages: sortedStages,
    currentStageIndex,
    setCurrentStageIndex,
    isInitialized: !loading && !!funnel && !!session,
  });

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400 mx-auto" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Page Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
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
    const faqSection = sections.find(s => s.type === 'faq') as FaqSection | undefined;
    const ctaSection = sections.find(s => s.type === 'cta') as CtaSection | undefined;

    // Normalize features/benefits - AI uses 'benefits', templates use 'features'
    const featureItems = featuresSection?.config?.features || featuresSection?.config?.benefits || [];
    const featureTitle = featuresSection?.config?.sectionTitle || featuresSection?.config?.title || 'Why Choose Us';

    // Normalize testimonials - AI uses testimonialPrompts, templates use testimonials
    const testimonialItems = testimonialsSection?.config?.testimonials || [];
    const testimonialPrompts = testimonialsSection?.config?.testimonialPrompts || [];
    const statsToHighlight = testimonialsSection?.config?.statsToHighlight || [];
    const testimonialsTitle = testimonialsSection?.config?.sectionTitle || testimonialsSection?.config?.title || 'What Our Customers Say';

    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Hero Section */}
        {heroSection && (() => {
          // Resolve background image from config or keywords
          const configImage = heroSection.config?.backgroundImage;
          const stockImage = resolveHeroImage(heroSection.config?.suggestedImageKeywords);
          const heroImageUrl = configImage || stockImage?.url;
          const heroImageAlt = stockImage?.alt || 'Hero background';
          const hasImage = !!heroImageUrl;

          return (
            <section
              className="relative py-20 md:py-32 px-4 overflow-hidden min-h-[500px] flex items-center"
              style={{
                background: hasImage
                  ? 'transparent'
                  : `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}05 50%, white 100%)`
              }}
            >
              {/* Background Image */}
              {hasImage && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${heroImageUrl})` }}
                    role="img"
                    aria-label={heroImageAlt}
                  />
                  {/* Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
                </>
              )}

              {/* Background Video (Enterprise tier) */}
              {heroSection.config?.backgroundVideo && (
                <>
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  >
                    <source src={heroSection.config.backgroundVideo} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-black/50" />
                </>
              )}

              <div className="max-w-4xl mx-auto text-center relative z-10">
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight ${hasImage ? 'text-white drop-shadow-lg' : 'text-gray-900 dark:text-gray-100'}`}>
                  {heroSection.config?.headline}
                </h1>
                <p className={`text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed ${hasImage ? 'text-white/90 drop-shadow' : 'text-gray-600 dark:text-gray-400'}`}>
                  {heroSection.config?.subheadline}
                </p>
                <button
                  onClick={advanceStage}
                  className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  {heroSection.config?.ctaText || ctaText}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </section>
          );
        })()}

        {/* Features/Benefits Section */}
        {featuresSection && featureItems.length > 0 && (
          <section className="py-16 md:py-20 px-4 bg-gray-50 dark:bg-gray-800">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
                {featureTitle}
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                Discover what makes us different
              </p>
              <div className={`grid gap-8 ${featureItems.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                {featureItems.map((feature, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <FeatureIcon icon={feature.icon || feature.iconSuggestion || ''} color={primaryColor} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Social Proof / Testimonials Section */}
        {testimonialsSection && (testimonialItems.length > 0 || testimonialPrompts.length > 0 || statsToHighlight.length > 0) && (
          <section className="py-16 md:py-20 px-4 bg-white dark:bg-gray-900">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
                {testimonialsTitle}
              </h2>

              {/* Stats Banner */}
              {statsToHighlight.length > 0 && (
                <div className="flex flex-wrap justify-center gap-8 mb-12">
                  {statsToHighlight.map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{stat}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actual testimonials */}
              {testimonialItems.length > 0 && (
                <div className="grid md:grid-cols-3 gap-6">
                  {testimonialItems.map((testimonial, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                      {testimonial.rating && (
                        <div className="flex gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < testimonial.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-gray-600 dark:text-gray-400 mb-4 italic leading-relaxed">"{testimonial.text}"</p>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {testimonial.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{testimonial.name}</p>
                          {testimonial.role && <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI-generated testimonial prompts (displayed as quotes) */}
              {testimonialItems.length === 0 && testimonialPrompts.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {testimonialPrompts.map((prompt, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 relative">
                      <Quote className="w-8 h-8 text-gray-200 dark:text-gray-700 absolute top-4 left-4" />
                      <div className="flex gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed pl-2">"{prompt}"</p>
                      <div className="flex items-center gap-3 mt-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <ThumbsUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">Happy Customer</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Verified Purchase</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {faqSection && faqSection.config?.items && faqSection.config.items.length > 0 && (
          <section className="py-16 md:py-20 px-4 bg-gray-50 dark:bg-gray-800">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
                {faqSection.config?.sectionTitle || faqSection.config?.title || 'Frequently Asked Questions'}
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
                Everything you need to know
              </p>
              <div className="space-y-4">
                {faqSection.config.items.map((item, idx) => (
                  <details key={idx} className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 pr-4">{item.question}</span>
                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        {ctaSection && (
          <section className="py-16 md:py-20 px-4" style={{ backgroundColor: `${primaryColor}08` }}>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">{ctaSection.config?.headline}</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">{ctaSection.config?.subheadline}</p>
              {ctaSection.config?.urgencyText && (
                <p className="text-sm font-medium mb-6" style={{ color: primaryColor }}>
                  {ctaSection.config.urgencyText}
                </p>
              )}
              {ctaSection.config?.benefits && ctaSection.config.benefits.length > 0 && (
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {ctaSection.config.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={advanceStage}
                className="inline-flex items-center gap-2 px-10 py-4 text-lg font-semibold text-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                style={{ backgroundColor: primaryColor }}
              >
                {ctaSection.config?.buttonText || ctaText}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">{funnel.company.name}</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Lock className="h-4 w-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{currentStage.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Select the products you'd like to order</p>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const quantity = selectedProducts.get(product.id) || 0;
                const imageUrl = product.images?.[0]?.url || product.images?.[0];
                return (
                  <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    {imageUrl && (
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700">
                        <img
                          src={typeof imageUrl === 'string' ? imageUrl : ''}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!imageUrl && (
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Coffee className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold" style={{ color: primaryColor }}>
                            ${product.price.toFixed(2)}
                          </span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 line-through">
                              ${product.compareAtPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {quantity === 0 ? (
                          <button
                            onClick={() => addProduct(product.id)}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeProduct(product.id)}
                              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium text-gray-900 dark:text-gray-100">{quantity}</span>
                            <button
                              onClick={() => addProduct(product.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors hover:opacity-90"
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
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedProducts.size === 0
                  ? `Select at least ${minItems} item${minItems > 1 ? 's' : ''}`
                  : `${Array.from(selectedProducts.values()).reduce((a, b) => a + b, 0)} item(s) selected`}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ${getSelectedTotal().toFixed(2)}
              </p>
            </div>
            <button
              onClick={advanceStage}
              disabled={selectedProducts.size < minItems}
              className="px-6 py-3 text-white font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Thank you for your purchase. A confirmation email will be sent to {email}.
          </p>
          {checkoutResult.orderNumber && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
              <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">{checkoutResult.orderNumber}</p>
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">{funnel.company.name}</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Lock className="h-4 w-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </header>

        {/* Progress */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
                      isActive ? 'text-white' : isPast ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`} style={isActive ? { backgroundColor: primaryColor } : {}}>
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:block">{step.label}</span>
                    </div>
                    {idx < 2 && <div className={`w-8 h-0.5 mx-2 ${isPast ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-600'}`} />}
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
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Shipping Form */}
              {checkoutStep === 'shipping' && (
                <form onSubmit={handleShippingSubmit}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Shipping Information</h2>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                        <input
                          type="text"
                          value={shippingAddress.firstName}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={shippingAddress.lastName}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
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
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        placeholder="Apt, suite (optional)"
                      />
                    </div>

                    {/* Country */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
                      <select
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value, state: '' })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        required
                      >
                        {COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code}>{country.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
                        <input
                          type="text"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {getCountryByCode(shippingAddress.country)?.regionLabel || 'State'} *
                        </label>
                        <select
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          required
                        >
                          <option value="">Select {(getCountryByCode(shippingAddress.country)?.regionLabel || 'state').toLowerCase()}</option>
                          {(getCountryByCode(shippingAddress.country)?.regions || []).map((region) => (
                            <option key={region.code} value={region.code}>{region.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {getCountryByCode(shippingAddress.country)?.postalLabel || 'ZIP'} *
                        </label>
                        <input
                          type="text"
                          value={shippingAddress.postalCode}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          placeholder={getCountryByCode(shippingAddress.country)?.postalPlaceholder || '12345'}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
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
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Payment Details</h2>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatCardNumber(card.number)}
                          onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\s/g, '') })}
                          className="w-full pl-12 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                          required
                        />
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month *</label>
                        <select
                          value={card.expiryMonth}
                          onChange={(e) => setCard({ ...card, expiryMonth: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          required
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year *</label>
                        <select
                          value={card.expiryYear}
                          onChange={(e) => setCard({ ...card, expiryYear: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                          required
                        >
                          <option value="">YYYY</option>
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                            <option key={y} value={y.toString()}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVV *</label>
                        <input
                          type="text"
                          value={card.cvv}
                          onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
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
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                      >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        Pay {summary ? `$${summary.total.toFixed(2)}` : ''}
                      </button>
                    </div>
                  </div>

                  {/* Security & Guarantee */}
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-sm text-green-700 dark:text-green-400">Your payment is secured with 256-bit SSL encryption</p>
                    </div>
                    {showGuarantee && guaranteeText && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3">
                        <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-400">{guaranteeText}</p>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>

                {selectedProducts.size > 0 ? (
                  <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    {Array.from(selectedProducts.entries()).map(([productId, qty]) => {
                      const product = products.find(p => p.id === productId);
                      if (!product) return null;
                      return (
                        <div key={productId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{product.name} <span className="text-gray-500 dark:text-gray-400">x{qty}</span></span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${(product.price * qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : summary?.items ? (
                  <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    {summary.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">{item.name} <span className="text-gray-500 dark:text-gray-400">x{item.quantity}</span></span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="py-4 space-y-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-gray-100">${summary?.subtotal?.toFixed(2) || getSelectedTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                    <span className="text-gray-900 dark:text-gray-100">{summary ? `$${summary.shippingAmount.toFixed(2)}` : 'Calculated next'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="text-gray-900 dark:text-gray-100">{summary ? `$${summary.taxAmount.toFixed(2)}` : 'Calculated next'}</span>
                  </div>
                </div>

                <div className="flex justify-between py-4 text-lg font-semibold">
                  <span className="text-gray-900 dark:text-gray-100">Total</span>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Stage type not supported: {currentStage.type}</p>
      </div>
    </div>
  );
}
