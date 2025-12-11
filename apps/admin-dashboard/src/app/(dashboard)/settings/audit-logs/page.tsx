'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  Clock,
  User,
  Activity,
  Shield,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  auditLogsApi,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogStats,
  formatAction,
  getActionColor,
  getClassificationColor,
  DataClassification,
} from '@/lib/api/audit-logs';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Query state
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<DataClassification | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Load filters and stats on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [filtersData, statsData] = await Promise.all([
          auditLogsApi.getFilters(),
          auditLogsApi.getStats(),
        ]);
        setFilters(filtersData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load audit log filters/stats:', error);
      }
    };
    loadInitialData();
  }, []);

  // Load logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await auditLogsApi.list({
        search: search || undefined,
        action: selectedAction || undefined,
        entity: selectedEntity || undefined,
        dataClassification: selectedClassification || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setLogs(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedAction, selectedEntity, selectedClassification, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const clearFilters = () => {
    setSearch('');
    setSelectedAction(null);
    setSelectedEntity(null);
    setSelectedClassification(null);
    setPage(0);
  };

  const hasActiveFilters = search || selectedAction || selectedEntity || selectedClassification;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <Header
        title="Audit Logs"
        subtitle="Full compliance audit trail of all system activity"
        actions={
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Total Events (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {stats?.totalLogs.toLocaleString() || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                User Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {Object.values(stats?.logsByAction || {}).reduce((a, b) => a + b, 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                PCI/PII Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-400">
                {((stats?.logsByClassification?.PCI || 0) + (stats?.logsByClassification?.PII || 0)).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Entity Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400">
                {Object.keys(stats?.logsByEntity || {}).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-card/50 border border-border rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction || ''}
              onChange={(e) => {
                setSelectedAction(e.target.value || null);
                setPage(0);
              }}
              className="h-9 px-3 bg-muted border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Actions</option>
              {filters?.actions.map((action) => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>

            {/* Entity Filter */}
            <select
              value={selectedEntity || ''}
              onChange={(e) => {
                setSelectedEntity(e.target.value || null);
                setPage(0);
              }}
              className="h-9 px-3 bg-muted border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Entities</option>
              {filters?.entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>

            {/* Classification Filter */}
            <select
              value={selectedClassification || ''}
              onChange={(e) => {
                setSelectedClassification((e.target.value as DataClassification) || null);
                setPage(0);
              }}
              className="h-9 px-3 bg-muted border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Classifications</option>
              {filters?.dataClassifications.map((classification) => (
                <option key={classification} value={classification}>
                  {classification}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="bg-card/50 border border-border rounded-xl p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading audit logs...</span>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-card/50 border border-border rounded-xl p-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No audit logs found</p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-4">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div
                    className="flex items-start gap-4 cursor-pointer"
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  >
                    {/* Expand Icon */}
                    <div className="pt-1">
                      {expandedLogId === log.id ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Action */}
                        <span className={cn('font-medium', getActionColor(log.action))}>
                          {formatAction(log.action)}
                        </span>

                        {/* Entity */}
                        <span className="text-muted-foreground">
                          {log.entity}
                          {log.entityId && (
                            <span className="text-muted-foreground ml-1 font-mono text-xs">
                              ({log.entityId.slice(0, 8)}...)
                            </span>
                          )}
                        </span>

                        {/* Classification Badge */}
                        {log.dataClassification && (
                          <Badge
                            className={cn(
                              'text-xs font-medium border',
                              getClassificationColor(log.dataClassification)
                            )}
                          >
                            {log.dataClassification}
                          </Badge>
                        )}
                      </div>

                      {/* User & Time */}
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.user
                            ? `${log.user.firstName || ''} ${log.user.lastName || ''} (${log.user.email})`
                            : 'System'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(log.createdAt)}
                        </span>
                        {log.ipAddress && (
                          <span className="font-mono text-xs text-muted-foreground">{log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLogId === log.id && (
                    <div className="mt-4 ml-8 p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">ID</p>
                          <p className="font-mono text-foreground">{log.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Timestamp</p>
                          <p className="text-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                        {log.scopeType && (
                          <div>
                            <p className="text-muted-foreground mb-1">Scope</p>
                            <p className="text-foreground">
                              {log.scopeType}: {log.scopeId}
                            </p>
                          </div>
                        )}
                        {log.userAgent && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground mb-1">User Agent</p>
                            <p className="text-muted-foreground text-xs font-mono truncate">{log.userAgent}</p>
                          </div>
                        )}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground mb-2">Changes</p>
                            <pre className="bg-card p-3 rounded text-xs text-foreground overflow-x-auto">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground mb-2">Metadata</p>
                            <pre className="bg-card p-3 rounded text-xs text-foreground overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
