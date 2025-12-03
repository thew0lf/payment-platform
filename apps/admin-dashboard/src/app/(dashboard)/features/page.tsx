'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  AlertTriangle,
  GitBranch,
  CheckCircle2,
  Clock,
  Users,
  Bug,
  ChevronRight,
  MessageSquare,
  Shield,
  Lock,
  FileCheck2,
  Code,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  featuresApi,
  Feature,
  FeatureStatus,
  FeatureStats,
  FeatureQuery,
  STATUS_CONFIG,
  SEVERITY_CONFIG,
} from '@/lib/api/features';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: FeatureStatus.DEVELOPMENT, label: 'Development' },
  // Code Review Phase
  { value: FeatureStatus.READY_FOR_REVIEW, label: 'Ready for Review' },
  { value: FeatureStatus.CODE_REVIEW, label: 'Code Review' },
  { value: FeatureStatus.REVIEW_FIXING, label: 'Review Fixing' },
  // QA Phase
  { value: FeatureStatus.READY_FOR_QA, label: 'Ready for QA' },
  { value: FeatureStatus.QA_IN_PROGRESS, label: 'QA In Progress' },
  { value: FeatureStatus.SR_REVIEW, label: 'Senior Review' },
  { value: FeatureStatus.QUESTIONS_READY, label: 'Questions Ready' },
  { value: FeatureStatus.AWAITING_ANSWERS, label: 'Awaiting Answers' },
  { value: FeatureStatus.SR_FIXING, label: 'Fixing Issues' },
  { value: FeatureStatus.READY_FOR_RETEST, label: 'Ready for Retest' },
  { value: FeatureStatus.APPROVED, label: 'Approved' },
  { value: FeatureStatus.MERGED, label: 'Merged' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: FeatureStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
      config.bgColor,
      config.color
    )}>
      {config.label}
    </span>
  );
}

