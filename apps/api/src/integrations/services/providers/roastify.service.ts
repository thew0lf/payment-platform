import { Injectable, Logger } from '@nestjs/common';

export interface RoastifyCredentials {
  apiKey: string;
}

export interface RoastifyTestResult {
  success: boolean;
  message: string;
  accountValid?: boolean;
  rateLimitRemaining?: number;
}

// ═══════════════════════════════════════════════════════════════
// CATALOG TYPES
// ═══════════════════════════════════════════════════════════════

export interface RoastifyProduct {
  id: string;
  name: string;
  description: string;
  sku: string;
  productType: 'coffee' | 'merchandise' | 'subscription';
  roastLevel?: string;
  origin?: string;
  flavorNotes?: string[];
  weight?: number;
  weightUnit?: string;
  price: number; // in cents
  currency: string;
  images: RoastifyImage[];
  variants: RoastifyVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoastifyVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  weight?: number;
  weightUnit?: string;
  grindType?: string;
  isAvailable: boolean;
  inventory?: number;
}

export interface RoastifyImage {
  id: string;
  url: string;
  altText?: string;
  position: number;
}

export interface RoastifyBlend {
  id: string;
  name: string;
  description: string;
  origins: string[];
  roastLevel: string;
  flavorProfile: string[];
}

// ═══════════════════════════════════════════════════════════════
// ORDER TYPES
// ═══════════════════════════════════════════════════════════════

export interface RoastifyOrderItem {
  variantId: string;
  quantity: number;
  price?: number; // Optional - uses variant price if not provided
}

export interface RoastifyAddress {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface RoastifyCreateOrderRequest {
  externalOrderId: string; // Your order ID for reference
  items: RoastifyOrderItem[];
  shippingAddress: RoastifyAddress;
  shippingMethod?: string;
  notes?: string;
}

export interface RoastifyOrder {
  id: string;
  externalOrderId: string;
  status: 'pending' | 'processing' | 'roasting' | 'shipped' | 'delivered' | 'cancelled';
  items: RoastifyOrderItem[];
  shippingAddress: RoastifyAddress;
  shippingMethod: string;
  trackingNumber?: string;
  trackingUrl?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════

export interface RoastifyPaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

export interface RoastifyPaginationOptions {
  cursor?: string;
  limit?: number; // max 100
}

// ═══════════════════════════════════════════════════════════════
// STOCK / INVENTORY TYPES
// ═══════════════════════════════════════════════════════════════

export interface RoastifyStockItem {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  reserved: number;
  available: number;
  reorderPoint?: number;
  lastUpdated: string;
}

export interface RoastifyStockUpdate {
  variantId: string;
  quantity: number;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// SHIPPING TYPES
// ═══════════════════════════════════════════════════════════════

export interface RoastifyShipment {
  id: string;
  orderId: string;
  carrier: string;
  carrierService: string;
  trackingNumber: string;
  trackingUrl: string;
  status: 'pending' | 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  estimatedDelivery?: string;
  actualDelivery?: string;
  weight?: number;
  weightUnit?: string;
  shippingCost: number;
  currency: string;
  events: RoastifyShippingEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface RoastifyShippingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

export interface RoastifyShippingRate {
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  estimatedDays: number;
  guaranteed?: boolean;
}

@Injectable()
export class RoastifyService {
  private readonly logger = new Logger(RoastifyService.name);
  private readonly baseUrl = 'https://api.roastify.app/v1';
  private readonly requestTimeout = 30000; // 30 seconds

