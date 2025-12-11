'use client';

import * as React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  deletedApi,
  DeletionPreview,
  SoftDeleteModel,
  getEntityTypeLabel,
  RETENTION_PERIODS,
} from '@/lib/api/deleted';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  entityType: SoftDeleteModel;
  entityId: string;
  entityName: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityId,
  entityName,
}: DeleteConfirmModalProps) {
  const [preview, setPreview] = React.useState<DeletionPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Load preview when modal opens
  React.useEffect(() => {
    if (isOpen && entityType && entityId) {
      setLoading(true);
      setError(null);
      deletedApi
        .previewDelete(entityType, entityId)
        .then(setPreview)
        .catch((err) => setError(err.message || 'Failed to load deletion preview'))
        .finally(() => setLoading(false));
    } else {
      setPreview(null);
      setReason('');
    }
  }, [isOpen, entityType, entityId]);

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      await onConfirm(reason || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setConfirming(false);
    }
  };

  const retentionInfo = RETENTION_PERIODS[entityType];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Deletion"
      description={`Delete ${getEntityTypeLabel(entityType).toLowerCase()}: ${entityName}`}
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
        ) : (
          <>
            {/* Warning Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-400">
                  This action will soft-delete the {getEntityTypeLabel(entityType).toLowerCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  The item will be moved to Trash and can be restored within {retentionInfo.label}.
                </p>
              </div>
            </div>

            {/* Cascade Impact */}
            {preview && preview.totalAffected > 1 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Affected Items</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{entityType}</span>
                    <span className="text-foreground">1</span>
                  </div>
                  {Object.entries(preview.cascadeCount).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{getEntityTypeLabel(type as SoftDeleteModel)}</span>
                      <span className="text-foreground">{count}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-medium">
                    <span className="text-foreground">Total Affected</span>
                    <span className="text-foreground">{preview.totalAffected}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {preview?.warnings && preview.warnings.length > 0 && (
              <div className="space-y-2">
                {preview.warnings.map((warning, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/5 rounded p-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <label htmlFor="deleteReason" className="text-sm font-medium text-muted-foreground">
                Reason for deletion (optional)
              </label>
              <textarea
                id="deleteReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for audit trail..."
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                rows={2}
                maxLength={500}
              />
            </div>
          </>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={confirming}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={loading || confirming}
          className="bg-red-600 hover:bg-red-700"
        >
          {confirming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
