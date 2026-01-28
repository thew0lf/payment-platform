'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  MessageSquare,
  DollarSign,
  Users,
  Clock,
  RefreshCw,
  Filter,
  Download,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';

// ============================================================================
// Types
// ============================================================================

interface CartRecoveryStats {
  totalAbandoned: number;
  totalRecovered: number;
  recoveryRate: number;
  revenueRecovered: number;
  averageCartValue: number;
  byChannel: {
    email: { attempts: number; recovered: number; rate: number };
    sms: { attempts: number; recovered: number; rate: number };
    voice: { attempts: number; recovered: number; rate: number };
    realtime: { attempts: number; recovered: number; rate: number };
  };
  byReason: { reason: string; count: number; recoveryRate: number }[];
  byStage: { stage: string; dropoff: number; conversion: number }[];
  timeline: { date: string; abandoned: number; recovered: number }[];
}

interface CartSaveAttempt {
  id: string;
  cartId: string;
  customerName: string;
  customerEmail: string;
  channel: 'EMAIL' | 'SMS' | 'VOICE' | 'REALTIME';
  currentStage: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'CONVERTED' | 'FAILED' | 'EXPIRED';
  diagnosedReason: string | null;
  cartValue: number;
  createdAt: string;
  completedAt: string | null;
}

// ============================================================================
// Mock Data (replace with API calls)
// ============================================================================

const MOCK_STATS: CartRecoveryStats = {
  totalAbandoned: 1247,
  totalRecovered: 412,
  recoveryRate: 33.0,
  revenueRecovered: 48960,
  averageCartValue: 118.83,
  byChannel: {
    email: { attempts: 892, recovered: 245, rate: 27.5 },
    sms: { attempts: 156, recovered: 52, rate: 33.3 },
    voice: { attempts: 89, recovered: 41, rate: 46.1 },
    realtime: { attempts: 423, recovered: 74, rate: 17.5 },
  },
  byReason: [
    { reason: 'PRICE_CONCERN', count: 423, recoveryRate: 38.2 },
    { reason: 'SHIPPING_CONCERN', count: 312, recoveryRate: 45.1 },
    { reason: 'JUST_BROWSING', count: 256, recoveryRate: 22.6 },
    { reason: 'COMPARING_OPTIONS', count: 142, recoveryRate: 31.0 },
    { reason: 'TRUST_CONCERN', count: 74, recoveryRate: 28.4 },
    { reason: 'TECHNICAL_ISSUE', count: 40, recoveryRate: 62.5 },
  ],
  byStage: [
    { stage: 'Browse Reminder', dropoff: 45, conversion: 8 },
    { stage: 'Pattern Interrupt', dropoff: 32, conversion: 12 },
    { stage: 'Diagnosis Survey', dropoff: 18, conversion: 15 },
    { stage: 'Branching Intervention', dropoff: 12, conversion: 22 },
    { stage: 'Nuclear Offer', dropoff: 8, conversion: 28 },
    { stage: 'Loss Visualization', dropoff: 5, conversion: 32 },
  ],
  timeline: [
    { date: '2025-01-20', abandoned: 42, recovered: 14 },
    { date: '2025-01-21', abandoned: 38, recovered: 11 },
    { date: '2025-01-22', abandoned: 51, recovered: 19 },
    { date: '2025-01-23', abandoned: 45, recovered: 16 },
    { date: '2025-01-24', abandoned: 39, recovered: 13 },
    { date: '2025-01-25', abandoned: 33, recovered: 10 },
    { date: '2025-01-26', abandoned: 47, recovered: 15 },
  ],
};

