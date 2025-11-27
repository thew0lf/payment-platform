'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Share2 } from 'lucide-react';
import { PlatformIntegration } from '@/lib/api/integrations';

interface ConfigureSharingModalProps {
  isOpen: boolean;
  integration: PlatformIntegration | null;
  onClose: () => void;
  onSubmit: (data: {
    isSharedWithClients: boolean;
    clientPricing?: { type: string; amount: number; percentage?: number };
  }) => Promise<void>;
}

export function ConfigureSharingModal({ isOpen, integration, onClose, onSubmit }: ConfigureSharingModalProps) {
  const [isShared, setIsShared] = useState(false);
  const [pricingType, setPricingType] = useState('fixed');
  const [pricingAmount, setPricingAmount] = useState('');
  const [pricingPercentage, setPricingPercentage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (integration) {
      setIsShared(integration.isSharedWithClients);
      if (integration.clientPricing) {
        setPricingType(integration.clientPricing.type);
        setPricingAmount(((integration.clientPricing.amount || 0) / 100).toString());
        setPricingPercentage((integration.clientPricing.percentage || 0).toString());
      }
    }
  }, [integration]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const data: Parameters<typeof onSubmit>[0] = {
        isSharedWithClients: isShared,
      };

      if (isShared) {
        data.clientPricing = {
          type: pricingType,
          amount: parseFloat(pricingAmount) * 100 || 0,
          percentage: pricingType === 'percentage' ? parseFloat(pricingPercentage) : undefined,
        };
      }

      await onSubmit(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sharing settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !integration) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Configure Client Sharing</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
          )}

          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-400">Integration</p>
            <p className="font-medium text-white">{integration.name}</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
            />
            <div>
              <p className="font-medium text-white">Share with Clients</p>
              <p className="text-sm text-zinc-500">Allow clients to use this integration</p>
            </div>
          </label>

          {isShared && (
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Pricing Type</label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="fixed">Fixed per transaction</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>

              {pricingType === 'fixed' ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Amount per Transaction ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pricingAmount}
                    onChange={(e) => setPricingAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    placeholder="0.30"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Clients will be charged ${pricingAmount || '0.00'} per transaction
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pricingPercentage}
                    onChange={(e) => setPricingPercentage(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    placeholder="2.9"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Clients will be charged {pricingPercentage || '0'}% of each transaction
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
