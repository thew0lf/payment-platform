'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building, Building2, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientsApi, ClientStats } from '@/lib/api/clients';
import { companiesApi, CompanyStats } from '@/lib/api/companies';

interface OrganizationOverviewProps {
  className?: string;
}

export function OrganizationOverview({ className }: OrganizationOverviewProps) {
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clients, companies] = await Promise.all([
        clientsApi.getStats(),
        companiesApi.getStats(),
      ]);
      setClientStats(clients);
      setCompanyStats(companies);
    } catch (err) {
      console.error('Failed to load organization stats:', err);
      setError('Failed to load organization stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className={cn('bg-card/50 border border-border rounded-xl p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Organization Overview</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-card/50 border border-border rounded-xl p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Organization Overview</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={fetchStats}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-card/50 border border-border rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Organization Overview</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Clients Card */}
        <Link
          href="/clients"
          className="group bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-400" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{clientStats?.totalClients || 0}</p>
            <p className="text-xs text-muted-foreground">Total Clients</p>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-green-400">{clientStats?.activeClients || 0} active</span>
            {clientStats?.clientsByPlan && Object.entries(clientStats.clientsByPlan).map(([plan, count]) => (
              <span key={plan} className="text-muted-foreground">
                {count} {plan.toLowerCase()}
              </span>
            ))}
          </div>
        </Link>

        {/* Companies Card */}
        <Link
          href="/companies"
          className="group bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{companyStats?.totalCompanies || 0}</p>
            <p className="text-xs text-muted-foreground">Total Companies</p>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-green-400">{companyStats?.activeCompanies || 0} active</span>
            {companyStats?.companiesByClient.slice(0, 2).map((item) => (
              <span key={item.clientId} className="text-muted-foreground truncate">
                {item.count} in {item.clientName}
              </span>
            ))}
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2">
        <Link
          href="/clients"
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Manage Clients →
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          href="/companies"
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Manage Companies →
        </Link>
      </div>
    </div>
  );
}
