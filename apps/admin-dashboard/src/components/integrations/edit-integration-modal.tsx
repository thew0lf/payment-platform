'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  IntegrationDefinition,
  PlatformIntegration,
  ClientIntegration,
  IntegrationProvider,
  IntegrationCategory,
  IntegrationMode,
} from '@/lib/api/integrations';

type Integration = PlatformIntegration | ClientIntegration;

interface EditIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration | null;
  definition?: IntegrationDefinition;
  isPlatformView?: boolean;
  onSubmit: (id: string, data: {
    name?: string;
    description?: string;
    credentials?: Record<string, string>;
    environment?: string;
    isSharedWithClients?: boolean;
    clientPricing?: { type: string; amount: number; percentage?: number };
    isDefault?: boolean;
  }) => Promise<void>;
}

const categoryLabels: Record<IntegrationCategory, string> = {
  [IntegrationCategory.PAYMENT_GATEWAY]: 'Payment Gateway',
  [IntegrationCategory.AUTHENTICATION]: 'Authentication',
  [IntegrationCategory.COMMUNICATION]: 'Communication',
  [IntegrationCategory.ANALYTICS]: 'Analytics',
  [IntegrationCategory.OAUTH]: 'Connected Services',
  [IntegrationCategory.EMAIL_TRANSACTIONAL]: 'Email (Transactional)',
  [IntegrationCategory.EMAIL_MARKETING]: 'Email (Marketing)',
  [IntegrationCategory.SMS]: 'SMS',
  [IntegrationCategory.VOICE]: 'Voice',
  [IntegrationCategory.PUSH_NOTIFICATION]: 'Push Notifications',
  [IntegrationCategory.AI_ML]: 'AI & Machine Learning',
  [IntegrationCategory.STORAGE]: 'Storage',
  [IntegrationCategory.IMAGE_PROCESSING]: 'Image Processing',
  [IntegrationCategory.VIDEO_GENERATION]: 'Video Generation',
  [IntegrationCategory.CDN]: 'CDN',
  [IntegrationCategory.DNS]: 'DNS',
  [IntegrationCategory.MONITORING]: 'Monitoring',
  [IntegrationCategory.FEATURE_FLAGS]: 'Feature Flags',
  [IntegrationCategory.WEBHOOK]: 'Webhooks',
  [IntegrationCategory.DEPLOYMENT]: 'Deployment',
  [IntegrationCategory.LOCATION_SERVICES]: 'Location Services',
  [IntegrationCategory.FULFILLMENT]: 'Fulfillment',
};