function PipelineCard({
  title,
  value,
  icon: Icon,
  color = 'cyan',
  href,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'cyan' | 'yellow' | 'green' | 'purple' | 'red' | 'blue' | 'orange';
  href?: string;
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  const content = (
    <div className={cn(
      'bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 transition-all',
      href && 'hover:border-zinc-700 cursor-pointer hover:bg-zinc-900/80'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={cn('p-2.5 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function NeedsAttentionCard({ feature }: { feature: Feature }) {
  const router = useRouter();
  const isQuestionsReady = feature.status === FeatureStatus.QUESTIONS_READY || feature.status === FeatureStatus.AWAITING_ANSWERS;
  const isApproved = feature.status === FeatureStatus.APPROVED;

  return (
    <div
      onClick={() => router.push(`/features/${feature.id}`)}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isQuestionsReady && <MessageSquare className="w-4 h-4 text-red-400" />}
          {isApproved && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          <span className="text-sm font-medium text-white">{feature.code}</span>
        </div>
        <StatusBadge status={feature.status as FeatureStatus} />
      </div>
      <h4 className="text-sm text-zinc-300 mb-2 line-clamp-1">{feature.name}</h4>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          {feature.branch}
        </span>
        {isQuestionsReady && feature.reviewQuestions && (
          <span className="text-red-400">
            {feature.reviewQuestions.filter(q => !q.answer).length} questions
          </span>
        )}
        {isApproved && (
          <span className="text-green-400">Ready to merge</span>
        )}
      </div>
    </div>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  const router = useRouter();

  return (
    <tr
      className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
      onClick={() => router.push(`/features/${feature.id}`)}
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <GitBranch className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{feature.code}</p>
            <p className="text-xs text-zinc-500">{feature.branch}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm text-zinc-300 line-clamp-1 max-w-xs">{feature.name}</p>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={feature.status as FeatureStatus} />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400">{feature.issuesResolved}</span>
          <span className="text-zinc-600">/</span>
          <span className={cn(
            feature.issuesFound > feature.issuesResolved ? 'text-red-400' : 'text-zinc-400'
          )}>
            {feature.issuesFound}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm text-zinc-400">
          {feature.qaRounds > 0 ? `Round ${feature.qaRounds}` : '-'}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm text-zinc-500">
          {new Date(feature.updatedAt).toLocaleDateString()}
        </span>
      </td>
      <td className="px-4 py-4">
        <ChevronRight className="w-4 h-4 text-zinc-600" />
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function FeaturesPage() {
  const { accessLevel } = useHierarchy();
  const router = useRouter();

  // State
  const [features, setFeatures] = useState<Feature[]>([]);
  const [needsAttention, setNeedsAttention] = useState<Feature[]>([]);
  const [stats, setStats] = useState<FeatureStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Check if user has access (org-only)
  const hasAccess = accessLevel === 'ORGANIZATION';

  const fetchData = useCallback(async () => {
    if (!hasAccess) return;

    setLoading(true);
    setError(null);

    try {
      const query: FeatureQuery = {
        limit: PAGE_SIZE,
        offset,
      };

      if (search) query.search = search;
      if (statusFilter) query.status = statusFilter;

      const [featuresResult, statsResult, attentionResult] = await Promise.all([
        featuresApi.list(query),
        featuresApi.getStats(),
        featuresApi.getNeedsAttention(),
      ]);

      setFeatures(featuresResult.features);
      setTotal(featuresResult.total);
      setStats(statsResult);
      setNeedsAttention(attentionResult);
    } catch (err) {
      console.error('Failed to fetch features:', err);
      setError('Failed to load features. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasAccess, search, statusFilter, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [search, statusFilter]);

  // Access denied view
  if (!hasAccess) {
    return (
      <>
        <Header title="Features" />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Lock className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Access Restricted</h3>
            <p className="text-sm text-zinc-500 max-w-md">
              The Feature Management system is only available to organization administrators.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Feature Development"
        subtitle={loading ? 'Loading...' : `${total} features in pipeline`}
        actions={
          <Button size="sm" onClick={() => router.push('/features/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Feature
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Pipeline Stats - Code Review Phase */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Code Review Phase</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PipelineCard
              title="Development"
              value={stats?.pipeline.development || 0}
              icon={GitBranch}
              color="blue"
            />
            <PipelineCard
              title="Ready for Review"
              value={stats?.pipeline.readyForReview || 0}
              icon={FileCheck2}
              color="purple"
            />
            <PipelineCard
              title="Code Review"
              value={stats?.pipeline.codeReview || 0}
              icon={Code}
              color="purple"
            />
            <PipelineCard
              title="Review Fixing"
              value={stats?.pipeline.reviewFixing || 0}
              icon={Wrench}
              color="purple"
            />
          </div>
        </div>

        {/* Pipeline Stats - QA Phase */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">QA Phase</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <PipelineCard
              title="Ready for QA"
              value={stats?.pipeline.readyForQA || 0}
              icon={Clock}
              color="cyan"
            />
            <PipelineCard
              title="QA In Progress"
              value={stats?.pipeline.qaInProgress || 0}
              icon={Bug}
              color="yellow"
            />
            <PipelineCard
              title="Senior Review"
              value={stats?.pipeline.srReview || 0}
              icon={Users}
              color="purple"
            />
            <PipelineCard
              title="Questions"
              value={stats?.pipeline.questionsReady || 0}
              icon={MessageSquare}
              color="red"
            />
            <PipelineCard
              title="Fixing"
              value={stats?.pipeline.fixing || 0}
              icon={Shield}
              color="orange"
            />
            <PipelineCard
              title="Approved"
              value={stats?.pipeline.approved || 0}
              icon={CheckCircle2}
              color="green"
            />
            <PipelineCard
              title="Merged"
              value={stats?.pipeline.merged || 0}
              icon={GitBranch}
              color="cyan"
            />
          </div>
        </div>

        {/* Needs Attention Section */}
        {needsAttention.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-medium text-yellow-400">Needs Attention</h2>
              <span className="text-xs text-zinc-500">({needsAttention.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {needsAttention.slice(0, 6).map((feature) => (
                <NeedsAttentionCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by code, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  showFilters
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                )}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {statusFilter && <span className="w-2 h-2 bg-cyan-400 rounded-full" />}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchData}
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FeatureStatus | '')}
                  className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {statusFilter && (
                <button
                  onClick={() => setStatusFilter('')}
                  className="mt-5 px-3 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && features.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && features.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitBranch className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No features found</h3>
            <p className="text-sm text-zinc-500 max-w-md">
              {search || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Create your first feature to get started with the development workflow.'}
            </p>
            {!search && !statusFilter && (
              <Button className="mt-4" onClick={() => router.push('/features/new')}>
                <Plus className="w-4 h-4 mr-2" />
                New Feature
              </Button>
            )}
          </div>
        )}

        {/* Features Table */}
        {features.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Feature</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Issues</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">QA Rounds</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Updated</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {features.map((feature) => (
                    <FeatureRow key={feature.id} feature={feature} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <p className="text-sm text-zinc-500">
                  Showing {offset + 1} to {Math.min(offset + PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={offset + PAGE_SIZE >= total}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Issue Statistics */}
        {stats && (Object.keys(stats.issuesByCategory).length > 0 || Object.keys(stats.issuesBySeverity).length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issues by Severity */}
            {Object.keys(stats.issuesBySeverity).length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-4">Issues by Severity</h3>
                <div className="space-y-3">
                  {Object.entries(stats.issuesBySeverity).map(([severity, count]) => {
                    const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG];
                    const maxCount = Math.max(...Object.values(stats.issuesBySeverity));
                    const percentage = (count / maxCount) * 100;

                    return (
                      <div key={severity} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={config?.color || 'text-zinc-400'}>{config?.label || severity}</span>
                          <span className="text-zinc-400">{count}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', config?.bgColor || 'bg-zinc-600')}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Issues by Category */}
            {Object.keys(stats.issuesByCategory).length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-4">Issues by Category</h3>
                <div className="space-y-3">
                  {Object.entries(stats.issuesByCategory).map(([category, count]) => {
                    const maxCount = Math.max(...Object.values(stats.issuesByCategory));
                    const percentage = (count / maxCount) * 100;

                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-300">{category.replace(/_/g, ' ')}</span>
                          <span className="text-zinc-400">{count}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500/50 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
