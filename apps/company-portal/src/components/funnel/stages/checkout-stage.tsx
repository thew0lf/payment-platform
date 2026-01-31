'use client';

import { useState, FormEvent, useCallback, useRef, useEffect } from 'react';
import { Funnel, FunnelStage, CheckoutStageConfig, CustomerInfo, processCheckout, captureField } from '@/lib/api';
import { useFunnel } from '@/contexts/funnel-context';
import { COUNTRIES, getCountryByCode } from '@/lib/address-data';
import { AddressAutocomplete } from '@/components/address';
import {
  cartApi,
  CartResponse,
  CartDiscountCode,
  CartApiError,
  isEmptyCart,
} from '@/lib/cart-api';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  CreditCardIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

interface CheckoutStageProps {
  stage: FunnelStage;
  funnel: Funnel;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface StockWarning {
  productId: string;
  productName: string;
  requested: number;
  available: number;
}

/** Unified display cart item type for both frontend and backend cart items */
interface DisplayCartItem {
  id: string;
  productId: string;
  productSnapshot: {
    name: string;
    sku: string;
    image?: string;
    originalPrice: number;
  };
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountAmount: number;
  lineTotal: number;
  isGift: boolean;
  addedAt: string;
  // Frontend-specific fields that may be present
  imageUrl?: string;
  name?: string;
}

export function CheckoutStage({ stage, funnel }: CheckoutStageProps) {
  const {
    cart,
    cartTotal,
    setCustomerInfo,
    prevStage,
    completeOrder,
    trackEvent,
    customerInfo,
    session,
    isDemoMode,
  } = useFunnel();
  const config = stage.config as CheckoutStageConfig;

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Backend cart state
  const [backendCart, setBackendCart] = useState<CartResponse | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);

