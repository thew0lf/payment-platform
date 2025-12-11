'use client';

import { useState, FormEvent } from 'react';
import {
  getCustomerPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  PaymentMethod,
} from '@/lib/api';
import {
  ArrowPathIcon,
  CreditCardIcon,
  EnvelopeIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AddCardModal, CardFormData } from '@/components/add-card-modal';

const CARD_BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  VISA: { bg: 'bg-blue-500', text: 'text-white' },
  MASTERCARD: { bg: 'bg-red-500', text: 'text-white' },
  AMEX: { bg: 'bg-blue-600', text: 'text-white' },
  DISCOVER: { bg: 'bg-orange-500', text: 'text-white' },
  OTHER: { bg: 'bg-gray-500', text: 'text-white' },
};

function formatExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

function CardIcon({ brand }: { brand: string }) {
  const colors = CARD_BRAND_COLORS[brand] || CARD_BRAND_COLORS.OTHER;

  return (
    <div className={`w-12 h-8 rounded flex items-center justify-center ${colors.bg}`}>
      <span className={`text-xs font-bold ${colors.text}`}>
        {brand === 'AMEX' ? 'AMEX' : brand?.slice(0, 4)}
      </span>
    </div>
  );
}

// Format card number input
const formatCardNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  return formatted.slice(0, 19); // Max 16 digits + 3 spaces
};

const INITIAL_CARD_DATA: CardFormData = {
  number: '',
  expiryMonth: '',
  expiryYear: '',
  cvv: '',
  cardholderName: '',
  nickname: '',
  setAsDefault: false,
};

export default function PaymentMethodsPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<PaymentMethod | null>(null);

  // Add card form state
  const [newCard, setNewCard] = useState<CardFormData>(INITIAL_CARD_DATA);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const result = await getCustomerPaymentMethods(email);
      setPaymentMethods(result.paymentMethods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethod: PaymentMethod) => {
    setActionLoading(paymentMethod.id);
    try {
      await setDefaultPaymentMethod(email, paymentMethod.id);
      setPaymentMethods((prev) =>
        prev.map((pm) => ({
          ...pm,
          isDefault: pm.id === paymentMethod.id,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(deleteModal.id);
    try {
      await deletePaymentMethod(email, deleteModal.id);
      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== deleteModal.id));
      setDeleteModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment method');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddCard = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading('add');
    setError(null);

    try {
      const result = await addPaymentMethod(email, {
        card: {
          number: newCard.number.replace(/\s/g, ''),
          expiryMonth: newCard.expiryMonth,
          expiryYear: newCard.expiryYear,
          cvv: newCard.cvv,
          cardholderName: newCard.cardholderName,
        },
        nickname: newCard.nickname || undefined,
        setAsDefault: newCard.setAsDefault,
      });

      setPaymentMethods((prev) => {
        if (newCard.setAsDefault) {
          return [...prev.map((pm) => ({ ...pm, isDefault: false })), result];
        }
        return [...prev, result];
      });

      setShowAddModal(false);
      setNewCard(INITIAL_CARD_DATA);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBack = () => {
    setPaymentMethods([]);
    setHasSearched(false);
    setError(null);
  };

  // Payment Methods List View
  if (hasSearched && paymentMethods.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            &larr; Back to lookup
          </button>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              Add Card
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <CardIcon brand={pm.cardType} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          •••• •••• •••• {pm.lastFour}
                        </p>
                        {pm.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                            <StarIcon className="h-3 w-3" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {pm.cardholderName || pm.cardType} • Expires {formatExpiry(pm.expirationMonth, pm.expirationYear)}
                      </p>
                      {pm.nickname && (
                        <p className="text-xs text-gray-400 mt-0.5">{pm.nickname}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!pm.isDefault && (
                      <button
                        onClick={() => handleSetDefault(pm)}
                        disabled={actionLoading === pm.id}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Set as default"
                      >
                        {actionLoading === pm.id ? (
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                          <StarIcon className="h-5 w-5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteModal(pm)}
                      disabled={actionLoading === pm.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Card Modal */}
        <AddCardModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCard}
          cardData={newCard}
          onCardDataChange={setNewCard}
          isLoading={actionLoading === 'add'}
          formatCardNumber={formatCardNumber}
        />

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Payment Method</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete the card ending in {deleteModal.lastFour}?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === deleteModal.id}
                  className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === deleteModal.id && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Empty State (after search)
  if (hasSearched && paymentMethods.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            &larr; Try another email
          </button>

          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CreditCardIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Saved Cards</h2>
            <p className="text-gray-600 mb-6">
              No payment methods found for this email address.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              Add Your First Card
            </button>
          </div>
        </div>

        {/* Add Card Modal */}
        <AddCardModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCard}
          cardData={newCard}
          onCardDataChange={setNewCard}
          isLoading={actionLoading === 'add'}
          formatCardNumber={formatCardNumber}
        />
      </div>
    );
  }

  // Lookup Form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CreditCardIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-gray-600 mt-2">
            Manage your saved payment methods
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Looking up...
                </>
              ) : (
                <>View My Payment Methods</>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6 space-y-2">
          <p>
            <a href="/account/orders" className="text-blue-600 hover:underline">
              Track an order
            </a>
            {' • '}
            <a href="/account/subscriptions" className="text-blue-600 hover:underline">
              Manage subscriptions
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
