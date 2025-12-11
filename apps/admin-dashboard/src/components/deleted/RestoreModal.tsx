'use client';

import * as React from 'react';
import { RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  deletedApi,
  DeletionDetails,
  SoftDeleteModel,
  getEntityTypeLabel,
  formatTimeUntilExpiration,
} from '@/lib/api/deleted';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascade?: boolean) => Promise<void>;
  entityType: SoftDeleteModel;
  entityId: string;
  entityName: string;
}

export function RestoreModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityId,
  entityName,
}: RestoreModalProps) {
  const [details, setDetails] = React.useState<DeletionDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [restoring, setRestoring] = React.useState(false);
  const [cascade, setCascade] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load details when modal opens
  React.useEffect(() => {
    if (isOpen && entityType && entityId) {
      setLoading(true);
      setError(null);
      deletedApi
        .getDetails(entityType, entityId)
        .then(setDetails)
        .catch((err) => setError(err.message || 'Failed to load details'))
        .finally(() => setLoading(false));
    } else {
      setDetails(null);
      setCascade(true);
    }
  }, [isOpen, entityType, entityId]);

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    try {
      await onConfirm(cascade);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to restore');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restore Item"
      description={`Restore ${getEntityTypeLabel(entityType).toLowerCase()}: ${entityName}`}
    >
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : details ? (
          <>
            {/* Cannot Restore Warning */}
            {!details.canRestore && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-400">Cannot restore this item</p>
                  <p className="text-xs text-muted-foreground">
                    The retention period has expired or the item was permanently deleted.
                  </p>
                </div>
              </div>
            )}

            {/* Deletion Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Deletion Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deleted</span>
                  <span className="text-foreground">
                    {new Date(details.deletedAt).toLocaleDateString()}
                  </span>
                </div>
                {details.deletedBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">By</span>
                    <span className="text-foreground">{details.deletedBy.name || details.deletedBy.email}</span>
                  </div>
                )}
                {details.deleteReason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason</span>
                    <span className="text-foreground">{details.deleteReason}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires in</span>
                  <span className="text-foreground">{formatTimeUntilExpiration(details.expiresAt)}</span>
                </div>
              </div>
            </div>

            {/* Cascaded Records */}
            {details.cascadeRecords.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">
                    Related Items ({details.cascadeRecords.length})
                  </h4>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={cascade}
                      onChange={(e) => setCascade(e.target.checked)}
                      className="rounded border-border bg-muted text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-muted-foreground">Restore all</span>
                  </label>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {details.cascadeRecords.slice(0, 10).map((record) => (
                    <div
                      key={record.entityId}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className="text-muted-foreground">{record.entityType}</span>
                      <span className="text-foreground truncate ml-2 max-w-[200px]">
                        {record.entityName || record.entityId}
                      </span>
                    </div>
                  ))}
                  {details.cascadeRecords.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ... and {details.cascadeRecords.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={restoring}>
          Cancel
        </Button>
        <Button
          onClick={handleRestore}
          disabled={loading || restoring || Boolean(details && !details.canRestore)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {restoring ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Restoring...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
