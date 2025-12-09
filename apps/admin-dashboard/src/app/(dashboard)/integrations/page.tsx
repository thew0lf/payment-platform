'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Plus, Plug, RefreshCw, AlertCircle, Search, LayoutGrid, List, Filter, X, MoreVertical, TestTube, Share2, Trash2, CheckCircle, XCircle, Clock, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  integrationsApi,
  PlatformIntegration,
  ClientIntegration,
  IntegrationDefinition,
  IntegrationCategory,
  IntegrationProvider,
} from '@/lib/api/integrations';
import {
  IntegrationCard,
  AddIntegrationModal,
  EditIntegrationModal,
  ConfigureSharingModal,
} from '@/components/integrations';

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

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ERROR', label: 'Error' },
];

// Provider icon configuration for table view
const providerConfig: Record<string, { iconUrl?: string; bgColor: string; gradient: string }> = {
  [IntegrationProvider.STRIPE]: { iconUrl: '/integrations/stripe.svg', bgColor: 'bg-[#635BFF]', gradient: 'from-[#635BFF] to-[#8B85FF]' },
  [IntegrationProvider.PAYPAL_REST]: { iconUrl: '/integrations/paypal.svg', bgColor: 'bg-[#003087]', gradient: 'from-[#003087] to-[#009cde]' },
  [IntegrationProvider.PAYPAL_PAYFLOW]: { iconUrl: '/integrations/paypal.svg', bgColor: 'bg-[#003087]', gradient: 'from-[#003087] to-[#009cde]' },
  [IntegrationProvider.AUTHORIZE_NET]: { iconUrl: '/integrations/authorize-net.svg', bgColor: 'bg-[#F26722]', gradient: 'from-[#F26722] to-[#FF8B4D]' },
  [IntegrationProvider.AUTH0]: { iconUrl: '/integrations/auth0.svg', bgColor: 'bg-[#EB5424]', gradient: 'from-[#EB5424] to-[#FF7A4D]' },
  [IntegrationProvider.AWS_BEDROCK]: { iconUrl: '/integrations/aws-bedrock.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#FF9900]' },
  [IntegrationProvider.AWS_S3]: { iconUrl: '/integrations/aws-s3.svg', bgColor: 'bg-[#232F3E]', gradient: 'from-[#232F3E] to-[#569A31]' },
  [IntegrationProvider.CLOUDINARY]: { iconUrl: '/integrations/cloudinary.svg', bgColor: 'bg-[#3448C5]', gradient: 'from-[#3448C5] to-[#F5BD51]' },
  [IntegrationProvider.OPENAI]: { iconUrl: '/integrations/openai.svg', bgColor: 'bg-[#10A37F]', gradient: 'from-[#10A37F] to-[#1ED9A4]' },
  [IntegrationProvider.TWILIO]: { iconUrl: '/integrations/twilio.svg', bgColor: 'bg-[#F22F46]', gradient: 'from-[#F22F46] to-[#FF5A6E]' },
  [IntegrationProvider.SENDGRID]: { iconUrl: '/integrations/sendgrid.svg', bgColor: 'bg-[#1A82E2]', gradient: 'from-[#1A82E2] to-[#4DA3FF]' },
  [IntegrationProvider.VERCEL]: { iconUrl: '/integrations/vercel.svg', bgColor: 'bg-[#000000]', gradient: 'from-[#000000] to-[#333333]' },
  [IntegrationProvider.GOOGLE_PLACES]: { iconUrl: '/integrations/google-places.svg', bgColor: 'bg-white', gradient: 'from-[#4285F4] to-[#34A853]' },
};

type ViewMode = 'card' | 'table';