const MOCK_ATTEMPTS: CartSaveAttempt[] = [
  {
    id: '1',
    cartId: 'cart-1',
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    channel: 'EMAIL',
    currentStage: 'NUCLEAR_OFFER',
    status: 'IN_PROGRESS',
    diagnosedReason: 'PRICE_CONCERN',
    cartValue: 156.99,
    createdAt: '2025-01-27T10:30:00Z',
    completedAt: null,
  },
  {
    id: '2',
    cartId: 'cart-2',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah@example.com',
    channel: 'VOICE',
    currentStage: 'BRANCHING_INTERVENTION',
    status: 'CONVERTED',
    diagnosedReason: 'SHIPPING_CONCERN',
    cartValue: 89.50,
    createdAt: '2025-01-27T09:15:00Z',
    completedAt: '2025-01-27T09:28:00Z',
  },
  {
    id: '3',
    cartId: 'cart-3',
    customerName: 'Mike Wilson',
    customerEmail: 'mike@example.com',
    channel: 'REALTIME',
    currentStage: 'DIAGNOSIS_SURVEY',
    status: 'IN_PROGRESS',
    diagnosedReason: null,
    cartValue: 234.00,
    createdAt: '2025-01-27T11:45:00Z',
    completedAt: null,
  },
  {
    id: '4',
    cartId: 'cart-4',
    customerName: 'Emily Brown',
    customerEmail: 'emily@example.com',
    channel: 'SMS',
    currentStage: 'LOSS_VISUALIZATION',
    status: 'FAILED',
    diagnosedReason: 'COMPARING_OPTIONS',
    cartValue: 67.25,
    createdAt: '2025-01-26T16:20:00Z',
    completedAt: '2025-01-27T08:00:00Z',
  },
];

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  color?: 'default' | 'green' | 'blue' | 'orange' | 'purple';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'bg-muted text-foreground',
    green: 'bg-green-500/10 text-green-600',
    blue: 'bg-blue-500/10 text-blue-600',
    orange: 'bg-orange-500/10 text-orange-600',
    purple: 'bg-purple-500/10 text-purple-600',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

// ============================================================================
// Channel Performance Component
// ============================================================================

interface ChannelPerformanceProps {
  data: CartRecoveryStats['byChannel'];
}

