'use client';

import { ShoppingCart, Construction } from 'lucide-react';

export default function OrdersInsightsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">Analyze order patterns and metrics</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
          <Construction className="h-12 w-12 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Order analytics with volume trends, conversion rates, and fulfillment metrics are currently under development.
        </p>
      </div>
    </div>
  );
}
