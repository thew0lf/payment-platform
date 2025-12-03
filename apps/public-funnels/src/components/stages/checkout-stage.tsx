'use client';

import { useState } from 'react';
import type { FunnelStage, Funnel } from '@/lib/api';

interface Props {
  stage: FunnelStage;
  funnel: Funnel;
  stageData: Record<string, unknown>;
  onAdvance: (data?: Record<string, unknown>) => void;
  onBack: () => void;
  canGoBack: boolean;
  isLastStage: boolean;
}

interface CheckoutConfig {
  layout?: 'two-column' | 'single-column';
  fields?: {
    customer?: {
      email?: { enabled?: boolean; required?: boolean };
      firstName?: { enabled?: boolean; required?: boolean };
      lastName?: { enabled?: boolean; required?: boolean };
      phone?: { enabled?: boolean; required?: boolean };
    };
    shipping?: { enabled?: boolean; required?: boolean };
    billing?: { enabled?: boolean; sameAsShipping?: boolean };
  };
  payment?: {
    methods?: Array<{ type: string; enabled: boolean }>;
    showOrderSummary?: boolean;
    allowCoupons?: boolean;
  };
  trust?: {
    showSecurityBadges?: boolean;
    showGuarantee?: boolean;
  };
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export function CheckoutStage({
  stage,
  funnel,
  stageData,
  onAdvance,
  onBack,
  canGoBack,
}: Props) {
  const config = (stage.config || {}) as CheckoutConfig;
  const branding = funnel.settings?.branding || {};

  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Get selected products from previous stage
  const selectedProducts = (stageData as { selectedProducts?: Array<{ productId: string; quantity: number }> })?.selectedProducts || [];

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    if (config.fields?.shipping?.enabled !== false) {
      if (!formData.address1) newErrors.address1 = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.postalCode) newErrors.postalCode = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      // In production, this would process payment and create order
      await new Promise((resolve) => setTimeout(resolve, 2000));

      onAdvance({
        customer: formData,
        paymentMethod: 'card',
      });
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isTwoColumn = config.layout !== 'single-column';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white py-4 px-4 md:px-8 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            {canGoBack && (
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900">Secure Checkout</h1>
            {config.trust?.showSecurityBadges !== false && (
              <div className="flex items-center text-gray-500 text-sm">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                SSL Secured
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className={`grid gap-8 ${isTwoColumn ? 'lg:grid-cols-5' : ''}`}>
              {/* Checkout Form */}
              <div className={isTwoColumn ? 'lg:col-span-3' : ''}>
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]`}
                        placeholder="your@email.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border ${
                            errors.firstName ? 'border-red-500' : 'border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]`}
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border ${
                            errors.lastName ? 'border-red-500' : 'border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]`}
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    {config.fields?.customer?.phone?.enabled !== false && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone (optional)
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {config.fields?.shipping?.enabled !== false && (
                  <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={formData.address1}
                          onChange={(e) => handleInputChange('address1', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border ${
                            errors.address1 ? 'border-red-500' : 'border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]`}
                        />
                        {errors.address1 && (
                          <p className="mt-1 text-sm text-red-500">{errors.address1}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Apartment, suite, etc. (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.address2}
                          onChange={(e) => handleInputChange('address2', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.city ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]`}
                          />
                          {errors.city && (
                            <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.state ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]`}
                          />
                          {errors.state && (
                            <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            value={formData.postalCode}
                            onChange={(e) => handleInputChange('postalCode', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.postalCode ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]`}
                          />
                          {errors.postalCode && (
                            <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <select
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="GB">United Kingdom</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment section placeholder */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <p className="text-gray-500">Payment integration placeholder</p>
                    <p className="text-sm text-gray-400 mt-1">Connect Stripe, PayPal, or other gateways</p>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              {config.payment?.showOrderSummary !== false && (
                <div className={isTwoColumn ? 'lg:col-span-2' : ''}>
                  <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

                    {selectedProducts.length > 0 ? (
                      <div className="space-y-4">
                        {selectedProducts.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Product {item.productId} × {item.quantity}
                            </span>
                            <span className="font-medium">$99.99</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No items selected</p>
                    )}

                    <div className="border-t mt-4 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">$99.99</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping</span>
                        <span className="font-medium">Free</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-medium">$8.00</span>
                      </div>
                    </div>

                    <div className="border-t mt-4 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>$107.99</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`w-full mt-6 py-4 rounded-lg font-semibold text-white transition-all ${
                        isProcessing
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: branding.primaryColor || '#000000' }}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        'Complete Order'
                      )}
                    </button>

                    {config.trust?.showGuarantee !== false && (
                      <p className="text-center text-xs text-gray-500 mt-4">
                        30-day money-back guarantee
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
