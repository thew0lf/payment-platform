'use client';

import { Flame, AlertTriangle } from 'lucide-react';

type ScarcityLevel = 'critical' | 'low' | 'medium';

interface ScarcityIndicatorProps {
  stockLevel: number;
  showViewers?: boolean;
  viewersCount?: number;
  productName?: string;
}

function getScarcityLevel(stock: number): ScarcityLevel {
  if (stock <= 2) return 'critical';
  if (stock <= 5) return 'low';
  return 'medium';
}

const SCARCITY_STYLES: Record<ScarcityLevel, string> = {
  critical: 'text-red-600',
  low: 'text-orange-600',
  medium: 'text-yellow-600',
};

export function ScarcityIndicator({
  stockLevel,
  showViewers = true,
  viewersCount = 0,
  productName,
}: ScarcityIndicatorProps) {
  // Only show for low stock (10 or fewer)
  if (stockLevel > 10) return null;

  const scarcityLevel = getScarcityLevel(stockLevel);
  const IconComponent = scarcityLevel === 'critical' ? AlertTriangle : Flame;

  const stockMessage =
    stockLevel === 1 ? 'Only 1 left in stock!' : `Only ${stockLevel} left in stock!`;

  return (
    <div className="space-y-1">
      {/* Stock level indicator */}
      <div
        className={`flex items-center gap-1.5 text-xs font-medium ${SCARCITY_STYLES[scarcityLevel]}`}
        role="status"
        aria-label={`${productName ? `${productName}: ` : ''}${stockMessage}`}
      >
        <IconComponent className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{stockMessage}</span>
      </div>

      {/* Live viewers count */}
      {showViewers && viewersCount > 0 && (
        <div
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-label={`${viewersCount} people viewing this item`}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>
            {viewersCount} {viewersCount === 1 ? 'person' : 'people'} viewing this now
          </span>
        </div>
      )}
    </div>
  );
}
