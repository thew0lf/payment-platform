'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">500</h1>
        <h2 className="text-xl text-muted-foreground mb-6">Something went wrong</h2>
        <p className="text-muted-foreground mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-foreground rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
