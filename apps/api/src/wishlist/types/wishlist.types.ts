/**
 * Wishlist System Types
 */

export interface WishlistItemSnapshot {
  name: string;
  sku: string;
  image?: string;
  price: number;
  compareAtPrice?: number;
  [key: string]: string | number | undefined;
}

export interface WishlistItemData {
  id: string;
  wishlistId: string;
  productId: string;
  variantId?: string;
  productSnapshot: WishlistItemSnapshot;
  priority: number;
  notes?: string;
  addedAt: Date;
}

export interface WishlistData {
  id: string;
  companyId: string;
  siteId?: string;
  customerId?: string;
  sessionToken?: string;
  name: string;
  isPublic: boolean;
  sharedUrl?: string;
  items: WishlistItemData[];
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWishlistInput {
  name?: string;
  siteId?: string;
  isPublic?: boolean;
}

export interface AddToWishlistInput {
  productId: string;
  variantId?: string;
  priority?: number;
  notes?: string;
}

export interface UpdateWishlistInput {
  name?: string;
  isPublic?: boolean;
}

export interface UpdateWishlistItemInput {
  priority?: number;
  notes?: string;
}

export interface ShareWishlistInput {
  isPublic: boolean;
}

export interface MoveToCartInput {
  itemId: string;
  quantity?: number;
}

export interface WishlistQueryParams {
  sessionToken?: string;
  customerId?: string;
  siteId?: string;
  isPublic?: boolean;
  includeItems?: boolean;
}

export interface WishlistStats {
  totalItems: number;
  totalValue: number;
  oldestItemDate?: Date;
  newestItemDate?: Date;
}
