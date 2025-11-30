'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Star,
  Trash2,
  Edit2,
  Wand2,
  GripVertical,
  Loader2,
  Image as ImageIcon,
  Film,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductMedia, MediaProcessAction } from '@/lib/api/products';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MediaGalleryProps {
  media: ProductMedia[];
  onReorder: (mediaIds: string[]) => Promise<void>;
  onSetPrimary: (mediaId: string) => Promise<void>;
  onDelete: (mediaId: string) => Promise<void>;
  onUpdate: (mediaId: string, data: { altText?: string; caption?: string }) => Promise<void>;
  onProcess: (mediaId: string, action: MediaProcessAction) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

interface SortableItemProps {
  media: ProductMedia;
  onSetPrimary: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onProcess: (action: MediaProcessAction) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

function SortableItem({
  media,
  onSetPrimary,
  onDelete,
  onEdit,
  onProcess,
  disabled,
  isProcessing,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isImage = media.type === 'IMAGE';
  const isVideo = media.type === 'VIDEO';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group rounded-lg border bg-card overflow-hidden',
        isDragging && 'opacity-50 shadow-lg z-50',
        media.isPrimary && 'ring-2 ring-primary'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute top-2 left-2 z-10 p-1.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab',
          disabled && 'hidden'
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Primary badge */}
      {media.isPrimary && (
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium">
          Primary
        </div>
      )}

      {/* Media preview */}
      <div className="aspect-square bg-muted relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        {isImage ? (
          <img
            src={media.thumbnailUrl || media.url}
            alt={media.altText || media.filename}
            className="w-full h-full object-cover"
          />
        ) : isVideo ? (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-12 w-12 text-muted-foreground" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="absolute bottom-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!media.isPrimary && (
          <button
            onClick={onSetPrimary}
            disabled={disabled}
            className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Set as primary"
          >
            <Star className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onEdit}
          disabled={disabled}
          className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
          title="Edit details"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        {isImage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={disabled || isProcessing}
                className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
                title="Process image"
              >
                <Wand2 className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onProcess('remove_background')}>
                Remove Background
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onProcess('smart_crop')}>
                Smart Crop
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onProcess('enhance')}>
                Auto Enhance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onProcess('upscale')}>
                Upscale 2x
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          onClick={onDelete}
          disabled={disabled}
          className="p-1.5 rounded bg-destructive/80 text-white hover:bg-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Filename */}
      <div className="p-2 border-t bg-muted/50">
        <p className="text-xs truncate text-muted-foreground" title={media.filename}>
          {media.filename}
        </p>
      </div>
    </div>
  );
}

export function MediaGallery({
  media,
  onReorder,
  onSetPrimary,
  onDelete,
  onUpdate,
  onProcess,
  disabled = false,
  className,
}: MediaGalleryProps) {
  const [items, setItems] = useState(media);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editingMedia, setEditingMedia] = useState<ProductMedia | null>(null);
  const [editForm, setEditForm] = useState({ altText: '', caption: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Update items when media prop changes
  React.useEffect(() => {
    setItems(media);
  }, [media]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        setItems(newItems);

        try {
          await onReorder(newItems.map((item) => item.id));
        } catch (error) {
          // Revert on error
          setItems(items);
        }
      }
    },
    [items, onReorder]
  );

  const handleProcess = useCallback(
    async (mediaId: string, action: MediaProcessAction) => {
      setProcessingIds((prev) => new Set(prev).add(mediaId));
      try {
        await onProcess(mediaId, action);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
      }
    },
    [onProcess]
  );

  const handleEditOpen = useCallback((media: ProductMedia) => {
    setEditingMedia(media);
    setEditForm({
      altText: media.altText || '',
      caption: media.caption || '',
    });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingMedia) return;
    await onUpdate(editingMedia.id, editForm);
    setEditingMedia(null);
  }, [editingMedia, editForm, onUpdate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return;
    await onDelete(deleteConfirm);
    setDeleteConfirm(null);
  }, [deleteConfirm, onDelete]);

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <ImageIcon className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">No media uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div
            className={cn(
              'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4',
              className
            )}
          >
            {items.map((item) => (
              <SortableItem
                key={item.id}
                media={item}
                onSetPrimary={() => onSetPrimary(item.id)}
                onDelete={() => setDeleteConfirm(item.id)}
                onEdit={() => handleEditOpen(item)}
                onProcess={(action) => handleProcess(item.id, action)}
                disabled={disabled}
                isProcessing={processingIds.has(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        title="Edit Media Details"
      >
        <div className="space-y-4 p-4">
          {editingMedia && (
            <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden">
              <img
                src={editingMedia.thumbnailUrl || editingMedia.url}
                alt={editingMedia.altText || editingMedia.filename}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="altText" className="text-sm font-medium text-zinc-300">
              Alt Text
            </label>
            <Input
              id="altText"
              value={editForm.altText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditForm((prev) => ({ ...prev, altText: e.target.value }))
              }
              placeholder="Describe this image for accessibility"
            />
            <p className="text-xs text-zinc-500">
              Alt text helps with SEO and screen readers
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="caption" className="text-sm font-medium text-zinc-300">
              Caption
            </label>
            <textarea
              id="caption"
              value={editForm.caption}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setEditForm((prev) => ({ ...prev, caption: e.target.value }))
              }
              placeholder="Optional caption for this media"
              rows={2}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setEditingMedia(null)}>
            Cancel
          </Button>
          <Button onClick={handleEditSave}>Save Changes</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Media"
        description="Are you sure you want to delete this media? This action cannot be undone."
      >
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