  /**
   * Test the Roastify API connection
   */
  async testConnection(credentials: RoastifyCredentials): Promise<RoastifyTestResult> {
    try {
      // Test by fetching the first page of products
      const response = await fetch(`${this.baseUrl}/catalog/products?limit=1`, {
        method: 'GET',
        headers: {
          'x-api-key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining') || '100');
        return {
          success: true,
          message: 'Roastify API connection successful',
          accountValid: true,
          rateLimitRemaining,
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Check your Roastify dashboard for the correct key.',
          accountValid: false,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          message: 'Rate limit exceeded. Try again in a minute.',
          accountValid: true,
          rateLimitRemaining: 0,
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `API error: ${response.status} - ${errorData.message || response.statusText}`,
        accountValid: response.status !== 401,
      };
    } catch (error) {
      this.logger.error('Roastify connection test failed', error);
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CATALOG API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all USER products (not catalog templates)
   * Endpoint: GET /products
   */
  async getProducts(
    credentials: RoastifyCredentials,
    options?: RoastifyPaginationOptions,
  ): Promise<{ products: any[]; pageInfo: { hasNextPage: boolean; endCursor?: string } }> {
    const url = new URL(`${this.baseUrl}/products`);
    if (options?.cursor) url.searchParams.append('cursor', options.cursor);
    if (options?.limit) url.searchParams.append('pageSize', String(options.limit));

    return this.request<{ products: any[]; pageInfo: { hasNextPage: boolean; endCursor?: string } }>(
      credentials,
      url.toString(),
    );
  }

  /**
   * Get a single product by ID
   */
  async getProduct(credentials: RoastifyCredentials, productId: string): Promise<RoastifyProduct> {
    return this.request<RoastifyProduct>(
      credentials,
      `${this.baseUrl}/catalog/products/${productId}`,
    );
  }

  /**
   * Get all variants for a product
   */
  async getVariants(
    credentials: RoastifyCredentials,
    productId: string,
    options?: RoastifyPaginationOptions,
  ): Promise<RoastifyPaginatedResponse<RoastifyVariant>> {
    const url = new URL(`${this.baseUrl}/catalog/products/${productId}/variants`);
    if (options?.cursor) url.searchParams.append('cursor', options.cursor);
    if (options?.limit) url.searchParams.append('limit', String(options.limit));

    return this.request<RoastifyPaginatedResponse<RoastifyVariant>>(credentials, url.toString());
  }

  /**
   * Get all available blends
   */
  async getBlends(
    credentials: RoastifyCredentials,
    options?: RoastifyPaginationOptions,
  ): Promise<RoastifyPaginatedResponse<RoastifyBlend>> {
    const url = new URL(`${this.baseUrl}/catalog/blends`);
    if (options?.cursor) url.searchParams.append('cursor', options.cursor);
    if (options?.limit) url.searchParams.append('limit', String(options.limit));

    return this.request<RoastifyPaginatedResponse<RoastifyBlend>>(credentials, url.toString());
  }

  // ═══════════════════════════════════════════════════════════════
  // ORDERS API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new fulfillment order
   */
  async createOrder(
    credentials: RoastifyCredentials,
    order: RoastifyCreateOrderRequest,
  ): Promise<RoastifyOrder> {
    return this.request<RoastifyOrder>(credentials, `${this.baseUrl}/orders`, {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  /**
   * Get an order by ID
   */
  async getOrder(credentials: RoastifyCredentials, orderId: string): Promise<RoastifyOrder> {
    return this.request<RoastifyOrder>(credentials, `${this.baseUrl}/orders/${orderId}`);
  }

  /**
   * Get all orders with pagination
   */
  async getOrders(
    credentials: RoastifyCredentials,
    options?: RoastifyPaginationOptions,
  ): Promise<RoastifyPaginatedResponse<RoastifyOrder>> {
    const url = new URL(`${this.baseUrl}/orders`);
    if (options?.cursor) url.searchParams.append('cursor', options.cursor);
    if (options?.limit) url.searchParams.append('limit', String(options.limit));

    return this.request<RoastifyPaginatedResponse<RoastifyOrder>>(credentials, url.toString());
  }

  /**
   * Cancel an order (only possible before processing starts)
   */
  async cancelOrder(credentials: RoastifyCredentials, orderId: string): Promise<RoastifyOrder> {
    return this.request<RoastifyOrder>(credentials, `${this.baseUrl}/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STOCK / INVENTORY API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current stock levels for all variants
   */
  async getStock(
    credentials: RoastifyCredentials,
    options?: RoastifyPaginationOptions,
  ): Promise<RoastifyPaginatedResponse<RoastifyStockItem>> {
    const url = new URL(`${this.baseUrl}/stock`);
    if (options?.cursor) url.searchParams.append('cursor', options.cursor);
    if (options?.limit) url.searchParams.append('limit', String(options.limit));

    return this.request<RoastifyPaginatedResponse<RoastifyStockItem>>(credentials, url.toString());
  }

  /**
   * Get stock for a specific variant
   */
  async getVariantStock(credentials: RoastifyCredentials, variantId: string): Promise<RoastifyStockItem> {
    return this.request<RoastifyStockItem>(credentials, `${this.baseUrl}/stock/${variantId}`);
  }

  /**
   * Import all stock levels from Roastify
   */
  async importAllStock(credentials: RoastifyCredentials): Promise<RoastifyStockItem[]> {
    const allStock: RoastifyStockItem[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getStock(credentials, { cursor, limit: 100 });
      allStock.push(...response.data);
      cursor = response.pagination.cursor;
      hasMore = response.pagination.hasMore;
    }

    this.logger.log(`Imported stock for ${allStock.length} variants from Roastify`);
    return allStock;
  }

  // ═══════════════════════════════════════════════════════════════
  // SHIPPING API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get shipping info for an order
   */
  async getOrderShipping(credentials: RoastifyCredentials, orderId: string): Promise<RoastifyShipment> {
    return this.request<RoastifyShipment>(credentials, `${this.baseUrl}/orders/${orderId}/shipping`);
  }

  /**
   * Get available shipping rates for an order
   */
  async getShippingRates(
    credentials: RoastifyCredentials,
    orderId: string,
  ): Promise<RoastifyShippingRate[]> {
    return this.request<RoastifyShippingRate[]>(
      credentials,
      `${this.baseUrl}/orders/${orderId}/shipping/rates`,
    );
  }

  /**
   * Track a shipment by tracking number
   */
  async trackShipment(
    credentials: RoastifyCredentials,
    trackingNumber: string,
  ): Promise<RoastifyShipment> {
    return this.request<RoastifyShipment>(
      credentials,
      `${this.baseUrl}/shipments/track/${trackingNumber}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VARIANTS API (Direct access)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a specific variant by ID (for direct access without product ID)
   */
  async getVariant(credentials: RoastifyCredentials, variantId: string): Promise<RoastifyVariant> {
    return this.request<RoastifyVariant>(credentials, `${this.baseUrl}/variants/${variantId}`);
  }

  /**
   * Get variants by product ID via dedicated variants endpoint
   */
  async getProductVariants(
    credentials: RoastifyCredentials,
    productId: string,
    options?: RoastifyPaginationOptions,
  ): Promise<RoastifyPaginatedResponse<RoastifyVariant>> {
    const url = new URL(`${this.baseUrl}/variants/product/${productId}`);
    if (options?.cursor) url.searchParams.append('cursor', options.cursor);
    if (options?.limit) url.searchParams.append('limit', String(options.limit));

    return this.request<RoastifyPaginatedResponse<RoastifyVariant>>(credentials, url.toString());
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Make an authenticated request to the Roastify API with timeout
   */
  private async request<T>(
    credentials: RoastifyCredentials,
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'x-api-key': credentials.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        this.logger.error(`Roastify API error: ${response.status} - ${errorMessage}`);
        throw new Error(`Roastify API error: ${response.status} - ${errorMessage}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Roastify API request timed out after ${this.requestTimeout}ms`);
        throw new Error(`Roastify API request timed out after ${this.requestTimeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Import all USER products from Roastify
   * Uses GET /products endpoint (not /catalog/products)
   */
  async importAllProducts(credentials: RoastifyCredentials): Promise<any[]> {
    const allProducts: any[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getProducts(credentials, { cursor, limit: 100 });

      // Response format: { products: [], pageInfo: { hasNextPage, endCursor } }
      const products = response.products || [];
      if (!Array.isArray(products)) {
        this.logger.warn(`Unexpected Roastify response format: ${JSON.stringify(response).substring(0, 200)}`);
        break;
      }

      allProducts.push(...products);
      cursor = response.pageInfo?.endCursor;
      hasMore = response.pageInfo?.hasNextPage ?? false;
    }

    this.logger.log(`Imported ${allProducts.length} products from Roastify`);
    return allProducts;
  }

  /**
   * Import all blends (coffee products) from Roastify
   * These are the actual coffee blends like "TRANQUILO", "EL PUENTE", etc.
   */
  async importAllBlends(credentials: RoastifyCredentials): Promise<RoastifyBlend[]> {
    const allBlends: RoastifyBlend[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getBlends(credentials, { cursor, limit: 100 });

      // Handle different response formats
      const blends = response.data || (response as any).blends || (Array.isArray(response) ? response : []);
      if (!Array.isArray(blends)) {
        this.logger.warn(`Unexpected Roastify blends response format: ${JSON.stringify(response).substring(0, 200)}`);
        break;
      }

      allBlends.push(...blends);
      cursor = response.pagination?.cursor;
      hasMore = response.pagination?.hasMore ?? false;
    }

    this.logger.log(`Imported ${allBlends.length} blends from Roastify`);
    return allBlends;
  }
}
