'use client';

/**
 * Import Jobs History Page
 *
 * Shows list of all past import jobs with filtering and pagination.
 * Features:
 * - Filter by status and provider
 * - Search by provider name
 * - Pagination
 * - Quick actions (retry, view details)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  RotateCcw,
  ExternalLink,
  Calendar,
  Package,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Upload,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productImportApi,
  type ImportJob,
  type ImportJobStatus,
  type ListImportJobsParams,
  IMPORT_PROVIDERS,
  getStatusVariant,
  formatDuration,
  getProvider,
} from '@/lib/api/product-import';

const ITEMS_PER_PAGE = 10;

// Status filter options
const STATUS_OPTIONS: { value: ImportJobStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ImportJobsPage() {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();

  // Check if company selection is required
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // State
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [isLoading, setIsLoading] = useState(!needsCompanySelection);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ImportJobStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // Load jobs
  const loadJobs = useCallback(async () => {
    // Skip loading if no company selected
    if (!selectedCompanyId) {
      setIsLoading(false);
      setJobs([]);
      setTotalJobs(0);
      return;
    }

    setIsLoading(true);

    try {
      const params: ListImportJobsParams = {
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (providerFilter !== 'all') {
        params.provider = providerFilter;
      }

      const response = await productImportApi.listJobs(params, selectedCompanyId);
      setJobs(response.items);
      setTotalJobs(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load import jobs';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, statusFilter, providerFilter, page]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [statusFilter, providerFilter]);

  // Retry a failed job
  const handleRetry = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsRetrying(jobId);
    try {
      await productImportApi.retryJob(jobId, selectedCompanyId || undefined);
      toast.success('Import job restarted');
      loadJobs();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry import';
      toast.error(message);
    } finally {
      setIsRetrying(null);
    }
  };

  // Get status icon
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

  // Format date/time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  // Calculate duration
  const getJobDuration = (job: ImportJob) => {
    if (!job.startedAt) return null;
    const endTime = job.completedAt ? new Date(job.completedAt) : new Date();
    const startTime = new Date(job.startedAt);
    const seconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    return formatDuration(seconds);
  };

  const totalPages = Math.ceil(totalJobs / ITEMS_PER_PAGE);
  const availableProviders = IMPORT_PROVIDERS.filter((p) => p.isAvailable);

  // Show company selection required message
  if (needsCompanySelection) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/products/import')}
            aria-label="Back to import"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Import History</h1>
            <p className="text-muted-foreground">
              Track all your product imports in one place
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl md:text-2xl font-semibold">Select a Company</h2>
              <p className="mt-2 text-muted-foreground max-w-md">
                Choose a company from the dropdown in the header to view import history.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/products/import')}
            aria-label="Back to import"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Import History</h1>
            <p className="text-muted-foreground">
              Track all your product imports in one place
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadJobs} disabled={isLoading} className="min-h-[44px] touch-manipulation">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push('/products/import')} className="min-h-[44px] touch-manipulation">
            <Plus className="mr-2 h-4 w-4" />
            New Import
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters:
            </div>
            <div className="flex flex-1 flex-wrap gap-3">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ImportJobStatus | 'all')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(statusFilter !== 'all' || providerFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setProviderFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No imports found</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                {statusFilter !== 'all' || providerFilter !== 'all'
                  ? 'Try adjusting your filters or start a new import'
                  : 'Start importing products to see your history here'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/products/import')}>
                <Plus className="mr-2 h-4 w-4" />
                Import Products
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Images</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => {
                      const provider = getProvider(job.provider);
                      const { date, time } = formatDateTime(job.createdAt);
                      const duration = getJobDuration(job);

                      return (
                        <TableRow
                          key={job.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/products/import/jobs/${job.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                                {provider?.icon ? (
                                  <img
                                    src={provider.icon}
                                    alt=""
                                    className="h-5 w-5"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="font-medium capitalize">{job.provider}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(job.status)}
                              <Badge variant={getStatusVariant(job.status)} className="capitalize">
                                {job.status.toLowerCase()}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{job.importedCount}</span>
                              {job.skippedCount > 0 && (
                                <span className="text-muted-foreground">
                                  (+{job.skippedCount} skipped)
                                </span>
                              )}
                            </div>
                            {job.errorCount > 0 && (
                              <span className="text-xs text-destructive">
                                {job.errorCount} errors
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{job.processedImages}/{job.totalImages}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {duration ? (
                              <span className="text-muted-foreground">{duration}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{date}</span>
                              <span className="text-xs text-muted-foreground">{time}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {job.status === 'FAILED' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleRetry(job.id, e)}
                                  disabled={isRetrying === job.id}
                                  aria-label="Retry import"
                                >
                                  {isRetrying === job.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/products/import/jobs/${job.id}`);
                                }}
                                aria-label="View details"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {jobs.map((job) => {
                  const provider = getProvider(job.provider);
                  const { date, time } = formatDateTime(job.createdAt);
                  const duration = getJobDuration(job);

                  return (
                    <Link
                      key={job.id}
                      href={`/products/import/jobs/${job.id}`}
                      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            {provider?.icon ? (
                              <img
                                src={provider.icon}
                                alt=""
                                className="h-6 w-6"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{job.provider}</span>
                              <Badge variant={getStatusVariant(job.status)} className="capitalize text-xs">
                                {job.status.toLowerCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {date} at {time}
                            </div>
                          </div>
                        </div>
                        {getStatusIcon(job.status)}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Products</div>
                          <div className="font-medium">{job.importedCount}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Images</div>
                          <div className="font-medium">{job.processedImages}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration</div>
                          <div className="font-medium">{duration || '-'}</div>
                        </div>
                      </div>

                      {job.errorCount > 0 && (
                        <div className="mt-2 text-xs text-destructive">
                          {job.errorCount} error{job.errorCount !== 1 ? 's' : ''} occurred
                        </div>
                      )}

                      {job.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={(e) => handleRetry(job.id, e)}
                          disabled={isRetrying === job.id}
                        >
                          {isRetrying === job.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-2 h-4 w-4" />
                          )}
                          Retry Import
                        </Button>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min((page + 1) * ITEMS_PER_PAGE, totalJobs)} of {totalJobs}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
