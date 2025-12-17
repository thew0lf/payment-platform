'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  /** Render function for the cell content */
  render: (item: T) => React.ReactNode;
  /** Whether to show this column on mobile cards (default: true for first 3) */
  showOnMobile?: boolean;
  /** Priority for mobile display (lower = more important, shown first) */
  mobilePriority?: number;
  /** Whether this is the primary identifier column */
  isPrimary?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  /** Optional link generator for mobile cards */
  getRowLink?: (item: T) => string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data to display',
  className,
  getRowLink,
}: ResponsiveTableProps<T>) {
  // Sort columns by mobile priority for card view
  const mobileColumns = React.useMemo(() => {
    return columns
      .filter((col, idx) => col.showOnMobile !== false && (col.showOnMobile || idx < 4))
      .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99));
  }, [columns]);

  const primaryColumn = columns.find(col => col.isPrimary) || columns[0];
  const secondaryColumns = mobileColumns.filter(col => col.key !== primaryColumn?.key).slice(0, 3);

  if (data.length === 0) {
    return (
      <div className={cn('bg-card border border-border rounded-xl p-8 text-center', className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-card border border-border rounded-xl overflow-hidden', className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'hover:bg-muted/50 cursor-pointer'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm">
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-border">
        {data.map((item) => {
          const CardWrapper = getRowLink ? 'a' : 'div';
          const cardProps = getRowLink
            ? { href: getRowLink(item) }
            : onRowClick
            ? { onClick: () => onRowClick(item), role: 'button', tabIndex: 0 }
            : {};

          return (
            <CardWrapper
              key={keyExtractor(item)}
              className={cn(
                'block p-4 transition-colors',
                (onRowClick || getRowLink) && 'active:bg-muted/50'
              )}
              {...cardProps}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Primary info */}
                  {primaryColumn && (
                    <div className="font-medium text-foreground truncate">
                      {primaryColumn.render(item)}
                    </div>
                  )}

                  {/* Secondary info grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {secondaryColumns.map((col) => (
                      <div key={col.key} className="flex flex-col">
                        <span className="text-xs text-muted-foreground">{col.header}</span>
                        <span className="text-sm text-foreground truncate">
                          {col.render(item)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chevron indicator for clickable rows */}
                {(onRowClick || getRowLink) && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                )}
              </div>
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}

export type { Column, ResponsiveTableProps };
