'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { gatewayRiskApi, MerchantRiskProfile, ChargebackRecord } from '@/lib/api/gateway-risk';
import { toast } from 'sonner';

export default function GatewayRiskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMerchants: 0,
    pendingReview: 0,
    highRisk: 0,
    suspended: 0,
  });
  const [profilesRequiringReview, setProfilesRequiringReview] = useState<MerchantRiskProfile[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<ChargebackRecord[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [merchantsResult, reviewProfiles, deadlines] = await Promise.all([
        gatewayRiskApi.listMerchantProfiles({ take: 1 }),
        gatewayRiskApi.getProfilesRequiringReview(),
        gatewayRiskApi.getChargebacksApproachingDeadline(7),
      ]);

      // Get counts for different statuses
      const [highRiskResult, suspendedResult, pendingResult] = await Promise.all([
        gatewayRiskApi.listMerchantProfiles({ riskLevel: 'HIGH' as any, take: 1 }),
        gatewayRiskApi.listMerchantProfiles({ accountStatus: 'SUSPENDED' as any, take: 1 }),
        gatewayRiskApi.listMerchantProfiles({ accountStatus: 'PENDING_REVIEW' as any, take: 1 }),
      ]);

      setStats({
        totalMerchants: merchantsResult.total,
        pendingReview: pendingResult.total,
        highRisk: highRiskResult.total,
        suspended: suspendedResult.total,
      });
      setProfilesRequiringReview(reviewProfiles.slice(0, 5));
      setUpcomingDeadlines(deadlines.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load risk management data');
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

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gateway Risk Management</h1>
          <p className="text-muted-foreground">
            Monitor merchant risk profiles, chargebacks, and reserves
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/gateway-risk/merchants')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMerchants}</div>
            <p className="text-xs text-muted-foreground">Active risk profiles</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/gateway-risk/merchants?status=PENDING_REVIEW')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/gateway-risk/merchants?riskLevel=HIGH')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highRisk}</div>
            <p className="text-xs text-muted-foreground">Require monitoring</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/gateway-risk/merchants?status=SUSPENDED')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspended}</div>
            <p className="text-xs text-muted-foreground">Processing halted</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/gateway-risk/merchants')}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold">Merchant Profiles</h3>
                <p className="text-sm text-muted-foreground">Manage risk profiles</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/gateway-risk/chargebacks')}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <h3 className="font-semibold">Chargebacks</h3>
                <p className="text-sm text-muted-foreground">Track & respond</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/gateway-risk/reserves')}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h3 className="font-semibold">Reserves</h3>
                <p className="text-sm text-muted-foreground">Manage holds</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profiles Requiring Review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profiles Requiring Review</CardTitle>
            <CardDescription>Merchants that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {profilesRequiringReview.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No profiles require review at this time
              </p>
            ) : (
              <div className="space-y-4">
                {profilesRequiringReview.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/gateway-risk/merchants/${profile.clientId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{profile.client?.name || profile.clientId}</p>
                        <p className="text-sm text-muted-foreground">
                          {profile.mccCode ? `MCC: ${profile.mccCode}` : 'No MCC'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={riskLevelColor(profile.riskLevel)}>
                        {profile.riskLevel}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {profilesRequiringReview.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/gateway-risk/merchants?requiresReview=true')}
                  >
                    View All
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Chargeback Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Chargeback Deadlines</CardTitle>
            <CardDescription>Chargebacks requiring response within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No chargebacks approaching deadline
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((chargeback) => (
                  <div
                    key={chargeback.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/gateway-risk/chargebacks/${chargeback.id}`)}
                  >
                    <div>
                      <p className="font-medium">{chargeback.chargebackId}</p>
                      <p className="text-sm text-muted-foreground">
                        ${(chargeback.amount / 100).toFixed(2)} - {chargeback.reason}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        {chargeback.respondByDate
                          ? new Date(chargeback.respondByDate).toLocaleDateString()
                          : 'No deadline'}
                      </p>
                      <p className="text-xs text-muted-foreground">Response due</p>
                    </div>
                  </div>
                ))}
                {upcomingDeadlines.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/gateway-risk/chargebacks')}
                  >
                    View All Chargebacks
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
