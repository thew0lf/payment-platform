'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Package,
  Image as ImageIcon,
  HardDrive,
  FileText,
  Plus,
  History,
  Settings2,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productImportApi,
  type ImportJob,
  type ImportJobStatus,
  type ImportHistoryStats,
  type StorageUsageStats,
  IMPORT_PROVIDERS,
  getStatusVariant,
  formatDuration,
} from '@/lib/api/product-import';
import { ImportWizard, useImportWizardStore } from '@/components/product-import';

export default function ProductImportPage() {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const { openWizard, setProvider } = useImportWizardStore();

  // Check if company selection is required
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;
  const [recentJobs, setRecentJobs] = useState<ImportJob[]>([]);
  const [historyStats, setHistoryStats] = useState<ImportHistoryStats | null>(null);
  const [storageStats, setStorageStats] = useState<StorageUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle opening wizard (can also be triggered with provider pre-selected)
  const handleStartImport = (providerId?: string) => {
    if (providerId) {
      const provider = IMPORT_PROVIDERS.find((p) => p.id === providerId);
      if (provider) {
        setProvider(provider);
      }
    }
    openWizard();
  };

  // Memoize available providers since IMPORT_PROVIDERS is static
  const availableProviders = useMemo(
    () => IMPORT_PROVIDERS.filter((p) => p.isAvailable),
    []
  );

  const loadData = useCallback(async (signal?: AbortSignal) => {
    // Don't load data if no company is selected
    if (!selectedCompanyId) {
      setIsLoading(false);
      setRecentJobs([]);
      setHistoryStats(null);
      setStorageStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use Promise.allSettled to handle individual API failures gracefully
      const results = await Promise.allSettled([
        productImportApi.listJobs({ limit: 5 }, selectedCompanyId),
        productImportApi.getImportHistory(selectedCompanyId),
        productImportApi.getStorageUsage(selectedCompanyId),
      ]);

      // Check if request was aborted
      if (signal?.aborted) return;

      // Handle each result individually
      if (results[0].status === 'fulfilled') {
        setRecentJobs(results[0].value.items);
      } else {
        console.error('Failed to load jobs:', results[0].reason);
        setRecentJobs([]);
      }

      if (results[1].status === 'fulfilled') {
        setHistoryStats(results[1].value);
      } else {
        // Not an error if no history exists yet
        setHistoryStats(null);
      }

      if (results[2].status === 'fulfilled') {
        setStorageStats(results[2].value);
      } else {
        // Not an error if no storage data exists yet
        setStorageStats(null);
      }

      // Only show error if ALL requests failed (indicates a real problem)
      const allFailed = results.every((r) => r.status === 'rejected');
      if (allFailed) {
        setError('Unable to load import data. Please check your connection and try again.');
        toast.error('Failed to load import data');
      }
    } catch (err) {
      if (signal?.aborted) return;
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      toast.error(message);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadData]);

  const getStatusIcon = (status: ImportJobStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'IN_PROGRESS':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Company selection required state
  if (needsCompanySelection) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold mb-2">Select a Company</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          Choose a company from the dropdown in the header to start importing products.
        </p>
      </div>
    );
  }

  // Error state
  if (error && !isLoading && recentJobs.length === 0) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button onClick={() => loadData()} variant="outline" className="min-h-[44px] touch-manipulation">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Import Products</h1>
          <p className="text-muted-foreground">
            Bring your products from any platform—we'll handle the heavy lifting
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/products/import/jobs')}
            aria-label="View import history"
            className="min-h-[44px] touch-manipulation"
          >
            <History className="mr-2 h-4 w-4" />
            See Past Imports
          </Button>
          <Button
            onClick={() => handleStartImport()}
            aria-label="Start a new product import"
            className="min-h-[44px] touch-manipulation"
          >
            <Plus className="mr-2 h-4 w-4" />
            Import Products
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{historyStats?.totalJobs ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {historyStats?.successfulJobs ?? 0} completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Added</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {historyStats?.totalProductsImported?.toLocaleString() ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg {formatDuration(historyStats?.avgJobDurationSeconds)} to complete
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images Stored</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {storageStats?.totalImages?.toLocaleString() ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Plus {storageStats?.totalThumbnails ?? 0} thumbnails
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {storageStats?.totalStorageFormatted ?? '0 B'}
                </div>
                {storageStats?.usagePercentage !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {storageStats.usagePercentage === 100
                      ? '100%'
                      : `${storageStats.usagePercentage.toFixed(1)}%`}{' '}
                    of limit
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Available Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Where Are Your Products?</CardTitle>
            <CardDescription>
              Pick your platform and start importing in seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleStartImport(provider.id)}
                className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Import from ${provider.name}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <img
                    src={provider.icon}
                    alt={`${provider.name} logo`}
                    className="h-6 w-6"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/integrations/default.svg';
                      target.alt = 'Integration logo';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-muted-foreground">{provider.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}

            {/* Coming Soon Providers */}
            {IMPORT_PROVIDERS.filter((p) => !p.isAvailable).slice(0, 2).map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-4 rounded-lg border border-dashed p-4 opacity-60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <img
                    src={provider.icon}
                    alt={`${provider.name} logo`}
                    className="h-6 w-6 grayscale"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/integrations/default.svg';
                      target.alt = 'Integration logo';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-muted-foreground">{provider.description}</div>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Imports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Latest Activity</CardTitle>
              <CardDescription>See what's been happening</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/products/import/jobs')}
              aria-label="View all import history"
              className="min-h-[44px] touch-manipulation"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Ready to bring in your products?</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                  Connect a platform below and watch your catalog fill up automatically
                </p>
                <Button
                  className="mt-4 min-h-[44px] touch-manipulation"
                  onClick={() => handleStartImport()}
                  aria-label="Import your first products"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Import Your First Products
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/products/import/jobs/${job.id}`}
                    className="flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${job.provider} import details`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {getStatusIcon(job.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{job.provider}</span>
                        <Badge variant={getStatusVariant(job.status)} className="text-xs">
                          {job.status.toLowerCase()}
                        </Badge>
                      </div>
                      <div
                        className="text-sm text-muted-foreground truncate"
                        title={`${job.importedCount} products added${job.errorCount > 0 ? `, ${job.errorCount} had issues` : ''}`}
                      >
                        {job.importedCount} products added
                        {job.errorCount > 0 && ` · ${job.errorCount} had issues`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(job.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring"
          onClick={() => handleStartImport()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleStartImport()}
          aria-label="Import more products"
        >
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-medium">Import More Products</div>
              <div className="text-sm text-muted-foreground">
                Sync your catalog from any platform
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring"
          onClick={() => router.push('/products/import/mappings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/products/import/mappings')}
          aria-label="Configure mapping settings"
        >
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
              <Settings2 className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="font-medium">Mapping Settings</div>
              <div className="text-sm text-muted-foreground">
                Customize how product data syncs
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring"
          onClick={() => router.push('/products/import/jobs')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/products/import/jobs')}
          aria-label="View import history"
        >
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="font-medium">Import History</div>
              <div className="text-sm text-muted-foreground">
                See everything you've imported
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Wizard Modal */}
      <ImportWizard />
    </div>
  );
}
