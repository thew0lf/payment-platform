'use client';

/**
 * Connection Step (Step 2)
 *
 * Allows users to connect to their selected provider by:
 * 1. Selecting an existing integration
 * 2. Or creating a new one
 * 3. Testing the connection
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Settings2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useImportWizardStore } from '@/stores/import-wizard.store';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  integrationsApi,
  type ClientIntegration,
  IntegrationProvider,
} from '@/lib/api/integrations';

// Map our provider IDs to IntegrationProvider enum values
const providerMapping: Record<string, IntegrationProvider | undefined> = {
  roastify: 'ROASTIFY' as IntegrationProvider, // Custom provider
  // These would need to be added to the IntegrationProvider enum in the backend
};

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

interface IntegrationCardProps {
  integration: ClientIntegration;
  isSelected: boolean;
  onSelect: () => void;
  onTest: () => void;
  connectionStatus: ConnectionStatus;
  isTesting: boolean;
}

function IntegrationCard({
  integration,
  isSelected,
  onSelect,
  onTest,
  connectionStatus,
  isTesting,
}: IntegrationCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      aria-pressed={isSelected}
      className={cn(
        'group relative rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border hover:border-primary/30 hover:bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground truncate">
              {integration.name}
            </h3>
            {integration.isDefault && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Default
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground truncate">
            {integration.description || `${integration.provider} integration`}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs capitalize">
              {integration.environment.toLowerCase()}
            </Badge>
            {integration.isVerified && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex flex-col items-end gap-2">
          {connectionStatus === 'success' && (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Connected
            </div>
          )}
          {connectionStatus === 'error' && (
            <div className="flex items-center gap-1 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              Failed
            </div>
          )}
          {connectionStatus === 'testing' && (
            <div className="flex items-center gap-1 text-blue-600 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </div>
          )}
        </div>
      </div>

      {/* Test button - only visible when selected */}
      {isSelected && connectionStatus !== 'testing' && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          onClick={(e) => {
            e.stopPropagation();
            onTest();
          }}
          disabled={isTesting}
        >
          <Zap className="mr-2 h-3.5 w-3.5" />
          Test Connection
        </Button>
      )}
    </div>
  );
}

export function ConnectionStep() {
  const {
    selectedProvider,
    selectedIntegrationId,
    connectionVerified,
    setIntegration,
    setConnectionVerified,
    prevStep,
    nextStep,
    markStepComplete,
    setLoading,
    setError,
  } = useImportWizardStore();

  const { selectedClientId } = useHierarchy();
  const [integrations, setIntegrations] = useState<ClientIntegration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [isTesting, setIsTesting] = useState(false);

  // Load available integrations for the selected provider
  const loadIntegrations = useCallback(async () => {
    if (!selectedProvider || !selectedClientId) {
      setIntegrations([]);
      setIsLoadingIntegrations(false);
      return;
    }

    setIsLoadingIntegrations(true);
    try {
      const response = await integrationsApi.listClientIntegrations(selectedClientId);

      // Filter to only show integrations matching our provider
      // For now, we'll show all integrations since we're using ROASTIFY as a custom provider
      const filtered = response.data.filter((int: ClientIntegration) => {
        const providerMatch = providerMapping[selectedProvider.id];
        return providerMatch ? int.provider === providerMatch : false;
      });

      setIntegrations(filtered);

      // Auto-select if there's only one integration
      if (filtered.length === 1 && !selectedIntegrationId) {
        setIntegration(filtered[0].id);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
      toast.error('Failed to load integrations');
      setIntegrations([]);
    } finally {
      setIsLoadingIntegrations(false);
    }
  }, [selectedProvider, selectedClientId, selectedIntegrationId, setIntegration]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  // Reset connection status when integration changes
  useEffect(() => {
    setConnectionStatus('idle');
    setConnectionVerified(false);
  }, [selectedIntegrationId, setConnectionVerified]);

  const handleSelectIntegration = (integrationId: string) => {
    setIntegration(integrationId);
    setConnectionStatus('idle');
  };

  const handleTestConnection = async () => {
    if (!selectedIntegrationId || !selectedClientId) return;

    setIsTesting(true);
    setConnectionStatus('testing');
    setLoading(true);

    try {
      const response = await integrationsApi.testClientIntegration(
        selectedClientId,
        selectedIntegrationId
      );
      const result = response.data;

      if (result.success) {
        setConnectionStatus('success');
        setConnectionVerified(true);
        toast.success('Connection successful!');
      } else {
        setConnectionStatus('error');
        setConnectionVerified(false);
        toast.error(result.message || 'Connection test failed');
        setError(result.message || 'Connection test failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setConnectionStatus('error');
      setConnectionVerified(false);
      toast.error(message);
      setError(message);
    } finally {
      setIsTesting(false);
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (connectionVerified) {
      markStepComplete('connection');
      nextStep();
    }
  };

  const handleCreateNew = () => {
    // Navigate to integrations settings page
    window.open('/settings/integrations', '_blank');
    toast.info('Add your integration in the new tab, then refresh this page');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Link2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          Connect to {selectedProvider?.name || 'Provider'}
        </h3>
        <p className="mt-2 text-muted-foreground">
          Select an existing connection or set up a new one
        </p>
      </div>

      {/* Integrations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Your {selectedProvider?.name} Connections
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadIntegrations}
            disabled={isLoadingIntegrations}
          >
            <RefreshCw className={cn('h-4 w-4', isLoadingIntegrations && 'animate-spin')} />
          </Button>
        </div>

        {isLoadingIntegrations ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="ml-auto h-5 w-16" />
                </div>
                <Skeleton className="mt-2 h-4 w-48" />
              </div>
            ))}
          </div>
        ) : integrations.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h4 className="mt-4 font-medium text-foreground">No connections found</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven't set up a {selectedProvider?.name} integration yet
            </p>
            <Button className="mt-4" onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add {selectedProvider?.name} Integration
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                isSelected={selectedIntegrationId === integration.id}
                onSelect={() => handleSelectIntegration(integration.id)}
                onTest={handleTestConnection}
                connectionStatus={
                  selectedIntegrationId === integration.id ? connectionStatus : 'idle'
                }
                isTesting={isTesting}
              />
            ))}
          </div>
        )}

        {/* Add new button when there are existing integrations */}
        {integrations.length > 0 && (
          <Button variant="outline" className="w-full" onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Another Connection
          </Button>
        )}
      </div>

      {/* Connection status message */}
      {connectionStatus === 'success' && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center">
          <CheckCircle className="mx-auto h-8 w-8 text-green-600" />
          <p className="mt-2 font-medium text-green-800 dark:text-green-200">
            Connection verified!
          </p>
          <p className="text-sm text-green-600 dark:text-green-300">
            Ready to preview products from {selectedProvider?.name}
          </p>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-center">
          <XCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 font-medium text-destructive">Connection failed</p>
          <p className="text-sm text-destructive/80">
            Check your credentials and try again
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => window.open('/settings/integrations', '_blank')}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Edit Integration Settings
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          {!connectionVerified && selectedIntegrationId && connectionStatus !== 'testing' && (
            <p className="text-sm text-muted-foreground">
              Test your connection to continue
            </p>
          )}
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!connectionVerified || isTesting}
            className="min-w-[150px]"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
