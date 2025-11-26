export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'VOIDED' | 'DISPUTED';
export type TransactionType = 'CHARGE' | 'REFUND' | 'VOID' | 'CHARGEBACK' | 'ADJUSTMENT' | 'AUTHORIZATION' | 'CAPTURE';

export interface Transaction {
  id: string;
  companyId: string;
  customerId?: string;
  subscriptionId?: string;
  orderId?: string;
  paymentProviderId?: string;
  transactionNumber: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  providerTransactionId?: string;
  status: TransactionStatus;
  failureReason?: string;
  failureCode?: string;
  refundedAmount?: number;
  riskScore?: number;
  riskFlags: string[];
  avsResult?: string;
  cvvResult?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  company?: { id: string; name: string; slug: string };
  customer?: { id: string; email: string; firstName?: string; lastName?: string };
  paymentProvider?: { id: string; name: string; type: string };
}

export interface TransactionFilters {
  status?: TransactionStatus[];
  type?: TransactionType[];
  companyId?: string;
  customerId?: string;
  providerId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface TransactionMetrics {
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  averageValue: number;
  revenueChange: number;
  transactionChange: number;
}
