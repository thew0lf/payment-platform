'use client';

import * as React from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Plus, X, GripVertical } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Validate URL to prevent XSS
const isValidImageUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Only allow http/https and data: URIs for images
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

interface MediaItem {
  id: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

interface MediaSectionProps {
  images: MediaItem[];
  onImagesChange: (images: MediaItem[]) => void;
  onUpload?: () => void;
  onRemove?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onReorder?: (images: MediaItem[]) => void;
  isUploading?: boolean;
  maxImages?: number;
  defaultOpen?: boolean;
}

/**
 * MediaSection - Product media/images management
 */
export function MediaSection({
  images,
  onImagesChange,
  onUpload,
  onRemove,
  onSetPrimary,
  onReorder,
  isUploading = false,
  maxImages = 10,
  defaultOpen = true,
}: MediaSectionProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    onImagesChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    if (onReorder) {
      onReorder(images);
    }
  };

  const handleRemove = (id: string) => {
    if (onRemove) {
      onRemove(id);
    } else {
      onImagesChange(images.filter((img) => img.id !== id));
    }
  };

  const handleSetPrimary = (id: string) => {
    if (onSetPrimary) {
      onSetPrimary(id);
    } else {
      const newImages = images.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }));
      onImagesChange(newImages);
    }
  };

  return (
    <CollapsibleCard
      title="Media"
      subtitle="Add images to showcase your product"
      icon={<ImageIcon className="h-5 w-5" />}
      badge={
        images.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {images.length} / {maxImages}
          </Badge>
        ) : undefined
      }
      defaultOpen={defaultOpen}
      storageKey="product-media"
    >
      <div className="space-y-4">
        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative aspect-square rounded-lg border overflow-hidden group cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${image.isPrimary ? 'ring-2 ring-primary' : ''}`}
              >
                {/* Secure image rendering with URL validation */}
                {isValidImageUrl(image.url) ? (
                  <Image
                    src={image.url}
                    alt={image.alt || 'Product image'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    unoptimized // Allow external URLs
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Overlay controls */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <GripVertical className="absolute top-2 left-2 h-4 w-4 text-white" />

                  {!image.isPrimary && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetPrimary(image.id)}
                    >
                      Set Primary
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemove(image.id)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Primary badge */}
                {image.isPrimary && (
                  <Badge className="absolute bottom-2 left-2" variant="default">
                    Primary
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {images.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            onClick={onUpload}
            disabled={isUploading}
            className="w-full h-24 border-dashed"
          >
            <Plus className="h-5 w-5 mr-2" />
            {isUploading ? 'Uploading...' : 'Add Images'}
          </Button>
        )}

        {/* Helper text */}
        <p className="text-xs text-muted-foreground">
          Drag images to reorder. First image is used as the primary product
          image. Supported formats: JPEG, PNG, WebP. Max size: 5MB each.
        </p>
      </div>
    </CollapsibleCard>
  );
}

export default MediaSection;
