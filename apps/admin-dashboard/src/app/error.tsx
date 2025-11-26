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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-200 mb-4">500</h1>
        <h2 className="text-xl text-zinc-400 mb-6">Something went wrong</h2>
        <p className="text-zinc-500 mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
