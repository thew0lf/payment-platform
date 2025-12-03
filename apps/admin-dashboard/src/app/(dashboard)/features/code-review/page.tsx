'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Lock,
  RefreshCw,
  Shield,
  Code,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  Database,
  Zap,
  Globe,
  FileText,
  Key,
  Lock as LockIcon,
  Eye,
  Terminal,
  Bug,
  GitBranch,
  Scale,
  UserCheck,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  codeReviewChecklistApi,
  CodeReviewCheckItem,
  CodeReviewCategory,
  CodeReviewCategoryInfo,
} from '@/lib/api/features';

// ═══════════════════════════════════════════════════════════════
// CATEGORY CONFIG
// ═══════════════════════════════════════════════════════════════

const CATEGORY_CONFIG: Record<
  CodeReviewCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  [CodeReviewCategory.CODE_QUALITY]: { label: 'Code Quality', icon: Code, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  [CodeReviewCategory.ARCHITECTURE]: { label: 'Architecture', icon: GitBranch, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  [CodeReviewCategory.TYPE_SAFETY]: { label: 'Type Safety', icon: FileCode2, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  [CodeReviewCategory.ERROR_HANDLING]: { label: 'Error Handling', icon: AlertTriangle, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  [CodeReviewCategory.MAINTAINABILITY]: { label: 'Maintainability', icon: FileText, color: 'text-teal-400', bgColor: 'bg-teal-500/10' },
  [CodeReviewCategory.TESTING]: { label: 'Testing', icon: Bug, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  [CodeReviewCategory.SECURITY]: { label: 'Security (OWASP)', icon: ShieldAlert, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  [CodeReviewCategory.AUTHENTICATION]: { label: 'Authentication', icon: Key, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  [CodeReviewCategory.AUTHORIZATION]: { label: 'Authorization', icon: UserCheck, color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  [CodeReviewCategory.INPUT_VALIDATION]: { label: 'Input Validation', icon: Terminal, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  [CodeReviewCategory.OUTPUT_ENCODING]: { label: 'Output Encoding', icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
  [CodeReviewCategory.CRYPTOGRAPHY]: { label: 'Cryptography', icon: LockIcon, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  [CodeReviewCategory.SOC2]: { label: 'SOC2 Compliance', icon: ShieldCheck, color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
  [CodeReviewCategory.ISO27001]: { label: 'ISO 27001', icon: Scale, color: 'text-green-500', bgColor: 'bg-green-500/20' },
  [CodeReviewCategory.PCI_DSS]: { label: 'PCI-DSS', icon: Shield, color: 'text-red-500', bgColor: 'bg-red-500/20' },
  [CodeReviewCategory.GDPR]: { label: 'GDPR', icon: Globe, color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  [CodeReviewCategory.PERFORMANCE]: { label: 'Performance', icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  [CodeReviewCategory.DATABASE]: { label: 'Database', icon: Database, color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
  [CodeReviewCategory.API_DESIGN]: { label: 'API Design', icon: Globe, color: 'text-lime-400', bgColor: 'bg-lime-500/10' },
  [CodeReviewCategory.LOGGING]: { label: 'Logging', icon: ClipboardList, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle },
  HIGH: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: AlertTriangle },
  MEDIUM: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', icon: Info },
  LOW: { label: 'Low', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', icon: Info },
  SUGGESTION: { label: 'Suggestion', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: CheckCircle2 },
};

// Compliance categories for special highlighting
const COMPLIANCE_CATEGORIES = [
  CodeReviewCategory.SOC2,
  CodeReviewCategory.ISO27001,
  CodeReviewCategory.PCI_DSS,
  CodeReviewCategory.GDPR,
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
        config.bgColor,
        config.color
      )}
    >
      <config.icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ComplianceBadge({ complianceRef }: { complianceRef: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
      {complianceRef}
    </span>
  );
}

function ChecklistItemCard({ item }: { item: CodeReviewCheckItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="mt-0.5">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-cyan-400">{item.code}</span>
            <SeverityBadge severity={item.severity} />
            {item.complianceRef && <ComplianceBadge complianceRef={item.complianceRef} />}
          </div>
          <h4 className="text-sm font-medium text-white mb-1">{item.title}</h4>
          <p className="text-xs text-zinc-500 line-clamp-2">{item.description}</p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 pl-12 space-y-4">
          {/* Check Steps */}
          <div>
            <h5 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              How to Check:
            </h5>
            <ul className="space-y-1.5">
              {item.checkSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-zinc-600 text-xs mt-0.5 font-mono">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Failure Impact */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
            <h5 className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Impact if Not Addressed:
            </h5>
            <p className="text-sm text-zinc-400">{item.failureImpact}</p>
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
  categoryInfo,
}: {
  category: CodeReviewCategory;
  items: CodeReviewCheckItem[];
  expanded: boolean;
  onToggle: () => void;
  categoryInfo?: CodeReviewCategoryInfo;
}) {
  const config = CATEGORY_CONFIG[category] || {
    label: category,
    icon: Code,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
  };
  const Icon = config.icon;
  const isCompliance = COMPLIANCE_CATEGORIES.includes(category);

  const criticalCount = items.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = items.filter((i) => i.severity === 'HIGH').length;

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden',
        isCompliance
          ? 'bg-zinc-900/50 border-zinc-700'
          : 'bg-zinc-900/30 border-zinc-800'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor, config.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white">{config.label}</h3>
              {isCompliance && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                  COMPLIANCE
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {categoryInfo?.description || `${items.length} checks`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{items.length} checks</span>
          {criticalCount > 0 && (
            <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {criticalCount}
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {highCount}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
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

interface CodeReviewChecklist {
  checklist: CodeReviewCheckItem[];
  categories: CodeReviewCategory[];
  totalChecks: number;
}

export default function CodeReviewChecklistPage() {
  const { accessLevel } = useHierarchy();

  // State
  const [checklist, setChecklist] = useState<CodeReviewChecklist | null>(null);
  const [categoryInfos, setCategoryInfos] = useState<CodeReviewCategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<CodeReviewCategory>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'compliance' | 'security' | 'quality'>('all');

  // Check if user has access (org-only)
  const hasAccess = accessLevel === 'ORGANIZATION';

  const fetchChecklist = useCallback(async () => {
    if (!hasAccess) return;

    setLoading(true);
    setError(null);

    try {
      const [checklistData, categoriesData] = await Promise.all([
        codeReviewChecklistApi.getStandard(),
        codeReviewChecklistApi.getCategories(),
      ]);
      setChecklist(checklistData);
      setCategoryInfos(categoriesData.categories);
      // Auto-expand first category
      if (checklistData.categories.length > 0) {
        setExpandedCategories(new Set([checklistData.categories[0]]));
      }
    } catch (err) {
      console.error('Failed to fetch checklist:', err);
      setError('Failed to load Code Review checklist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleCategory = (category: CodeReviewCategory) => {
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
  const itemsByCategory =
    checklist?.checklist.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<CodeReviewCategory, CodeReviewCheckItem[]>
    ) || {};

  // Filter categories based on active tab
  const getFilteredCategories = () => {
    if (!checklist) return [];

    switch (activeTab) {
      case 'compliance':
        return checklist.categories.filter((c) => COMPLIANCE_CATEGORIES.includes(c));
      case 'security':
        return checklist.categories.filter((c) =>
          [
            CodeReviewCategory.SECURITY,
            CodeReviewCategory.AUTHENTICATION,
            CodeReviewCategory.AUTHORIZATION,
            CodeReviewCategory.INPUT_VALIDATION,
            CodeReviewCategory.OUTPUT_ENCODING,
            CodeReviewCategory.CRYPTOGRAPHY,
          ].includes(c)
        );
      case 'quality':
        return checklist.categories.filter((c) =>
          [
            CodeReviewCategory.CODE_QUALITY,
            CodeReviewCategory.ARCHITECTURE,
            CodeReviewCategory.TYPE_SAFETY,
            CodeReviewCategory.ERROR_HANDLING,
            CodeReviewCategory.MAINTAINABILITY,
            CodeReviewCategory.TESTING,
            CodeReviewCategory.PERFORMANCE,
            CodeReviewCategory.DATABASE,
            CodeReviewCategory.API_DESIGN,
            CodeReviewCategory.LOGGING,
          ].includes(c)
        );
      default:
        return checklist.categories;
    }
  };

  // Calculate stats
  const criticalCount = checklist?.checklist.filter((i) => i.severity === 'CRITICAL').length || 0;
  const highCount = checklist?.checklist.filter((i) => i.severity === 'HIGH').length || 0;
  const complianceCount = checklist?.checklist.filter((i) =>
    COMPLIANCE_CATEGORIES.includes(i.category)
  ).length || 0;

  // Access denied view
  if (!hasAccess) {
    return (
      <>
        <Header title="Code Review Checklist" />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Lock className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Access Restricted</h3>
            <p className="text-sm text-zinc-500 max-w-md">
              The Code Review Checklist is only available to organization administrators.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Code Review Checklist"
        subtitle={
          loading
            ? 'Loading...'
            : `${checklist?.totalChecks || 0} checks across ${checklist?.categories.length || 0} categories`
        }
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
            <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        )}

        {/* Checklist Content */}
        {!loading && checklist && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Total Checks</p>
                <p className="text-2xl font-bold text-white">{checklist.totalChecks}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Categories</p>
                <p className="text-2xl font-bold text-white">{checklist.categories.length}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Critical</p>
                <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">High Priority</p>
                <p className="text-2xl font-bold text-orange-400">{highCount}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Compliance</p>
                <p className="text-2xl font-bold text-blue-400">{complianceCount}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-800 rounded-lg w-fit">
              {[
                { id: 'all', label: 'All Checks' },
                { id: 'compliance', label: 'Compliance' },
                { id: 'security', label: 'Security' },
                { id: 'quality', label: 'Code Quality' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Expand/Collapse All */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Expand All
              </button>
              <span className="text-zinc-600">|</span>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Collapse All
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {getFilteredCategories().map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  items={itemsByCategory[category] || []}
                  expanded={expandedCategories.has(category)}
                  onToggle={() => toggleCategory(category)}
                  categoryInfo={categoryInfos.find((c) => c.category === category)}
                />
              ))}
            </div>

            {/* Usage Note */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-cyan-400" />
                How to Use This Checklist
              </h3>
              <div className="space-y-2 text-sm text-zinc-400">
                <p>
                  1. Use the{' '}
                  <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-cyan-400">/review</code>{' '}
                  slash command to run a Senior Developer code review.
                </p>
                <p>
                  2. The AI Senior Developer will check items from this list relevant to your
                  feature before QA testing.
                </p>
                <p>
                  3. Focus on{' '}
                  <span className="text-red-400">Critical</span> and{' '}
                  <span className="text-orange-400">High</span> severity items first.
                </p>
                <p>
                  4. <span className="text-blue-400">Compliance</span> checks include SOC2, ISO
                  27001, PCI-DSS, and GDPR requirements.
                </p>
                <p>
                  5. <span className="text-red-400">Security</span> checks cover OWASP Top 10
                  vulnerabilities and authentication/authorization.
                </p>
              </div>
            </div>

            {/* Compliance Standards Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-medium text-blue-400">SOC2</h4>
                </div>
                <p className="text-xs text-zinc-500">
                  Trust Services Criteria covering security, availability, processing integrity,
                  confidentiality, and privacy.
                </p>
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-5 h-5 text-green-400" />
                  <h4 className="text-sm font-medium text-green-400">ISO 27001</h4>
                </div>
                <p className="text-xs text-zinc-500">
                  International standard for information security management systems (ISMS).
                </p>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  <h4 className="text-sm font-medium text-red-400">PCI-DSS</h4>
                </div>
                <p className="text-xs text-zinc-500">
                  Payment Card Industry Data Security Standard for handling cardholder data.
                </p>
              </div>
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <h4 className="text-sm font-medium text-purple-400">GDPR</h4>
                </div>
                <p className="text-xs text-zinc-500">
                  General Data Protection Regulation for EU personal data protection and privacy.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
