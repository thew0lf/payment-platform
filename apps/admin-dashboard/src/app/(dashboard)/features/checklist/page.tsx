'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Lock,
  RefreshCw,
  Shield,
  Users,
  Zap,
  AlertOctagon,
  FileText,
  Activity,
  Accessibility,
  Smartphone,
  Database,
  Plug,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { qaChecklistApi, QACheckItem } from '@/lib/api/features';

// Types
interface QAChecklist {
  checklist: QACheckItem[];
  categories: string[];
  totalChecks: number;
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY CONFIG
// ═══════════════════════════════════════════════════════════════

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  SECURITY: { label: 'Security', icon: Shield, color: 'text-red-400' },
  PERMISSIONS: { label: 'Permissions', icon: Users, color: 'text-purple-400' },
  FUNCTIONALITY: { label: 'Functionality', icon: Zap, color: 'text-primary' },
  ERROR_HANDLING: { label: 'Error Handling', icon: AlertOctagon, color: 'text-orange-400' },
  EDGE_CASES: { label: 'Edge Cases', icon: FileText, color: 'text-yellow-400' },
  PERFORMANCE: { label: 'Performance', icon: Activity, color: 'text-green-400' },
  ACCESSIBILITY: { label: 'Accessibility', icon: Accessibility, color: 'text-blue-400' },
  RESPONSIVE: { label: 'Responsive', icon: Smartphone, color: 'text-pink-400' },
  DATA_INTEGRITY: { label: 'Data Integrity', icon: Database, color: 'text-indigo-400' },
  INTEGRATION: { label: 'Integration', icon: Plug, color: 'text-teal-400' },
  DOCUMENTATION: { label: 'Documentation', icon: BookOpen, color: 'text-muted-foreground' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  HIGH: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  LOW: { label: 'Low', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] || { label: severity, color: 'text-muted-foreground', bgColor: 'bg-muted' };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      config.bgColor,
      config.color
    )}>
      {config.label}
    </span>
  );
}

function ChecklistItemCard({ item }: { item: QACheckItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="mt-0.5">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-primary">{item.code}</span>
            <SeverityBadge severity={item.severity} />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">{item.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 pl-12 space-y-3">
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">Test Steps:</h5>
            <ul className="space-y-1.5">
              {(item.testSteps || []).map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-muted-foreground text-xs mt-0.5">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  items,
  expanded,
  onToggle,
}: {
  category: string;
  items: QACheckItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = CATEGORY_CONFIG[category] || { label: category, icon: FileText, color: 'text-muted-foreground' };
  const Icon = config.icon;

  const criticalCount = items.filter(i => i.severity === 'CRITICAL').length;
  const highCount = items.filter(i => i.severity === 'HIGH').length;

  return (
    <div className="bg-card/30 border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-muted', config.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-foreground">{config.label}</h3>
            <p className="text-xs text-muted-foreground">{items.length} checks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">
              {highCount} high
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-2">
          {items.map((item) => (
            <ChecklistItemCard key={item.code} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function QAChecklistPage() {
  const { accessLevel } = useHierarchy();

  // State
  const [checklist, setChecklist] = useState<QAChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Check if user has access (org-only)
  const hasAccess = accessLevel === 'ORGANIZATION';

  const fetchChecklist = useCallback(async () => {
    if (!hasAccess) return;

    setLoading(true);
    setError(null);

    try {
      const data = await qaChecklistApi.getStandard();
      setChecklist(data);
      // Auto-expand first category
      if (data.categories.length > 0) {
        setExpandedCategories(new Set([data.categories[0]]));
      }
    } catch (err) {
      console.error('Failed to fetch checklist:', err);
      setError('Failed to load QA checklist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (checklist) {
      setExpandedCategories(new Set(checklist.categories));
    }
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Group items by category
  const itemsByCategory = checklist?.checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, QACheckItem[]>) || {};

  // Access denied view
  if (!hasAccess) {
    return (
      <>
        <Header title="QA Checklist" />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Access Restricted</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The QA Checklist is only available to organization administrators.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="QA Checklist"
        subtitle={loading ? 'Loading...' : `${checklist?.totalChecks || 0} checks across ${checklist?.categories.length || 0} categories`}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Checklist Content */}
        {!loading && checklist && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card/50 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Checks</p>
                <p className="text-2xl font-bold text-foreground">{checklist.totalChecks}</p>
              </div>
              <div className="bg-card/50 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Categories</p>
                <p className="text-2xl font-bold text-foreground">{checklist.categories.length}</p>
              </div>
              <div className="bg-card/50 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Critical</p>
                <p className="text-2xl font-bold text-red-400">
                  {checklist.checklist.filter(i => i.severity === 'CRITICAL').length}
                </p>
              </div>
              <div className="bg-card/50 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">High Priority</p>
                <p className="text-2xl font-bold text-orange-400">
                  {checklist.checklist.filter(i => i.severity === 'HIGH').length}
                </p>
              </div>
            </div>

            {/* Expand/Collapse All */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Expand All
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Collapse All
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {checklist.categories.map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  items={itemsByCategory[category] || []}
                  expanded={expandedCategories.has(category)}
                  onToggle={() => toggleCategory(category)}
                />
              ))}
            </div>

            {/* Usage Note */}
            <div className="bg-card/50 border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">How to Use This Checklist</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. Use the <code className="px-1.5 py-0.5 bg-muted rounded text-primary">/qa</code> slash command to run QA on a feature.</p>
                <p>2. The AI QA Manager will automatically check items from this list relevant to your feature.</p>
                <p>3. Focus on <span className="text-red-400">Critical</span> and <span className="text-orange-400">High</span> severity items first.</p>
                <p>4. Each category represents a different aspect of quality assurance.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
