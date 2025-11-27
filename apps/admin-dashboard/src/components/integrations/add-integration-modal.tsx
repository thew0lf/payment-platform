'use client';

import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Zap, Key, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  IntegrationDefinition,
  PlatformIntegration,
  IntegrationProvider,
  IntegrationMode,
  IntegrationCategory,
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
};

const providerLogos: Record<string, { icon: string; gradient: string }> = {
  [IntegrationProvider.PAYPAL_PAYFLOW]: { icon: 'PP', gradient: 'from-blue-500 to-blue-600' },
  [IntegrationProvider.NMI]: { icon: 'NMI', gradient: 'from-emerald-500 to-emerald-600' },
  [IntegrationProvider.AUTHORIZE_NET]: { icon: 'AN', gradient: 'from-orange-500 to-orange-600' },
  [IntegrationProvider.STRIPE]: { icon: 'S', gradient: 'from-violet-500 to-violet-600' },
  [IntegrationProvider.AUTH0]: { icon: 'A0', gradient: 'from-rose-500 to-rose-600' },
  [IntegrationProvider.OKTA]: { icon: 'OK', gradient: 'from-blue-600 to-indigo-600' },
  [IntegrationProvider.TWILIO]: { icon: 'TW', gradient: 'from-red-500 to-red-600' },
  [IntegrationProvider.SENDGRID]: { icon: 'SG', gradient: 'from-cyan-500 to-cyan-600' },
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
      def.requiredFields.forEach((field) => {
        initialCreds[field.key] = '';
      });
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
                      const logo = providerLogos[def.provider] || { icon: '?', gradient: 'from-zinc-500 to-zinc-600' };
                      const hasPlatformOption = platformOptions.some((p) => p.provider === def.provider);
                      return (
                        <button
                          key={def.provider}
                          onClick={() => handleSelectProvider(def.provider)}
                          className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br',
                              logo.gradient
                            )}
                          >
                            {logo.icon}
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
              <p className="text-sm text-zinc-400 mb-4">
                Enter your {selectedDefinition.name} API credentials. These will be encrypted and stored securely.
              </p>
              {selectedDefinition.requiredFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={credentials[field.key] || ''}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    placeholder={field.label}
                    required={field.required}
                  />
                </div>
              ))}
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
              disabled={isSubmitting || selectedDefinition?.requiredFields.some((f) => f.required && !credentials[f.key])}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Integration
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
