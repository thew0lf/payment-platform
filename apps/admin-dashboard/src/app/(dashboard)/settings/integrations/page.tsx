'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Plug, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  integrationsApi,
  ClientIntegration,
  IntegrationDefinition,
  PlatformIntegration,
  IntegrationCategory,
  IntegrationProvider,
  IntegrationMode,
} from '@/lib/api/integrations';
import { IntegrationCard, AddIntegrationModal } from '@/components/integrations';

const categoryLabels: Record<IntegrationCategory, string> = {
  [IntegrationCategory.PAYMENT_GATEWAY]: 'Payment Gateways',
  [IntegrationCategory.AUTHENTICATION]: 'Authentication',
  [IntegrationCategory.COMMUNICATION]: 'Communication',
  [IntegrationCategory.ANALYTICS]: 'Analytics',
};

export default function ClientIntegrationsPage() {
  const { user } = useAuth();
  const { selectedClientId } = useHierarchy();
  const [integrations, setIntegrations] = useState<ClientIntegration[]>([]);
  const [definitions, setDefinitions] = useState<IntegrationDefinition[]>([]);
  const [platformOptions, setPlatformOptions] = useState<PlatformIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const clientId = selectedClientId || user?.clientId;

  const loadData = async () => {
    if (!clientId) return;

    setIsLoading(true);
    setError(null);
    try {
      const [integrationsRes, availableRes] = await Promise.all([
        integrationsApi.listClientIntegrations(clientId),
        integrationsApi.getAvailableForClient(clientId),
      ]);
      setIntegrations(integrationsRes.data);
      setDefinitions(availableRes.data.definitions);
      setPlatformOptions(availableRes.data.platformOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const handleCreateIntegration = async (data: {
    provider: IntegrationProvider;
    name: string;
    description?: string;
    mode?: IntegrationMode;
    credentials?: Record<string, string>;
    platformIntegrationId?: string;
    environment: string;
    isDefault?: boolean;
  }) => {
    if (!clientId) return;
    await integrationsApi.createClientIntegration(clientId, {
      ...data,
      mode: data.mode || IntegrationMode.OWN,
    });
    await loadData();
  };

  const handleTestIntegration = async (id: string) => {
    if (!clientId) return;
    try {
      const result = await integrationsApi.testClientIntegration(clientId, id);
      if (result.data.success) {
        await loadData();
      } else {
        setError(`Test failed: ${result.data.message}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!clientId) return;
    if (!confirm('Are you sure you want to delete this integration?')) return;
    try {
      await integrationsApi.deleteClientIntegration(clientId, id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!clientId) return;
    try {
      await integrationsApi.setDefaultIntegration(clientId, id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  const groupedIntegrations = integrations.reduce(
    (acc, integration) => {
      if (!acc[integration.category]) acc[integration.category] = [];
      acc[integration.category].push(integration);
      return acc;
    },
    {} as Record<IntegrationCategory, ClientIntegration[]>
  );

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Plug className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Please select a client to manage integrations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-zinc-400 mt-1">
            Manage your payment gateways and service integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Platform gateway promotion */}
      {platformOptions.length > 0 && integrations.length === 0 && (
        <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Plug className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Platform Gateways Available</h3>
              <p className="text-sm text-zinc-400 mt-1">
                You can use pre-configured platform payment gateways without entering your own credentials.
                This simplifies setup and ensures security best practices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : integrations.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <Plug className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-lg font-medium text-zinc-400 mb-2">No integrations configured</p>
          <p className="text-sm text-zinc-500 mb-4">Add a payment gateway to start processing transactions</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Integration
          </button>
        </div>
      ) : (
        /* Integration cards grouped by category */
        <div className="space-y-8">
          {Object.entries(categoryLabels).map(([category, label]) => {
            const categoryIntegrations = groupedIntegrations[category as IntegrationCategory];
            if (!categoryIntegrations || categoryIntegrations.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-white mb-4">{label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onTest={handleTestIntegration}
                      onDelete={handleDeleteIntegration}
                      onSetDefault={handleSetDefault}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Integration Modal */}
      <AddIntegrationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        definitions={definitions}
        platformOptions={platformOptions}
        onSubmit={handleCreateIntegration}
      />
    </div>
  );
}
