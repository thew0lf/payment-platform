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

// Product image with optional thumbnails
export interface ProductImageData {
  id: string;
  url: string;
  alt?: string;
  position: number;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
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

  // Media - array of image objects with URLs and metadata
  images: ProductImageData[];

  // SEO
  metaTitle?: string;
  metaDescription?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
