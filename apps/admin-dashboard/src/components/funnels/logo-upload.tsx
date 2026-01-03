'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { funnelsApi, LogoCapabilities, LogoProcessingOptions } from '@/lib/api/funnels';

interface LogoUploadProps {
  funnelId: string;
  companyId: string;
  currentLogoUrl?: string | null;
  onLogoChange?: (logoUrl: string | null) => void;
  className?: string;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function LogoUpload({
  funnelId,
  companyId,
  currentLogoUrl,
  onLogoChange,
  className,
}: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [capabilities, setCapabilities] = useState<LogoCapabilities | null>(null);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load capabilities on first interaction
  const loadCapabilities = useCallback(async () => {
    if (capabilities || isLoadingCapabilities) return;

    setIsLoadingCapabilities(true);
    try {
      const caps = await funnelsApi.getLogoCapabilities(companyId);
      setCapabilities(caps);
    } catch (error) {
      console.error('Failed to load logo capabilities:', error);
    } finally {
      setIsLoadingCapabilities(false);
    }
  }, [companyId, capabilities, isLoadingCapabilities]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please use PNG, JPG, SVG, or WebP format';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Please use a file under 5MB';
    }
    return null;
  };

  const handleUpload = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    try {
      // Apply processing if available
      const process: LogoProcessingOptions | undefined = capabilities?.canProcess
        ? { optimize: true }
        : undefined;

      const result = await funnelsApi.uploadLogo(funnelId, file, companyId, process);
      const newLogoUrl = result.cdnUrl || result.url;
      setLogoUrl(newLogoUrl);
      onLogoChange?.(newLogoUrl);
      toast.success('Logo uploaded!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload logo';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await funnelsApi.removeLogo(funnelId, companyId);
      setLogoUrl(null);
      onLogoChange?.(null);
      toast.success('Logo removed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove logo';
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    loadCapabilities();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleClick = () => {
    loadCapabilities();
    fileInputRef.current?.click();
  };

  // Current logo preview
  if (logoUrl) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="relative group">
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border border-border">
            <img
              src={logoUrl}
              alt="Funnel logo"
              className="max-h-16 max-w-full object-contain"
            />
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 min-h-[44px] min-w-[44px] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity touch-manipulation"
            onClick={handleRemove}
            disabled={isRemoving}
            aria-label="Remove logo"
          >
            {isRemoving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Click the X to remove</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleClick}
            disabled={isUploading}
          >
            Replace
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Handle keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Upload area
  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload logo. Drag and drop a file or click to browse. Accepts PNG, JPG, SVG, or WebP up to 5MB."
        aria-busy={isUploading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed p-6 transition-colors',
          'hover:border-primary/50 hover:bg-muted/50',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'min-h-[120px] touch-manipulation',
          isDragOver && 'border-primary bg-primary/5',
          isUploading && 'pointer-events-none opacity-50',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        <div className="flex flex-col items-center justify-center text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="mb-2 p-2 rounded-full bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Drop your logo here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, SVG, or WebP up to 5MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Feature badges */}
      {capabilities && (
        <div className="flex flex-wrap gap-2">
          {capabilities.canProcess && (
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              <span>Pro: Auto-optimize</span>
            </div>
          )}
          {capabilities.canGenerate && (
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Wand2 className="h-3 w-3" />
              <span>Enterprise: AI Generation</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LogoUpload;
