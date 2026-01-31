'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { useCS } from '@/contexts/cs-context';

export function TicketForm() {
  const { submitTicket, isLoading, endSession } = useCS();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ subject?: string; message?: string; email?: string }>({});

  const validate = () => {
    const newErrors: { subject?: string; message?: string; email?: string } = {};

    if (!subject.trim()) {
      newErrors.subject = 'Please enter a subject';
    }
    if (!message.trim()) {
      newErrors.message = 'Please enter your message';
    } else if (message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const success = await submitTicket(subject, message, email || undefined);
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
          Ticket Submitted!
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          We&apos;ve received your message and will respond shortly.
          {email && (
            <> You&apos;ll receive updates at <span className="font-medium">{email}</span>.</>
          )}
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
        Send us a message and we&apos;ll get back to you as soon as we can.
      </p>

      {/* Email Input (optional) */}
      <div>
        <label
          htmlFor="ticket-email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email (optional, for follow-up)
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="ticket-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="you@example.com"
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              errors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--primary-color,#4F46E5)]'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent`}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
        )}
      </div>

      {/* Subject Input */}
      <div>
        <label
          htmlFor="ticket-subject"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Subject *
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setErrors((prev) => ({ ...prev, subject: undefined }));
            }}
            placeholder="What's this about?"
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              errors.subject
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--primary-color,#4F46E5)]'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent`}
            required
          />
        </div>
        {errors.subject && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>
        )}
      </div>

      {/* Message Input */}
      <div>
        <label
          htmlFor="ticket-message"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Message *
        </label>
        <textarea
          id="ticket-message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setErrors((prev) => ({ ...prev, message: undefined }));
          }}
          placeholder="Describe your question or issue in detail..."
          rows={4}
          className={`w-full px-4 py-2 rounded-lg border ${
            errors.message
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--primary-color,#4F46E5)]'
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent resize-none`}
          required
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p>
        )}
      </div>

      {/* Privacy Notice */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        By submitting this form, you agree to our{' '}
        <a href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
          Privacy Policy
        </a>
        . We&apos;ll use your information only to respond to your inquiry.
      </p>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !subject.trim() || !message.trim()}
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
            <Mail className="w-5 h-5" />
            Submit Ticket
          </>
        )}
      </button>
    </form>
  );
}
