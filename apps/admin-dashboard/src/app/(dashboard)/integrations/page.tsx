'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Plug, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  integrationsApi,
  PlatformIntegration,
  IntegrationDefinition,
  IntegrationCategory,
  IntegrationProvider,
} from '@/lib/api/integrations';
import {
  IntegrationCard,
  AddIntegrationModal,
  ConfigureSharingModal,
} from '@/components/integrations';

const categoryLabels: Record<IntegrationCategory, string> = {
  [IntegrationCategory.PAYMENT_GATEWAY]: 'Payment Gateways',
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

export default function PlatformIntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [definitions, setDefinitions] = useState<IntegrationDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sharingModalIntegration, setSharingModalIntegration] = useState<PlatformIntegration | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [integrationsRes, definitionsRes] = await Promise.all([
        integrationsApi.listPlatformIntegrations(),
        integrationsApi.listDefinitions(),
      ]);
      setIntegrations(integrationsRes.data);
      // Platform admin can configure any integration, no filtering needed
      setDefinitions(definitionsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateIntegration = async (data: {
    provider: IntegrationProvider;
    name: string;
    description?: string;
    credentials?: Record<string, string>;
    environment: string;
    isSharedWithClients?: boolean;
    clientPricing?: { type: string; amount: number; percentage?: number };
  }) => {
    await integrationsApi.createPlatformIntegration({
      ...data,
      credentials: data.credentials || {},
    });
    await loadData();
  };

  const handleTestIntegration = async (id: string) => {
    try {
      const result = await integrationsApi.testPlatformIntegration(id);
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
    if (!confirm('Are you sure you want to delete this integration?')) return;
    try {
      await integrationsApi.deletePlatformIntegration(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    }
  };

  const handleConfigureSharing = async (data: Parameters<typeof integrationsApi.configureSharing>[1]) => {
    if (!sharingModalIntegration) return;
    await integrationsApi.configureSharing(sharingModalIntegration.id, data);
    await loadData();
  };

  const groupedIntegrations = integrations.reduce(
    (acc, integration) => {
      if (!acc[integration.category]) acc[integration.category] = [];
      acc[integration.category].push(integration);
      return acc;
    },
    {} as Record<IntegrationCategory, PlatformIntegration[]>
  );

  if (!user || user.scopeType !== 'ORGANIZATION') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-zinc-400">You do not have access to this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Integrations</h1>
          <p className="text-zinc-400 mt-1">
            Manage platform-level integrations that can be shared with clients
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
          <p className="text-sm text-zinc-500 mb-4">Add your first integration to get started</p>
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
                      isPlatformView
                      onTest={handleTestIntegration}
                      onDelete={handleDeleteIntegration}
                      onConfigureSharing={(int) => setSharingModalIntegration(int)}
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
        isPlatformView
        onSubmit={handleCreateIntegration}
      />

      {/* Configure Sharing Modal */}
      <ConfigureSharingModal
        isOpen={!!sharingModalIntegration}
        integration={sharingModalIntegration}
        onClose={() => setSharingModalIntegration(null)}
        onSubmit={handleConfigureSharing}
      />
    </div>
  );
}
