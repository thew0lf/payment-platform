'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavSection as NavSectionType, NavBadges, isPathActive } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';

interface NavSectionProps {
  section: NavSectionType;
  isExpanded: boolean;
  onToggle: () => void;
  badges?: NavBadges;
  collapsed?: boolean;
}

export function NavSection({ section, isExpanded, onToggle, badges, collapsed }: NavSectionProps) {
  const pathname = usePathname();
  const SectionIcon = section.icon;
  const currentPath = pathname || '';

  // Check if any item in this section is active
  const hasActiveItem = section.items.some((item) => isPathActive(item.href, currentPath));

  // Calculate total badge count for collapsed state
  const totalBadgeCount = section.items.reduce((sum, item) => {
    if (item.badgeKey && badges?.[item.badgeKey]) {
      return sum + badges[item.badgeKey];
    }
    return sum;
  }, 0);

  // When collapsed, show just the section icon as a link to the first item
  if (collapsed) {
    const firstItem = section.items[0];
    return (
      <div className="mb-1 relative group" role="group" aria-labelledby={`nav-section-${section.id}`}>
        <Link
          href={firstItem.href}
          className={cn(
            'flex items-center justify-center rounded-lg p-2 transition-colors',
            'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            hasActiveItem && 'bg-primary/10 text-primary'
          )}
          title={section.label}
        >
          <SectionIcon className={cn('h-5 w-5', hasActiveItem ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
          {totalBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
            </span>
          )}
        </Link>
        {/* Tooltip on hover */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 whitespace-nowrap">
          {section.label}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1" role="group" aria-labelledby={`nav-section-${section.id}`}>
      {/* Section Header */}
      <button
        id={`nav-section-${section.id}`}
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          hasActiveItem && !isExpanded && 'bg-muted/30'
        )}
        aria-expanded={isExpanded}
        aria-controls={`nav-section-items-${section.id}`}
      >
        <div className="flex items-center gap-3">
          <SectionIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>{section.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Show badge count when collapsed */}
          {!isExpanded && totalBadgeCount > 0 && (
            <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
              {totalBadgeCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Section Items */}
      <div
        id={`nav-section-items-${section.id}`}
        role="list"
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!isExpanded}
      >
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
          {section.items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = isPathActive(item.href, currentPath);
            const badgeValue = item.badgeKey ? badges?.[item.badgeKey] : (typeof item.badge === 'number' ? item.badge : undefined);

            return (
              <Link
                key={item.id}
                href={item.href}
                role="listitem"
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-3">
                  <ItemIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
                {badgeValue !== undefined && badgeValue > 0 && (
                  <Badge
                    variant={
                      item.badgeVariant === 'error'
                        ? 'destructive'
                        : item.badgeVariant === 'warning'
                          ? 'warning'
                          : 'default'
                    }
                    className="h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {badgeValue}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