export default function PlatformIntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [definitions, setDefinitions] = useState<IntegrationDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<PlatformIntegration | null>(null);
  const [sharingModalIntegration, setSharingModalIntegration] = useState<PlatformIntegration | null>(null);
  const [integrationToDelete, setIntegrationToDelete] = useState<PlatformIntegration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search, filter, and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [integrationsRes, definitionsRes] = await Promise.all([
        integrationsApi.listPlatformIntegrations(),
        integrationsApi.listDefinitions(),
      ]);
      setIntegrations(integrationsRes.data);
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

  // Filter integrations based on search and filters
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = integration.name.toLowerCase().includes(query);
        const matchesProvider = integration.provider.toLowerCase().includes(query);
        const matchesDescription = integration.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesProvider && !matchesDescription) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && integration.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && integration.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [integrations, searchQuery, selectedCategory, selectedStatus]);

  // Group filtered integrations by category for card view
  const groupedIntegrations = useMemo(() => {
    return filteredIntegrations.reduce(
      (acc, integration) => {
        if (!acc[integration.category]) acc[integration.category] = [];
        acc[integration.category].push(integration);
        return acc;
      },
      {} as Record<IntegrationCategory, PlatformIntegration[]>
    );
  }, [filteredIntegrations]);

  // Get available categories from current integrations
  const availableCategories = useMemo(() => {
    const categories = new Set(integrations.map((i) => i.category));
    return Array.from(categories);
  }, [integrations]);

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

  const handleDeleteIntegration = (integration: PlatformIntegration | ClientIntegration) => {
    // Only handle platform integrations in this view
    if ('isSharedWithClients' in integration) {
      setIntegrationToDelete(integration);
    }
  };

  const confirmDelete = async () => {
    if (!integrationToDelete) return;
    setIsDeleting(true);
    try {
      await integrationsApi.deletePlatformIntegration(integrationToDelete.id);
      toast.success(`"${integrationToDelete.name}" deleted successfully`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete integration');
    } finally {
      setIsDeleting(false);
      setIntegrationToDelete(null);
    }
  };

  const handleConfigureSharing = async (data: Parameters<typeof integrationsApi.configureSharing>[1]) => {
    if (!sharingModalIntegration) return;
    await integrationsApi.configureSharing(sharingModalIntegration.id, data);
    await loadData();
  };

  const handleEditIntegration = (integration: PlatformIntegration | ClientIntegration) => {
    // Only handle platform integrations in this view
    if ('isSharedWithClients' in integration) {
      setEditingIntegration(integration);
    }
  };

  const handleUpdateIntegration = async (id: string, data: {
    name?: string;
    description?: string;
    credentials?: Record<string, string>;
    environment?: string;
    isSharedWithClients?: boolean;
    clientPricing?: { type: string; amount: number; percentage?: number };
  }) => {
    await integrationsApi.updatePlatformIntegration(id, data);
    toast.success('Integration updated successfully');
    await loadData();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-500/10 text-zinc-400 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Inactive
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full">
            <XCircle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return <span className="text-xs text-zinc-500">{status}</span>;
    }
  };

  const getProviderIcon = (provider: string) => {
    const config = providerConfig[provider];
    const initials = provider.split('_').map(word => word.charAt(0)).join('').substring(0, 2);

    if (config?.iconUrl) {
      return (
        <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', config.bgColor)}>
          <Image src={config.iconUrl} alt={provider} width={20} height={20} className="w-5 h-5 object-contain" />
        </div>
      );
    }

    return (
      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br', config?.gradient || 'from-zinc-600 to-zinc-700')}>
        <span className="text-white text-xs font-bold">{initials}</span>
      </div>
    );
  };

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

      {/* Search, Filter, and View Toggle Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">All Categories</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category] || category}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}

        {/* View Toggle */}
        <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('card')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'card' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            )}
            title="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'table' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            )}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="text-sm text-zinc-500">
          Showing {filteredIntegrations.length} of {integrations.length} integrations
          {hasActiveFilters && ' (filtered)'}
        </div>
      )}

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
      ) : filteredIntegrations.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <Plug className="w-12 h-12 text-zinc-600 mb-4" />
          {integrations.length === 0 ? (
            <>
              <p className="text-lg font-medium text-zinc-400 mb-2">No integrations configured</p>
              <p className="text-sm text-zinc-500 mb-4">Add your first integration to get started</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Integration
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-zinc-400 mb-2">No integrations match your filters</p>
              <p className="text-sm text-zinc-500 mb-4">Try adjusting your search or filters</p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'card' ? (
        /* Card View - grouped by category */
        <div className="space-y-8">
          {Object.entries(categoryLabels).map(([category, label]) => {
            const categoryIntegrations = groupedIntegrations[category as IntegrationCategory];
            if (!categoryIntegrations || categoryIntegrations.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-white mb-4">{label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categoryIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      isPlatformView
                      onTest={handleTestIntegration}
                      onEdit={handleEditIntegration}
                      onDelete={handleDeleteIntegration}
                      onConfigureSharing={(int) => setSharingModalIntegration(int)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Integration
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Category
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Sharing
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Last Tested
                </th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredIntegrations.map((integration) => (
                <tr key={integration.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {getProviderIcon(integration.provider)}
                      <div>
                        <p className="text-sm font-medium text-white">{integration.name}</p>
                        <p className="text-xs text-zinc-500">{integration.provider.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-400">
                      {categoryLabels[integration.category] || integration.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(integration.status)}
                  </td>
                  <td className="px-4 py-3">
                    {integration.isSharedWithClients ? (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
                        <Share2 className="w-3.5 h-3.5" />
                        Enabled
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-500">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-500">
                      {integration.lastTestedAt
                        ? new Date(integration.lastTestedAt).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTestIntegration(integration.id)}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Test connection"
                      >
                        <TestTube className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditIntegration(integration)}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSharingModalIntegration(integration)}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Configure sharing"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteIntegration(integration)}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Edit Integration Modal */}
      <EditIntegrationModal
        isOpen={!!editingIntegration}
        onClose={() => setEditingIntegration(null)}
        integration={editingIntegration}
        definition={editingIntegration ? definitions.find(d => d.provider === editingIntegration.provider) : undefined}
        isPlatformView
        onSubmit={handleUpdateIntegration}
      />

      {/* Configure Sharing Modal */}
      <ConfigureSharingModal
        isOpen={!!sharingModalIntegration}
        integration={sharingModalIntegration}
        onClose={() => setSharingModalIntegration(null)}
        onSubmit={handleConfigureSharing}
      />

      {/* Delete Confirmation Modal */}
      {integrationToDelete && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Integration</h3>
                <p className="text-sm text-zinc-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete <span className="font-medium text-white">&quot;{integrationToDelete.name}&quot;</span>?
              This will remove all associated credentials and settings.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIntegrationToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
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
