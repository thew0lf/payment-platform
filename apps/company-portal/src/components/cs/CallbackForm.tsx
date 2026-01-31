'use client';

import { useState } from 'react';
import { Phone, Clock, Loader2, CheckCircle } from 'lucide-react';
import { useCS } from '@/contexts/cs-context';

export function CallbackForm() {
  const { requestCallback, isLoading, endSession } = useCS();
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (value: string) => {
    // Basic phone validation - at least 10 digits
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) {
      return 'Please enter a valid phone number';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    const success = await requestCallback(phone, preferredTime || undefined, message || undefined);
    if (success) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Callback Requested!
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          We&apos;ll call you at <span className="font-medium">{phone}</span>
          {preferredTime && <> around {preferredTime}</>}.
        </p>
        <button
          onClick={endSession}
          className="text-[var(--primary-color,#4F46E5)] hover:underline text-sm font-medium"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <p className="text-gray-600 dark:text-gray-300 text-sm">
        Leave your number and we&apos;ll call you back as soon as possible.
      </p>

      {/* Phone Input */}
      <div>
        <label
          htmlFor="callback-phone"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Phone Number *
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="callback-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError('');
            }}
            placeholder="(555) 123-4567"
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              phoneError
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--primary-color,#4F46E5)]'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent`}
            required
          />
        </div>
        {phoneError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{phoneError}</p>
        )}
      </div>

      {/* Preferred Time */}
      <div>
        <label
          htmlFor="callback-time"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Preferred Time (optional)
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            id="callback-time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300
              dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-[var(--primary-color,#4F46E5)]
              focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="">As soon as possible</option>
            <option value="morning">Morning (9am - 12pm)</option>
            <option value="afternoon">Afternoon (12pm - 5pm)</option>
            <option value="evening">Evening (5pm - 8pm)</option>
          </select>
        </div>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="callback-message"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          What can we help with? (optional)
        </label>
        <textarea
          id="callback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Briefly describe your question or issue..."
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-gray-300
            dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            placeholder-gray-500 focus:outline-none focus:ring-2
            focus:ring-[var(--primary-color,#4F46E5)] focus:border-transparent resize-none"
        />
      </div>

      {/* Privacy Notice */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        By submitting this form, you agree to our{' '}
        <a href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
          Privacy Policy
        </a>
        . We&apos;ll use your phone number only to contact you about your request.
      </p>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !phone.trim()}
        className="w-full py-3 px-4 rounded-lg bg-[var(--primary-color,#4F46E5)]
          text-white font-medium hover:opacity-90 transition-opacity
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color,#4F46E5)]
          flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Phone className="w-5 h-5" />
            Request Callback
          </>
        )}
      </button>
    </form>
  );
}