  // Discount code state
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountSuccess, setDiscountSuccess] = useState<string | null>(null);

  // Stock validation state
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([]);
  const [isValidatingStock, setIsValidatingStock] = useState(false);

  // Form state
  const [email, setEmail] = useState(customerInfo?.email || '');
  const [firstName, setFirstName] = useState(customerInfo?.firstName || '');
  const [lastName, setLastName] = useState(customerInfo?.lastName || '');
  const [phone, setPhone] = useState(customerInfo?.phone || '');
  const [company, setCompany] = useState(customerInfo?.company || '');

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  // Card details (for demo - would use Stripe Elements in production)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Consent state (for compliance)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Progressive field capture - save customer info as they type
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load backend cart on mount
  useEffect(() => {
    const loadCart = async () => {
      if (!session?.sessionToken || !funnel.companyId) {
        setIsLoadingCart(false);
        return;
      }

      try {
        setIsLoadingCart(true);
        const cartData = await cartApi.getCart(session.sessionToken, funnel.companyId);

        if (!isEmptyCart(cartData)) {
          setBackendCart(cartData as CartResponse);
        }
      } catch (err) {
        console.error('Failed to load cart:', err);
        setCartError('Hmm, we couldn\'t load your cart. A quick refresh should fix it!');
      } finally {
        setIsLoadingCart(false);
      }
    };

    loadCart();
  }, [session?.sessionToken, funnel.companyId]);

  // Debounced save function for progressive capture
  const saveCustomerInfoProgressively = useCallback(() => {
    // Create current info snapshot
    const currentInfo: CustomerInfo = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      company: company.trim(),
    };

    // Only save if email is present (minimum required field) and data changed
    const infoKey = JSON.stringify(currentInfo);
    if (!currentInfo.email || infoKey === lastSavedRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      lastSavedRef.current = infoKey;
      setCustomerInfo(currentInfo);
      trackEvent('CUSTOMER_INFO_CAPTURED', {
        hasEmail: !!currentInfo.email,
        hasName: !!(currentInfo.firstName || currentInfo.lastName),
        hasPhone: !!currentInfo.phone,
      });
    }, 1000);
  }, [email, firstName, lastName, phone, company, setCustomerInfo, trackEvent]);

  // Trigger progressive save when customer fields change
  useEffect(() => {
    saveCustomerInfoProgressively();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [email, firstName, lastName, phone, company, saveCustomerInfoProgressively]);

  // Progressive field capture - capture individual fields on blur for lead tracking
  const handleFieldBlur = useCallback((fieldName: string, value: string) => {
    if (session?.sessionToken && value && value.trim()) {
      // Find the current stage index for the checkout stage
      const stageIndex = funnel.stages.findIndex(s => s.type === 'CHECKOUT');
      captureField(session.sessionToken, fieldName, value.trim(), stageIndex, 'CHECKOUT');
    }
  }, [session?.sessionToken, funnel.stages]);

  // Apply discount code handler
  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !backendCart?.id || !session?.sessionToken) {
      return;
    }

    setIsApplyingDiscount(true);
    setDiscountError(null);
    setDiscountSuccess(null);

    try {
      const updatedCart = await cartApi.applyDiscount(
        backendCart.id,
        session.sessionToken,
        funnel.companyId,
        discountCode.trim().toUpperCase()
      );

      setBackendCart(updatedCart);
      setDiscountSuccess(`Discount code "${discountCode.toUpperCase()}" applied!`);
      setDiscountCode('');

      trackEvent('COUPON_APPLIED', { code: discountCode.toUpperCase() });
    } catch (err) {
      const errorMessage = err instanceof CartApiError
        ? err.message
        : 'Failed to apply discount code';
      setDiscountError(errorMessage);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  // Remove discount code handler
  const handleRemoveDiscount = async (code: string) => {
    if (!backendCart?.id || !session?.sessionToken) {
      return;
    }

    try {
      const updatedCart = await cartApi.removeDiscount(
        backendCart.id,
        session.sessionToken,
        funnel.companyId,
        code
      );

      setBackendCart(updatedCart);
      trackEvent('COUPON_REMOVED', { code });
    } catch (err) {
      console.error('Failed to remove discount:', err);
    }
  };

  // Validate stock before checkout
  const validateStockBeforeCheckout = async (): Promise<boolean> => {
    // For now, we'll do a simple client-side check
    // The backend will validate stock during checkout as well
    // TODO: Add a dedicated stock validation endpoint when available
    setStockWarnings([]);
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Validate consent if required
      if (funnel.settings.requireTermsAccept) {
        if (!termsAccepted || !privacyAccepted) {
          setError('Please accept the Terms of Service and Privacy Policy to continue.');
          setIsProcessing(false);
          return;
        }
      }

      // Validate stock before proceeding
      const stockValid = await validateStockBeforeCheckout();
      if (!stockValid) {
        setIsProcessing(false);
        return;
      }

      // Save customer info
      const info: CustomerInfo = { email, firstName, lastName, phone, company };
      setCustomerInfo(info);

      // Get totals from backend cart if available, otherwise use frontend calculation
      const totals = backendCart?.totals || {
        subtotal: cartTotal,
        discountTotal: 0,
        taxTotal: cartTotal * 0.08,
        shippingTotal: 5.99,
        grandTotal: cartTotal + (cartTotal * 0.08) + 5.99,
      };

      trackEvent('CHECKOUT_SUBMITTED', {
        subtotal: totals.subtotal,
        shipping: totals.shippingTotal,
        tax: totals.taxTotal,
        discount: totals.discountTotal,
        total: totals.grandTotal,
        itemCount: backendCart?.totals.itemCount || cart.length,
      });

      // Validate session exists
      if (!session?.sessionToken) {
        throw new Error('Something went wrong. Please refresh the page to continue.');
      }

      // Parse card expiry (MM/YY format)
      const [expiryMonth, expiryYear] = cardExpiry.split('/');

      // Determine billing address to use
      const finalBillingAddress = billingSameAsShipping ? shippingAddress : billingAddress;

      // Process checkout via real payment API
      const result = await processCheckout(session.sessionToken, {
        card: {
          number: cardNumber,
          expiryMonth,
          expiryYear: `20${expiryYear}`, // Convert YY to YYYY
          cvv: cardCvc,
          cardholderName: `${finalBillingAddress.firstName} ${finalBillingAddress.lastName}`,
        },
        billingAddress: {
          firstName: finalBillingAddress.firstName,
          lastName: finalBillingAddress.lastName,
          street1: finalBillingAddress.address1,
          street2: finalBillingAddress.address2,
          city: finalBillingAddress.city,
          state: finalBillingAddress.state,
          postalCode: finalBillingAddress.postalCode,
          country: finalBillingAddress.country,
          email,
          phone,
        },
        email,
        // Include consent tracking data for compliance
        ...(funnel.settings.requireTermsAccept && {
          consent: {
            termsAccepted,
            privacyAccepted,
            acceptedAt: new Date().toISOString(),
          },
        }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment failed. Please try again.');
      }

      await completeOrder(result.orderId!, totals.grandTotal, backendCart?.currency || 'USD');

      trackEvent('CHECKOUT_COMPLETED', { orderId: result.orderId, total: totals.grandTotal });
    } catch (err) {
      console.error('Checkout failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(errorMessage);
      trackEvent('CHECKOUT_FAILED', { error: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate display totals - prefer backend cart data
  const displayTotals = backendCart?.totals || {
    subtotal: cartTotal,
    discountTotal: 0,
    taxTotal: cartTotal * 0.08,
    shippingTotal: 5.99,
    grandTotal: cartTotal + (cartTotal * 0.08) + 5.99,
    itemCount: cart.length,
  };

  // Get cart items to display - prefer backend cart data
  // Using DisplayCartItem type to unify frontend/backend item structure
  const displayItems: DisplayCartItem[] = backendCart?.items || cart.map(item => ({
    id: item.productId,
    productId: item.productId,
    productSnapshot: {
      name: item.name,
      sku: '',
      image: item.imageUrl,
      originalPrice: item.price,
    },
    quantity: item.quantity,
    unitPrice: item.price,
    originalPrice: item.price,
    discountAmount: 0,
    lineTotal: item.price * item.quantity,
    isGift: false,
    addedAt: new Date().toISOString(),
    // Include frontend-specific fields for fallback access
    imageUrl: item.imageUrl,
    name: item.name,
  }));

  // Check if checkout should be disabled
  const consentRequired = funnel.settings.requireTermsAccept;
  const consentMissing = consentRequired && (!termsAccepted || !privacyAccepted);
  const isCheckoutDisabled = isProcessing || stockWarnings.length > 0 || isLoadingCart || consentMissing;

  if (cart.length === 0 && !isLoadingCart && (!backendCart || backendCart.items.length === 0)) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <ShieldCheckIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">Nothing here yet</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Let&apos;s find something you&apos;ll love!</p>
        <button
          onClick={prevStage}
          className="px-6 py-3 bg-[var(--primary-color)] text-white rounded-lg min-h-[44px] touch-manipulation hover:opacity-90 transition-opacity"
        >
          Keep Browsing
        </button>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className={`grid gap-8 ${config.layout === 'two-column' ? 'lg:grid-cols-5' : ''}`}>
            {/* Left Column - Form */}
            <div className={config.layout === 'two-column' ? 'lg:col-span-3' : ''}>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Checkout</h2>

              {/* Demo Mode Banner */}
              {isDemoMode && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Demo Mode - No Real Charges</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        This is a demo checkout. No actual payment will be processed.
                        Use test card: <span className="font-mono font-medium">4111 1111 1111 1111</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  EXPRESS CHECKOUT SECTION (Phase 4.3+ - Placeholder)

                  TODO: Implement Express Checkout options:
                  - Apple Pay (via Stripe/Payment Request API)
                  - Google Pay (via Stripe/Payment Request API)
                  - PayPal Express

                  Implementation notes:
                  - Check for browser/device support before showing buttons
                  - Use Payment Request API for Apple Pay/Google Pay
                  - PayPal requires separate SDK integration
                  - All express methods should skip the card form
                  ═══════════════════════════════════════════════════════════════ */}
              {/*
              <section className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-500">Express Checkout</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button type="button" className="h-12 border rounded-lg flex items-center justify-center bg-black text-white">
                    Apple Pay
                  </button>
                  <button type="button" className="h-12 border rounded-lg flex items-center justify-center bg-white">
                    Google Pay
                  </button>
                  <button type="button" className="h-12 border rounded-lg flex items-center justify-center bg-[#0070ba] text-white">
                    PayPal
                  </button>
                </div>

                <div className="flex items-center gap-4 mt-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-500">Or pay with card</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </section>
              */}

              {/* Contact Information */}
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--primary-color)] text-white rounded-full text-sm flex items-center justify-center">
                    1
                  </span>
                  Contact Information
                </h3>

                <div className="space-y-4">
                  {config.fields.customer.email.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email {config.fields.customer.email.required && <span className="text-red-500 dark:text-red-400">*</span>}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={(e) => handleFieldBlur('email', e.target.value)}
                        required={config.fields.customer.email.required}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                        placeholder="your@email.com"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {config.fields.customer.firstName.enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name {config.fields.customer.firstName.required && <span className="text-red-500 dark:text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          onBlur={(e) => handleFieldBlur('firstName', e.target.value)}
                          required={config.fields.customer.firstName.required}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                        />
                      </div>
                    )}
                    {config.fields.customer.lastName.enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name {config.fields.customer.lastName.required && <span className="text-red-500 dark:text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          onBlur={(e) => handleFieldBlur('lastName', e.target.value)}
                          required={config.fields.customer.lastName.required}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {config.fields.customer.phone.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone {config.fields.customer.phone.required && <span className="text-red-500 dark:text-red-400">*</span>}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                        required={config.fields.customer.phone.required}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Shipping Address */}
              {config.fields.shipping.enabled && (
                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[var(--primary-color)] text-white rounded-full text-sm flex items-center justify-center">
                      2
                    </span>
                    Shipping Address
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={shippingAddress.firstName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={shippingAddress.lastName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                    </div>
                    <AddressAutocomplete
                      value={shippingAddress.address1}
                      onChange={(value) => setShippingAddress({ ...shippingAddress, address1: value })}
                      onAddressSelect={(address) => {
                        setShippingAddress({
                          ...shippingAddress,
                          address1: address.street1,
                          address2: address.street2 || '',
                          city: address.city,
                          state: address.stateCode,
                          postalCode: address.postalCode,
                          country: address.countryCode,
                        });
                      }}
                      companyId={funnel.companyId}
                      selectedCountry={shippingAddress.country}
                      placeholder="Start typing your address..."
                    />
                    <input
                      type="text"
                      placeholder="Apartment, suite, etc. (optional)"
                      value={shippingAddress.address2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                    />
                    {/* Country */}
                    <select
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value, state: '' })}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none mb-4"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="City"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                      <select
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      >
                        <option value="">Select {(getCountryByCode(shippingAddress.country)?.regionLabel || 'state').toLowerCase()}</option>
                        {(getCountryByCode(shippingAddress.country)?.regions || []).map((region) => (
                          <option key={region.code} value={region.code}>{region.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder={getCountryByCode(shippingAddress.country)?.postalPlaceholder || 'ZIP'}
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Payment */}
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--primary-color)] text-white rounded-full text-sm flex items-center justify-center">
                    {config.fields.shipping.enabled ? '3' : '2'}
                  </span>
                  Payment
                </h3>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCardIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Credit Card</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Card Number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                          }
                          setCardExpiry(value);
                        }}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                {config.trust.showSecurityBadges && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <LockClosedIcon className="h-4 w-4" />
                      SSL Secure
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheckIcon className="h-4 w-4" />
                      256-bit encryption
                    </div>
                  </div>
                )}
              </section>

              {/* Stock Warnings */}
              {stockWarnings.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Some items have limited stock</p>
                      <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300 space-y-1">
                        {stockWarnings.map((warning) => (
                          <li key={warning.productId}>
                            {warning.productName}: Only {warning.available} available (you requested {warning.requested})
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                        Please update your cart quantities to proceed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Consent Checkboxes (Compliance) */}
              {funnel.settings.requireTermsAccept && (
                <section className="mb-6">
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[var(--primary-color)] focus:ring-[var(--primary-color)] focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        I agree to the{' '}
                        {funnel.settings.urls?.termsUrl ? (
                          <a
                            href={funnel.settings.urls.termsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--primary-color)] hover:underline font-medium"
                          >
                            Terms of Service
                          </a>
                        ) : (
                          <span className="font-medium">Terms of Service</span>
                        )}
                        {funnel.settings.customTermsText && (
                          <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {funnel.settings.customTermsText}
                          </span>
                        )}
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[var(--primary-color)] focus:ring-[var(--primary-color)] focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        I agree to the{' '}
                        {funnel.settings.urls?.privacyUrl ? (
                          <a
                            href={funnel.settings.urls.privacyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--primary-color)] hover:underline font-medium"
                          >
                            Privacy Policy
                          </a>
                        ) : (
                          <span className="font-medium">Privacy Policy</span>
                        )}
                        <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                          We collect and store information you provide to process your order and improve our services.
                        </span>
                      </span>
                    </label>
                  </div>
                </section>
              )}

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Submit Button (Mobile) */}
              <div className="lg:hidden mb-8">
                <button
                  type="submit"
                  disabled={isCheckoutDisabled}
                  className="w-full py-4 bg-[var(--primary-color)] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="h-5 w-5" />
                      Pay ${displayTotals.grandTotal.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            {config.payment.showOrderSummary && (
              <div className={config.layout === 'two-column' ? 'lg:col-span-2' : ''}>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 sticky top-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h3>

                  {/* Loading State */}
                  {isLoadingCart && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Getting your items ready...</p>
                    </div>
                  )}

                  {/* Cart Error */}
                  {cartError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                      {cartError}
                    </div>
                  )}

                  {/* Cart Items */}
                  {!isLoadingCart && (
                    <div className="space-y-4 mb-6">
                      {displayItems.map((item) => {
                        // Get image and name from either backend snapshot or frontend fields
                        const itemImage = item.productSnapshot?.image || item.imageUrl;
                        const itemName = item.productSnapshot?.name || item.name || 'Product';

                        return (
                          <div key={item.id} className="flex gap-3">
                            {itemImage && (
                              <img
                                src={itemImage}
                                alt={itemName}
                                className="w-16 h-16 rounded-lg object-cover bg-white dark:bg-gray-700"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                {itemName}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                              {item.discountAmount > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  Save ${item.discountAmount.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              ${item.lineTotal.toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Discount Code Input */}
                  {config.payment.allowCoupons && !isLoadingCart && (
                    <div className="mb-6">
                      {/* Applied Discounts */}
                      {backendCart?.discountCodes && backendCart.discountCodes.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {backendCart.discountCodes.map((discount: CartDiscountCode) => (
                            <div
                              key={discount.code}
                              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-300"
                            >
                              <span className="flex items-center gap-2">
                                <TagIcon className="h-4 w-4" />
                                <span className="font-medium">{discount.code}</span>
                                {discount.description && (
                                  <span className="text-sm text-green-600 dark:text-green-400">
                                    - {discount.description}
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  -${discount.discountAmount.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDiscount(discount.code)}
                                  className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                                  aria-label="Remove discount"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Discount Input */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Discount code"
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value.toUpperCase());
                              setDiscountError(null);
                              setDiscountSuccess(null);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyDiscount}
                            disabled={isApplyingDiscount || !discountCode.trim()}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isApplyingDiscount ? (
                              <div className="w-4 h-4 border-2 border-gray-500 dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            Apply
                          </button>
                        </div>

                        {/* Discount Messages */}
                        {discountError && (
                          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            {discountError}
                          </p>
                        )}
                        {discountSuccess && (
                          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircleIcon className="h-4 w-4" />
                            {discountSuccess}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  {!isLoadingCart && (
                    <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                        <span className="text-gray-900 dark:text-gray-100">${displayTotals.subtotal.toFixed(2)}</span>
                      </div>
                      {displayTotals.discountTotal > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Discount</span>
                          <span>-${displayTotals.discountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {displayTotals.shippingTotal > 0
                            ? `$${displayTotals.shippingTotal.toFixed(2)}`
                            : 'Free'
                          }
                        </span>
                      </div>
                      {config.payment.showTaxEstimate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Tax</span>
                          <span className="text-gray-900 dark:text-gray-100">${displayTotals.taxTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-900 dark:text-gray-100">Total</span>
                        <span className="text-gray-900 dark:text-gray-100">${displayTotals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button (Desktop) */}
                  <div className="hidden lg:block mt-6">
                    <button
                      type="submit"
                      disabled={isCheckoutDisabled}
                      className="w-full py-4 bg-[var(--primary-color)] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <LockClosedIcon className="h-5 w-5" />
                          Pay ${displayTotals.grandTotal.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>

                  {/* Guarantee */}
                  {config.trust.showGuarantee && (
                    <div className="mt-6 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-3">
                        <ShieldCheckIcon className="h-6 w-6 text-green-500 dark:text-green-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Satisfaction Guaranteed</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {config.trust.guaranteeText || '30-day money-back guarantee. No questions asked.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
