'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type ViewMode = 'cards' | 'table';

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-muted rounded-lg p-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0 rounded-md',
          view === 'cards'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        onClick={() => onViewChange('cards')}
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0 rounded-md',
          view === 'table'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        onClick={() => onViewChange('table')}
        title="Table view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
