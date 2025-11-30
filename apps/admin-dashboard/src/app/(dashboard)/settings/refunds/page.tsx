'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  DollarSign,
  Calendar,
  Shield,
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { refundsApi, RefundSettings, UpdateRefundSettingsInput } from '@/lib/api/refunds';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SettingSection({
  title,
  description,
  icon: Icon,
  children
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled = false
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-zinc-800/50 rounded-lg">
      <div className="flex-1">
        <label className="text-sm font-medium text-white block mb-1">
          {label}
        </label>
        {description && (
          <p className="text-xs text-zinc-500">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
          checked ? 'bg-cyan-600' : 'bg-zinc-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function NumberSetting({
  label,
  description,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  disabled = false
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="p-4 bg-zinc-800/50 rounded-lg">
      <label className="text-sm font-medium text-white block mb-1">
        {label}
      </label>
      {description && (
        <p className="text-xs text-zinc-500 mb-3">{description}</p>
      )}
      <div className="flex items-center gap-2">
        {prefix && (
          <span className="text-sm text-zinc-400">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {suffix && (
          <span className="text-sm text-zinc-400">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-blue-300">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function RefundSettingsPage() {
  const [settings, setSettings] = useState<RefundSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UpdateRefundSettingsInput>({
    autoApprovalEnabled: false,
    autoApprovalMaxAmount: 100,
    autoApprovalMaxDays: 30,
    requireReason: true,
    requireApproval: true,
    allowPartialRefunds: true,
    notifyOnRequest: true,
    notifyOnApproval: true,
    notifyOnCompletion: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await refundsApi.getSettings();
      setSettings(data);
      setFormData({
        autoApprovalEnabled: data.autoApprovalEnabled,
        autoApprovalMaxAmount: data.autoApprovalMaxAmount,
        autoApprovalMaxDays: data.autoApprovalMaxDays,
        requireReason: data.requireReason,
        requireApproval: data.requireApproval,
        allowPartialRefunds: data.allowPartialRefunds,
        notifyOnRequest: data.notifyOnRequest,
        notifyOnApproval: data.notifyOnApproval,
        notifyOnCompletion: data.notifyOnCompletion,
      });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load refund settings. Using default values.');
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await refundsApi.updateSettings(formData);
      setSettings(updated);
      setHasChanges(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData({
        autoApprovalEnabled: settings.autoApprovalEnabled,
        autoApprovalMaxAmount: settings.autoApprovalMaxAmount,
        autoApprovalMaxDays: settings.autoApprovalMaxDays,
        requireReason: settings.requireReason,
        requireApproval: settings.requireApproval,
        allowPartialRefunds: settings.allowPartialRefunds,
        notifyOnRequest: settings.notifyOnRequest,
        notifyOnApproval: settings.notifyOnApproval,
        notifyOnCompletion: settings.notifyOnCompletion,
      });
      setHasChanges(false);
    }
  };

  const updateField = <K extends keyof UpdateRefundSettingsInput>(
    field: K,
    value: UpdateRefundSettingsInput[K]
  ) => {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/refunds"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Refunds
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Refund Settings</h1>
            <p className="text-sm text-zinc-500">Configure refund policies and automation</p>
          </div>

          <div className="flex gap-2">
            {hasChanges && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <p className="text-sm text-green-300">Settings saved successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Auto-Approval Settings */}
        <SettingSection
          title="Auto-Approval"
          description="Automatically approve refunds that meet certain criteria"
          icon={Shield}
        >
          <ToggleSetting
            label="Enable Auto-Approval"
            description="Automatically approve refunds based on amount and time constraints"
            checked={formData.autoApprovalEnabled || false}
            onChange={(checked) => updateField('autoApprovalEnabled', checked)}
          />

          {formData.autoApprovalEnabled && (
            <>
              <NumberSetting
                label="Maximum Amount"
                description="Auto-approve refunds up to this amount"
                value={formData.autoApprovalMaxAmount || 100}
                onChange={(value) => updateField('autoApprovalMaxAmount', value)}
                min={0}
                step={10}
                prefix="$"
              />

              <NumberSetting
                label="Maximum Days Since Order"
                description="Auto-approve refunds for orders placed within this many days"
                value={formData.autoApprovalMaxDays || 30}
                onChange={(value) => updateField('autoApprovalMaxDays', value)}
                min={1}
                max={365}
                suffix="days"
              />

              <InfoBox>
                Refunds will be automatically approved if they meet <strong>both</strong> criteria:
                under ${formData.autoApprovalMaxAmount || 100} and within {formData.autoApprovalMaxDays || 30} days of order.
              </InfoBox>
            </>
          )}
        </SettingSection>

        {/* Refund Policy */}
        <SettingSection
          title="Refund Policy"
          description="Control refund requirements and restrictions"
          icon={DollarSign}
        >
          <ToggleSetting
            label="Require Reason"
            description="Customers must provide a reason when requesting a refund"
            checked={formData.requireReason || false}
            onChange={(checked) => updateField('requireReason', checked)}
          />

          <ToggleSetting
            label="Require Approval"
            description="All refunds must be manually approved (unless auto-approved)"
            checked={formData.requireApproval || false}
            onChange={(checked) => updateField('requireApproval', checked)}
          />

          <ToggleSetting
            label="Allow Partial Refunds"
            description="Enable partial refunds for individual line items"
            checked={formData.allowPartialRefunds || false}
            onChange={(checked) => updateField('allowPartialRefunds', checked)}
          />
        </SettingSection>

        {/* Notifications */}
        <SettingSection
          title="Notifications"
          description="Configure email notifications for refund events"
          icon={Bell}
        >
          <ToggleSetting
            label="Notify on Request"
            description="Send notification when a new refund is requested"
            checked={formData.notifyOnRequest || false}
            onChange={(checked) => updateField('notifyOnRequest', checked)}
          />

          <ToggleSetting
            label="Notify on Approval"
            description="Send notification when a refund is approved"
            checked={formData.notifyOnApproval || false}
            onChange={(checked) => updateField('notifyOnApproval', checked)}
          />

          <ToggleSetting
            label="Notify on Completion"
            description="Send notification when a refund is completed"
            checked={formData.notifyOnCompletion || false}
            onChange={(checked) => updateField('notifyOnCompletion', checked)}
          />

          <InfoBox>
            Notifications are sent to the customer and assigned team members based on their role.
          </InfoBox>
        </SettingSection>

        {/* Best Practices */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Best Practices</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Set reasonable auto-approval limits</p>
                <p>Consider your average order value and fraud risk when setting auto-approval thresholds.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Monitor refund trends</p>
                <p>Regularly review refund reasons to identify product or service issues.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Keep customers informed</p>
                <p>Enable notifications to maintain transparency throughout the refund process.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Document your policy</p>
                <p>Make sure your refund policy is clearly stated in your terms of service.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar (Mobile) */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800 md:hidden">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
