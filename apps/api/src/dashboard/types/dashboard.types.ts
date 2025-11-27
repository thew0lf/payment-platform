/**
 * Dashboard Types
 * Types for dashboard chart data and responses
 */

/**
 * Single data point for the transaction chart
 */
export interface ChartDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  successful: number;
  failed: number;
  total: number;
  volume: number; // Total transaction volume in cents
}

/**
 * Summary statistics for the chart period
 */
export interface ChartSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number; // Percentage (0-100)
  totalVolume: number; // Total volume in cents
  avgDailyTransactions: number;
  avgDailyVolume: number;
}

/**
 * Full chart response including data points and summary
 */
export interface ChartResponse {
  data: ChartDataPoint[];
  summary: ChartSummary;
  period: {
    start: string; // ISO date string
    end: string; // ISO date string
    days: number;
  };
}

/**
 * Query parameters for chart data endpoint
 */
export interface ChartQueryParams {
  days?: number; // 7, 14, 30, or 90 (default: 30)
}

/**
 * Valid day ranges for chart queries
 */
export const VALID_CHART_DAYS = [7, 14, 30, 90] as const;
export type ValidChartDays = (typeof VALID_CHART_DAYS)[number];
