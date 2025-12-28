import { Test, TestingModule } from '@nestjs/testing';
import {
  RoastifyService,
  RoastifyCredentials,
  RoastifyProduct,
  RoastifyVariant,
  RoastifyOrder,
  RoastifyStockItem,
  RoastifyShipment,
  RoastifyShippingRate,
  RoastifyBlend,
  RoastifyPaginatedResponse,
  RoastifyCreateOrderRequest,
} from './roastify.service';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('RoastifyService', () => {
  let service: RoastifyService;
  const mockCredentials: RoastifyCredentials = { apiKey: 'rty_test_abc123' };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const createMockProduct = (overrides: Partial<RoastifyProduct> = {}): RoastifyProduct => ({
    id: 'prod_123',
    name: 'Ethiopian Yirgacheffe',
    description: 'Light roasted single origin with notes of blueberry and jasmine',
    sku: 'ETH-YIRG-001',
    productType: 'coffee',
    roastLevel: 'Light',
    origin: 'Ethiopia',
    flavorNotes: ['Blueberry', 'Jasmine', 'Citrus'],
    weight: 340,
    weightUnit: 'g',
    price: 1899,
    currency: 'USD',
    images: [
      { id: 'img_1', url: 'https://cdn.roastify.app/products/eth-yirg.jpg', altText: 'Ethiopian Yirgacheffe', position: 0 },
    ],
    variants: [
      { id: 'var_1', sku: 'ETH-YIRG-WB', name: 'Whole Bean', price: 1899, weight: 340, weightUnit: 'g', grindType: 'Whole Bean', isAvailable: true, inventory: 50 },
      { id: 'var_2', sku: 'ETH-YIRG-GR', name: 'Ground', price: 1899, weight: 340, weightUnit: 'g', grindType: 'Medium', isAvailable: true, inventory: 30 },
    ],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    ...overrides,
  });

  const createMockVariant = (overrides: Partial<RoastifyVariant> = {}): RoastifyVariant => ({
    id: 'var_1',
    sku: 'ETH-YIRG-WB',
    name: 'Whole Bean',
    price: 1899,
    weight: 340,
    weightUnit: 'g',
    grindType: 'Whole Bean',
    isAvailable: true,
    inventory: 50,
    ...overrides,
  });

  const createMockOrder = (overrides: Partial<RoastifyOrder> = {}): RoastifyOrder => ({
    id: 'ord_456',
    externalOrderId: 'EXT-12345',
    status: 'pending',
    items: [{ variantId: 'var_1', quantity: 2, price: 1899 }],
    shippingAddress: {
      name: 'John Doe',
      address1: '123 Coffee Lane',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'US',
    },
    shippingMethod: 'standard',
    subtotal: 3798,
    shippingCost: 599,
    total: 4397,
    currency: 'USD',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    ...overrides,
  });

  const createMockStockItem = (overrides: Partial<RoastifyStockItem> = {}): RoastifyStockItem => ({
    variantId: 'var_1',
    sku: 'ETH-YIRG-WB',
    productName: 'Ethiopian Yirgacheffe',
    variantName: 'Whole Bean',
    quantity: 100,
    reserved: 10,
    available: 90,
    reorderPoint: 20,
    lastUpdated: '2025-01-15T08:00:00Z',
    ...overrides,
  });

  const createMockShipment = (overrides: Partial<RoastifyShipment> = {}): RoastifyShipment => ({
    id: 'shp_789',
    orderId: 'ord_456',
    carrier: 'USPS',
    carrierService: 'Priority Mail',
    trackingNumber: '9400111899223344556677',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223344556677',
    status: 'in_transit',
    estimatedDelivery: '2025-01-18T00:00:00Z',
    weight: 400,
    weightUnit: 'g',
    shippingCost: 599,
    currency: 'USD',
    events: [
      { timestamp: '2025-01-15T14:00:00Z', status: 'label_created', description: 'Shipping label created' },
      { timestamp: '2025-01-16T09:00:00Z', status: 'in_transit', description: 'Package accepted by USPS' },
    ],
    createdAt: '2025-01-15T14:00:00Z',
    updatedAt: '2025-01-16T09:00:00Z',
    ...overrides,
  });

  const createMockBlend = (overrides: Partial<RoastifyBlend> = {}): RoastifyBlend => ({
    id: 'blend_1',
    name: 'House Blend',
    description: 'A balanced blend with notes of chocolate and nuts',
    origins: ['Colombia', 'Brazil'],
    roastLevel: 'Medium',
    flavorProfile: ['Chocolate', 'Nutty', 'Caramel'],
    ...overrides,
  });

  const createPaginatedResponse = <T>(data: T[], hasMore = false, cursor?: string): RoastifyPaginatedResponse<T> => ({
    data,
    pagination: { cursor, hasMore, total: data.length },
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoastifyService],
    }).compile();

    service = module.get<RoastifyService>(RoastifyService);
  });

  // Helper to set up mock fetch response
  const mockFetchResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) => {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {
        get: (name: string) => headers[name] || null,
      },
      json: jest.fn().mockResolvedValueOnce(data),
    });
  };

  const mockFetchError = (status: number, message: string) => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      statusText: message,
      headers: { get: () => null },
      json: jest.fn().mockResolvedValueOnce({ message }),
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // CONNECTION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('testConnection', () => {
    it('should return success for valid API key', async () => {
      mockFetchResponse(createPaginatedResponse([createMockProduct()]), 200, { 'x-ratelimit-remaining': '95' });

      const result = await service.testConnection(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Roastify API connection successful');
      expect(result.accountValid).toBe(true);
      expect(result.rateLimitRemaining).toBe(95);
    });

    it('should return failure for invalid API key (401)', async () => {
      mockFetchError(401, 'Unauthorized');

      const result = await service.testConnection(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid API key');
      expect(result.accountValid).toBe(false);
    });

    it('should return failure for rate limit exceeded (429)', async () => {
      mockFetchError(429, 'Too Many Requests');

      const result = await service.testConnection(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Rate limit exceeded');
      expect(result.accountValid).toBe(true);
      expect(result.rateLimitRemaining).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.testConnection(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
      expect(result.message).toContain('Network error');
    });

    it('should handle unknown errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error string');

      const result = await service.testConnection(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown error');
    });

    it('should handle API errors with custom messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
        json: jest.fn().mockResolvedValueOnce({ message: 'Database connection failed' }),
      });

      const result = await service.testConnection(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('500');
      expect(result.message).toContain('Database connection failed');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CATALOG API TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProducts', () => {
    it('should fetch products with pagination', async () => {
      const products = [createMockProduct(), createMockProduct({ id: 'prod_124', name: 'Colombian Supremo' })];
      mockFetchResponse(createPaginatedResponse(products, false));

      const result = await service.getProducts(mockCredentials, { limit: 50 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Ethiopian Yirgacheffe');
      expect(result.pagination.hasMore).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/catalog/products'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': mockCredentials.apiKey }),
        }),
      );
    });

    it('should pass cursor for pagination', async () => {
      mockFetchResponse(createPaginatedResponse([], false, 'next_cursor'));

      await service.getProducts(mockCredentials, { cursor: 'abc123', limit: 100 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cursor=abc123'),
        expect.any(Object),
      );
    });

    it('should handle empty product list', async () => {
      mockFetchResponse(createPaginatedResponse([], false));

      const result = await service.getProducts(mockCredentials);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('getProduct', () => {
    it('should fetch a single product by ID', async () => {
      const product = createMockProduct();
      mockFetchResponse(product);

      const result = await service.getProduct(mockCredentials, 'prod_123');

      expect(result.id).toBe('prod_123');
      expect(result.name).toBe('Ethiopian Yirgacheffe');
      expect(result.variants).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/catalog/products/prod_123'),
        expect.any(Object),
      );
    });

    it('should throw error for non-existent product', async () => {
      mockFetchError(404, 'Product not found');

      await expect(service.getProduct(mockCredentials, 'nonexistent')).rejects.toThrow('Roastify API error: 404');
    });
  });

  describe('getVariants', () => {
    it('should fetch variants for a product', async () => {
      const variants = [createMockVariant(), createMockVariant({ id: 'var_2', sku: 'ETH-YIRG-GR', grindType: 'Medium' })];
      mockFetchResponse(createPaginatedResponse(variants, false));

      const result = await service.getVariants(mockCredentials, 'prod_123');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].grindType).toBe('Whole Bean');
    });
  });

  describe('getBlends', () => {
    it('should fetch all blends', async () => {
      const blends = [createMockBlend(), createMockBlend({ id: 'blend_2', name: 'Espresso Blend' })];
      mockFetchResponse(createPaginatedResponse(blends, false));

      const result = await service.getBlends(mockCredentials);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('House Blend');
      expect(result.data[0].origins).toContain('Colombia');
    });
  });

  describe('importAllProducts', () => {
    it('should fetch all products across multiple pages', async () => {
      const page1 = createPaginatedResponse([createMockProduct({ id: 'prod_1' })], true, 'cursor_1');
      const page2 = createPaginatedResponse([createMockProduct({ id: 'prod_2' })], true, 'cursor_2');
      const page3 = createPaginatedResponse([createMockProduct({ id: 'prod_3' })], false);

      mockFetchResponse(page1);
      mockFetchResponse(page2);
      mockFetchResponse(page3);

      const result = await service.importAllProducts(mockCredentials);

      expect(result).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle empty catalog', async () => {
      mockFetchResponse(createPaginatedResponse([], false));

      const result = await service.importAllProducts(mockCredentials);

      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ORDERS API TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const orderRequest: RoastifyCreateOrderRequest = {
        externalOrderId: 'EXT-12345',
        items: [{ variantId: 'var_1', quantity: 2 }],
        shippingAddress: {
          name: 'John Doe',
          address1: '123 Coffee Lane',
          city: 'Seattle',
          state: 'WA',
          postalCode: '98101',
          country: 'US',
        },
      };

      const expectedOrder = createMockOrder();
      mockFetchResponse(expectedOrder);

      const result = await service.createOrder(mockCredentials, orderRequest);

      expect(result.id).toBe('ord_456');
      expect(result.externalOrderId).toBe('EXT-12345');
      expect(result.status).toBe('pending');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(orderRequest),
        }),
      );
    });

    it('should handle order creation with notes and shipping method', async () => {
      const orderRequest: RoastifyCreateOrderRequest = {
        externalOrderId: 'EXT-12346',
        items: [{ variantId: 'var_1', quantity: 1, price: 1999 }],
        shippingAddress: {
          name: 'Jane Doe',
          company: 'Acme Corp',
          address1: '456 Bean Street',
          address2: 'Suite 100',
          city: 'Portland',
          state: 'OR',
          postalCode: '97201',
          country: 'US',
          phone: '555-0100',
        },
        shippingMethod: 'express',
        notes: 'Please ship ASAP',
      };

      mockFetchResponse(createMockOrder({ externalOrderId: 'EXT-12346' }));

      const result = await service.createOrder(mockCredentials, orderRequest);

      expect(result).toBeDefined();
    });

    it('should throw error for invalid order data', async () => {
      mockFetchError(400, 'Invalid order data');

      const orderRequest: RoastifyCreateOrderRequest = {
        externalOrderId: '',
        items: [],
        shippingAddress: {
          name: '',
          address1: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
      };

      await expect(service.createOrder(mockCredentials, orderRequest)).rejects.toThrow('Roastify API error: 400');
    });
  });

  describe('getOrder', () => {
    it('should fetch an order by ID', async () => {
      const order = createMockOrder();
      mockFetchResponse(order);

      const result = await service.getOrder(mockCredentials, 'ord_456');

      expect(result.id).toBe('ord_456');
      expect(result.status).toBe('pending');
      expect(result.items).toHaveLength(1);
    });

    it('should fetch shipped order with tracking info', async () => {
      const shippedOrder = createMockOrder({
        status: 'shipped',
        trackingNumber: '1Z999AA10123456784',
        trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
        shippedAt: '2025-01-16T10:00:00Z',
      });
      mockFetchResponse(shippedOrder);

      const result = await service.getOrder(mockCredentials, 'ord_456');

      expect(result.status).toBe('shipped');
      expect(result.trackingNumber).toBeDefined();
      expect(result.shippedAt).toBeDefined();
    });
  });

  describe('getOrders', () => {
    it('should fetch orders with pagination', async () => {
      const orders = [createMockOrder(), createMockOrder({ id: 'ord_457', status: 'shipped' })];
      mockFetchResponse(createPaginatedResponse(orders, true, 'next_cursor'));

      const result = await service.getOrders(mockCredentials, { limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBe('next_cursor');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', async () => {
      const cancelledOrder = createMockOrder({ status: 'cancelled' });
      mockFetchResponse(cancelledOrder);

      const result = await service.cancelOrder(mockCredentials, 'ord_456');

      expect(result.status).toBe('cancelled');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/ord_456/cancel'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should throw error when cancelling non-cancellable order', async () => {
      mockFetchError(422, 'Order cannot be cancelled - already in processing');

      await expect(service.cancelOrder(mockCredentials, 'ord_456')).rejects.toThrow('Roastify API error: 422');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STOCK/INVENTORY API TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getStock', () => {
    it('should fetch all stock levels', async () => {
      const stockItems = [createMockStockItem(), createMockStockItem({ variantId: 'var_2', sku: 'ETH-YIRG-GR' })];
      mockFetchResponse(createPaginatedResponse(stockItems, false));

      const result = await service.getStock(mockCredentials);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].available).toBe(90);
      expect(result.data[0].reserved).toBe(10);
    });
  });

  describe('getVariantStock', () => {
    it('should fetch stock for a specific variant', async () => {
      const stockItem = createMockStockItem();
      mockFetchResponse(stockItem);

      const result = await service.getVariantStock(mockCredentials, 'var_1');

      expect(result.variantId).toBe('var_1');
      expect(result.quantity).toBe(100);
      expect(result.available).toBe(90);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/stock/var_1'),
        expect.any(Object),
      );
    });
  });

  describe('importAllStock', () => {
    it('should fetch all stock across multiple pages', async () => {
      const page1 = createPaginatedResponse([createMockStockItem({ variantId: 'var_1' })], true, 'cursor_1');
      const page2 = createPaginatedResponse([createMockStockItem({ variantId: 'var_2' })], false);

      mockFetchResponse(page1);
      mockFetchResponse(page2);

      const result = await service.importAllStock(mockCredentials);

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SHIPPING API TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOrderShipping', () => {
    it('should fetch shipping info for an order', async () => {
      const shipment = createMockShipment();
      mockFetchResponse(shipment);

      const result = await service.getOrderShipping(mockCredentials, 'ord_456');

      expect(result.orderId).toBe('ord_456');
      expect(result.carrier).toBe('USPS');
      expect(result.status).toBe('in_transit');
      expect(result.events).toHaveLength(2);
    });

    it('should handle delivered shipment', async () => {
      const deliveredShipment = createMockShipment({
        status: 'delivered',
        actualDelivery: '2025-01-17T14:30:00Z',
        events: [
          { timestamp: '2025-01-15T14:00:00Z', status: 'label_created', description: 'Shipping label created' },
          { timestamp: '2025-01-16T09:00:00Z', status: 'in_transit', description: 'Package accepted by USPS' },
          { timestamp: '2025-01-17T14:30:00Z', status: 'delivered', description: 'Delivered to recipient', location: 'Seattle, WA' },
        ],
      });
      mockFetchResponse(deliveredShipment);

      const result = await service.getOrderShipping(mockCredentials, 'ord_456');

      expect(result.status).toBe('delivered');
      expect(result.actualDelivery).toBeDefined();
      expect(result.events).toHaveLength(3);
    });
  });

  describe('getShippingRates', () => {
    it('should fetch available shipping rates', async () => {
      const rates: RoastifyShippingRate[] = [
        { carrier: 'USPS', service: 'Priority Mail', rate: 599, currency: 'USD', estimatedDays: 3 },
        { carrier: 'UPS', service: 'Ground', rate: 799, currency: 'USD', estimatedDays: 5 },
        { carrier: 'FedEx', service: 'Express', rate: 1299, currency: 'USD', estimatedDays: 1, guaranteed: true },
      ];
      mockFetchResponse(rates);

      const result = await service.getShippingRates(mockCredentials, 'ord_456');

      expect(result).toHaveLength(3);
      expect(result[0].carrier).toBe('USPS');
      expect(result[2].guaranteed).toBe(true);
    });
  });

  describe('trackShipment', () => {
    it('should track a shipment by tracking number', async () => {
      const shipment = createMockShipment();
      mockFetchResponse(shipment);

      const result = await service.trackShipment(mockCredentials, '9400111899223344556677');

      expect(result.trackingNumber).toBe('9400111899223344556677');
      expect(result.status).toBe('in_transit');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/shipments/track/9400111899223344556677'),
        expect.any(Object),
      );
    });

    it('should handle exception status', async () => {
      const exceptionShipment = createMockShipment({
        status: 'exception',
        events: [
          { timestamp: '2025-01-15T14:00:00Z', status: 'label_created', description: 'Shipping label created' },
          { timestamp: '2025-01-16T09:00:00Z', status: 'in_transit', description: 'Package accepted by USPS' },
          { timestamp: '2025-01-17T08:00:00Z', status: 'exception', description: 'Delivery attempted - recipient not available' },
        ],
      });
      mockFetchResponse(exceptionShipment);

      const result = await service.trackShipment(mockCredentials, '9400111899223344556677');

      expect(result.status).toBe('exception');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VARIANTS API TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getVariant', () => {
    it('should fetch a variant by ID', async () => {
      const variant = createMockVariant();
      mockFetchResponse(variant);

      const result = await service.getVariant(mockCredentials, 'var_1');

      expect(result.id).toBe('var_1');
      expect(result.sku).toBe('ETH-YIRG-WB');
      expect(result.grindType).toBe('Whole Bean');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/variants/var_1'),
        expect.any(Object),
      );
    });
  });

  describe('getProductVariants', () => {
    it('should fetch variants via dedicated endpoint', async () => {
      const variants = [createMockVariant(), createMockVariant({ id: 'var_2', grindType: 'Fine' })];
      mockFetchResponse(createPaginatedResponse(variants, false));

      const result = await service.getProductVariants(mockCredentials, 'prod_123');

      expect(result.data).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/variants/product/prod_123'),
        expect.any(Object),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should throw meaningful error for server errors', async () => {
      mockFetchError(500, 'Internal server error');

      await expect(service.getProducts(mockCredentials)).rejects.toThrow('Roastify API error: 500');
    });

    it('should throw error for unauthorized requests', async () => {
      mockFetchError(401, 'Unauthorized');

      await expect(service.getProducts(mockCredentials)).rejects.toThrow('Roastify API error: 401');
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      await expect(service.getProducts(mockCredentials)).rejects.toThrow('Roastify API error: 500');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // API REQUEST HEADER TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('request headers', () => {
    it('should include correct headers in all requests', async () => {
      mockFetchResponse(createPaginatedResponse([createMockProduct()], false));

      await service.getProducts(mockCredentials);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'rty_test_abc123',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should use correct base URL', async () => {
      mockFetchResponse(createPaginatedResponse([], false));

      await service.getProducts(mockCredentials);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.roastify.app/v1'),
        expect.any(Object),
      );
    });

    it('should include AbortSignal for timeout', async () => {
      mockFetchResponse(createPaginatedResponse([], false));

      await service.getProducts(mockCredentials);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  describe('timeout handling', () => {
    it('should throw timeout error when request takes too long', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(service.getProducts(mockCredentials)).rejects.toThrow('timed out');
    });
  });
});
