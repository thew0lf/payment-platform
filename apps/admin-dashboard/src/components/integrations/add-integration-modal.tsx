'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, ArrowLeft, ArrowRight, Check, Zap, Key, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  IntegrationDefinition,
  PlatformIntegration,
  IntegrationProvider,
  IntegrationMode,
  IntegrationCategory,
  AuthType,
} from '@/lib/api/integrations';

interface AddIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  definitions: IntegrationDefinition[];
  platformOptions?: PlatformIntegration[];
  isPlatformView?: boolean;
  onSubmit: (data: {
    provider: IntegrationProvider;
    name: string;
    description?: string;
    mode?: IntegrationMode;
    credentials?: Record<string, string>;
    platformIntegrationId?: string;
    environment: string;
    isDefault?: boolean;
    isSharedWithClients?: boolean;
    clientPricing?: { type: string; amount: number; percentage?: number };
  }) => Promise<void>;
}

const categoryLabels: Record<IntegrationCategory, string> = {
  [IntegrationCategory.PAYMENT_GATEWAY]: 'Payment Gateway',
  [IntegrationCategory.AUTHENTICATION]: 'Authentication',
  [IntegrationCategory.COMMUNICATION]: 'Communication',
  [IntegrationCategory.ANALYTICS]: 'Analytics',
  [IntegrationCategory.OAUTH]: 'Connected Services',
  [IntegrationCategory.EMAIL_TRANSACTIONAL]: 'Email',
  [IntegrationCategory.SMS]: 'SMS',
  [IntegrationCategory.AI_ML]: 'AI & Machine Learning',
  [IntegrationCategory.STORAGE]: 'Storage',
  [IntegrationCategory.IMAGE_PROCESSING]: 'Image Processing',
  [IntegrationCategory.VIDEO_GENERATION]: 'Video Generation',
};

