'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Globe,
  Settings,
  Palette,
  CreditCard,
  Eye,
  Code,
  Copy,
  ExternalLink,
  BarChart3,
  Users,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  paymentPagesApi,
  themesApi,
  PaymentPage,
  CheckoutPageTheme,
  UpdatePaymentPageInput,
  PAGE_TYPES,
  PAGE_STATUSES,
  THEME_CATEGORIES,
  PaymentPageType,
  ThemeCategory,
} from '@/lib/api/payment-pages';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type EditorTab = 'settings' | 'design' | 'gateway' | 'preview';

// ═══════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════

interface SettingsTabProps {
  page: PaymentPage;
  onChange: (updates: Partial<UpdatePaymentPageInput>) => void;
}

function SettingsTab({ page, onChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Page Name</label>
              <input
                type="text"
                value={page.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">URL Slug</label>
              <div className="flex">
                <span className="px-3 py-2 bg-zinc-900 border border-r-0 border-zinc-700 rounded-l-lg text-zinc-500 text-sm">
                  checkout/
                </span>
                <input
                  type="text"
                  value={page.slug}
                  onChange={(e) => onChange({ slug: e.target.value })}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-r-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Page Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(PAGE_TYPES) as PaymentPageType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange({ type })}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
                    page.type === type
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  <span className="text-xs font-medium">{PAGE_TYPES[type].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Branding & Content</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Headline</label>
              <input
                type="text"
                value={page.headline || ''}
                onChange={(e) => onChange({ headline: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="Complete your purchase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Brand Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={page.brandColor || '#3B82F6'}
                  onChange={(e) => onChange({ brandColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={page.brandColor || '#3B82F6'}
                  onChange={(e) => onChange({ brandColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Subheadline</label>
            <input
              type="text"
              value={page.subheadline || ''}
              onChange={(e) => onChange({ subheadline: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="Secure payment powered by our platform"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
            <textarea
              value={page.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
              placeholder="A brief description of this payment page..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Logo URL</label>
              <input
                type="url"
                value={page.logoUrl || ''}
                onChange={(e) => onChange({ logoUrl: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Favicon URL</label>
              <input
                type="url"
                value={page.faviconUrl || ''}
                onChange={(e) => onChange({ faviconUrl: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Redirects */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Redirect URLs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Success URL</label>
            <input
              type="url"
              value={page.successUrl || ''}
              onChange={(e) => onChange({ successUrl: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="https://yoursite.com/success"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Cancel URL</label>
            <input
              type="url"
              value={page.cancelUrl || ''}
              onChange={(e) => onChange({ cancelUrl: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="https://yoursite.com/cancel"
            />
          </div>
        </div>
      </div>

      {/* Advanced */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Advanced Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">AI Insights</p>
              <p className="text-xs text-zinc-500">Enable AI-powered conversion optimization</p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ aiInsightsEnabled: !page.aiInsightsEnabled } as any)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                page.aiInsightsEnabled ? 'bg-cyan-500' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5',
                  page.aiInsightsEnabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Conversion Tracking</p>
              <p className="text-xs text-zinc-500">Track visitor behavior and conversions</p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ conversionTracking: !page.conversionTracking } as any)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                page.conversionTracking ? 'bg-cyan-500' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5',
                  page.conversionTracking ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DESIGN TAB (Theme Selector)
// ═══════════════════════════════════════════════════════════════

interface DesignTabProps {
  page: PaymentPage;
  themes: CheckoutPageTheme[];
  onChange: (updates: Partial<UpdatePaymentPageInput>) => void;
}

function DesignTab({ page, themes, onChange }: DesignTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<ThemeCategory | ''>('');

  const filteredThemes = categoryFilter
    ? themes.filter((t) => t.category === categoryFilter)
    : themes;

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            !categoryFilter
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
          )}
        >
          All Themes
        </button>
        {(Object.keys(THEME_CATEGORIES) as ThemeCategory[]).map((category) => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              categoryFilter === category
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
            )}
          >
            {THEME_CATEGORIES[category].label}
          </button>
        ))}
      </div>

      {/* Themes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onChange({ themeId: theme.id })}
            className={cn(
              'relative rounded-xl border overflow-hidden transition-all text-left',
              page.themeId === theme.id
                ? 'border-cyan-500 ring-2 ring-cyan-500/20'
                : 'border-zinc-700 hover:border-zinc-600'
            )}
          >
            {/* Theme Preview */}
            <div className="aspect-video bg-zinc-800 flex items-center justify-center">
              {theme.thumbnail ? (
                <img src={theme.thumbnail} alt={theme.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${(theme.styles as any)?.primaryColor || '#3B82F6'}20, ${(theme.styles as any)?.backgroundColor || '#18181B'})`,
                  }}
                >
                  <Palette className="w-8 h-8 text-zinc-600" />
                </div>
              )}
            </div>

            {/* Theme Info */}
            <div className="p-3 bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{theme.name}</span>
                {page.themeId === theme.id && (
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <span className="text-xs text-zinc-500">{THEME_CATEGORIES[theme.category]?.label}</span>
            </div>
          </button>
        ))}
      </div>

      {filteredThemes.length === 0 && (
        <div className="text-center py-12">
          <Palette className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-500">No themes found for this category</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GATEWAY TAB
// ═══════════════════════════════════════════════════════════════

interface GatewayTabProps {
  page: PaymentPage;
  onChange: (updates: Partial<UpdatePaymentPageInput>) => void;
}

function GatewayTab({ page, onChange }: GatewayTabProps) {
  const gateways = [
    { id: 'stripe', name: 'Stripe', icon: '💳', description: 'Credit/debit cards via Stripe Elements' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'PayPal checkout and Pay Later' },
    { id: 'nmi', name: 'NMI', icon: '🏦', description: 'NMI payment gateway' },
    { id: 'authorizenet', name: 'Authorize.net', icon: '💵', description: 'Authorize.net Accept.js' },
  ];

  const acceptedGateways = (page.acceptedGateways as Record<string, boolean>) || {};

  const toggleGateway = (gatewayId: string) => {
    const updated = { ...acceptedGateways, [gatewayId]: !acceptedGateways[gatewayId] };
    onChange({ acceptedGateways: updated });
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Accepted Payment Methods</h3>
        <div className="space-y-3">
          {gateways.map((gateway) => (
            <div
              key={gateway.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border transition-colors',
                acceptedGateways[gateway.id]
                  ? 'bg-cyan-500/5 border-cyan-500/30'
                  : 'bg-zinc-800/50 border-zinc-700'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{gateway.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{gateway.name}</p>
                  <p className="text-xs text-zinc-500">{gateway.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleGateway(gateway.id)}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                  acceptedGateways[gateway.id] ? 'bg-cyan-500' : 'bg-zinc-700'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5',
                    acceptedGateways[gateway.id] ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Fields Configuration */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Customer Fields</h3>
        <div className="space-y-3">
          {[
            { id: 'name', label: 'Full Name', required: true },
            { id: 'email', label: 'Email Address', required: true },
            { id: 'phone', label: 'Phone Number', required: false },
            { id: 'address', label: 'Billing Address', required: false },
            { id: 'shipping', label: 'Shipping Address', required: false },
          ].map((field) => {
            const config = (page.customerFieldsConfig as Record<string, { enabled: boolean; required: boolean }>) || {};
            const fieldConfig = config[field.id] || { enabled: field.required, required: field.required };

            return (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
              >
                <span className="text-sm text-white">{field.label}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={fieldConfig.required}
                      disabled={field.required}
                      onChange={(e) => {
                        const updated = {
                          ...config,
                          [field.id]: { ...fieldConfig, required: e.target.checked, enabled: e.target.checked || fieldConfig.enabled },
                        };
                        onChange({ customerFieldsConfig: updated });
                      }}
                      className="rounded border-zinc-600 bg-zinc-700 text-cyan-500 focus:ring-cyan-500/50"
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...config,
                        [field.id]: { ...fieldConfig, enabled: !fieldConfig.enabled },
                      };
                      onChange({ customerFieldsConfig: updated });
                    }}
                    disabled={field.required}
                    className={cn(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out disabled:opacity-50',
                      fieldConfig.enabled ? 'bg-cyan-500' : 'bg-zinc-700'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5',
                        fieldConfig.enabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PREVIEW TAB
// ═══════════════════════════════════════════════════════════════

interface PreviewTabProps {
  page: PaymentPage;
}

function PreviewTab({ page }: PreviewTabProps) {
  const checkoutUrl = `${window.location.origin}/checkout/${page.slug}`;
  const previewUrl = `/payment-pages/preview/${page.id}`;

  return (
    <div className="space-y-6">
      {/* URL Info & Preview Actions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-white">Checkout URL</p>
              <p className="text-xs text-zinc-500">{checkoutUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(checkoutUrl)}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Copy URL"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </button>
            {page.status === 'PUBLISHED' && (
              <button
                onClick={() => window.open(checkoutUrl, '_blank')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Live Page</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Notice */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Preview Your Page</h3>
          <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
            Click the Preview button above to see how your payment page will look on different devices.
            You can preview pages at any status - draft, published, or archived.
          </p>
          <button
            onClick={() => window.open(previewUrl, '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Open Preview
          </button>
        </div>
      </div>

      {/* Embed Code */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-zinc-500" />
            <span className="text-sm font-medium text-white">Embed Code</span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(`<script src="${window.location.origin}/checkout/embed.js" data-page="${page.slug}"></script>`)}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Copy
          </button>
        </div>
        <pre className="p-3 bg-zinc-950 rounded-lg text-xs text-zinc-400 overflow-x-auto">
{`<script
  src="${window.location.origin}/checkout/embed.js"
  data-page="${page.slug}"
></script>`}
        </pre>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function PaymentPageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();

  const [page, setPage] = useState<PaymentPage | null>(null);
  const [themes, setThemes] = useState<CheckoutPageTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('settings');
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<UpdatePaymentPageInput>>({});

  const pageId = params?.id as string;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageData, themesData] = await Promise.all([
        paymentPagesApi.getById(pageId, selectedCompanyId || undefined),
        themesApi.list(selectedCompanyId || undefined),
      ]);
      setPage(pageData);
      setThemes(themesData);
    } catch (err) {
      console.error('Failed to load page:', err);
      setError('Failed to load payment page');
    } finally {
      setLoading(false);
    }
  }, [pageId, selectedCompanyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (updates: Partial<UpdatePaymentPageInput>) => {
    setPendingChanges((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
    // Optimistically update local state
    setPage((prev) => (prev ? { ...prev, ...updates } as PaymentPage : null));
  };

  const handleSave = async () => {
    if (!page || !hasChanges) return;

    setSaving(true);
    try {
      await paymentPagesApi.update(pageId, pendingChanges, selectedCompanyId || undefined);
      setPendingChanges({});
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save page:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!page) return;
    try {
      const updated = await paymentPagesApi.publish(pageId, selectedCompanyId || undefined);
      setPage(updated);
    } catch (err) {
      console.error('Failed to publish page:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-lg font-medium text-white mb-2">Error Loading Page</p>
        <p className="text-sm text-zinc-500 mb-4">{error || 'Page not found'}</p>
        <button
          onClick={() => router.push('/payment-pages')}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
        >
          Back to Payment Pages
        </button>
      </div>
    );
  }

  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'design', label: 'Design', icon: <Palette className="w-4 h-4" /> },
    { id: 'gateway', label: 'Payment', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/payment-pages')}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">{page.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', PAGE_STATUSES[page.status].color)}>
                  {PAGE_STATUSES[page.status].label}
                </span>
                <span className="text-xs text-zinc-500">checkout/{page.slug}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs text-yellow-400">Unsaved changes</span>
            )}
            <button
              onClick={() => window.open(`/payment-pages/preview/${page.id}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            {page.status === 'DRAFT' && (
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Publish
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-zinc-500 border-transparent hover:text-white'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {activeTab === 'settings' && <SettingsTab page={page} onChange={handleChange} />}
        {activeTab === 'design' && <DesignTab page={page} themes={themes} onChange={handleChange} />}
        {activeTab === 'gateway' && <GatewayTab page={page} onChange={handleChange} />}
        {activeTab === 'preview' && <PreviewTab page={page} />}
      </div>
    </div>
  );
}
