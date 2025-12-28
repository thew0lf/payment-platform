'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Search,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Shield,
  RefreshCw,
} from 'lucide-react';
import {
  gatewayRiskApi,
  MerchantRiskProfile,
  ReserveSummary,
  ReserveTransactionType,
} from '@/lib/api/gateway-risk';
import { toast } from 'sonner';

interface MerchantReserveSummary extends MerchantRiskProfile {
  reserveSummary?: ReserveSummary;
}

export default function ReservesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<MerchantReserveSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingReleases, setProcessingReleases] = useState(false);

  useEffect(() => {
    loadMerchants();
  }, []);

  async function loadMerchants() {
    setLoading(true);
    try {
      // Get all merchant profiles
      const result = await gatewayRiskApi.listMerchantProfiles({ take: 100 });

      // Load reserve summaries for each merchant
      const merchantsWithReserves = await Promise.all(
        result.items.map(async (merchant) => {
          try {
            const reserveSummary = await gatewayRiskApi.getReserveSummary(merchant.id);
            return { ...merchant, reserveSummary };
          } catch {
            return { ...merchant, reserveSummary: undefined };
          }
        })
      );

      // Filter to only show merchants with reserves
      setMerchants(
        merchantsWithReserves.filter(
          (m) => m.reserveSummary && m.reserveSummary.currentBalance > 0
        )
      );
    } catch (error) {
      console.error('Failed to load merchants:', error);
      toast.error('Failed to load reserve data');
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessScheduledReleases() {
    setProcessingReleases(true);
    try {
      const result = await gatewayRiskApi.processScheduledReleases();
      toast.success(`Processed ${result.processed} of ${result.total} scheduled releases`);
      loadMerchants();
    } catch (error) {
      console.error('Failed to process releases:', error);
      toast.error('Failed to process scheduled releases');
    } finally {
      setProcessingReleases(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const filteredMerchants = merchants.filter((merchant) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      merchant.client?.name?.toLowerCase().includes(query) ||
      merchant.clientId.toLowerCase().includes(query)
    );
  });

  // Calculate totals
  const totalReserved = merchants.reduce(
    (sum, m) => sum + (m.reserveSummary?.currentBalance || 0),
    0
  );
  const totalPending = merchants.reduce(
    (sum, m) => sum + (m.reserveSummary?.pendingReleaseAmount || 0),
    0
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reserve Management</h1>
          <p className="text-muted-foreground">Monitor and manage merchant rolling reserves</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleProcessScheduledReleases} disabled={processingReleases}>
            {processingReleases ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Process Releases
          </Button>
          <Button onClick={() => router.push('/gateway-risk')}>
            <Shield className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Reserved</span>
            </div>
            <p className="text-2xl font-bold mt-2">{formatCurrency(totalReserved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Pending Release</span>
            </div>
            <p className="text-2xl font-bold mt-2">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Merchants with Reserves</span>
            </div>
            <p className="text-2xl font-bold mt-2">{merchants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Avg Reserve per Merchant</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {merchants.length > 0 ? formatCurrency(totalReserved / merchants.length) : '$0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant name or client ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Reserves</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredMerchants.length} merchants with active reserves`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No reserves found</h3>
              <p className="text-muted-foreground">
                No merchants have active reserve balances
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Total Held</TableHead>
                      <TableHead>Total Released</TableHead>
                      <TableHead>Pending Releases</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMerchants.map((merchant) => (
                      <TableRow
                        key={merchant.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          router.push(`/gateway-risk/reserves/${merchant.id}`)
                        }
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {merchant.client?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {merchant.clientId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(merchant.reserveSummary?.currentBalance || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(merchant.reserveSummary?.totalHeld || 0)}
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600 dark:text-green-400">
                            {formatCurrency(merchant.reserveSummary?.totalReleased || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{merchant.reserveSummary?.pendingReleases || 0} pending</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(
                                merchant.reserveSummary?.pendingReleaseAmount || 0
                              )}
                            </p>
                          </div>
                        </TableCell>
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
                {filteredMerchants.map((merchant) => (
                  <div
                    key={merchant.id}
                    className="py-4 cursor-pointer active:bg-muted/50"
                    onClick={() =>
                      router.push(`/gateway-risk/reserves/${merchant.id}`)
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {merchant.client?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {merchant.clientId}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Balance</p>
                        <p className="font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(merchant.reserveSummary?.currentBalance || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p>
                          {formatCurrency(
                            merchant.reserveSummary?.pendingReleaseAmount || 0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
