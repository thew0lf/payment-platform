'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, Lock, Shield, CreditCard, Check, AlertCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ThemeStyles {
  primaryColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
  buttonStyle?: 'solid' | 'outline' | 'ghost';
  inputStyle?: 'outline' | 'filled' | 'underline';
  cardShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  spacing?: 'compact' | 'comfortable' | 'luxurious' | 'playful' | 'professional';
  showProgressBar?: boolean;
  showTrustBadges?: boolean;
  showSecurityIndicators?: boolean;
}

interface PublicPaymentPage {
  id: string;
  companyCode: string;
  companyName: string;
  companyLogo?: string;
  name: string;
  slug: string;
  type: 'CHECKOUT' | 'SUBSCRIPTION' | 'DONATION' | 'INVOICE';
  logoUrl?: string;
  faviconUrl?: string;
  brandColor?: string;
  title?: string;
  description?: string;
  headline?: string;
  subheadline?: string;
  theme?: {
    id: string;
    name: string;
    category: string;
    styles: ThemeStyles;
  };
  customStyles?: Record<string, unknown>;
  paymentConfig: Record<string, unknown>;
  acceptedGateways: Record<string, boolean>;
  customerFieldsConfig: Record<string, { enabled: boolean; required: boolean }>;
  shippingEnabled: boolean;
  discountsEnabled: boolean;
  termsUrl?: string;
  privacyUrl?: string;
  refundPolicyUrl?: string;
  customTermsText?: string;
  requireTermsAccept: boolean;
  successUrl?: string;
  cancelUrl?: string;
  successMessage?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface CustomerData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

type CheckoutStep = 'info' | 'payment' | 'review' | 'complete';

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS (Public - no auth required)
// ═══════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchPublicPage(companyCode: string, slug: string): Promise<PublicPaymentPage> {
  const response = await fetch(`${API_BASE}/api/checkout/page/${companyCode}/${slug}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Page not found' }));
    throw new Error(error.message || 'Page not found');
  }
  return response.json();
}

async function createCheckoutSession(pageId: string, data: {
  lineItems?: { name: string; price: number; quantity: number }[];
  total: number;
  currency: string;
}) {
  const response = await fetch(`${API_BASE}/api/checkout/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId, ...data }),
  });
  if (!response.ok) {
    throw new Error('Failed to create session');
  }
  return response.json();
}

// ═══════════════════════════════════════════════════════════════
// THEME HELPERS
// ═══════════════════════════════════════════════════════════════

function getThemeClasses(theme?: ThemeStyles) {
  const styles = theme || {};

  const shadowMap = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const spacingMap = {
    compact: 'p-4 gap-3',
    comfortable: 'p-6 gap-4',
    luxurious: 'p-8 gap-6',
    playful: 'p-6 gap-5',
    professional: 'p-6 gap-4',
  };

  return {
    shadow: shadowMap[styles.cardShadow || 'md'],
    spacing: spacingMap[styles.spacing || 'comfortable'],
    borderRadius: styles.borderRadius || '12px',
  };
}

function getButtonClasses(theme?: ThemeStyles, variant: 'primary' | 'secondary' = 'primary') {
  const styles = theme || {};
  const buttonStyle = styles.buttonStyle || 'solid';

  if (variant === 'secondary') {
    return 'bg-transparent border border-zinc-300 text-zinc-700 hover:bg-zinc-50';
  }

  switch (buttonStyle) {
    case 'outline':
      return 'bg-transparent border-2 hover:bg-opacity-10';
    case 'ghost':
      return 'bg-transparent hover:bg-opacity-10';
    case 'solid':
    default:
      return 'text-white';
  }
}

