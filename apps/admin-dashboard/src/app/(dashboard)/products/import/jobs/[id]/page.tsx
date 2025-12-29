'use client';

/**
 * Import Job Detail Page
 *
 * Shows detailed information about a specific import job.
 * Features:
 * - Job status and progress
 * - Full error log with filtering
 * - Product breakdown (imported, skipped, errors)
 * - Retry capability for failed jobs
 * - Real-time updates via SSE for active jobs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  RotateCcw,
  Package,
  Image as ImageIcon,
  AlertTriangle,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Timer,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productImportApi,
  type ImportJob,
  type ImportJobError,
  type ImportJobStatus,
  type ImportEvent,
  getStatusVariant,
  getPhaseDisplayName,
  formatDuration,
  getProvider,
} from '@/lib/api/product-import';
import { cn } from '@/lib/utils';

// Phase colors for the timeline
const PHASE_COLORS: Record<string, string> = {
  INITIALIZING: 'bg-gray-500',
  FETCHING: 'bg-blue-500',
  MAPPING: 'bg-indigo-500',
  IMPORTING: 'bg-purple-500',
  IMAGES: 'bg-pink-500',
  THUMBNAILS: 'bg-orange-500',
  FINALIZING: 'bg-green-500',
};

export default function ImportJobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;
  const { selectedCompanyId, accessLevel } = useHierarchy();

  // Check if company selection is required
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // State
  const [job, setJob] = useState<ImportJob | null>(null);
  const [isLoading, setIsLoading] = useState(!needsCompanySelection);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // SSE connection ref
  const cleanupRef = useRef<(() => void) | null>(null);

  // Load job details
  const loadJob = useCallback(async () => {
    // Skip loading if no company selected
    if (!selectedCompanyId) {
      setIsLoading(false);
      setJob(null);
      return;
    }

    setIsLoading(true);

    try {
      const jobData = await productImportApi.getJob(jobId, selectedCompanyId);
      setJob(jobData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job details';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, selectedCompanyId]);

  // Initial load
  useEffect(() => {
    loadJob();
  }, [loadJob]);

  // Subscribe to SSE for active jobs
  useEffect(() => {
    if (!job || job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      return;
    }

    const handleEvent = (event: ImportEvent) => {
      switch (event.type) {
        case 'job:started':
        case 'job:progress':
        case 'job:phase-changed':
        case 'job:completed':
        case 'job:failed':
        case 'job:cancelled':
          setJob(event.data);
          break;
        case 'job:product-error':
          // Add error to local errors list
          setJob((prev) => {
            if (!prev) return prev;
            const newError: ImportJobError = {
              productId: event.data.productId || '',
              sku: event.data.sku,
              message: event.data.message,
              code: event.data.code || 'IMPORT_ERROR',
              timestamp: new Date().toISOString(),
            };
            return {
              ...prev,
              errors: [...(prev.errors || []), newError],
              errorCount: (prev.errorCount || 0) + 1,
            };
          });
          break;
      }
    };

    cleanupRef.current = productImportApi.subscribeToJobEvents(
      jobId,
      handleEvent,
      (error) => console.error('SSE error:', error),
      { companyId: selectedCompanyId || undefined }
    );

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [job?.status, jobId, selectedCompanyId]);

  // Retry failed job
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const newJob = await productImportApi.retryJob(jobId, selectedCompanyId || undefined);
      setJob(newJob);
      toast.success('Import job restarted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry import';
      toast.error(message);
    } finally {
      setIsRetrying(false);
    }
  };

  // Cancel running job
  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const cancelledJob = await productImportApi.cancelJob(jobId, selectedCompanyId || undefined);
      setJob(cancelledJob);
      toast.info('Import cancelled');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel import';
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  };

  // Copy job ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(jobId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success('Job ID copied');
  };

  // Export errors as CSV
  const handleExportErrors = () => {
    if (!job?.errors?.length) return;

    const headers = ['SKU', 'Product ID', 'Error Code', 'Message', 'Timestamp'];
    const rows = job.errors.map((err) => [
      err.sku || '',
      err.productId || '',
      err.code,
      `"${err.message.replace(/"/g, '""')}"`,
      err.timestamp,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status icon
  const getStatusIcon = (status: ImportJobStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'PROCESSING':
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'FAILED':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'CANCELLED':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Clock className="h-6 w-6 text-muted-foreground" />;
    }
  };

  // Format timestamps
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate duration
  const getJobDuration = () => {
    if (!job?.startedAt) return null;
    const endTime = job.completedAt ? new Date(job.completedAt) : new Date();
    const startTime = new Date(job.startedAt);
    const seconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    return formatDuration(seconds);
  };

  // Filter errors by search
  const filteredErrors = (job?.errors || []).filter((err) => {
    if (!errorSearch) return true;
    const searchLower = errorSearch.toLowerCase();
    return (
      err.sku?.toLowerCase().includes(searchLower) ||
      err.message.toLowerCase().includes(searchLower) ||
      err.code.toLowerCase().includes(searchLower)
    );
  });

  const displayedErrors = showAllErrors ? filteredErrors : filteredErrors.slice(0, 10);
  const hasMoreErrors = filteredErrors.length > 10;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-10 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Company selection required state
  if (needsCompanySelection) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/products/import/jobs')}
            aria-label="Back to history"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Import Job Details</h1>
            <p className="text-muted-foreground">View detailed import information</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">Select a Company</h2>
              <p className="mt-2 text-muted-foreground max-w-md">
                Choose a company from the dropdown in the header to view import details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!job) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
        <p className="text-muted-foreground mb-4">
          This import job doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => router.push('/products/import/jobs')} className="min-h-[44px] touch-manipulation">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
      </div>
    );
  }

  const provider = getProvider(job.provider);
  const isActive = job.status === 'PROCESSING' || job.status === 'PENDING';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/products/import/jobs')}
            aria-label="Back to history"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              {provider?.icon ? (
                <img
                  src={provider.icon}
                  alt=""
                  className="h-7 w-7"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight capitalize">
                  {job.provider} Import
                </h1>
                <Badge variant={getStatusVariant(job.status)} className="capitalize">
                  {job.status.toLowerCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  aria-label="Copy job ID"
                >
                  {copiedId ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {jobId.slice(0, 8)}...
                </button>
                <span>•</span>
                <span>Started {formatDateTime(job.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isActive && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
              className="min-h-[44px] touch-manipulation"
            >
              {isCancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Cancel
            </Button>
          )}
          {job.status === 'FAILED' && (
            <Button onClick={handleRetry} disabled={isRetrying} className="min-h-[44px] touch-manipulation">
              {isRetrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Retry Import
            </Button>
          )}
          <Button variant="outline" onClick={loadJob} className="min-h-[44px] touch-manipulation">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress (for active jobs) */}
      {isActive && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="font-medium">{getPhaseDisplayName(job.phase)}</div>
                    {job.currentItem && (
                      <div className="text-sm text-muted-foreground truncate max-w-md">
                        {job.currentItem}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{Math.round(job.progress)}%</div>
                  {job.estimatedSecondsRemaining && job.estimatedSecondsRemaining > 0 && (
                    <div className="text-sm text-muted-foreground">
                      ~{formatDuration(job.estimatedSecondsRemaining)} remaining
                    </div>
                  )}
                </div>
              </div>
              <Progress value={job.progress} className="h-3" />

              {/* Phase timeline */}
              <div className="flex items-center justify-between text-xs">
                {['INITIALIZING', 'FETCHING', 'IMPORTING', 'IMAGES', 'FINALIZING'].map((phase, i) => {
                  const phases = ['INITIALIZING', 'FETCHING', 'MAPPING', 'IMPORTING', 'IMAGES', 'THUMBNAILS', 'FINALIZING'];
                  const currentIndex = phases.indexOf(job.phase);
                  const phaseIndex = phases.indexOf(phase);
                  const isComplete = phaseIndex < currentIndex;
                  const isCurrent = phase === job.phase ||
                    (phase === 'IMPORTING' && job.phase === 'MAPPING') ||
                    (phase === 'IMAGES' && job.phase === 'THUMBNAILS');

                  return (
                    <div key={phase} className="flex items-center gap-1">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          isComplete && 'bg-green-500',
                          isCurrent && 'bg-blue-500 animate-pulse',
                          !isComplete && !isCurrent && 'bg-muted'
                        )}
                      />
                      <span className={cn(
                        isComplete && 'text-green-600',
                        isCurrent && 'text-blue-600 font-medium',
                        !isComplete && !isCurrent && 'text-muted-foreground'
                      )}>
                        {phase === 'INITIALIZING' ? 'Setup' :
                         phase === 'FETCHING' ? 'Fetch' :
                         phase === 'IMPORTING' ? 'Import' :
                         phase === 'IMAGES' ? 'Images' : 'Done'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Imported</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{job.importedCount}</div>
            <p className="text-xs text-muted-foreground">
              of {job.totalProducts} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skipped</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{job.skippedCount}</div>
            <p className="text-xs text-muted-foreground">
              already existed or filtered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              job.errorCount > 0 ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {job.errorCount}
            </div>
            <p className="text-xs text-muted-foreground">
              failed to import
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.processedImages}</div>
            <p className="text-xs text-muted-foreground">
              of {job.totalImages} processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium capitalize">{job.provider}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={getStatusVariant(job.status)} className="capitalize">
                {job.status.toLowerCase()}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Phase</span>
              <span className="font-medium">{getPhaseDisplayName(job.phase)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{getJobDuration() || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created
              </span>
              <span className="text-sm">{formatDateTime(job.createdAt)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Timer className="h-4 w-4" />
                Started
              </span>
              <span className="text-sm">
                {job.startedAt ? formatDateTime(job.startedAt) : '-'}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </span>
              <span className="text-sm">
                {job.completedAt ? formatDateTime(job.completedAt) : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Log */}
      {(job.errors?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Error Log ({job.errors?.length || 0})
                </CardTitle>
                <CardDescription>
                  Products that couldn't be imported
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportErrors} className="min-h-[44px] touch-manipulation">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search errors by SKU, message, or code..."
                value={errorSearch}
                onChange={(e) => setErrorSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Error list */}
            <div className="space-y-2">
              {displayedErrors.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No errors match your search
                </div>
              ) : (
                displayedErrors.map((error, index) => (
                  <div
                    key={`${error.productId}-${index}`}
                    className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {error.sku && (
                          <Badge variant="outline" className="text-xs">
                            {error.sku}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {error.code}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-destructive/90">{error.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Show more/less */}
            {hasMoreErrors && (
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => setShowAllErrors(!showAllErrors)}
              >
                {showAllErrors ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Show All {filteredErrors.length} Errors
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* View products link for completed jobs */}
      {job.status === 'COMPLETED' && job.importedCount > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">View Imported Products</h3>
                <p className="text-sm text-muted-foreground">
                  See all {job.importedCount} products that were just imported
                </p>
              </div>
              <Button onClick={() => router.push('/products')} className="min-h-[44px] touch-manipulation">
                View Products
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
