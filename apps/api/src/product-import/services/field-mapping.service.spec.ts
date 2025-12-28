import { Test, TestingModule } from '@nestjs/testing';
import { FieldMappingService } from './field-mapping.service';
import { ExternalProduct, FieldMapping } from '../types/product-import.types';

describe('FieldMappingService', () => {
  let service: FieldMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldMappingService],
    }).compile();

    service = module.get<FieldMappingService>(FieldMappingService);
  });

  // ═══════════════════════════════════════════════════════════════
  // BASIC MAPPING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('applyMappings', () => {
    it('should map simple fields', () => {
      const product: ExternalProduct = {
        id: 'prod_1',
        sku: 'SKU001',
        name: 'Test Product',
        description: 'A test product',
        price: 1999,
        currency: 'USD',
      };

      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'productName' },
        { sourceField: 'sku', targetField: 'productSku' },
      ];

      const result = service.applyMappings(product, mappings);

      expect(result.data.productName).toBe('Test Product');
      expect(result.data.productSku).toBe('SKU001');
      expect(result.validation.isValid).toBe(true);
    });

    it('should handle nested fields', () => {
      const product: ExternalProduct = {
        id: 'prod_1',
        sku: 'SKU001',
        name: 'Test',
        price: 1999,
        currency: 'USD',
        metadata: {
          origin: 'Brazil',
          roastLevel: 'Medium',
        },
      };

      const mappings: FieldMapping[] = [
        { sourceField: 'metadata.origin', targetField: 'origin' },
        { sourceField: 'metadata.roastLevel', targetField: 'roast' },
      ];

      const result = service.applyMappings(product, mappings);

      expect(result.data.origin).toBe('Brazil');
      expect(result.data.roast).toBe('Medium');
    });

    it('should apply default values when source is undefined', () => {
      const product: ExternalProduct = {
        id: 'prod_1',
        sku: 'SKU001',
        name: 'Test',
        price: 1999,
        currency: 'USD',
      };

      const mappings: FieldMapping[] = [
        { sourceField: 'missing', targetField: 'value', defaultValue: 'default' },
        { sourceField: 'description', targetField: 'desc', defaultValue: 'No description' },
      ];

      const result = service.applyMappings(product, mappings);

      expect(result.data.value).toBe('default');
      expect(result.data.desc).toBe('No description');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRANSFORM TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('transforms', () => {
    const product: ExternalProduct = {
      id: 'prod_1',
      sku: 'SKU001',
      name: '  Test Product  ',
      price: 1999,
      currency: 'usd',
    };

    it('should apply uppercase transform', () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'currency', targetField: 'currency', transform: 'uppercase' },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.currency).toBe('USD');
    });

    it('should apply lowercase transform', () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', transform: 'lowercase' },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('  test product  ');
    });

    it('should apply trim transform', () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', transform: 'trim' },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Test Product');
    });

    it('should apply capitalize transform', () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'currency', targetField: 'currency', transform: 'capitalize' },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.currency).toBe('Usd');
    });

    it('should apply capitalizeWords transform', () => {
      const testProduct = { ...product, name: 'the quick brown fox' };
      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', transform: 'capitalizeWords' },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.name).toBe('The Quick Brown Fox');
    });

    it('should apply slug transform', () => {
      const testProduct = { ...product, name: 'The Quick Brown Fox!' };
      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'slug', transform: 'slug' },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.slug).toBe('the-quick-brown-fox');
    });

    it('should apply stripHtml transform', () => {
      const testProduct = { ...product, description: '<p>Hello <strong>World</strong></p>' };
      const mappings: FieldMapping[] = [
        { sourceField: 'description', targetField: 'description', transform: 'stripHtml' },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.description).toBe('Hello World');
    });

    it('should apply centsToDecimal transform', () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'price', targetField: 'price', transform: 'centsToDecimal' },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.price).toBe(19.99);
    });

    it('should apply decimalToCents transform', () => {
      const testProduct = { ...product, price: 19.99 };
      const mappings: FieldMapping[] = [
        { sourceField: 'price', targetField: 'price', transform: 'decimalToCents' },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.price).toBe(1999);
    });

    it('should apply round/floor/ceil transforms', () => {
      const testProduct = { ...product, price: 19.56 };
      expect(
        service.applyMappings(testProduct, [{ sourceField: 'price', targetField: 'p', transform: 'round' }]).data.p,
      ).toBe(20);
      expect(
        service.applyMappings(testProduct, [{ sourceField: 'price', targetField: 'p', transform: 'floor' }]).data.p,
      ).toBe(19);
      expect(
        service.applyMappings(testProduct, [{ sourceField: 'price', targetField: 'p', transform: 'ceil' }]).data.p,
      ).toBe(20);
    });

    it('should apply boolean transform', () => {
      const testProduct = { ...product, metadata: { active: 'yes', inactive: '' } };
      const mappings: FieldMapping[] = [
        { sourceField: 'metadata.active', targetField: 'active', transform: 'boolean' },
        { sourceField: 'metadata.inactive', targetField: 'inactive', transform: 'boolean' },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.active).toBe(true);
      expect(result.data.inactive).toBe(false);
    });

    it('should apply array transform', () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'names', transform: 'array' },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.names).toEqual(['  Test Product  ']);
    });

    it('should apply json transform', () => {
      const testProduct = { ...product, metadata: { data: '{"key": "value"}' } };
      const mappings: FieldMapping[] = [
        { sourceField: 'metadata.data', targetField: 'parsed', transform: 'json' },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.parsed).toEqual({ key: 'value' });
    });

    it('should apply isoDate transform', () => {
      const testProduct = { ...product, metadata: { date: '2024-01-15' } };
      const mappings: FieldMapping[] = [
        { sourceField: 'metadata.date', targetField: 'date', transform: 'isoDate' },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(typeof result.data.date).toBe('string');
      expect((result.data.date as string).startsWith('2024-01-15')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CHAINED TRANSFORMS
  // ═══════════════════════════════════════════════════════════════

  describe('chained transforms', () => {
    it('should apply multiple transforms in sequence', () => {
      const product: ExternalProduct = {
        id: 'prod_1',
        sku: 'SKU001',
        name: '  hello world  ',
        price: 1999,
        currency: 'USD',
      };

      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          transform: [
            { type: 'trim' },
            { type: 'capitalizeWords' },
          ],
        },
      ];

      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Hello World');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONFIG-BASED TRANSFORMS
  // ═══════════════════════════════════════════════════════════════

  describe('config-based transforms', () => {
    const product: ExternalProduct = {
      id: 'prod_1',
      sku: 'SKU001',
      name: 'Test Product',
      price: 1999.99,
      currency: 'USD',
    };

    it('should apply replace transform', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          transform: {
            type: 'replace',
            options: { search: 'Test', replace: 'Demo' },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Demo Product');
    });

    it('should apply replace transform with regex', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          transform: {
            type: 'replace',
            options: { search: '[a-z]', replace: 'X', regex: true, global: true },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('TXXX PXXXXXX');
    });

    it('should apply split transform', () => {
      const testProduct = { ...product, name: 'one,two,three' };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'parts',
          transform: { type: 'split', options: { delimiter: ',' } },
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.parts).toEqual(['one', 'two', 'three']);
    });

    it('should apply split transform with index', () => {
      const testProduct = { ...product, name: 'one,two,three' };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'second',
          transform: { type: 'split', options: { delimiter: ',', index: 1 } },
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.second).toBe('two');
    });

    it('should apply join transform', () => {
      const testProduct = { ...product, tags: ['coffee', 'organic', 'fair-trade'] };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'tags',
          targetField: 'tagString',
          transform: { type: 'join', options: { delimiter: ', ' } },
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.tagString).toBe('coffee, organic, fair-trade');
    });

    it('should apply substring transform', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'short',
          transform: { type: 'substring', options: { start: 0, end: 4 } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.short).toBe('Test');
    });

    it('should apply pad transform', () => {
      const testProduct = { ...product, sku: '123' };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'sku',
          targetField: 'paddedSku',
          transform: { type: 'pad', options: { length: 8, char: '0', position: 'start' } },
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.paddedSku).toBe('00000123');
    });

    it('should apply template transform', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'display',
          transform: { type: 'template', options: { template: '{{name}} ({{sku}})' } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.display).toBe('Test Product (SKU001)');
    });

    it('should apply lookup transform', () => {
      const testProduct = { ...product, metadata: { status: 'A' } };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'metadata.status',
          targetField: 'statusLabel',
          transform: {
            type: 'lookup',
            options: { map: { A: 'Active', I: 'Inactive', P: 'Pending' }, default: 'Unknown' },
          },
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.statusLabel).toBe('Active');
    });

    it('should apply math transform', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'price',
          targetField: 'discounted',
          transform: { type: 'math', options: { operation: 'multiply', operand: 0.9 } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.discounted).toBeCloseTo(1799.991);
    });

    it('should apply numberFormat transform', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'price',
          targetField: 'formatted',
          transform: { type: 'numberFormat', options: { decimals: 2, prefix: '$' } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.formatted).toBe('$1,999.99');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONDITIONAL MAPPING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('conditional mappings', () => {
    const product: ExternalProduct = {
      id: 'prod_1',
      sku: 'SKU001',
      name: 'Test Product',
      price: 1999,
      currency: 'USD',
      metadata: { status: 'active', quantity: 50 },
    };

    it('should apply mapping when simple condition is met', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          condition: {
            type: 'simple',
            rule: { field: 'metadata.status', operator: 'equals', value: 'active' },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Test Product');
    });

    it('should skip mapping when simple condition is not met', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          condition: {
            type: 'simple',
            rule: { field: 'metadata.status', operator: 'equals', value: 'inactive' },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBeUndefined();
    });

    it('should apply default value when condition not met', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          defaultValue: 'Default Name',
          condition: {
            type: 'simple',
            rule: { field: 'metadata.status', operator: 'equals', value: 'inactive' },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Default Name');
    });

    it('should evaluate isEmpty condition', () => {
      const testProduct = { ...product, description: undefined };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'fallback',
          condition: { type: 'simple', rule: { field: 'description', operator: 'isEmpty' } },
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.data.fallback).toBe('Test Product');
    });

    it('should evaluate isNotEmpty condition', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          condition: { type: 'simple', rule: { field: 'metadata.status', operator: 'isNotEmpty' } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Test Product');
    });

    it('should evaluate contains condition', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'price',
          targetField: 'price',
          condition: { type: 'simple', rule: { field: 'name', operator: 'contains', value: 'Test' } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.price).toBe(1999);
    });

    it('should evaluate greaterThan condition', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'premium',
          condition: { type: 'simple', rule: { field: 'price', operator: 'greaterThan', value: 1000 } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.premium).toBe('Test Product');
    });

    it('should evaluate compound AND condition', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          condition: {
            type: 'compound',
            rules: {
              operator: 'and',
              conditions: [
                { field: 'metadata.status', operator: 'equals', value: 'active' },
                { field: 'price', operator: 'greaterThan', value: 1000 },
              ],
            },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Test Product');
    });

    it('should evaluate compound OR condition', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          condition: {
            type: 'compound',
            rules: {
              operator: 'or',
              conditions: [
                { field: 'metadata.status', operator: 'equals', value: 'inactive' },
                { field: 'price', operator: 'greaterThan', value: 1000 },
              ],
            },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Test Product');
    });

    it('should evaluate in condition', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          condition: {
            type: 'simple',
            rule: { field: 'currency', operator: 'in', value: ['USD', 'EUR', 'GBP'] },
          },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.name).toBe('Test Product');
    });

    it('should evaluate matches (regex) condition', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'price',
          targetField: 'price',
          condition: { type: 'simple', rule: { field: 'sku', operator: 'matches', value: '^SKU\\d+$' } },
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.data.price).toBe(1999);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('validation', () => {
    const product: ExternalProduct = {
      id: 'prod_1',
      sku: 'SKU001',
      name: 'Test',
      price: 1999,
      currency: 'USD',
    };

    it('should validate required fields', () => {
      const testProduct = { ...product, name: undefined };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          validation: [{ type: 'required' }],
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('required');
    });

    it('should validate minLength', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          validation: [{ type: 'minLength', value: 10 }],
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('minLength');
    });

    it('should validate maxLength', () => {
      const testProduct = { ...product, name: 'This is a very long product name that exceeds the limit' };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          validation: [{ type: 'maxLength', value: 20 }],
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('maxLength');
    });

    it('should validate min value', () => {
      const testProduct = { ...product, price: 5 };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'price',
          targetField: 'price',
          validation: [{ type: 'min', value: 100 }],
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('min');
    });

    it('should validate max value', () => {
      const testProduct = { ...product, price: 100000 };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'price',
          targetField: 'price',
          validation: [{ type: 'max', value: 99999 }],
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('max');
    });

    it('should validate pattern', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'sku',
          targetField: 'sku',
          validation: [{ type: 'pattern', value: '^PROD-\\d{4}$' }],
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('pattern');
    });

    it('should validate email', () => {
      const testProduct = { ...product, metadata: { email: 'invalid-email' } };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'metadata.email',
          targetField: 'email',
          validation: [{ type: 'email' }],
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('email');
    });

    it('should validate url', () => {
      const testProduct = { ...product, metadata: { website: 'not-a-url' } };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'metadata.website',
          targetField: 'website',
          validation: [{ type: 'url' }],
        },
      ];
      const result = service.applyMappings(testProduct, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('url');
    });

    it('should validate enum', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'currency',
          targetField: 'currency',
          validation: [{ type: 'enum', value: ['EUR', 'GBP'] }],
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors[0].rule).toBe('enum');
    });

    it('should pass validation for valid data', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          validation: [
            { type: 'required' },
            { type: 'minLength', value: 2 },
            { type: 'maxLength', value: 100 },
          ],
        },
        {
          sourceField: 'price',
          targetField: 'price',
          validation: [
            { type: 'min', value: 0 },
            { type: 'max', value: 999999 },
          ],
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
    });

    it('should use custom error messages', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          validation: [{ type: 'minLength', value: 10, message: 'Product name too short!' }],
        },
      ];
      const result = service.applyMappings(product, mappings);
      expect(result.validation.errors[0].message).toBe('Product name too short!');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHOD TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getNestedValue', () => {
    it('should get nested values', () => {
      const obj = { a: { b: { c: 'value' } } } as Record<string, unknown>;
      expect(service.getNestedValue(obj, 'a.b.c')).toBe('value');
    });

    it('should return undefined for missing paths', () => {
      const obj = { a: { b: 'value' } } as Record<string, unknown>;
      expect(service.getNestedValue(obj, 'a.x.y')).toBeUndefined();
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple products', () => {
      const products: ExternalProduct[] = [
        { id: '1', sku: 'SKU1', name: 'Valid Product', price: 1999, currency: 'USD' },
        { id: '2', sku: 'SKU2', name: '', price: 1999, currency: 'USD' },
      ];

      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', validation: [{ type: 'required' }] },
      ];

      const results = service.validateBatch(products, mappings);

      expect(results[0].validation.isValid).toBe(true);
      expect(results[1].validation.isValid).toBe(false);
    });
  });
});
