/**
 * Product Types
 */

export { ProductCategory, ProductStatus, RoastLevel } from '@prisma/client';

export interface Product {
  id: string;
  companyId: string;
  sku: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;

  // Coffee-specific
  roastLevel?: string;
  origin?: string;
  flavorNotes: string[];
  process?: string;
  altitude?: string;
  varietal?: string;

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