// Provider configuration with icons and brand colors
const providerConfig: Record<string, { icon: string; iconUrl?: string; bgColor: string; gradient: string }> = {
  // Payment Gateways
  [IntegrationProvider.PAYPAL_PAYFLOW]: {
    icon: 'PP',
    iconUrl: '/integrations/paypal.svg',
    bgColor: 'bg-[#003087]',
    gradient: 'from-[#003087] to-[#009cde]',
  },
  [IntegrationProvider.PAYPAL_REST]: {
    icon: 'PP',
    iconUrl: '/integrations/paypal.svg',
    bgColor: 'bg-[#003087]',
    gradient: 'from-[#003087] to-[#009cde]',
  },
  [IntegrationProvider.STRIPE]: {
    icon: 'S',
    iconUrl: '/integrations/stripe.svg',
    bgColor: 'bg-[#635BFF]',
    gradient: 'from-[#635BFF] to-[#8B85FF]',
  },
  [IntegrationProvider.AUTHORIZE_NET]: {
    icon: 'AN',
    iconUrl: '/integrations/authorize-net.svg',
    bgColor: 'bg-[#F26722]',
    gradient: 'from-[#F26722] to-[#FF8B4D]',
  },
  [IntegrationProvider.NMI]: {
    icon: 'NMI',
    iconUrl: '/integrations/nmi.svg',
    bgColor: 'bg-[#00A651]',
    gradient: 'from-[#00A651] to-[#00D468]',
  },
  // Authentication
  [IntegrationProvider.AUTH0]: {
    icon: 'A0',
    iconUrl: '/integrations/auth0.svg',
    bgColor: 'bg-[#EB5424]',
    gradient: 'from-[#EB5424] to-[#FF7A4D]',
  },
  [IntegrationProvider.OKTA]: {
    icon: 'OK',
    iconUrl: '/integrations/okta.svg',
    bgColor: 'bg-[#007DC1]',
    gradient: 'from-[#007DC1] to-[#00A3E0]',
  },
  [IntegrationProvider.COGNITO]: {
    icon: 'CG',
    iconUrl: '/integrations/cognito.svg',
    bgColor: 'bg-[#DD344C]',
    gradient: 'from-[#DD344C] to-[#FF5A6E]',
  },
  // Communication
  [IntegrationProvider.TWILIO]: {
    icon: 'TW',
    iconUrl: '/integrations/twilio.svg',
    bgColor: 'bg-[#F22F46]',
    gradient: 'from-[#F22F46] to-[#FF5A6E]',
  },
  [IntegrationProvider.SENDGRID]: {
    icon: 'SG',
    iconUrl: '/integrations/sendgrid.svg',
    bgColor: 'bg-[#1A82E2]',
    gradient: 'from-[#1A82E2] to-[#4DA3FF]',
  },
  [IntegrationProvider.AWS_SES]: {
    icon: 'SES',
    iconUrl: '/integrations/aws-ses.svg',
    bgColor: 'bg-[#232F3E]',
    gradient: 'from-[#232F3E] to-[#FF9900]',
  },
  [IntegrationProvider.KLAVIYO]: {
    icon: 'KL',
    iconUrl: '/integrations/klaviyo.svg',
    bgColor: 'bg-[#111111]',
    gradient: 'from-[#111111] to-[#5DCB7E]',
  },
  // OAuth Providers
  [IntegrationProvider.GOOGLE]: {
    icon: 'G',
    iconUrl: '/integrations/google.svg',
    bgColor: 'bg-white',
    gradient: 'from-[#4285F4] to-[#34A853]',
  },
  [IntegrationProvider.MICROSOFT]: {
    icon: 'MS',
    iconUrl: '/integrations/microsoft.svg',
    bgColor: 'bg-white',
    gradient: 'from-[#00A4EF] to-[#7FBA00]',
  },
  [IntegrationProvider.SLACK]: {
    icon: 'SL',
    iconUrl: '/integrations/slack.svg',
    bgColor: 'bg-[#4A154B]',
    gradient: 'from-[#4A154B] to-[#E01E5A]',
  },
  [IntegrationProvider.HUBSPOT]: {
    icon: 'HS',
    iconUrl: '/integrations/hubspot.svg',
    bgColor: 'bg-[#FF7A59]',
    gradient: 'from-[#FF7A59] to-[#FF9A7A]',
  },
  [IntegrationProvider.SALESFORCE]: {
    icon: 'SF',
    iconUrl: '/integrations/salesforce.svg',
    bgColor: 'bg-[#00A1E0]',
    gradient: 'from-[#00A1E0] to-[#1ECBE1]',
  },
  [IntegrationProvider.QUICKBOOKS]: {
    icon: 'QB',
    iconUrl: '/integrations/quickbooks.svg',
    bgColor: 'bg-[#2CA01C]',
    gradient: 'from-[#2CA01C] to-[#4CD93A]',
  },
};

type Step = 'select' | 'configure' | 'credentials';

