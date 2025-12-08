'use client';

import { useState, FormEvent, useCallback, useRef, useEffect } from 'react';
import { Funnel, FunnelStage, CheckoutStageConfig, CustomerInfo, processCheckout } from '@/lib/api';
import { useFunnel } from '@/contexts/funnel-context';
import { COUNTRIES, getCountryByCode } from '@/lib/address-data';
import { AddressAutocomplete } from '@/components/address';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  CreditCardIcon,
  TruckIcon,
  CheckCircleIcon,
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
  } = useFunnel();
  const config = stage.config as CheckoutStageConfig;

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  // Progressive field capture - save customer info as they type
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

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

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  const shippingCost = 5.99; // Would be calculated based on address
  const taxRate = 0.08;
  const discount = appliedCoupon?.discount || 0;
  const subtotal = cartTotal;
  const tax = (subtotal - discount) * taxRate;
  const total = subtotal - discount + tax + shippingCost;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Save customer info
      const info: CustomerInfo = { email, firstName, lastName, phone, company };
      setCustomerInfo(info);

      trackEvent('CHECKOUT_SUBMITTED', {
        subtotal,
        shipping: shippingCost,
        tax,
        total,
        itemCount: cart.length,
      });

      // Validate session exists
      if (!session?.sessionToken) {
        throw new Error('Session not found. Please refresh and try again.');
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
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment failed. Please try again.');
      }

      await completeOrder(result.orderId!, total, 'USD');

      trackEvent('CHECKOUT_COMPLETED', { orderId: result.orderId, total });
    } catch (err) {
      console.error('Checkout failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(errorMessage);
      trackEvent('CHECKOUT_FAILED', { error: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCoupon = () => {
    // Demo coupon logic
    if (couponCode.toUpperCase() === 'SAVE10') {
      setAppliedCoupon({ code: 'SAVE10', discount: subtotal * 0.1 });
      trackEvent('COUPON_APPLIED', { code: couponCode });
    } else {
      setError('Invalid coupon code');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button
          onClick={prevStage}
          className="px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg"
        >
          Continue Shopping
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
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h2>

              {/* Contact Information */}
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--primary-color)] text-white rounded-full text-sm flex items-center justify-center">
                    1
                  </span>
                  Contact Information
                </h3>

                <div className="space-y-4">
                  {config.fields.customer.email.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email {config.fields.customer.email.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={config.fields.customer.email.required}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                        placeholder="your@email.com"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {config.fields.customer.firstName.enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name {config.fields.customer.firstName.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required={config.fields.customer.firstName.required}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                        />
                      </div>
                    )}
                    {config.fields.customer.lastName.enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name {config.fields.customer.lastName.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required={config.fields.customer.lastName.required}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {config.fields.customer.phone.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone {config.fields.customer.phone.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required={config.fields.customer.phone.required}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Shipping Address */}
              {config.fields.shipping.enabled && (
                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={shippingAddress.lastName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
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
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                    />
                    {/* Country */}
                    <select
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value, state: '' })}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white mb-4"
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
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                      />
                      <select
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
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
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Payment */}
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--primary-color)] text-white rounded-full text-sm flex items-center justify-center">
                    {config.fields.shipping.enabled ? '3' : '2'}
                  </span>
                  Payment
                </h3>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCardIcon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-900">Credit Card</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Card Number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
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
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                {config.trust.showSecurityBadges && (
                  <div className="flex items-center gap-4 text-sm text-gray-500">
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

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Submit Button (Mobile) */}
              <div className="lg:hidden mb-8">
                <button
                  type="submit"
                  disabled={isProcessing}
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
                      Pay ${total.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            {config.payment.showOrderSummary && (
              <div className={config.layout === 'two-column' ? 'lg:col-span-2' : ''}>
                <div className="bg-gray-50 rounded-xl p-6 sticky top-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

                  {/* Cart Items */}
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={`${item.productId}-${item.variantId || ''}`} className="flex gap-3">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover bg-white"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Coupon */}
                  {config.payment.allowCoupons && (
                    <div className="mb-6">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg text-green-700">
                          <span className="flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5" />
                            {appliedCoupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAppliedCoupon(null)}
                            className="text-sm hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-300"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="text-gray-900">${shippingCost.toFixed(2)}</span>
                    </div>
                    {config.payment.showTaxEstimate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span className="text-gray-900">${tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Submit Button (Desktop) */}
                  <div className="hidden lg:block mt-6">
                    <button
                      type="submit"
                      disabled={isProcessing}
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
                          Pay ${total.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>

                  {/* Guarantee */}
                  {config.trust.showGuarantee && (
                    <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <ShieldCheckIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Satisfaction Guaranteed</p>
                          <p className="text-sm text-gray-500">
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
