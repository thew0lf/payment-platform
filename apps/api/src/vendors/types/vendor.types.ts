import {
  VendorStatus,
  VendorTier,
  VendorType,
  ConnectionStatus,
  ProductSyncMode,
  ProductSyncStatus,
  EntityStatus,
} from '@prisma/client';

export {
  VendorStatus,
  VendorTier,
  VendorType,
  ConnectionStatus,
  ProductSyncMode,
  ProductSyncStatus,
};

export interface VendorQueryParams {
  search?: string;
  status?: VendorStatus;
  tier?: VendorTier;
  vendorType?: VendorType;
  isVerified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'totalOrders' | 'averageRating';
  sortOrder?: 'asc' | 'desc';
}

export interface VendorCompanyQueryParams {
  vendorId?: string;
  search?: string;
  status?: EntityStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ConnectionQueryParams {
  vendorId?: string;
  vendorCompanyId?: string;
  companyId?: string;
  status?: ConnectionStatus;
  limit?: number;
  offset?: number;
}

export interface VendorProductQueryParams {
  vendorCompanyId: string;
  search?: string;
  isActive?: boolean;
  categories?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'wholesalePrice' | 'stockQuantity' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  pendingVerification: number;
  byTier: Record<VendorTier, number>;
  byType: Record<VendorType, number>;
}

export interface VendorPerformanceMetrics {
  vendorId: string;
  totalOrders: number;
  completedOrders: number;
  averageRating: number;
  totalReviews: number;
  completionRate: number;
  averageShipDays: number;
  totalRevenue: number;
}
