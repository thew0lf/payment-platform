'use client';

/**
 * Importing Step (Step 5)
 *
 * Shows real-time import progress with SSE updates.
 * Features:
 * - Automatic job start on step load
 * - Real-time progress via Server-Sent Events
 * - Phase indicators (preparing, importing, processing images)
 * - Error log display
 * - Completion actions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Image as ImageIcon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Download,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useImportWizardStore, useSelectedProductCount } from '@/stores/import-wizard.store';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productImportApi,
  getPhaseDisplayName,
  type ImportJob,
  type ImportJobStatus,
  type ImportJobPhase,
  type ImportEvent,
} from '@/lib/api/product-import';

// Phase icons mapping (must match Prisma schema phases)
const PHASE_ICONS: Record<ImportJobPhase, typeof Package> = {
  QUEUED: Settings,
  FETCHING: Download,
  MAPPING: Settings,
  CREATING: Package,
  DOWNLOADING_IMAGES: Download,
  UPLOADING_IMAGES: ImageIcon,
  GENERATING_THUMBNAILS: ImageIcon,
  FINALIZING: CheckCircle,
  DONE: CheckCircle,
};

// Status configurations (must match Prisma ImportJobStatus enum)
const STATUS_CONFIG: Record<
  ImportJobStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  PENDING: { icon: Loader2, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  IN_PROGRESS: { icon: Loader2, color: 'text-primary', bgColor: 'bg-primary/10' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  FAILED: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  CANCELLED: { icon: XCircle, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
};

export function ImportingStep() {
  const {
    selectedIntegrationId,
    selectedProductIds,
    fieldMappings,
    importOptions,
    savedMappingProfileId,
    currentJob,
    currentJobId,
    importErrors,
    setCurrentJob,
    setCurrentJobId,
    addImportError,
    clearImportErrors,
    closeWizard,
    resetWizard,
    setLoading,
    setError,
    prevStep,
    goToStep,
  } = useImportWizardStore();

  const { selectedCompanyId, accessLevel } = useHierarchy();
  const selectedCount = useSelectedProductCount();

  // Check if company selection is required
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const [showErrors, setShowErrors] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasStartedJob, setHasStartedJob] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const hasShownCompletionToast = useRef(false);
  // Ref to prevent duplicate job creation (React StrictMode protection)
  const isCreatingJobRef = useRef(false);

  // Derived states
  const isComplete = currentJob?.status === 'COMPLETED';
  const isFailed = currentJob?.status === 'FAILED';
  const isCancelled = currentJob?.status === 'CANCELLED';
  const isProcessing = currentJob?.status === 'IN_PROGRESS';
  const isFinished = isComplete || isFailed || isCancelled;

  // Start the import job
  const startImportJob = useCallback(async () => {
    // Use ref to prevent duplicate calls from React StrictMode
    if (!selectedIntegrationId || hasStartedJob || isCreatingJobRef.current) return;

    if (!selectedCompanyId) {
      setError('Please select a company from the header dropdown first');
      toast.error('Please select a company first');
      return;
    }

    // Set ref immediately to prevent race conditions
    isCreatingJobRef.current = true;
    setHasStartedJob(true);
    setLoading(true);
    clearImportErrors();

    try {
      const job = await productImportApi.createJob(
        {
          integrationId: selectedIntegrationId,
          selectedProductIds: Array.from(selectedProductIds),
          importImages: importOptions.importImages,
          generateThumbnails: importOptions.generateThumbnails,
          conflictStrategy: importOptions.conflictStrategy,
          fieldMappingProfileId: savedMappingProfileId || undefined,
          customMappings: fieldMappings.length > 0 ? fieldMappings : undefined,
        },
        selectedCompanyId
      );

      setCurrentJobId(job.id);
      setCurrentJob(job);
      toast.success('Import job started!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start import job';
      setError(message);
      toast.error(message);
      // Don't reset hasStartedJob - user can manually retry with button
    } finally {
      setLoading(false);
    }
  }, [
    selectedIntegrationId,
    selectedProductIds,
    fieldMappings,
    importOptions,
    savedMappingProfileId,
    selectedCompanyId,
    hasStartedJob,
    setCurrentJobId,
    setCurrentJob,
    clearImportErrors,
    setLoading,
    setError,
  ]);

  // Poll for job status (catches fast-completing jobs that finish before SSE connects)
  useEffect(() => {
    if (!currentJobId || !selectedCompanyId) {
      console.log('[ImportingStep] Polling effect skipped - missing jobId or companyId');
      return;
    }

    console.log('[ImportingStep] Starting polling for job:', currentJobId);
    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const pollJobStatus = async () => {
      try {
        console.log('[ImportingStep] Polling job status...');
        const job = await productImportApi.getJob(currentJobId, selectedCompanyId);
        console.log('[ImportingStep] Poll response:', {
          id: job.id,
          status: job.status,
          phase: job.phase,
          progress: job.progress,
          importedCount: job.importedCount,
        });

        if (!isMounted) {
          console.log('[ImportingStep] Component unmounted, skipping update');
          return;
        }

        // Update job state
        console.log('[ImportingStep] Calling setCurrentJob with status:', job.status);
        setCurrentJob(job);

        // If job is finished, show appropriate toast and stop polling
        if (job.status === 'COMPLETED') {
          console.log('[ImportingStep] Job COMPLETED!');
          if (!hasShownCompletionToast.current) {
            hasShownCompletionToast.current = true;
            toast.success(`Import complete! ${job.importedCount} products imported.`);
          }
          if (pollInterval) clearInterval(pollInterval);
        } else if (job.status === 'FAILED') {
          console.log('[ImportingStep] Job FAILED');
          if (!hasShownCompletionToast.current) {
            hasShownCompletionToast.current = true;
            toast.error('Import failed');
          }
          if (pollInterval) clearInterval(pollInterval);
        } else if (job.status === 'CANCELLED') {
          console.log('[ImportingStep] Job CANCELLED');
          if (!hasShownCompletionToast.current) {
            hasShownCompletionToast.current = true;
            toast.info('Import cancelled');
          }
          if (pollInterval) clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('[ImportingStep] Failed to poll job status:', error);
      }
    };

    // Immediately fetch current status
    pollJobStatus();

    // Poll every 2 seconds until job is finished
    pollInterval = setInterval(pollJobStatus, 2000);

    return () => {
      console.log('[ImportingStep] Cleaning up polling');
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentJobId, selectedCompanyId, setCurrentJob]);

  // Subscribe to job events via SSE (for real-time updates)
  useEffect(() => {
    if (!currentJobId || isFinished) return;

    const handleEvent = (event: ImportEvent) => {
      switch (event.type) {
        case 'job:started':
        case 'job:progress':
        case 'job:phase-changed':
          setCurrentJob(event.data);
          break;

        case 'job:completed':
          setCurrentJob(event.data);
          if (!hasShownCompletionToast.current) {
            hasShownCompletionToast.current = true;
            toast.success(`Import complete! ${event.data.importedCount} products imported.`);
          }
          break;

        case 'job:failed':
          setCurrentJob(event.data);
          if (!hasShownCompletionToast.current) {
            hasShownCompletionToast.current = true;
            toast.error('Import failed');
          }
          break;

        case 'job:cancelled':
          setCurrentJob(event.data);
          if (!hasShownCompletionToast.current) {
            hasShownCompletionToast.current = true;
            toast.info('Import cancelled');
          }
          break;

        case 'job:product-error':
          addImportError({
            productId: event.data.productId || '',
            sku: event.data.sku,
            message: event.data.message,
            code: event.data.code || 'IMPORT_ERROR',
            timestamp: new Date().toISOString(),
          });
          break;
      }
    };

    const handleSSEError = (error: Error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
    };

    // Subscribe to events
    cleanupRef.current = productImportApi.subscribeToJobEvents(
      currentJobId,
      handleEvent,
      handleSSEError,
      {
        companyId: selectedCompanyId || undefined,
        onConnectionChange: setIsConnected,
      }
    );

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [currentJobId, isFinished, selectedCompanyId, setCurrentJob, addImportError]);

  // Start job when step loads
  useEffect(() => {
    console.log('[ImportingStep] Step mounted/updated');
    console.log('[ImportingStep] hasStartedJob:', hasStartedJob);
    console.log('[ImportingStep] selectedIntegrationId:', selectedIntegrationId);
    console.log('[ImportingStep] selectedCompanyId:', selectedCompanyId);
    console.log('[ImportingStep] selectedProductIds count:', selectedProductIds.size);
    console.log('[ImportingStep] fieldMappings count:', fieldMappings.length);

    if (!hasStartedJob && selectedIntegrationId) {
      console.log('[ImportingStep] Starting import job...');
      startImportJob();
    }
  }, [hasStartedJob, selectedIntegrationId, startImportJob]);

  // Cancel the import job
  const handleCancel = async () => {
    if (!currentJobId) return;
    if (!selectedCompanyId) {
      toast.error('Company context required');
      return;
    }

    try {
      await productImportApi.cancelJob(currentJobId, selectedCompanyId);
      toast.info('Import cancelled');
    } catch (err) {
      toast.error('Failed to cancel import');
    }
  };

  // Retry the import
  const handleRetry = () => {
    hasShownCompletionToast.current = false;
    isCreatingJobRef.current = false; // Reset the ref to allow new job creation
    setHasStartedJob(false);
    setCurrentJobId(null);
    setCurrentJob(null);
    clearImportErrors();
    // Will auto-start on next render
  };

  const handleDone = () => {
    closeWizard();
    resetWizard();
  };

  const handleViewProducts = () => {
    closeWizard();
    resetWizard();
    window.location.href = '/products';
  };

  // Get status config - with fallbacks to prevent undefined components
  const statusConfig = currentJob ? STATUS_CONFIG[currentJob.status] : null;
  const StatusIcon = statusConfig?.icon || Loader2;
  const PhaseIcon = (currentJob?.phase && PHASE_ICONS[currentJob.phase]) || Package;

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s remaining`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  };

  // Get error message from job
  const errorMessage = currentJob?.errors?.[0]?.message || 'Something went wrong during the import';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Status Header */}
      <div className="text-center">
        <div
          className={cn(
            'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl transition-colors',
            statusConfig?.bgColor || 'bg-muted'
          )}
        >
          {isComplete ? (
            <Sparkles className={cn('h-10 w-10', statusConfig?.color)} />
          ) : isFailed || isCancelled ? (
            <StatusIcon className={cn('h-10 w-10', statusConfig?.color)} />
          ) : (
            <div className="relative">
              <PhaseIcon className="h-10 w-10 text-muted-foreground" />
              <Loader2
                className={cn(
                  'absolute -right-1 -top-1 h-6 w-6 animate-spin',
                  statusConfig?.color || 'text-primary'
                )}
              />
            </div>
          )}
        </div>

        <h3 className="text-xl font-semibold text-foreground">
          {isComplete
            ? 'Import Complete!'
            : isFailed
            ? 'Import Failed'
            : isCancelled
            ? 'Import Cancelled'
            : 'Importing Products...'}
        </h3>
        <p className="mt-2 text-muted-foreground">
          {isComplete
            ? `Successfully imported ${currentJob?.importedCount || 0} products`
            : isFailed
            ? errorMessage
            : isCancelled
            ? 'The import was cancelled'
            : currentJob?.phase
            ? getPhaseDisplayName(currentJob.phase)
            : 'Preparing import...'}
        </p>

        {/* Connection status */}
        {isProcessing && (
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
              )}
            />
            {isConnected ? 'Live updates' : 'Reconnecting...'}
          </div>
        )}
      </div>

      {/* Progress Section */}
      {!isFinished && currentJob && (
        <div className="space-y-3">
          {/* Current item */}
          {currentJob.currentItem && (
            <p className="text-center text-sm text-muted-foreground truncate">
              Processing: {currentJob.currentItem}
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(currentJob.progress || 0)}%</span>
            </div>
            <Progress value={currentJob.progress || 0} className="h-3" />
            {currentJob.estimatedSecondsRemaining && currentJob.estimatedSecondsRemaining > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {formatTimeRemaining(currentJob.estimatedSecondsRemaining)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {currentJob && (
        <div className="grid grid-cols-3 gap-4 rounded-xl border p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {currentJob.importedCount || 0}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Imported
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">
              {currentJob.skippedCount || 0}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Skipped
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive">
              {currentJob.errorCount || 0}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Errors
            </div>
          </div>
        </div>
      )}

      {/* Phase timeline (during import) */}
      {isProcessing && currentJob?.phase && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {(['QUEUED', 'FETCHING', 'CREATING', 'UPLOADING_IMAGES', 'FINALIZING'] as const).map(
            (phase, index) => {
              // All phases in order for progress tracking
              const allPhases: ImportJobPhase[] = ['QUEUED', 'FETCHING', 'MAPPING', 'CREATING', 'DOWNLOADING_IMAGES', 'UPLOADING_IMAGES', 'GENERATING_THUMBNAILS', 'FINALIZING', 'DONE'];
              const currentIndex = allPhases.indexOf(currentJob.phase);
              const phaseIndex = allPhases.indexOf(phase);
              const isActive = phase === currentJob.phase;
              const isPhaseComplete = phaseIndex < currentIndex;

              return (
                <div key={phase} className="flex items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        'h-0.5 w-4 mx-1',
                        isPhaseComplete ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      isPhaseComplete && 'bg-primary text-primary-foreground',
                      isActive && 'bg-primary/20 text-primary ring-2 ring-primary',
                      !isPhaseComplete && !isActive && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isPhaseComplete ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Error Log */}
      {importErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 overflow-hidden">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="flex w-full items-center justify-between bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {importErrors.length} error{importErrors.length !== 1 ? 's' : ''} occurred
            </div>
            {showErrors ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showErrors && (
            <div className="max-h-48 overflow-y-auto divide-y divide-destructive/10">
              {importErrors.map((error, i) => (
                <div key={i} className="px-4 py-2 text-sm">
                  <span className="font-medium text-destructive">
                    {error.sku || error.productId}:
                  </span>{' '}
                  <span className="text-muted-foreground">{error.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No job started yet (edge case) */}
      {!currentJob && !hasStartedJob && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h4 className="mt-4 font-medium text-foreground">Ready to Import</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedCount > 0
              ? `Click start to begin importing ${selectedCount} products`
              : 'No products selected. Go back to select products.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="outline" className="min-h-[44px] touch-manipulation" onClick={() => goToStep('preview')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Preview
            </Button>
            {selectedCount > 0 && (
              <Button className="min-h-[44px] touch-manipulation" onClick={startImportJob}>
                <Play className="mr-2 h-4 w-4" />
                Start Import
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3 pt-4 border-t">
        {/* Show cancel during any non-finished state */}
        {!isFinished && (
          <>
            {currentJobId ? (
              <Button variant="destructive" onClick={handleCancel} className="min-h-[44px] touch-manipulation">
                Cancel Import
              </Button>
            ) : (
              <Button variant="outline" onClick={handleDone} className="min-h-[44px] touch-manipulation">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </>
        )}

        {isFinished && (
          <>
            {isFailed && (
              <Button variant="outline" onClick={handleRetry} className="min-h-[44px] touch-manipulation">
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry Import
              </Button>
            )}
            {isComplete && (
              <Button onClick={handleViewProducts} className="min-h-[44px] touch-manipulation">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Products
              </Button>
            )}
            <Button variant={isComplete ? 'outline' : 'default'} onClick={handleDone} className="min-h-[44px] touch-manipulation">
              {isComplete ? 'Done' : 'Close'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