function ChannelPerformance({ data }: ChannelPerformanceProps) {
  const channels = [
    { key: 'email', label: 'Email', icon: Mail, color: 'bg-blue-500' },
    { key: 'sms', label: 'SMS', icon: MessageSquare, color: 'bg-green-500' },
    { key: 'voice', label: 'Voice AI', icon: Phone, color: 'bg-purple-500' },
    { key: 'realtime', label: 'Real-time', icon: Zap, color: 'bg-orange-500' },
  ] as const;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Channel Performance</h3>
      <div className="space-y-4">
        {channels.map(({ key, label, icon: Icon, color }) => {
          const channelData = data[key];
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {channelData.rate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', color)}
                  style={{ width: `${channelData.rate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{channelData.attempts} attempts</span>
                <span>{channelData.recovered} recovered</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Reason Breakdown Component
// ============================================================================

interface ReasonBreakdownProps {
  data: CartRecoveryStats['byReason'];
}

function ReasonBreakdown({ data }: ReasonBreakdownProps) {
  const reasonLabels: Record<string, string> = {
    PRICE_CONCERN: 'Price Concern',
    SHIPPING_CONCERN: 'Shipping Concern',
    JUST_BROWSING: 'Just Browsing',
    COMPARING_OPTIONS: 'Comparing Options',
    TRUST_CONCERN: 'Trust Concern',
    TECHNICAL_ISSUE: 'Technical Issue',
    PRODUCT_UNCERTAINTY: 'Product Uncertainty',
    CHANGED_MIND: 'Changed Mind',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Abandonment Reasons</h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.reason} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-foreground">
                {reasonLabels[item.reason] || item.reason}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{item.count}</span>
              <span className={cn(
                'text-xs font-medium',
                item.recoveryRate > 40 ? 'text-green-600' :
                item.recoveryRate > 25 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {item.recoveryRate.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Stage Funnel Component
// ============================================================================

interface StageFunnelProps {
  data: CartRecoveryStats['byStage'];
}

function StageFunnel({ data }: StageFunnelProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Recovery Funnel</h3>
      <div className="space-y-2">
        {data.map((stage, index) => (
          <div key={stage.stage} className="flex items-center gap-3">
            <div className="w-32 text-xs text-muted-foreground truncate">{stage.stage}</div>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden flex">
              <div
                className="h-full bg-red-400"
                style={{ width: `${stage.dropoff}%` }}
                title={`${stage.dropoff}% dropoff`}
              />
              <div
                className="h-full bg-green-500"
                style={{ width: `${stage.conversion}%` }}
                title={`${stage.conversion}% conversion`}
              />
            </div>
            <div className="w-16 text-xs text-right">
              <span className="text-green-600 font-medium">{stage.conversion}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span className="text-xs text-muted-foreground">Dropoff</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-muted-foreground">Converted</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Active Attempts Table
// ============================================================================

interface ActiveAttemptsProps {
  attempts: CartSaveAttempt[];
}

function ActiveAttempts({ attempts }: ActiveAttemptsProps) {
  const statusConfig = {
    PENDING: { label: 'Pending', icon: Clock, color: 'text-muted-foreground bg-muted' },
    IN_PROGRESS: { label: 'In Progress', icon: RefreshCw, color: 'text-blue-600 bg-blue-500/10' },
    CONVERTED: { label: 'Converted', icon: CheckCircle, color: 'text-green-600 bg-green-500/10' },
    FAILED: { label: 'Failed', icon: XCircle, color: 'text-red-600 bg-red-500/10' },
    EXPIRED: { label: 'Expired', icon: AlertTriangle, color: 'text-orange-600 bg-orange-500/10' },
  };

  const channelIcons = {
    EMAIL: Mail,
    SMS: MessageSquare,
    VOICE: Phone,
    REALTIME: Zap,
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Active Recovery Attempts</h3>
        <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Channel</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Reason</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Cart Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((attempt) => {
              const status = statusConfig[attempt.status];
              const StatusIcon = status.icon;
              const ChannelIcon = channelIcons[attempt.channel];

              return (
                <tr key={attempt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{attempt.customerName}</div>
                      <div className="text-xs text-muted-foreground">{attempt.customerEmail}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{attempt.channel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">
                      {attempt.currentStage.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {attempt.diagnosedReason?.replace(/_/g, ' ') || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-foreground">
                      ${attempt.cartValue.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      status.color
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function CartRecoveryAnalyticsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [stats, setStats] = useState<CartRecoveryStats>(MOCK_STATS);
  const [attempts, setAttempts] = useState<CartSaveAttempt[]>(MOCK_ATTEMPTS);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  // In real implementation, fetch data from API
  useEffect(() => {
    // fetchCartRecoveryStats(selectedCompanyId, dateRange)
    // fetchActiveAttempts(selectedCompanyId)
  }, [selectedCompanyId, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Cart Recovery Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and optimize your abandoned cart recovery performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:border-blue-500 focus:outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="p-2 min-h-[44px] min-w-[44px] rounded-lg border border-border hover:bg-muted transition-colors touch-manipulation">
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Recovery Rate"
          value={`${stats.recoveryRate.toFixed(1)}%`}
          subtitle={`${stats.totalRecovered} of ${stats.totalAbandoned} carts`}
          icon={TrendingUp}
          color="green"
          trend={{ value: 4.2, isPositive: true }}
        />
        <StatCard
          title="Revenue Recovered"
          value={formatCurrency(stats.revenueRecovered)}
          subtitle="This period"
          icon={DollarSign}
          color="blue"
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Avg Cart Value"
          value={formatCurrency(stats.averageCartValue)}
          subtitle="Recovered carts"
          icon={ShoppingCart}
          color="purple"
        />
        <StatCard
          title="Active Recoveries"
          value={attempts.filter(a => a.status === 'IN_PROGRESS').length}
          subtitle="In progress now"
          icon={Users}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChannelPerformance data={stats.byChannel} />
        <ReasonBreakdown data={stats.byReason} />
        <StageFunnel data={stats.byStage} />
      </div>

      {/* Active Attempts Table */}
      <ActiveAttempts attempts={attempts} />
    </div>
  );
}
