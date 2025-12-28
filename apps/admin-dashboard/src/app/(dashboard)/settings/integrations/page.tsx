'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Plus, Plug, RefreshCw, AlertCircle, Search, LayoutGrid, List, X, Trash2, CheckCircle, XCircle, Clock, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { cn } from '@/lib/utils';
import {
  integrationsApi,
  ClientIntegration,
  IntegrationDefinition,
  PlatformIntegration,
  IntegrationCategory,
  IntegrationProvider,
  IntegrationMode,
  IntegrationStatus,
} from '@/lib/api/integrations';
import { IntegrationCard, AddIntegrationModal, EditIntegrationModal } from '@/components/integrations';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

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
  [IntegrationCategory.FULFILLMENT]: 'Fulfillment',
};

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ERROR', label: 'Error' },
  { value: 'DISABLED', label: 'Disabled' },
];

const modeOptions = [
  { value: 'all', label: 'All Modes' },
  { value: 'OWN', label: 'Own Credentials' },
  { value: 'PLATFORM', label: 'Shared Service' },
];

// Provider icon configuration
const providerConfig: Record<string, { iconUrl?: string; bgColor: string; gradient: string }> = {
  [IntegrationProvider.STRIPE]: { iconUrl: '/integrations/stripe.svg', bgColor: 'bg-[#635BFF]', gradient: 'from-[#635BFF] to-[#8B85FF]' },
  [IntegrationProvider.PAYPAL_REST]: { iconUrl: '/integrations/paypal.svg', bgColor: 'bg-[#003087]', gradient: 'from-[#003087] to-[#009cde]' },
  [IntegrationProvider.PAYPAL_PAYFLOW]: { iconUrl: '/integrations/paypal.svg', bgColor: 'bg-[#003087]', gradient: 'from-[#003087] to-[#009cde]' },
  [IntegrationProvider.NMI]: { iconUrl: '/integrations/nmi.svg', bgColor: 'bg-[#00A651]', gradient: 'from-[#00A651] to-[#00D084]' },
  [IntegrationProvider.AUTHORIZE_NET]: { iconUrl: '/integrations/authorize-net.svg', bgColor: 'bg-[#F26722]', gradient: 'from-[#F26722] to-[#FF8B4D]' },
  [IntegrationProvider.LANGUAGETOOL]: { iconUrl: '/integrations/languagetool.svg', bgColor: 'bg-[#0066CC]', gradient: 'from-[#0066CC] to-[#0099FF]' },
  [IntegrationProvider.CLOUDINARY]: { iconUrl: '/integrations/cloudinary.svg', bgColor: 'bg-[#3448C5]', gradient: 'from-[#3448C5] to-[#F5BD51]' },
  [IntegrationProvider.RUNWAY]: { iconUrl: '/integrations/runway.svg', bgColor: 'bg-[#000000]', gradient: 'from-[#000000] to-[#333333]' },
};

type ViewMode = 'card' | 'table';

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

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

  // Search, filter, and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

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

      // Mode filter
      if (selectedMode !== 'all' && integration.mode !== selectedMode) {
        return false;
      }

      return true;
    });
  }, [integrations, searchQuery, selectedCategory, selectedStatus, selectedMode]);

  // Group filtered integrations by category for card view
  const groupedIntegrations = useMemo(() => {
    return filteredIntegrations.reduce(
      (acc, integration) => {
        if (!acc[integration.category]) acc[integration.category] = [];
        acc[integration.category].push(integration);
        return acc;
      },
      {} as Record<IntegrationCategory, ClientIntegration[]>
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
    toast.success('Integration created successfully');
    await loadData();
  };

  const handleTestIntegration = async (id: string) => {
    if (!clientId) return;
    try {
      const result = await integrationsApi.testClientIntegration(clientId, id);
      if (result.data.success) {
        toast.success('Connection test successful');
        await loadData();
      } else {
        toast.error(`Test failed: ${result.data.message}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    }
  };

  const handleDeleteIntegration = (integration: ClientIntegration | PlatformIntegration) => {
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
      toast.success('Default integration updated');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  const handleEditIntegration = (integration: ClientIntegration | PlatformIntegration) => {
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedMode('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedMode !== 'all';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full">
            <XCircle className="w-3 h-3" />
            Error
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
            <XCircle className="w-3 h-3" />
            Disabled
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  };

  const getModeBadge = (mode: string) => {
    if (mode === 'PLATFORM') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
          Shared
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
        Own
      </span>
    );
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
      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br', config?.gradient || 'from-muted to-muted')}>
        <span className="text-foreground text-xs font-bold">{initials}</span>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (!clientId) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plug className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">No Client Selected</p>
          <p className="text-muted-foreground text-center">Please select a client to manage integrations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect to payment gateways, AI services, and other tools to power your business
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadData()}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </div>

      {/* Platform shared services promotion */}
      {platformOptions.length > 0 && integrations.length === 0 && !isLoading && (
        <div className="p-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
              <Plug className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Shared Services Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your organization has pre-configured integrations ready to use.
                Connect to shared services without managing your own API credentials.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Browse Available Services
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search, Filter, and View Toggle Bar */}
      {(integrations.length > 0 || hasActiveFilters) && (
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 bg-card/50 border border-border rounded-xl p-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="h-9 px-3 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Mode Filter */}
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="h-9 px-3 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {modeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}

            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'card' ? 'bg-primary text-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'table' ? 'bg-primary text-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-4" />
          <p className="text-muted-foreground">Loading integrations...</p>
        </div>
      ) : filteredIntegrations.length === 0 && !hasActiveFilters ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-64 bg-card/50 border border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plug className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">No integrations yet</p>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Connect to payment gateways, AI tools, and other services to unlock powerful features
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Integration
          </Button>
        </div>
      ) : filteredIntegrations.length === 0 && hasActiveFilters ? (
        /* No results from filter */
        <div className="flex flex-col items-center justify-center h-64 bg-card/50 border border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">No matching integrations</p>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Try adjusting your search or filters
          </p>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      ) : viewMode === 'card' ? (
        /* Card View - grouped by category */
        <div className="space-y-8">
          {Object.entries(categoryLabels).map(([category, label]) => {
            const categoryIntegrations = groupedIntegrations[category as IntegrationCategory];
            if (!categoryIntegrations || categoryIntegrations.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  {label}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({categoryIntegrations.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
      ) : (
        /* Table View */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Integration</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Mode</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Environment</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredIntegrations.map((integration) => (
                  <tr key={integration.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getProviderIcon(integration.provider)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{integration.name}</span>
                            {integration.isDefault && (
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{integration.provider.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">{categoryLabels[integration.category] || integration.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getModeBadge(integration.mode)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(integration.status)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 text-xs rounded-full',
                        integration.environment === 'PRODUCTION'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      )}>
                        {integration.environment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestIntegration(integration.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditIntegration(integration)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIntegration(integration)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredIntegrations.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredIntegrations.length} of {integrations.length} integration{integrations.length !== 1 ? 's' : ''}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
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
              Are you sure you want to delete <span className="font-medium">&quot;{integrationToDelete.name}&quot;</span>?
              This will remove all associated credentials and settings.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setIntegrationToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
