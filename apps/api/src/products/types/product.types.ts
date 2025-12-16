/**
 * Product Types
 */

export { ProductStatus } from '@prisma/client';

// Dynamic category info for products
export interface ProductCategoryInfo {
  id: string;
  name: string;
  slug: string;
  isPrimary?: boolean;
}

export interface Product {
  id: string;
  companyId: string;
  sku: string;
  slug: string;
  name: string;
  description?: string;

  // Categories - use dynamic categories via categoryAssignments
  categories?: ProductCategoryInfo[];

  // Sizing
  weight?: number;
  weightUnit: string;

  // Pricing
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: string;

  // Subscription
  isSubscribable: boolean;
  subscriptionDiscount?: number;

  // Inventory
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;

  // Status
  status: string;
  isVisible: boolean;

  // Media
  images: string[];

  // SEO
  metaTitle?: string;
  metaDescription?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
