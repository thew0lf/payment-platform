'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Shield,
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  gatewayRiskApi,
  MerchantRiskProfile,
  MerchantRiskLevel,
  MerchantAccountStatus,
} from '@/lib/api/gateway-risk';
import { toast } from 'sonner';

export default function MerchantProfilesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<MerchantRiskProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  // Filters
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>(
    searchParams?.get('riskLevel') || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams?.get('status') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProfiles();
  }, [page, riskLevelFilter, statusFilter]);

  async function loadProfiles() {
    setLoading(true);
    try {
      const params: {
        skip: number;
        take: number;
        riskLevel?: MerchantRiskLevel;
        accountStatus?: MerchantAccountStatus;
      } = {
        skip: page * pageSize,
        take: pageSize,
      };

      if (riskLevelFilter !== 'all') {
        params.riskLevel = riskLevelFilter as MerchantRiskLevel;
      }
      if (statusFilter !== 'all') {
        params.accountStatus = statusFilter as MerchantAccountStatus;
      }

      const result = await gatewayRiskApi.listMerchantProfiles(params);
      setProfiles(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load merchant profiles:', error);
      toast.error('Failed to load merchant profiles');
    } finally {
      setLoading(false);
    }
  }

  const riskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'STANDARD':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'ELEVATED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'VERY_HIGH':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'SUSPENDED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING_REVIEW':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'UNDER_REVIEW':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'SUSPENDED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'TERMINATED':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const filteredProfiles = profiles.filter((profile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.client?.name?.toLowerCase().includes(query) ||
      profile.clientId.toLowerCase().includes(query) ||
      profile.mccCode?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Merchant Risk Profiles</h1>
          <p className="text-muted-foreground">
            Manage merchant risk assessments and account statuses
          </p>
        </div>
        <Button onClick={() => router.push('/gateway-risk')}>
          <Shield className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, client ID, or MCC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="ELEVATED">Elevated</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="VERY_HIGH">Very High</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Profiles</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${total} total profiles`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No profiles found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>MCC</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Chargeback Ratio</TableHead>
                      <TableHead>Total Processed</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow
                        key={profile.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/gateway-risk/merchants/${profile.clientId}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{profile.client?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{profile.clientId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm">{profile.mccCode || '-'}</p>
                            {profile.isHighRiskMCC && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                High-Risk MCC
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={riskLevelColor(profile.riskLevel)}>
                            {profile.riskLevel.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcon(profile.accountStatus)}
                            <span className="text-sm">
                              {profile.accountStatus.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              profile.chargebackRatio > 0.01
                                ? 'text-red-600 font-medium'
                                : profile.chargebackRatio > 0.005
                                  ? 'text-yellow-600'
                                  : ''
                            }
                          >
                            {(profile.chargebackRatio * 100).toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(profile.totalProcessed))}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="py-4 cursor-pointer active:bg-muted/50"
                    onClick={() => router.push(`/gateway-risk/merchants/${profile.clientId}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{profile.client?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{profile.clientId}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={riskLevelColor(profile.riskLevel)}>
                        {profile.riskLevel.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm">
                        {statusIcon(profile.accountStatus)}
                        <span>{profile.accountStatus.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                      <span>CB Ratio: {(profile.chargebackRatio * 100).toFixed(2)}%</span>
                      <span>Processed: {formatCurrency(Number(profile.totalProcessed))}</span>
                    </div>
                  </div>
                ))}
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
