'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api, ChartDataPoint, ChartResponse } from '@/lib/api';
import { format, parseISO } from 'date-fns';

type DayRange = 7 | 14 | 30 | 90;

interface TransactionChartProps {
  companyId?: string;
  clientId?: string;
  className?: string;
}

export function TransactionChart({
  companyId,
  clientId,
  className = '',
}: TransactionChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [summary, setSummary] = useState<ChartResponse['summary'] | null>(null);
  const [period, setPeriod] = useState<ChartResponse['period'] | null>(null);
  const [selectedDays, setSelectedDays] = useState<DayRange>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      api.initToken();
      const response = await api.getChartData({
        days: selectedDays,
        companyId,
        clientId,
      });

      setData(response.data.data);
      setSummary(response.data.summary);
      setPeriod(response.data.period);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      console.error('Error fetching chart data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDays, companyId, clientId]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const dayOptions: { value: DayRange; label: string }[] = [
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days' },
    { value: 90, label: '90 Days' },
  ];

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Transaction Volume</h2>
        </div>
        <div className="flex items-center justify-center h-[300px] text-red-500">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Transaction Volume</h2>
          {period && (
            <p className="text-sm text-gray-500 mt-1">
              {format(parseISO(period.start), 'MMM d, yyyy')} -{' '}
              {format(parseISO(period.end), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Day Range Selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {dayOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedDays(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedDays === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Transactions</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {summary.totalTransactions.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 uppercase tracking-wide">Successful</p>
            <p className="text-xl font-semibold text-green-700 mt-1">
              {summary.successfulTransactions.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600 uppercase tracking-wide">Failed</p>
            <p className="text-xl font-semibold text-red-700 mt-1">
              {summary.failedTransactions.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 uppercase tracking-wide">Success Rate</p>
            <p className="text-xl font-semibold text-blue-700 mt-1">{summary.successRate}%</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload as ChartDataPoint;
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                        <p className="font-medium text-gray-900 mb-2">
                          {format(parseISO(label), 'MMMM d, yyyy')}
                        </p>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-gray-600">Successful:</span>
                            <span className="font-medium text-gray-900">
                              {dataPoint.successful.toLocaleString()}
                            </span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-gray-600">Failed:</span>
                            <span className="font-medium text-gray-900">
                              {dataPoint.failed.toLocaleString()}
                            </span>
                          </p>
                          <p className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
                            <span className="text-gray-600">Volume:</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(dataPoint.volume)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 20 }}
                formatter={(value) => (
                  <span className="text-sm text-gray-600">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="successful"
                name="Successful"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorSuccessful)"
              />
              <Area
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorFailed)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Volume Summary */}
      {summary && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-500">Total Volume:</span>{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(summary.totalVolume)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Daily Avg:</span>{' '}
              <span className="font-semibold text-gray-900">
                {summary.avgDailyTransactions.toLocaleString()} txns / {formatCurrency(summary.avgDailyVolume)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