function getInputClasses(theme?: ThemeStyles) {
  const styles = theme || {};
  const inputStyle = styles.inputStyle || 'outline';

  switch (inputStyle) {
    case 'filled':
      return 'bg-zinc-100 border-transparent focus:bg-white';
    case 'underline':
      return 'border-t-0 border-l-0 border-r-0 rounded-none border-b-2';
    case 'outline':
    default:
      return 'border border-zinc-300 bg-white';
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECKOUT PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyCode = params?.companyCode as string;
  const slug = params?.slug as string;

  const [page, setPage] = useState<PublicPaymentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('info');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Customer data
  const [customerData, setCustomerData] = useState<CustomerData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');

  // Sample order data (would come from query params or session)
  const orderTotal = parseFloat(searchParams?.get('amount') || '0') || 99.99;
  const currency = searchParams?.get('currency') || 'USD';

  // Load page configuration
  useEffect(() => {
    if (!companyCode || !slug) return;

    setLoading(true);
    fetchPublicPage(companyCode, slug)
      .then(setPage)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyCode, slug]);

  // Initialize session and set default gateway
  useEffect(() => {
    if (!page) return;

    // Set default gateway
    const gateways = page.acceptedGateways || {};
    const enabledGateways = Object.entries(gateways)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
    if (enabledGateways.length > 0 && !selectedGateway) {
      setSelectedGateway(enabledGateways[0]);
    }
  }, [page, selectedGateway]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setCustomerData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddressChange = useCallback((field: string, value: string) => {
    setCustomerData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value } as CustomerData['address'],
    }));
  }, []);

  const handleContinueToPayment = useCallback(async () => {
    if (!page) return;

    // Validate required fields
    const fields = page.customerFieldsConfig || {};
    if (fields.email?.required && !customerData.email) {
      setError('Email is required');
      return;
    }
    if (fields.name?.required && (!customerData.firstName || !customerData.lastName)) {
      setError('Name is required');
      return;
    }

    setError(null);

    // Create session if we don't have one
    if (!sessionId) {
      try {
        const session = await createCheckoutSession(page.id, {
          total: orderTotal,
          currency,
        });
        setSessionId(session.sessionId);
      } catch (err) {
        setError('Failed to initialize checkout');
        return;
      }
    }

    setCurrentStep('payment');
  }, [page, customerData, sessionId, orderTotal, currency]);

  const handleSubmitPayment = useCallback(async () => {
    if (!page || !sessionId) return;

    if (page.requireTermsAccept && !termsAccepted) {
      setError('You must accept the terms and conditions');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // This would integrate with the actual payment gateway
      // For now, simulate a successful payment
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setCurrentStep('complete');
    } catch {
      setError('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [page, sessionId, termsAccepted]);

  // ─────────────────────────────────────────────────────────────
  // RENDER: Loading State
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto" />
          <p className="mt-2 text-sm text-zinc-500">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Error State
  // ─────────────────────────────────────────────────────────────

  if (error && !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Page Not Found</h1>
          <p className="text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!page) return null;

  // ─────────────────────────────────────────────────────────────
  // RENDER: Theme Styles
  // ─────────────────────────────────────────────────────────────

  const theme = page.theme?.styles || {};
  const themeClasses = getThemeClasses(theme);
  const primaryColor = theme.primaryColor || page.brandColor || '#3B82F6';
  const backgroundColor = theme.backgroundColor || '#FFFFFF';
  const textColor = theme.textColor || '#1F2937';
  const accentColor = theme.accentColor || '#22C55E';

  const steps: { key: CheckoutStep; label: string }[] = [
    { key: 'info', label: 'Information' },
    { key: 'payment', label: 'Payment' },
    { key: 'complete', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  // ─────────────────────────────────────────────────────────────
  // RENDER: Success State
  // ─────────────────────────────────────────────────────────────

  if (currentStep === 'complete') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor, color: textColor }}
      >
        <div className="text-center max-w-md px-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-zinc-500 mb-6">
            {page.successMessage || 'Thank you for your purchase. You will receive a confirmation email shortly.'}
          </p>
          {page.successUrl && (
            <a
              href={page.successUrl}
              className="inline-flex items-center px-6 py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Continue
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Main Checkout Form
  // ─────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor,
        color: textColor,
        fontFamily: theme.fontFamily || 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {page.logoUrl ? (
            <img src={page.logoUrl} alt={page.companyName} className="h-8" />
          ) : (
            <span className="font-semibold text-lg">{page.companyName}</span>
          )}
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Lock className="h-4 w-4" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {theme.showProgressBar !== false && (
        <div className="bg-white border-b border-zinc-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-4">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${index <= currentStepIndex
                        ? 'text-white'
                        : 'bg-zinc-200 text-zinc-500'}
                    `}
                    style={index <= currentStepIndex ? { backgroundColor: primaryColor } : {}}
                  >
                    {index < currentStepIndex ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="ml-2 text-sm hidden sm:block">{step.label}</span>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-3 ${index < currentStepIndex ? '' : 'bg-zinc-200'}`}
                      style={index < currentStepIndex ? { backgroundColor: primaryColor } : {}}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-3">
            {/* Headline */}
            {page.headline && currentStep === 'info' && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold">{page.headline}</h1>
                {page.subheadline && (
                  <p className="text-zinc-500 mt-1">{page.subheadline}</p>
                )}
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Step: Customer Information */}
            {currentStep === 'info' && (
              <div
                className={`bg-white rounded-xl ${themeClasses.shadow}`}
                style={{ borderRadius: themeClasses.borderRadius }}
              >
                <div className={themeClasses.spacing}>
                  <h2 className="text-lg font-semibold mb-4">Contact Information</h2>

                  {/* Email */}
                  {page.customerFieldsConfig?.email?.enabled !== false && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">
                        Email {page.customerFieldsConfig?.email?.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="email"
                        value={customerData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-offset-0 ${getInputClasses(theme)}`}
                        style={{
                          borderRadius: themeClasses.borderRadius,
                          '--tw-ring-color': primaryColor,
                        } as React.CSSProperties}
                        placeholder="your@email.com"
                      />
                    </div>
                  )}

                  {/* Name Fields */}
                  {page.customerFieldsConfig?.name?.enabled !== false && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          First Name {page.customerFieldsConfig?.name?.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={customerData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                          style={{ borderRadius: themeClasses.borderRadius }}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Last Name</label>
                        <input
                          type="text"
                          value={customerData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                          style={{ borderRadius: themeClasses.borderRadius }}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {page.customerFieldsConfig?.phone?.enabled && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">
                        Phone {page.customerFieldsConfig?.phone?.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="tel"
                        value={customerData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                        style={{ borderRadius: themeClasses.borderRadius }}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  )}

                  {/* Address */}
                  {page.customerFieldsConfig?.address?.enabled && (
                    <div className="mt-6">
                      <h3 className="text-md font-medium mb-3">Billing Address</h3>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Address Line 1"
                          value={customerData.address?.line1 || ''}
                          onChange={(e) => handleAddressChange('line1', e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                          style={{ borderRadius: themeClasses.borderRadius }}
                        />
                        <input
                          type="text"
                          placeholder="Address Line 2 (optional)"
                          value={customerData.address?.line2 || ''}
                          onChange={(e) => handleAddressChange('line2', e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                          style={{ borderRadius: themeClasses.borderRadius }}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="City"
                            value={customerData.address?.city || ''}
                            onChange={(e) => handleAddressChange('city', e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                            style={{ borderRadius: themeClasses.borderRadius }}
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={customerData.address?.state || ''}
                            onChange={(e) => handleAddressChange('state', e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                            style={{ borderRadius: themeClasses.borderRadius }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Postal Code"
                            value={customerData.address?.postalCode || ''}
                            onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                            style={{ borderRadius: themeClasses.borderRadius }}
                          />
                          <select
                            value={customerData.address?.country || 'US'}
                            onChange={(e) => handleAddressChange('country', e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                            style={{ borderRadius: themeClasses.borderRadius }}
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="GB">United Kingdom</option>
                            <option value="AU">Australia</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Continue Button */}
                  <button
                    onClick={handleContinueToPayment}
                    className={`w-full mt-6 px-6 py-3 font-medium rounded-lg transition-colors ${getButtonClasses(theme)}`}
                    style={{
                      backgroundColor: theme.buttonStyle !== 'outline' && theme.buttonStyle !== 'ghost' ? primaryColor : 'transparent',
                      borderColor: primaryColor,
                      color: theme.buttonStyle === 'outline' || theme.buttonStyle === 'ghost' ? primaryColor : 'white',
                      borderRadius: themeClasses.borderRadius,
                    }}
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step: Payment */}
            {currentStep === 'payment' && (
              <div
                className={`bg-white rounded-xl ${themeClasses.shadow}`}
                style={{ borderRadius: themeClasses.borderRadius }}
              >
                <div className={themeClasses.spacing}>
                  <h2 className="text-lg font-semibold mb-4">Payment Method</h2>

                  {/* Gateway Selection */}
                  <div className="space-y-3 mb-6">
                    {Object.entries(page.acceptedGateways || {})
                      .filter(([, enabled]) => enabled)
                      .map(([gateway]) => (
                        <label
                          key={gateway}
                          className={`
                            flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors
                            ${selectedGateway === gateway ? 'border-2' : 'border-zinc-200 hover:border-zinc-300'}
                          `}
                          style={{
                            borderColor: selectedGateway === gateway ? primaryColor : undefined,
                            borderRadius: themeClasses.borderRadius,
                          }}
                        >
                          <input
                            type="radio"
                            name="gateway"
                            value={gateway}
                            checked={selectedGateway === gateway}
                            onChange={() => setSelectedGateway(gateway)}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedGateway === gateway ? '' : 'border-zinc-300'
                            }`}
                            style={{ borderColor: selectedGateway === gateway ? primaryColor : undefined }}
                          >
                            {selectedGateway === gateway && (
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: primaryColor }}
                              />
                            )}
                          </div>
                          <CreditCard className="h-5 w-5 text-zinc-500" />
                          <span className="font-medium capitalize">{gateway.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                  </div>

                  {/* Card Details Placeholder */}
                  <div className="p-4 bg-zinc-50 rounded-lg border border-dashed border-zinc-300 mb-6">
                    <p className="text-sm text-zinc-500 text-center">
                      Payment form will be loaded here via {selectedGateway} integration
                    </p>
                    {/* This is where Stripe Elements, PayPal buttons, etc. would render */}
                  </div>

                  {/* Promo Code */}
                  {page.discountsEnabled && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-1">Promo Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Enter code"
                          className={`flex-1 px-4 py-2.5 rounded-lg focus:ring-2 ${getInputClasses(theme)}`}
                          style={{ borderRadius: themeClasses.borderRadius }}
                        />
                        <button
                          className="px-4 py-2.5 border border-zinc-300 rounded-lg hover:bg-zinc-50"
                          style={{ borderRadius: themeClasses.borderRadius }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Terms Acceptance */}
                  {page.requireTermsAccept && (
                    <label className="flex items-start gap-3 mb-6 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-zinc-300"
                        style={{ accentColor: primaryColor }}
                      />
                      <span className="text-sm text-zinc-600">
                        I agree to the{' '}
                        {page.termsUrl ? (
                          <a href={page.termsUrl} target="_blank" rel="noopener" className="underline" style={{ color: primaryColor }}>
                            Terms of Service
                          </a>
                        ) : (
                          'Terms of Service'
                        )}
                        {page.privacyUrl && (
                          <>
                            {' '}and{' '}
                            <a href={page.privacyUrl} target="_blank" rel="noopener" className="underline" style={{ color: primaryColor }}>
                              Privacy Policy
                            </a>
                          </>
                        )}
                        {page.customTermsText && <span className="block mt-1 text-xs">{page.customTermsText}</span>}
                      </span>
                    </label>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep('info')}
                      className={`px-6 py-3 font-medium rounded-lg ${getButtonClasses(theme, 'secondary')}`}
                      style={{ borderRadius: themeClasses.borderRadius }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmitPayment}
                      disabled={processing}
                      className={`flex-1 px-6 py-3 font-medium rounded-lg transition-colors ${getButtonClasses(theme)} disabled:opacity-50`}
                      style={{
                        backgroundColor: theme.buttonStyle !== 'outline' && theme.buttonStyle !== 'ghost' ? primaryColor : 'transparent',
                        borderColor: primaryColor,
                        color: theme.buttonStyle === 'outline' || theme.buttonStyle === 'ghost' ? primaryColor : 'white',
                        borderRadius: themeClasses.borderRadius,
                      }}
                    >
                      {processing ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(orderTotal)}`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-2">
            <div
              className={`bg-white rounded-xl sticky top-8 ${themeClasses.shadow}`}
              style={{ borderRadius: themeClasses.borderRadius }}
            >
              <div className={themeClasses.spacing}>
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                {/* Sample Line Items */}
                <div className="space-y-3 pb-4 border-b border-zinc-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(orderTotal)}</span>
                  </div>
                  {page.shippingEnabled && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">Shipping</span>
                      <span>Calculated at next step</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between py-4 text-lg font-semibold">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(orderTotal)}
                  </span>
                </div>

                {/* Trust Badges */}
                {theme.showTrustBadges && (
                  <div className="pt-4 border-t border-zinc-200">
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <Shield className="h-4 w-4" style={{ color: accentColor }} />
                      <span>100% Secure Checkout</span>
                    </div>
                  </div>
                )}

                {/* Security Indicators */}
                {theme.showSecurityIndicators && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Your payment information is encrypted and secure</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              Powered by {page.companyName}
            </p>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              {page.termsUrl && (
                <a href={page.termsUrl} target="_blank" rel="noopener" className="hover:underline">
                  Terms
                </a>
              )}
              {page.privacyUrl && (
                <a href={page.privacyUrl} target="_blank" rel="noopener" className="hover:underline">
                  Privacy
                </a>
              )}
              {page.refundPolicyUrl && (
                <a href={page.refundPolicyUrl} target="_blank" rel="noopener" className="hover:underline">
                  Refunds
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
