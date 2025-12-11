'use client';

import { FormEvent } from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface CardFormData {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  nickname: string;
  setAsDefault: boolean;
}

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  cardData: CardFormData;
  onCardDataChange: (data: CardFormData) => void;
  isLoading: boolean;
  formatCardNumber: (value: string) => string;
}

export function AddCardModal({
  isOpen,
  onClose,
  onSubmit,
  cardData,
  onCardDataChange,
  isLoading,
  formatCardNumber,
}: AddCardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              value={cardData.number}
              onChange={(e) => onCardDataChange({ ...cardData, number: formatCardNumber(e.target.value) })}
              placeholder="1234 5678 9012 3456"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={cardData.expiryMonth}
                onChange={(e) => onCardDataChange({ ...cardData, expiryMonth: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900"
              >
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m).padStart(2, '0')}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={cardData.expiryYear}
                onChange={(e) => onCardDataChange({ ...cardData, expiryYear: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900"
              >
                <option value="">YY</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                type="text"
                value={cardData.cvv}
                onChange={(e) => onCardDataChange({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="123"
                required
                maxLength={4}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardData.cardholderName}
              onChange={(e) => onCardDataChange({ ...cardData, cardholderName: e.target.value })}
              placeholder="John Doe"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={cardData.nickname}
              onChange={(e) => onCardDataChange({ ...cardData, nickname: e.target.value })}
              placeholder="Personal Card"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cardData.setAsDefault}
              onChange={(e) => onCardDataChange({ ...cardData, setAsDefault: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Set as default payment method</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              )}
              Add Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
