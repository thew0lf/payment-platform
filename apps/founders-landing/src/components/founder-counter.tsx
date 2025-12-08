'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface FounderCounterProps {
  initialCount?: number;
}

export function FounderCounter({ initialCount = 0 }: FounderCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(!initialCount);

  useEffect(() => {
    if (initialCount) return;

    const fetchCount = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setCount(data.totalFounders);
      } catch (error) {
        console.error('Failed to fetch founder count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [initialCount]);

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400">
        <Users className="w-5 h-5" />
        <span className="animate-pulse">Loading...</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold">
      <Users className="w-5 h-5" />
      <span>{formatNumber(count)}</span>
      <span className="font-normal">founders</span>
    </span>
  );
}
