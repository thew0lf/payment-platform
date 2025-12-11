'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Plug, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { IntegrationCard, AddIntegrationModal, EditIntegrationModal } from '@/components/integrations';

const categoryLabels: Record<IntegrationCategory, string> = {
  [IntegrationCategory.PAYMENT_GATEWAY]: 'Payment Gateways',
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
  const [editingIntegration, setEditingIntegration] = useState<ClientIntegration | null>(null);
  const [integrationToDelete, setIntegrationToDelete] = useState<ClientIntegration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteIntegration = (integration: ClientIntegration | PlatformIntegration) => {
    // Only handle client integrations in this view
    if ('mode' in integration) {
      setIntegrationToDelete(integration);
    }
  };

  const confirmDelete = async () => {
    if (!clientId || !integrationToDelete) return;
    setIsDeleting(true);
    try {
      await integrationsApi.deleteClientIntegration(clientId, integrationToDelete.id);
      toast.success(`"${integrationToDelete.name}" deleted successfully`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete integration');
    } finally {
      setIsDeleting(false);
      setIntegrationToDelete(null);
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

  const handleEditIntegration = (integration: ClientIntegration | PlatformIntegration) => {
    // Only handle client integrations in this view
    if ('mode' in integration) {
      setEditingIntegration(integration);
    }
  };

  const handleUpdateIntegration = async (id: string, data: {
    name?: string;
    description?: string;
    credentials?: Record<string, string>;
    environment?: string;
    isDefault?: boolean;
  }) => {
    if (!clientId) return;
    await integrationsApi.updateClientIntegration(clientId, id, data);
    toast.success('Integration updated successfully');
    await loadData();
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
          <Plug className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Please select a client to manage integrations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your payment gateways and service integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-foreground font-medium rounded-lg transition-colors"
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
        <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Plug className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Platform Gateways Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
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
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : integrations.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-64 bg-card/50 border border-border rounded-xl">
          <Plug className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">No integrations configured</p>
          <p className="text-sm text-muted-foreground mb-4">Add a payment gateway to start processing transactions</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-foreground font-medium rounded-lg transition-colors"
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
                <h2 className="text-lg font-semibold text-foreground mb-4">{label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onTest={handleTestIntegration}
                      onEdit={handleEditIntegration}
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

      {/* Edit Integration Modal */}
      <EditIntegrationModal
        isOpen={!!editingIntegration}
        onClose={() => setEditingIntegration(null)}
        integration={editingIntegration}
        definition={editingIntegration ? definitions.find(d => d.provider === editingIntegration.provider) : undefined}
        onSubmit={handleUpdateIntegration}
      />

      {/* Delete Confirmation Modal */}
      {integrationToDelete && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delete Integration</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-foreground mb-6">
              Are you sure you want to delete <span className="font-medium text-foreground">&quot;{integrationToDelete.name}&quot;</span>?
              This will remove all associated credentials and settings.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIntegrationToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
