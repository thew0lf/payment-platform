'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  AlertCircle,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
} from 'lucide-react';
import { gatewayRiskApi, ChargebackRecord, ChargebackStatus } from '@/lib/api/gateway-risk';
import { toast } from 'sonner';

export default function ChargebacksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chargebacks, setChargebacks] = useState<ChargebackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadChargebacks();
  }, [page, statusFilter]);

  async function loadChargebacks() {
    setLoading(true);
    try {
      const params: {
        skip: number;
        take: number;
        status?: ChargebackStatus;
      } = {
        skip: page * pageSize,
        take: pageSize,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter as ChargebackStatus;
      }

      const result = await gatewayRiskApi.listChargebacks(params);
      setChargebacks(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load chargebacks:', error);
      toast.error('Failed to load chargebacks');
    } finally {
      setLoading(false);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'REPRESENTMENT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'WON':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'LOST':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'ACCEPTED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'UNDER_REVIEW':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'REPRESENTMENT':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'WON':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'LOST':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilDeadline = (deadline: string | undefined) => {
    if (!deadline) return null;
    const days = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const filteredChargebacks = chargebacks.filter((cb) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cb.chargebackId.toLowerCase().includes(query) ||
      cb.transactionId?.toLowerCase().includes(query) ||
      cb.reason.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chargeback Management</h1>
          <p className="text-muted-foreground">Track and respond to chargebacks</p>
        </div>
        <Button onClick={() => router.push('/gateway-risk')}>
          <Shield className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Open</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {chargebacks.filter((cb) =>
                ['RECEIVED', 'UNDER_REVIEW', 'REPRESENTMENT'].includes(cb.status)
              ).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Won</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {chargebacks.filter((cb) => cb.status === 'WON').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Lost</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {chargebacks.filter((cb) => cb.status === 'LOST').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Due Soon</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {
                chargebacks.filter((cb) => {
                  const days = getDaysUntilDeadline(cb.respondByDate);
                  return days !== null && days >= 0 && days <= 7;
                }).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by chargeback ID, transaction, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="REPRESENTMENT">Representment</SelectItem>
                <SelectItem value="WON">Won</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Chargebacks</CardTitle>
          <CardDescription>{loading ? 'Loading...' : `${total} total chargebacks`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredChargebacks.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No chargebacks found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chargeback ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChargebacks.map((cb) => {
                      const daysUntil = getDaysUntilDeadline(cb.respondByDate);
                      return (
                        <TableRow
                          key={cb.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/gateway-risk/chargebacks/${cb.id}`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-mono text-sm">{cb.chargebackId}</p>
                              {cb.transactionId && (
                                <p className="text-xs text-muted-foreground">
                                  TXN: {cb.transactionId}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCurrency(cb.amount)}</p>
                              <p className="text-xs text-muted-foreground">
                                Fee: {formatCurrency(cb.fee)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <p className="truncate">{cb.reason}</p>
                              {cb.reasonCode && (
                                <p className="text-xs text-muted-foreground">
                                  Code: {cb.reasonCode}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {statusIcon(cb.status)}
                              <Badge className={statusColor(cb.status)}>{cb.status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(cb.receivedAt)}</TableCell>
                          <TableCell>
                            {cb.respondByDate ? (
                              <div
                                className={
                                  daysUntil !== null && daysUntil <= 3
                                    ? 'text-red-600 font-medium'
                                    : daysUntil !== null && daysUntil <= 7
                                      ? 'text-orange-600'
                                      : ''
                                }
                              >
                                {formatDate(cb.respondByDate)}
                                {daysUntil !== null && daysUntil >= 0 && (
                                  <span className="text-xs ml-1">({daysUntil}d)</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {filteredChargebacks.map((cb) => {
                  const daysUntil = getDaysUntilDeadline(cb.respondByDate);
                  return (
                    <div
                      key={cb.id}
                      className="py-4 cursor-pointer active:bg-muted/50"
                      onClick={() => router.push(`/gateway-risk/chargebacks/${cb.id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-mono text-sm">{cb.chargebackId}</p>
                          <p className="font-medium">{formatCurrency(cb.amount)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">{cb.reason}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          {statusIcon(cb.status)}
                          <Badge className={statusColor(cb.status)}>{cb.status}</Badge>
                        </div>
                        {cb.respondByDate && daysUntil !== null && daysUntil >= 0 && (
                          <span
                            className={`text-xs ${
                              daysUntil <= 3
                                ? 'text-red-600 font-medium'
                                : daysUntil <= 7
                                  ? 'text-orange-600'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            Due in {daysUntil} days
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of{' '}
                    {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={(page + 1) * pageSize >= total}
                    >
                      Next
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
