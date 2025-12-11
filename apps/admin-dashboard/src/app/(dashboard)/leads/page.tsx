'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Eye,
  Loader2,
  ChevronDown,
  X,
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { formatDate, cn } from '@/lib/utils';
import {
  leadsApi,
  Lead,
  LeadStatus,
  LeadSource,
  LeadStats,
  leadStatusConfig,
  leadSourceConfig,
  formatLeadName,
  getLeadLocation,
} from '@/lib/api/leads';

// Status filter options
const statusOptions: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ANONYMOUS', label: 'Anonymous' },
  { value: 'IDENTIFIED', label: 'Identified' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'ABANDONED', label: 'Abandoned' },
  { value: 'NURTURING', label: 'Nurturing' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
];

// Source filter options
const sourceOptions: { value: LeadSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'FUNNEL', label: 'Funnel' },
  { value: 'LANDING_PAGE', label: 'Landing Page' },
  { value: 'CHECKOUT_ABANDON', label: 'Checkout Abandon' },
  { value: 'FORM', label: 'Form' },
  { value: 'IMPORT', label: 'Import' },
  { value: 'API', label: 'API' },
  { value: 'MANUAL', label: 'Manual' },
];

// Sort options
const sortOptions = [
  { value: 'lastSeenAt', label: 'Last Seen' },
  { value: 'engagementScore', label: 'Engagement' },
  { value: 'intentScore', label: 'Intent' },
  { value: 'estimatedValue', label: 'Value' },
] as const;

export default function LeadsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]['value']>('lastSeenAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Refs for click-outside handling
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setShowSourceDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsResponse, statsResponse] = await Promise.all([
        leadsApi.list(
          {
            status: statusFilter !== 'all' ? statusFilter : undefined,
            source: sourceFilter !== 'all' ? sourceFilter : undefined,
            search: search || undefined,
            orderBy: sortBy,
            order: sortOrder,
            limit: 50,
            offset: 0,
          },
          selectedCompanyId || undefined
        ),
        leadsApi.getStats(selectedCompanyId || undefined),
      ]);

      setLeads(leadsResponse.leads || []);
      setTotal(leadsResponse.total || 0);
      setStats(statsResponse);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, sortBy, sortOrder, selectedCompanyId]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchLeads]);

  // Format score as percentage bar
  const ScoreBar = ({ score, label }: { score: number; label: string }) => (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-gray-400'
          )}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
        {Math.round(score * 100)}%
      </span>
    </div>
  );

  // Stats cards
  const StatsCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="Leads" />

      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Total Leads"
              value={stats.total.toLocaleString()}
              icon={Users}
              color="bg-blue-500"
            />
            <StatsCard
              title="Qualified Rate"
              value={`${Math.round(stats.qualifiedRate * 100)}%`}
              icon={Target}
              color="bg-green-500"
            />
            <StatsCard
              title="Conversion Rate"
              value={`${Math.round(stats.conversionRate * 100)}%`}
              icon={TrendingUp}
              color="bg-purple-500"
            />
            <StatsCard
              title="Total Value"
              value={`$${stats.totalEstimatedValue.toLocaleString()}`}
              icon={DollarSign}
              color="bg-amber-500"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by email, name, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Filter className="w-4 h-4" />
                {statusFilter === 'all' ? 'Status' : leadStatusConfig[statusFilter].label}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full mt-1 right-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setShowStatusDropdown(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                        statusFilter === opt.value && 'bg-gray-50 dark:bg-gray-700'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Source Filter */}
            <div className="relative" ref={sourceDropdownRef}>
              <button
                onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Filter className="w-4 h-4" />
                {sourceFilter === 'all' ? 'Source' : leadSourceConfig[sourceFilter].label}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showSourceDropdown && (
                <div className="absolute top-full mt-1 right-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]">
                  {sourceOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSourceFilter(opt.value);
                        setShowSourceDropdown(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                        sourceFilter === opt.value && 'bg-gray-50 dark:bg-gray-700'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Sort: {sortOptions.find((o) => o.value === sortBy)?.label}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full mt-1 right-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (sortBy === opt.value) {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(opt.value);
                          setSortOrder('desc');
                        }
                        setShowSortDropdown(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                        sortBy === opt.value && 'bg-gray-50 dark:bg-gray-700'
                      )}
                    >
                      {opt.label} {sortBy === opt.value && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(statusFilter !== 'all' || sourceFilter !== 'all' || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setSourceFilter('all');
                  setSearch('');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
              <Button onClick={fetchLeads} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No leads found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Leads will appear here as visitors interact with your funnels
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                      <TableHead className="font-medium">Lead</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium">Source</TableHead>
                      <TableHead className="font-medium">Engagement</TableHead>
                      <TableHead className="font-medium">Intent</TableHead>
                      <TableHead className="font-medium">Value</TableHead>
                      <TableHead className="font-medium">Last Seen</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => {
                      const statusConf = leadStatusConfig[lead.status];
                      const location = getLeadLocation(lead);
                      return (
                        <TableRow
                          key={lead.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-foreground">
                                {formatLeadName(lead)}
                              </p>
                              {lead.email && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {lead.email}
                                </p>
                              )}
                              {location && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {location}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(statusConf.bgColor, statusConf.color, 'border-0')}>
                              {statusConf.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {leadSourceConfig[lead.source].label}
                            </span>
                            {lead.sourceName && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[150px]">
                                {lead.sourceName}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <ScoreBar score={lead.engagementScore} label="Engagement" />
                          </TableCell>
                          <TableCell>
                            <ScoreBar score={lead.intentScore} label="Intent" />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900 dark:text-foreground">
                              ${Number(lead.estimatedValue).toLocaleString()}
                            </span>
                            {lead.cartValue > 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Cart: ${Number(lead.cartValue).toLocaleString()}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              {formatDate(lead.lastSeenAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/leads/${lead.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {leads.length} of {total} leads
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
