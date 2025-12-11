'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface MediaUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export function MediaUpload({
  onUpload,
  maxFiles = 10,
  disabled = false,
  className,
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, maxFiles);
      const validFiles: File[] = [];
      const uploadFiles: UploadingFile[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          uploadFiles.push({ file, progress: 0, error });
        } else {
          validFiles.push(file);
          uploadFiles.push({ file, progress: 0 });
        }
      }

      setUploadingFiles(uploadFiles);

      if (validFiles.length > 0) {
        try {
          // Simulate progress
          const progressInterval = setInterval(() => {
            setUploadingFiles((prev) =>
              prev.map((uf) =>
                !uf.error && uf.progress < 90
                  ? { ...uf, progress: uf.progress + 10 }
                  : uf
              )
            );
          }, 200);

          await onUpload(validFiles);

          clearInterval(progressInterval);

          // Show completion
          setUploadingFiles((prev) =>
            prev.map((uf) => (!uf.error ? { ...uf, progress: 100 } : uf))
          );

          // Clear after short delay
          setTimeout(() => {
            setUploadingFiles([]);
          }, 1000);
        } catch (error) {
          setUploadingFiles((prev) =>
            prev.map((uf) => ({
              ...uf,
              error: error instanceof Error ? error.message : 'Upload failed',
            }))
          );
        }
      }
    },
    [maxFiles, onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = ''; // Reset for re-upload of same file
      }
    },
    [handleFiles]
  );

  const removeUploadingFile = useCallback((index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <Upload
          className={cn(
            'mx-auto h-10 w-10 mb-3',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <p className="text-sm font-medium">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supports: JPEG, PNG, WebP, GIF, MP4 (max {MAX_FILE_SIZE / 1024 / 1024}MB)
        </p>
      </div>

      {/* Upload progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uf, index) => (
            <div
              key={`${uf.file.name}-${index}`}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                uf.error ? 'border-destructive bg-destructive/5' : 'border-border'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uf.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uf.file.size / 1024).toFixed(1)} KB
                </p>
                {uf.error ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {uf.error}
                  </p>
                ) : (
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${uf.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {uf.error ? (
                <button
                  onClick={() => removeUploadingFile(index)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : uf.progress < 100 ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                  <svg
                    className="h-2.5 w-2.5 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
