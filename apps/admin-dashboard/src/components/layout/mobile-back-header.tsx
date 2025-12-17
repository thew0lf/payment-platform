'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBackHeaderProps {
  /** Back link destination - if not provided, uses browser back */
  backHref?: string;
  /** Label for the back button */
  backLabel?: string;
  /** Title shown in the header */
  title?: string;
  /** Right-side actions */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Mobile-optimized back navigation header.
 * Shown only on mobile (md:hidden) and provides easy back navigation.
 */
export function MobileBackHeader({
  backHref,
  backLabel = 'Back',
  title,
  actions,
  className,
}: MobileBackHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const backButtonClasses = "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 py-1";

  return (
    <div
      className={cn(
        'md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border',
        className
      )}
    >
      {backHref ? (
        <Link href={backHref} className={backButtonClasses}>
          <ArrowLeft className="w-5 h-5" />
          <span>{backLabel}</span>
        </Link>
      ) : (
        <button type="button" onClick={handleBack} className={backButtonClasses}>
          <ArrowLeft className="w-5 h-5" />
          <span>{backLabel}</span>
        </button>
      )}

      {title && (
        <h1 className="text-sm font-medium text-foreground truncate flex-1 text-center px-2">
          {title}
        </h1>
      )}

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}

      {/* Spacer to balance the layout when no actions */}
      {!actions && <div className="w-12" />}
    </div>
  );
}
