'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { toast } from 'sonner';
import {
  funnelsApi,
  Funnel,
  FunnelType,
  FunnelStatus,
  getFunnelTypeLabel,
} from '@/lib/api/funnels';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Play,
  Pause,
  ExternalLink,
  BarChart3,
  Users,
  TrendingUp,
  Layout,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  Workflow,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  PUBLISHED: { label: 'Published', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  PAUSED: { label: 'Paused', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function FunnelsPage() {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FunnelStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<FunnelType | ''>('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Mount check for portals
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen && !(e.target as HTMLElement).closest('[data-menu-container]')) {
        setMenuOpen(null);
        setMenuPosition(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  useEffect(() => {
    if (!needsCompanySelection) {
      loadFunnels();
    }
  }, [selectedCompanyId, searchQuery, statusFilter, typeFilter]);

  const loadFunnels = async () => {
    try {
      setLoading(true);
      const response = await funnelsApi.list({
        companyId: selectedCompanyId || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchQuery || undefined,
      });
      setFunnels(response.items);
    } catch (error) {
      console.error('Failed to load funnels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuToggle = (funnel: Funnel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuOpen === funnel.id) {
      setMenuOpen(null);
      setMenuPosition(null);
    } else {
      const button = menuButtonRefs.current[funnel.id];
      if (button) {
        const rect = button.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 8,
          left: rect.right - 192, // 192px = w-48
        });
      }
      setMenuOpen(funnel.id);
    }
  };

  const handlePublish = async (funnel: Funnel, publish: boolean) => {
    try {
      await funnelsApi.publish(funnel.id, publish, selectedCompanyId || undefined);
      toast.success(publish ? `"${funnel.name}" published` : `"${funnel.name}" unpublished`);
      loadFunnels();
      setMenuOpen(null);
      setMenuPosition(null);
    } catch (error) {
      toast.error('Failed to update funnel status');
      console.error('Failed to update funnel status:', error);
    }
  };

  const handleDuplicate = async (funnel: Funnel) => {
    try {
      if (!selectedCompanyId) return;
      await funnelsApi.duplicate(funnel.id, selectedCompanyId);
      toast.success(`"${funnel.name}" duplicated`);
      loadFunnels();
      setMenuOpen(null);
      setMenuPosition(null);
    } catch (error) {
      toast.error('Failed to duplicate funnel');
      console.error('Failed to duplicate funnel:', error);
    }
  };

  const handleDeleteClick = (funnel: Funnel) => {
    setFunnelToDelete(funnel);
    setMenuOpen(null);
    setMenuPosition(null);
  };

  const confirmDelete = async () => {
    if (!funnelToDelete) return;
    try {
      await funnelsApi.delete(funnelToDelete.id, selectedCompanyId || undefined);
      toast.success(`"${funnelToDelete.name}" deleted`);
      loadFunnels();
    } catch (error) {
      toast.error('Failed to delete funnel');
      console.error('Failed to delete funnel:', error);
    } finally {
      setFunnelToDelete(null);
    }
  };

  const getStageIcons = (funnel: Funnel) => {
    return funnel.stages.slice(0, 4).map((stage) => {
      switch (stage.type) {
        case 'LANDING':
          return Layout;
        case 'PRODUCT_SELECTION':
          return ShoppingBag;
        case 'CHECKOUT':
          return CreditCard;
        default:
          return Layout;
      }
    });
  };

  const getConversionRate = (funnel: Funnel) => {
    if (funnel.totalVisits === 0) return 0;
    return ((funnel.totalConversions / funnel.totalVisits) * 100).toFixed(1);
  };

  if (needsCompanySelection) {
    return (
      <>
        <Header title="Funnels" subtitle="Select a company to view funnels" />
        <div className="p-4 md:p-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 flex items-center justify-center mb-6">
              <Workflow className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Select a Company</h2>
            <p className="text-zinc-400 max-w-md">
              Please select a company from the header dropdown to view and manage funnels.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Funnels"
        subtitle={loading ? 'Loading...' : `${funnels.length} funnels`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/funnels/generate')}
              className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with MI
            </Button>
            <Button size="sm" onClick={() => router.push('/funnels/builder')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Funnel
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search funnels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FunnelStatus | '')}
              className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FunnelType | '')}
              className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">All Types</option>
              <option value="DIRECT_CHECKOUT">Direct Checkout</option>
              <option value="PRODUCT_CHECKOUT">Product + Checkout</option>
              <option value="LANDING_CHECKOUT">Landing + Checkout</option>
              <option value="FULL_FUNNEL">Full Funnel</option>
            </select>

            <button
              onClick={loadFunnels}
              className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Funnels Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-2/3 mb-4" />
                <div className="h-3 bg-zinc-800/50 rounded w-1/2 mb-6" />
                <div className="flex gap-2 mb-6">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-8 h-8 bg-zinc-800 rounded-lg" />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-12 bg-zinc-800/50 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : funnels.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-6">
              <Workflow className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No funnels yet</h3>
            <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
              Create your first funnel to start converting visitors into customers.
            </p>
            <Button onClick={() => router.push('/funnels/builder')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Funnel
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funnels.map((funnel) => {
              const StageIcons = getStageIcons(funnel);
              const statusConfig = STATUS_CONFIG[funnel.status] || STATUS_CONFIG.DRAFT;
              return (
                <div
                  key={funnel.id}
                  onClick={() => router.push(`/funnels/${funnel.id}/analytics`)}
                  className="group bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/30 rounded-xl transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                          {funnel.name}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-0.5">
                          {getFunnelTypeLabel(funnel.type)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2.5 py-1 text-xs font-medium rounded-lg border', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                        <button
                          ref={(el) => { menuButtonRefs.current[funnel.id] = el; }}
                          onClick={(e) => handleMenuToggle(funnel, e)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                          data-menu-container
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stage Flow Visualization */}
                    <div className="flex items-center gap-1.5 mt-4 mb-2">
                      {StageIcons.map((Icon, idx) => (
                        <div key={idx} className="flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-cyan-400" />
                          </div>
                          {idx < StageIcons.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-zinc-600 mx-0.5" />
                          )}
                        </div>
                      ))}
                      {funnel.stages.length > 4 && (
                        <span className="text-xs text-zinc-500 ml-1">+{funnel.stages.length - 4}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats Footer */}
                  <div className="px-5 py-4 bg-zinc-800/30 border-t border-zinc-800">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {funnel.totalVisits.toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-500">Visits</p>
                      </div>
                      <div className="text-center border-x border-zinc-700">
                        <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {funnel.totalConversions.toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-500">Conversions</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {getConversionRate(funnel)}%
                        </p>
                        <p className="text-xs text-zinc-500">Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dropdown Menu Portal */}
      {mounted && menuOpen && menuPosition && createPortal(
        <div
          data-menu-container
          className="fixed w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-2 z-[9999]"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {(() => {
            const funnel = funnels.find(f => f.id === menuOpen);
            if (!funnel) return null;
            return (
              <>
                <button
                  onClick={() => {
                    router.push(`/funnels/builder?id=${funnel.id}`);
                    setMenuOpen(null);
                    setMenuPosition(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                {funnel.status === 'PUBLISHED' ? (
                  <button
                    onClick={() => handlePublish(funnel, false)}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Unpublish
                  </button>
                ) : (
                  <button
                    onClick={() => handlePublish(funnel, true)}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Publish
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(funnel)}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    router.push(`/funnels/${funnel.id}/analytics`);
                    setMenuOpen(null);
                    setMenuPosition(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>
                <button
                  onClick={() => {
                    window.open(`/f/${funnel.slug}`, '_blank');
                    setMenuOpen(null);
                    setMenuPosition(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview
                </button>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={() => handleDeleteClick(funnel)}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {mounted && funnelToDelete && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Funnel</h3>
                <p className="text-sm text-zinc-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete <span className="font-semibold text-white">"{funnelToDelete.name}"</span>?
              All associated data including stages, variants, and analytics will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setFunnelToDelete(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Delete Funnel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