// Provider configuration with icons and brand colors
const providerConfig: Record<string, { icon: string; iconUrl?: string; bgColor: string; gradient: string }> = {
  [IntegrationProvider.PAYPAL_PAYFLOW]: { icon: 'PP', iconUrl: '/integrations/paypal.svg', bgColor: 'bg-[#003087]', gradient: 'from-[#003087] to-[#009cde]' },
  [IntegrationProvider.PAYPAL_REST]: { icon: 'PP', iconUrl: '/integrations/paypal.svg', bgColor: 'bg-[#003087]', gradient: 'from-[#003087] to-[#009cde]' },
  [IntegrationProvider.PAYPAL_CLASSIC]: { icon: 'PP', iconUrl: '/integrations/paypal.svg', bgColor: 'bg-[#003087]', gradient: 'from-[#003087] to-[#009cde]' },
  [IntegrationProvider.STRIPE]: { icon: 'S', iconUrl: '/integrations/stripe.svg', bgColor: 'bg-[#635BFF]', gradient: 'from-[#635BFF] to-[#8B85FF]' },
  [IntegrationProvider.AUTHORIZE_NET]: { icon: 'AN', iconUrl: '/integrations/authorize-net.svg', bgColor: 'bg-[#F26722]', gradient: 'from-[#F26722] to-[#FF8B4D]' },
  [IntegrationProvider.NMI]: { icon: 'NMI', iconUrl: '/integrations/nmi.svg', bgColor: 'bg-[#00A651]', gradient: 'from-[#00A651] to-[#00D468]' },
  [IntegrationProvider.AUTH0]: { icon: 'A0', iconUrl: '/integrations/auth0.svg', bgColor: 'bg-[#EB5424]', gradient: 'from-[#EB5424] to-[#FF7A4D]' },
  [IntegrationProvider.OKTA]: { icon: 'OK', iconUrl: '/integrations/okta.svg', bgColor: 'bg-[#007DC1]', gradient: 'from-[#007DC1] to-[#00A3E0]' },
  [IntegrationProvider.COGNITO]: { icon: 'CG', iconUrl: '/integrations/cognito.svg', bgColor: 'bg-[#DD344C]', gradient: 'from-[#DD344C] to-[#FF5A6E]' },
  [IntegrationProvider.TWILIO]: { icon: 'TW', iconUrl: '/integrations/twilio.svg', bgColor: 'bg-[#F22F46]', gradient: 'from-[#F22F46] to-[#FF5A6E]' },
  [IntegrationProvider.SENDGRID]: { icon: 'SG', iconUrl: '/integrations/sendgrid.svg', bgColor: 'bg-[#1A82E2]', gradient: 'from-[#1A82E2] to-[#4DA3FF]' },
  [IntegrationProvider.AWS_SES]: { icon: 'SES', iconUrl: '/integrations/aws-ses.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.AWS_SNS]: { icon: 'SNS', iconUrl: '/integrations/aws-sns.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.KLAVIYO]: { icon: 'KL', iconUrl: '/integrations/klaviyo.svg', bgColor: 'bg-[#111111]', gradient: 'from-[#111111] to-[#5DCB7E]' },
  [IntegrationProvider.AWS_BEDROCK]: { icon: 'BR', iconUrl: '/integrations/aws-bedrock.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.OPENAI]: { icon: 'AI', iconUrl: '/integrations/openai.svg', bgColor: 'bg-[#000000]', gradient: 'from-[#000000] to-[#10A37F]' },
  [IntegrationProvider.LANGUAGETOOL]: { icon: 'LT', iconUrl: '/integrations/languagetool.svg', bgColor: 'bg-[#0066CC]', gradient: 'from-[#0066CC] to-[#00AAFF]' },
  [IntegrationProvider.AWS_S3]: { icon: 'S3', iconUrl: '/integrations/aws-s3.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.AWS_CLOUDFRONT]: { icon: 'CF', iconUrl: '/integrations/aws-cloudfront.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.AWS_ROUTE53]: { icon: 'R53', iconUrl: '/integrations/aws-route53.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.CLOUDINARY]: { icon: 'CL', iconUrl: '/integrations/cloudinary.svg', bgColor: 'bg-[#3448C5]', gradient: 'from-[#3448C5] to-[#F7C046]' },
  [IntegrationProvider.RUNWAY]: { icon: 'RW', iconUrl: '/integrations/runway.svg', bgColor: 'bg-[#000000]', gradient: 'from-[#000000] to-[#6366F1]' },
  [IntegrationProvider.DATADOG]: { icon: 'DD', iconUrl: '/integrations/datadog.svg', bgColor: 'bg-[#632CA6]', gradient: 'from-[#632CA6] to-[#9E5DF0]' },
  [IntegrationProvider.SENTRY]: { icon: 'ST', iconUrl: '/integrations/sentry.svg', bgColor: 'bg-[#362D59]', gradient: 'from-[#362D59] to-[#8B5CF6]' },
  [IntegrationProvider.CLOUDWATCH]: { icon: 'CW', iconUrl: '/integrations/cloudwatch.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.LAUNCHDARKLY]: { icon: 'LD', iconUrl: '/integrations/launchdarkly.svg', bgColor: 'bg-[#000000]', gradient: 'from-[#000000] to-[#405BFF]' },
  [IntegrationProvider.AWS_APPCONFIG]: { icon: 'AC', iconUrl: '/integrations/aws-appconfig.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.GOOGLE]: { icon: 'G', iconUrl: '/integrations/google.svg', bgColor: 'bg-white', gradient: 'from-[#4285F4] to-[#34A853]' },
  [IntegrationProvider.MICROSOFT]: { icon: 'MS', iconUrl: '/integrations/microsoft.svg', bgColor: 'bg-white', gradient: 'from-[#00A4EF] to-[#7FBA00]' },
  [IntegrationProvider.SLACK]: { icon: 'SL', iconUrl: '/integrations/slack.svg', bgColor: 'bg-[#4A154B]', gradient: 'from-[#4A154B] to-[#E01E5A]' },
  [IntegrationProvider.HUBSPOT]: { icon: 'HS', iconUrl: '/integrations/hubspot.svg', bgColor: 'bg-[#FF7A59]', gradient: 'from-[#FF7A59] to-[#FF9A7A]' },
  [IntegrationProvider.SALESFORCE]: { icon: 'SF', iconUrl: '/integrations/salesforce.svg', bgColor: 'bg-[#00A1E0]', gradient: 'from-[#00A1E0] to-[#1ECBE1]' },
  [IntegrationProvider.QUICKBOOKS]: { icon: 'QB', iconUrl: '/integrations/quickbooks.svg', bgColor: 'bg-[#2CA01C]', gradient: 'from-[#2CA01C] to-[#4CD93A]' },
  [IntegrationProvider.VERCEL]: { icon: 'V', iconUrl: '/integrations/vercel.svg', bgColor: 'bg-[#000000]', gradient: 'from-[#000000] to-[#333333]' },
};

function isPlatformIntegration(integration: Integration): integration is PlatformIntegration {
  return 'isSharedWithClients' in integration;
}

function isClientIntegration(integration: Integration): integration is ClientIntegration {
  return 'mode' in integration;
}

export function EditIntegrationModal({
  isOpen,
  onClose,
  integration,
  definition,
  isPlatformView = false,
  onSubmit,
}: EditIntegrationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: 'sandbox',
    isDefault: false,
    isSharedWithClients: false,
    pricingType: 'fixed',
    pricingAmount: '',
    pricingPercentage: '',
  });
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [updateCredentials, setUpdateCredentials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when integration changes
  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        description: integration.description || '',
        environment: integration.environment,
        isDefault: isClientIntegration(integration) ? integration.isDefault : false,
        isSharedWithClients: isPlatformIntegration(integration) ? integration.isSharedWithClients : false,
        pricingType: isPlatformIntegration(integration) && integration.clientPricing?.type || 'fixed',
        pricingAmount: isPlatformIntegration(integration) && integration.clientPricing?.amount
          ? String(integration.clientPricing.amount / 100)
          : '',
        pricingPercentage: isPlatformIntegration(integration) && integration.clientPricing?.percentage
          ? String(integration.clientPricing.percentage)
          : '',
      });
      setCredentials({});
      setShowCredentials({});
      setUpdateCredentials(false);
      setError(null);
    }
  }, [integration]);

  const handleSubmit = async () => {
    if (!integration) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const data: Parameters<typeof onSubmit>[1] = {
        name: formData.name,
        description: formData.description || undefined,
        environment: formData.environment,
      };

      if (updateCredentials && Object.keys(credentials).length > 0) {
        data.credentials = credentials;
      }

      if (isPlatformView) {
        data.isSharedWithClients = formData.isSharedWithClients;
        if (formData.isSharedWithClients) {
          data.clientPricing = {
            type: formData.pricingType,
            amount: parseFloat(formData.pricingAmount) * 100 || 0,
            percentage: formData.pricingType === 'percentage' ? parseFloat(formData.pricingPercentage) : undefined,
          };
        }
      } else {
        data.isDefault = formData.isDefault;
      }

      await onSubmit(integration.id, data);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update integration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      environment: 'sandbox',
      isDefault: false,
      isSharedWithClients: false,
      pricingType: 'fixed',
      pricingAmount: '',
      pricingPercentage: '',
    });
    setCredentials({});
    setShowCredentials({});
    setUpdateCredentials(false);
    setError(null);
    onClose();
  };

  if (!isOpen || !integration) return null;

  const getProviderInitials = (provider: string) => {
    return provider.split('_').map(word => word.charAt(0)).join('').substring(0, 3);
  };

  const config = providerConfig[integration.provider] || {
    icon: getProviderInitials(integration.provider),
    bgColor: 'bg-muted',
    gradient: 'from-muted to-muted',
  };

  const categoryLabel = categoryLabels[integration.category] || integration.category;
  const isUsingPlatform = isClientIntegration(integration) && integration.mode === IntegrationMode.PLATFORM;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden',
                config.iconUrl ? config.bgColor : `bg-gradient-to-br ${config.gradient}`
              )}
            >
              {config.iconUrl ? (
                <Image
                  src={config.iconUrl}
                  alt={integration.name}
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <span className="text-foreground font-bold text-xs">{config.icon}</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Edit Integration</h2>
              <p className="text-sm text-muted-foreground">{categoryLabel}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                placeholder="Integration name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            {/* Environment */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData((prev) => ({ ...prev, environment: e.target.value }))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>

            {/* Credentials section - only if not using platform mode */}
            {!isUsingPlatform && definition?.credentialSchema?.properties && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">Update Credentials</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateCredentials}
                      onChange={(e) => setUpdateCredentials(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">Change credentials</span>
                  </label>
                </div>

                {updateCredentials && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter new credentials. Leave blank to keep existing values.
                    </p>
                    {Object.entries(definition.credentialSchema.properties).map(([key, prop]) => {
                      const isRequired = definition.credentialSchema.required?.includes(key);
                      const isPassword = prop.format === 'password';
                      return (
                        <div key={key}>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {prop.title}
                            {isRequired && updateCredentials && <span className="text-amber-400 ml-1">*</span>}
                          </label>
                          {prop.description && (
                            <p className="text-xs text-muted-foreground mb-1">{prop.description}</p>
                          )}
                          <div className="relative">
                            <input
                              type={isPassword && !showCredentials[key] ? 'password' : 'text'}
                              value={credentials[key] || ''}
                              onChange={(e) => setCredentials((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-3 py-2 pr-10 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                              placeholder={`Enter new ${prop.title.toLowerCase()}`}
                            />
                            {isPassword && (
                              <button
                                type="button"
                                onClick={() => setShowCredentials(prev => ({ ...prev, [key]: !prev[key] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                              >
                                {showCredentials[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Default checkbox for client view - only for payment gateways */}
            {!isPlatformView && integration?.category === IntegrationCategory.PAYMENT_GATEWAY && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Set as default gateway</span>
              </label>
            )}

            {/* Sharing options for platform view */}
            {isPlatformView && (
              <>
                <div className="pt-4 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSharedWithClients}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isSharedWithClients: e.target.checked }))}
                      className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Share with clients</span>
                  </label>
                </div>

                {formData.isSharedWithClients && (
                  <div className="pl-6 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Pricing Type</label>
                      <select
                        value={formData.pricingType}
                        onChange={(e) => setFormData((prev) => ({ ...prev, pricingType: e.target.value }))}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="fixed">Fixed per transaction</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </div>
                    {formData.pricingType === 'fixed' ? (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Amount per Transaction ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.pricingAmount}
                          onChange={(e) => setFormData((prev) => ({ ...prev, pricingAmount: e.target.value }))}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          placeholder="0.30"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Percentage</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.pricingPercentage}
                          onChange={(e) => setFormData((prev) => ({ ...prev, pricingPercentage: e.target.value }))}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          placeholder="2.9"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary disabled:bg-muted disabled:text-muted-foreground text-foreground text-sm font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
