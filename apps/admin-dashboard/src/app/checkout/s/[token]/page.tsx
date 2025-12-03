'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Clock, XCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// SESSION-BASED CHECKOUT
// ═══════════════════════════════════════════════════════════════
// This page handles pre-created checkout sessions (e.g., from API)
// It loads session data and redirects to the main checkout or shows status

interface SessionData {
  id: string;
  sessionToken: string;
  status: 'PENDING' | 'PROCESSING' | 'REQUIRES_ACTION' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'ABANDONED';
  page: {
    id: string;
    slug: string;
    companyCode: string;
  };
  total: number;
  currency: string;
  customerEmail?: string;
  expiresAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchSession(token: string): Promise<SessionData> {
  const response = await fetch(`${API_BASE}/api/checkout/sessions/${token}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Session not found' }));
    throw new Error(error.message || 'Session not found');
  }
  return response.json();
}

export default function SessionCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetchSession(token)
      .then((data) => {
        setSession(data);

        // Handle different session statuses
        switch (data.status) {
          case 'PENDING':
          case 'REQUIRES_ACTION':
            // Redirect to checkout with session context
            router.push(
              `/checkout/${data.page.companyCode}/${data.page.slug}?session=${token}&amount=${data.total}&currency=${data.currency}`
            );
            break;
          case 'COMPLETED':
          case 'FAILED':
          case 'CANCELLED':
          case 'EXPIRED':
          case 'ABANDONED':
            // Show status page
            setLoading(false);
            break;
          default:
            setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto" />
          <p className="mt-2 text-sm text-zinc-500">Loading checkout session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Session Not Found</h1>
          <p className="text-zinc-500 mb-6">
            {error || 'This checkout session is invalid or has expired.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Expired session
  if (session.status === 'EXPIRED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Session Expired</h1>
          <p className="text-zinc-500 mb-6">
            This checkout session has expired. Please start a new checkout.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Start Over
          </a>
        </div>
      </div>
    );
  }

  // Cancelled session
  if (session.status === 'CANCELLED' || session.status === 'ABANDONED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-zinc-500" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Session Cancelled</h1>
          <p className="text-zinc-500 mb-6">
            This checkout session was cancelled. You can start a new checkout if needed.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Start Over
          </a>
        </div>
      </div>
    );
  }

  // Failed session
  if (session.status === 'FAILED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Payment Failed</h1>
          <p className="text-zinc-500 mb-6">
            Unfortunately, we were unable to process your payment. Please try again or use a different payment method.
          </p>
          <a
            href={`/checkout/${session.page.companyCode}/${session.page.slug}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Completed (shouldn't normally reach here, but just in case)
  if (session.status === 'COMPLETED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Payment Complete</h1>
          <p className="text-zinc-500">
            Thank you for your purchase! A confirmation email has been sent to {session.customerEmail}.
          </p>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  );
}