export function AddIntegrationModal({
  isOpen,
  onClose,
  definitions,
  platformOptions = [],
  isPlatformView = false,
  onSubmit,
}: AddIntegrationModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [selectedMode, setSelectedMode] = useState<IntegrationMode>(IntegrationMode.OWN);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDefinition = definitions.find((d) => d.provider === selectedProvider);
  const platformOptionForProvider = platformOptions.find((p) => p.provider === selectedProvider);

  const groupedDefinitions = definitions.reduce(
    (acc, def) => {
      if (!acc[def.category]) acc[def.category] = [];
      acc[def.category].push(def);
      return acc;
    },
    {} as Record<IntegrationCategory, IntegrationDefinition[]>
  );

  const handleSelectProvider = (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
    const def = definitions.find((d) => d.provider === provider);
    if (def) {
      setFormData((prev) => ({ ...prev, name: def.name }));
      const initialCreds: Record<string, string> = {};
      // Use credentialSchema.properties to get the credential fields
      if (def.credentialSchema?.properties) {
        Object.keys(def.credentialSchema.properties).forEach((key) => {
          const prop = def.credentialSchema.properties[key];
          initialCreds[key] = prop.default?.toString() || '';
        });
      }
      setCredentials(initialCreds);
    }
    setStep('configure');
  };

  const handleBack = () => {
    if (step === 'configure') {
      setStep('select');
      setSelectedProvider(null);
    } else if (step === 'credentials') {
      setStep('configure');
    }
  };

  const handleNext = () => {
    if (step === 'configure') {
      if (selectedMode === IntegrationMode.PLATFORM && selectedPlatformId) {
        handleSubmit();
      } else {
        setStep('credentials');
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedProvider || !selectedDefinition) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const data: Parameters<typeof onSubmit>[0] = {
        provider: selectedProvider,
        name: formData.name,
        description: formData.description || undefined,
        environment: formData.environment,
      };

      if (!isPlatformView) {
        data.mode = selectedMode;
        data.isDefault = formData.isDefault;
        if (selectedMode === IntegrationMode.PLATFORM) {
          data.platformIntegrationId = selectedPlatformId || undefined;
        } else {
          data.credentials = credentials;
        }
      } else {
        data.credentials = credentials;
        data.isSharedWithClients = formData.isSharedWithClients;
        if (formData.isSharedWithClients) {
          data.clientPricing = {
            type: formData.pricingType,
            amount: parseFloat(formData.pricingAmount) * 100 || 0,
            percentage: formData.pricingType === 'percentage' ? parseFloat(formData.pricingPercentage) : undefined,
          };
        }
      }

      await onSubmit(data);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create integration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedProvider(null);
    setSelectedMode(IntegrationMode.OWN);
    setSelectedPlatformId(null);
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
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <button onClick={handleBack} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-white">
              {step === 'select' && 'Add Integration'}
              {step === 'configure' && `Configure ${selectedDefinition?.name}`}
              {step === 'credentials' && 'Enter Credentials'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
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

          {/* Step 1: Select Provider */}
          {step === 'select' && (
            <div className="space-y-6">
              {Object.entries(groupedDefinitions).map(([category, defs]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">
                    {categoryLabels[category as IntegrationCategory] || category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {defs.map((def) => {
                      // Generate initials from provider name (never a question mark)
                      const getProviderInitials = (provider: string) => {
                        return provider.split('_').map(word => word.charAt(0)).join('').substring(0, 3);
                      };
                      const config = providerConfig[def.provider] || {
                        icon: getProviderInitials(def.provider),
                        bgColor: 'bg-zinc-700',
                        gradient: 'from-zinc-500 to-zinc-600'
                      };
                      const hasPlatformOption = platformOptions.some((p) => p.provider === def.provider);
                      return (
                        <button
                          key={def.provider}
                          onClick={() => handleSelectProvider(def.provider)}
                          className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden',
                              config.iconUrl ? config.bgColor : `bg-gradient-to-br ${config.gradient}`
                            )}
                          >
                            {config.iconUrl ? (
                              <Image
                                src={config.iconUrl}
                                alt={def.name}
                                width={24}
                                height={24}
                                className="w-6 h-6 object-contain"
                              />
                            ) : (
                              <span className="text-white font-bold text-xs">{config.icon}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">{def.name}</span>
                              {hasPlatformOption && !isPlatformView && (
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 truncate">{def.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && selectedDefinition && (
            <div className="space-y-4">
              {/* Mode selection for client view */}
              {!isPlatformView && platformOptionForProvider && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Connection Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSelectedMode(IntegrationMode.PLATFORM);
                        setSelectedPlatformId(platformOptionForProvider.id);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                        selectedMode === IntegrationMode.PLATFORM
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      )}
                    >
                      <Zap
                        className={cn('w-6 h-6', selectedMode === IntegrationMode.PLATFORM ? 'text-cyan-400' : 'text-zinc-400')}
                      />
                      <span
                        className={cn(
                          'font-medium',
                          selectedMode === IntegrationMode.PLATFORM ? 'text-white' : 'text-zinc-300'
                        )}
                      >
                        Use Platform Gateway
                      </span>
                      <span className="text-xs text-zinc-500 text-center">No credentials needed</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMode(IntegrationMode.OWN);
                        setSelectedPlatformId(null);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                        selectedMode === IntegrationMode.OWN
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      )}
                    >
                      <Key className={cn('w-6 h-6', selectedMode === IntegrationMode.OWN ? 'text-cyan-400' : 'text-zinc-400')} />
                      <span className={cn('font-medium', selectedMode === IntegrationMode.OWN ? 'text-white' : 'text-zinc-300')}>
                        Own Credentials
                      </span>
                      <span className="text-xs text-zinc-500 text-center">Enter your own API keys</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  placeholder="Integration name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              {/* Environment */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Environment</label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData((prev) => ({ ...prev, environment: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>

              {/* Default checkbox for client view */}
              {!isPlatformView && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-zinc-300">Set as default gateway</span>
                </label>
              )}

              {/* Sharing options for platform view */}
              {isPlatformView && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSharedWithClients}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isSharedWithClients: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-zinc-300">Share with clients</span>
                  </label>

                  {formData.isSharedWithClients && (
                    <div className="pl-6 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Pricing Type</label>
                        <select
                          value={formData.pricingType}
                          onChange={(e) => setFormData((prev) => ({ ...prev, pricingType: e.target.value }))}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="fixed">Fixed per transaction</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>
                      {formData.pricingType === 'fixed' ? (
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1">Amount per Transaction ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.pricingAmount}
                            onChange={(e) => setFormData((prev) => ({ ...prev, pricingAmount: e.target.value }))}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                            placeholder="0.30"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1">Percentage</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.pricingPercentage}
                            onChange={(e) => setFormData((prev) => ({ ...prev, pricingPercentage: e.target.value }))}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                            placeholder="2.9"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Credentials */}
          {step === 'credentials' && selectedDefinition && (
            <div className="space-y-4">
              {selectedDefinition.authType === AuthType.OAUTH2 ? (
                <>
                  <p className="text-sm text-zinc-400 mb-4">
                    Enter your {selectedDefinition.name} OAuth App credentials. These are the Client ID and Client Secret
                    from your OAuth application configuration.
                  </p>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                    <p className="text-sm text-blue-300">
                      After saving credentials, users will be able to connect their {selectedDefinition.name} accounts
                      through the OAuth authorization flow.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-400 mb-4">
                  Enter your {selectedDefinition.name} API credentials. These will be encrypted and stored securely.
                </p>
              )}
              {selectedDefinition.credentialSchema?.properties && Object.entries(selectedDefinition.credentialSchema.properties).map(([key, prop]) => {
                const isRequired = selectedDefinition.credentialSchema.required?.includes(key);
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      {prop.title}
                      {isRequired && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {prop.description && (
                      <p className="text-xs text-zinc-500 mb-1">{prop.description}</p>
                    )}
                    <input
                      type={prop.format === 'password' ? 'password' : 'text'}
                      value={credentials[key] || ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                      placeholder={prop.title}
                      required={isRequired}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          {step === 'configure' && (
            <button
              onClick={handleNext}
              disabled={!formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {selectedMode === IntegrationMode.PLATFORM ? (
                <>
                  <Check className="w-4 h-4" />
                  Create
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
          {step === 'credentials' && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (selectedDefinition?.credentialSchema?.required || []).some((key) => !credentials[key])}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {selectedDefinition?.authType === AuthType.OAUTH2 ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {selectedDefinition?.authType === AuthType.OAUTH2 ? 'Save OAuth App' : 'Create Integration'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
