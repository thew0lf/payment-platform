'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  paymentPagesApi,
  PaymentPagePreview,
  PAGE_STATUSES,
} from '@/lib/api/payment-pages';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Edit,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// PAYMENT PAGE PREVIEW
// ═══════════════════════════════════════════════════════════════

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES: Record<DeviceType, { width: number; height: number; label: string }> = {
  desktop: { width: 1280, height: 800, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 812, label: 'Mobile' },
};

export default function PaymentPagePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [preview, setPreview] = useState<PaymentPagePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [scale, setScale] = useState(1);

  const pageId = params?.id as string;
  const companyId = accessLevel === 'COMPANY' ? undefined : selectedCompanyId || undefined;

  useEffect(() => {
    loadPreview();
  }, [pageId, companyId]);

  // Calculate scale to fit preview in available space
  useEffect(() => {
    function calculateScale() {
      const container = document.getElementById('preview-container');
      if (!container) return;

      const containerWidth = container.clientWidth - 48; // padding
      const containerHeight = container.clientHeight - 48;
      const deviceSize = DEVICE_SIZES[device];

      const scaleX = containerWidth / deviceSize.width;
      const scaleY = containerHeight / deviceSize.height;
      const newScale = Math.min(scaleX, scaleY, 1);

      setScale(newScale);
    }

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [device]);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentPagesApi.getPreview(pageId, companyId);
      setPreview(data);
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError('Failed to load payment page preview');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin" />
          <p className="text-sm text-zinc-400">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Preview Error</h2>
          <p className="text-sm text-zinc-400 mb-4">{error || 'Page not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = PAGE_STATUSES[preview.status];
  const deviceSize = DEVICE_SIZES[device];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex-none border-b border-zinc-800 bg-zinc-900">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left - Back and Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-purple-400" />
                <h1 className="text-lg font-semibold text-white">Preview</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-sm text-zinc-400">{preview.name}</p>
            </div>
          </div>

          {/* Center - Device Switcher */}
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                  device === d
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {d === 'desktop' && <Monitor className="h-4 w-4" />}
                {d === 'tablet' && <Tablet className="h-4 w-4" />}
                {d === 'mobile' && <Smartphone className="h-4 w-4" />}
                <span className="text-sm hidden sm:inline">{DEVICE_SIZES[d].label}</span>
              </button>
            ))}
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadPreview}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link
              href={`/payment-pages/${preview.id}`}
              className="px-3 py-1.5 text-sm bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
            {preview.status === 'PUBLISHED' && (
              <a
                href={`/checkout/${preview.companyCode}/${preview.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Open Live</span>
              </a>
            )}
          </div>
        </div>

        {/* Preview Banner */}
        {preview.status !== 'PUBLISHED' && (
          <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20 flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">
              This page is not published. Preview only - customers cannot see this page.
            </span>
          </div>
        )}
      </header>

      {/* Preview Container */}
      <div
        id="preview-container"
        className="flex-1 overflow-hidden flex items-center justify-center p-6"
        style={{ background: 'repeating-conic-gradient(#18181b 0% 25%, #09090b 0% 50%) 50% / 20px 20px' }}
      >
        <div
          className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
          style={{
            width: deviceSize.width,
            height: deviceSize.height,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Preview Content - Simulated Payment Page */}
          <div className="h-full overflow-auto" style={{ backgroundColor: preview.theme?.styles?.backgroundColor as string || '#ffffff' }}>
            <PaymentPageRenderer preview={preview} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-none border-t border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Device: {deviceSize.width} x {deviceSize.height}px | Scale: {Math.round(scale * 100)}%
          </span>
          <span>
            Preview generated at {new Date(preview.previewGeneratedAt).toLocaleString()}
          </span>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Payment Page Renderer Component
// ─────────────────────────────────────────────────────────────

function PaymentPageRenderer({ preview }: { preview: PaymentPagePreview }) {
  const styles = preview.theme?.styles || {};
  const primaryColor = (preview.brandColor || styles.primaryColor || '#3b82f6') as string;
  const fontFamily = (styles.fontFamily || 'system-ui, -apple-system, sans-serif') as string;

  return (
    <div
      className="min-h-full"
      style={{
        fontFamily,
        backgroundColor: (styles.backgroundColor || '#ffffff') as string,
        color: (styles.textColor || '#1f2937') as string,
      }}
    >
      {/* Header */}
      <header
        className="p-6 border-b"
        style={{ borderColor: (styles.borderColor || '#e5e7eb') as string }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {preview.logoUrl ? (
            <img
              src={preview.logoUrl}
              alt={preview.companyName}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <span className="text-lg font-semibold">{preview.companyName}</span>
          )}
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
            }}
          >
            Secure Checkout
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{preview.headline || preview.title || 'Complete Your Purchase'}</h1>
            {preview.subheadline && (
              <p className="text-gray-600">{preview.subheadline}</p>
            )}
          </div>

          {/* Customer Information Form */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: (styles.cardBackground || '#f9fafb') as string,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: (styles.borderColor || '#e5e7eb') as string,
            }}
          >
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{
                    borderColor: (styles.borderColor || '#e5e7eb') as string,
                    '--tw-ring-color': primaryColor,
                  } as React.CSSProperties}
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="John"
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ borderColor: (styles.borderColor || '#e5e7eb') as string }}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ borderColor: (styles.borderColor || '#e5e7eb') as string }}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: (styles.cardBackground || '#f9fafb') as string,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: (styles.borderColor || '#e5e7eb') as string,
            }}
          >
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            <div className="space-y-3">
              {/* Payment options based on acceptedGateways */}
              <PaymentOptionCard
                label="Credit Card"
                icon="card"
                selected={true}
                primaryColor={primaryColor}
              />
              {preview.acceptedGateways && Object.keys(preview.acceptedGateways).length > 1 && (
                <>
                  <PaymentOptionCard
                    label="PayPal"
                    icon="paypal"
                    selected={false}
                    primaryColor={primaryColor}
                  />
                </>
              )}
            </div>

            {/* Card Input Mock */}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ borderColor: (styles.borderColor || '#e5e7eb') as string }}
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ borderColor: (styles.borderColor || '#e5e7eb') as string }}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CVC</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ borderColor: (styles.borderColor || '#e5e7eb') as string }}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: (styles.cardBackground || '#f9fafb') as string,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: (styles.borderColor || '#e5e7eb') as string,
            }}
          >
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sample Product</span>
                <span>$99.00</span>
              </div>
              {preview.shippingEnabled && (
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>$9.99</span>
                </div>
              )}
              {preview.taxEnabled && (
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>$8.91</span>
                </div>
              )}
              {preview.discountsEnabled && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-$10.00</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>$107.90</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          {preview.requireTermsAccept && (
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 rounded"
                style={{ accentColor: primaryColor }}
                disabled
              />
              <p className="text-sm text-gray-600">
                I agree to the{' '}
                <a href="#" className="underline" style={{ color: primaryColor }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="underline" style={{ color: primaryColor }}>
                  Privacy Policy
                </a>
              </p>
            </div>
          )}

          {/* Pay Button */}
          <button
            className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
            disabled
          >
            Pay $107.90
          </button>

          {/* Security Badge */}
          <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secured with 256-bit SSL encryption
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="p-6 border-t text-center text-sm text-gray-500"
        style={{ borderColor: (styles.borderColor || '#e5e7eb') as string }}
      >
        <p>&copy; {new Date().getFullYear()} {preview.companyName}. All rights reserved.</p>
        {(preview.termsUrl || preview.privacyUrl || preview.refundPolicyUrl) && (
          <div className="mt-2 flex items-center justify-center gap-4">
            {preview.termsUrl && <a href="#" className="underline hover:no-underline">Terms</a>}
            {preview.privacyUrl && <a href="#" className="underline hover:no-underline">Privacy</a>}
            {preview.refundPolicyUrl && <a href="#" className="underline hover:no-underline">Refunds</a>}
          </div>
        )}
      </footer>
    </div>
  );
}

// Payment Option Card
function PaymentOptionCard({
  label,
  icon,
  selected,
  primaryColor,
}: {
  label: string;
  icon: string;
  selected: boolean;
  primaryColor: string;
}) {
  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected ? 'border-current' : 'border-gray-200'
      }`}
      style={{ borderColor: selected ? primaryColor : undefined }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected ? 'border-current' : 'border-gray-300'
          }`}
          style={{ borderColor: selected ? primaryColor : undefined }}
        >
          {selected && (
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
          )}
        </div>
        <span className="font-medium">{label}</span>
        {icon === 'card' && (
          <div className="ml-auto flex gap-1">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Visa</span>
            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">MC</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded">Amex</span>
          </div>
        )}
        {icon === 'paypal' && (
          <span className="ml-auto text-blue-600 font-bold">PayPal</span>
        )}
      </div>
    </div>
  );
}
