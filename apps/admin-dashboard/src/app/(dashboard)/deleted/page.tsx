'use client';

import * as React from 'react';
import {
  Search,
  Trash2,
  RotateCcw,
  Clock,
  Filter,
  AlertTriangle,
  Building2,
  Building,
  Layers,
  Users,
  UserCircle,
  MapPin,
  RefreshCw,
  ShoppingCart,
  Package,
  CreditCard,
  Route,
  Webhook,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Info,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  deletedApi,
  DeletedRecord,
  SoftDeleteModel,
  SOFT_DELETE_MODELS,
  formatTimeUntilExpiration,
  getEntityTypeLabel,
} from '@/lib/api/deleted';
import { RestoreModal } from '@/components/deleted/RestoreModal';
import { formatDate } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Building,
  Layers,
  Users,
  UserCircle,
  MapPin,
  RefreshCw,
  ShoppingCart,
  Package,
  CreditCard,
  Route,
  Webhook,
};

export default function DeletedItemsPage() {
  const [items, setItems] = React.useState<DeletedRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<SoftDeleteModel | ''>('');
  const [page, setPage] = React.useState(0);
  const limit = 20;

  // Restore modal state
  const [restoreModal, setRestoreModal] = React.useState<{
    isOpen: boolean;
    entityType: SoftDeleteModel;
    entityId: string;
    entityName: string;
  } | null>(null);

  // Load deleted items
  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        limit,
        offset: page * limit,
      };
      if (search) params.search = search;
      if (selectedType) params.entityType = selectedType;

      const result = await deletedApi.list(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load deleted items:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, page]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRestore = async (cascade?: boolean) => {
    if (!restoreModal) return;
    await deletedApi.restore(restoreModal.entityType, restoreModal.entityId, { cascade });
    setRestoreModal(null);
    loadItems();
  };

  const getIconComponent = (entityType: SoftDeleteModel) => {
    const model = SOFT_DELETE_MODELS.find((m) => m.value === entityType);
    const iconName = model?.icon || 'Package';
    return ICONS[iconName] || Package;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header
        title="Trash"
        subtitle={`${total} deleted item${total !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Info Banner */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-zinc-300">
              Items in Trash will be automatically permanently deleted after their retention period
              expires.
            </p>
            <p className="text-xs text-zinc-500">
              Retention periods vary by item type (90 days - 2 years). Restore items before they
              expire to recover them.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search deleted items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {selectedType ? getEntityTypeLabel(selectedType) : 'All Types'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSelectedType('')}>All Types</DropdownMenuItem>
              {SOFT_DELETE_MODELS.map((model) => {
                const Icon = ICONS[model.icon] || Package;
                return (
                  <DropdownMenuItem
                    key={model.value}
                    onClick={() => setSelectedType(model.value)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {model.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Trash2 className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">Trash is empty</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                {search || selectedType
                  ? 'No deleted items match your filters.'
                  : 'Deleted items will appear here and can be restored before their retention period expires.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Expires In</TableHead>
                  <TableHead>Related</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const Icon = getIconComponent(item.entityType);
                  const isExpiringSoon =
                    new Date(item.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {item.entityName || item.id.slice(0, 8)}
                            </p>
                            {item.deleteReason && (
                              <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                {item.deleteReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getEntityTypeLabel(item.entityType)}</Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {formatDate(new Date(item.deletedAt))}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {item.deletedBy?.name || item.deletedBy?.email || 'System'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpiringSoon && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className={isExpiringSoon ? 'text-amber-400' : 'text-zinc-400'}>
                            {formatTimeUntilExpiration(item.expiresAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.cascadedCount > 0 && (
                          <Badge variant="outline">{item.cascadedCount} items</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.canRestore ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setRestoreModal({
                                  isOpen: true,
                                  entityType: item.entityType,
                                  entityId: item.id,
                                  entityName: item.entityName || item.id.slice(0, 8),
                                })
                              }
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                          ) : (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setRestoreModal({
                                    isOpen: true,
                                    entityType: item.entityType,
                                    entityId: item.id,
                                    entityName: item.entityName || item.id.slice(0, 8),
                                  })
                                }
                                disabled={!item.canRestore}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                View Details / Restore
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-zinc-500">
              Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Modal */}
      {restoreModal && (
        <RestoreModal
          isOpen={restoreModal.isOpen}
          onClose={() => setRestoreModal(null)}
          onConfirm={handleRestore}
          entityType={restoreModal.entityType}
          entityId={restoreModal.entityId}
          entityName={restoreModal.entityName}
        />
      )}
    </>
  );
}
