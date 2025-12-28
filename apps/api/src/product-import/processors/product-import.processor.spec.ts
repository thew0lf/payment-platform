import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { ProductImportProcessor } from './product-import.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { RoastifyService } from '../../integrations/services/providers/roastify.service';
import { FieldMappingService } from '../services/field-mapping.service';
import { ImageImportService } from '../services/image-import.service';
import { ImportEventService } from '../services/import-event.service';
import { ImportJobStatus, ImportJobPhase } from '@prisma/client';
import { ImportJobData, ExternalProduct } from '../types/product-import.types';

describe('ProductImportProcessor', () => {
  let module: TestingModule;
  let processor: ProductImportProcessor;
  let prisma: jest.Mocked<PrismaService>;
  let roastifyService: jest.Mocked<RoastifyService>;
  let fieldMappingService: jest.Mocked<FieldMappingService>;

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company_123';
  const mockClientId = 'client_456';
  const mockJobId = 'job_789';
  const mockIntegrationId = 'integration_abc';

  const createMockJobData = (overrides: Partial<ImportJobData> = {}): ImportJobData => ({
    jobId: mockJobId,
    companyId: mockCompanyId,
    clientId: mockClientId,
    integrationId: mockIntegrationId,
    provider: 'ROASTIFY',
    config: {
      provider: 'ROASTIFY',
      integrationId: mockIntegrationId,
      importImages: false,
      generateThumbnails: false,
      skipDuplicates: true,
      updateExisting: false,
    },
    createdBy: 'user_123',
    ...overrides,
  });

  const createMockJob = (data: ImportJobData): Job<ImportJobData> =>
    ({
      id: 'bull_123',
      data,
      progress: jest.fn(),
    }) as unknown as Job<ImportJobData>;

  const createMockIntegration = (overrides = {}) => ({
    id: mockIntegrationId,
    clientId: mockClientId,
    provider: 'ROASTIFY',
    credentials: { apiKey: 'test_api_key' },
    status: 'ACTIVE',
    ...overrides,
  });

  const createMockRoastifyProduct = (overrides = {}) => ({
    id: 'rty_prod_123',
    name: 'Ethiopian Yirgacheffe',
    description: 'Light roasted coffee',
    sku: 'ETH-YIRG-001',
    productType: 'coffee',
    roastLevel: 'Light',
    origin: 'Ethiopia',
    flavorNotes: ['Blueberry', 'Jasmine'],
    weight: 340,
    weightUnit: 'g',
    price: 1899,
    currency: 'USD',
    images: [{ id: 'img_1', url: 'https://example.com/image.jpg', altText: 'Coffee', position: 0 }],
    variants: [{ id: 'var_1', sku: 'ETH-YIRG-WB', name: 'Whole Bean', price: 1899, inventory: 50 }],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    ...overrides,
  });

  const createMockExternalProduct = (overrides: Partial<ExternalProduct> = {}): ExternalProduct => ({
    id: 'ext_prod_123',
    sku: 'SKU-001',
    name: 'Test Coffee',
    description: 'A test coffee product',
    price: 1999,
    currency: 'USD',
    images: [],
    variants: [],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ProductImportProcessor,
        {
          provide: PrismaService,
          useValue: {
            clientIntegration: {
              findFirst: jest.fn(),
            },
            productImportJob: {
              update: jest.fn(),
            },
            fieldMappingProfile: {
              findFirst: jest.fn(),
            },
            product: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: RoastifyService,
          useValue: {
            importAllProducts: jest.fn(),
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            applyMappings: jest.fn().mockReturnValue({
              data: { name: 'Mapped Name', description: 'Mapped Description', price: 18.99, currency: 'USD' },
              validation: { isValid: true, errors: [] },
            }),
            evaluateCondition: jest.fn().mockReturnValue(true),
            validateField: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
          },
        },
        {
          provide: ImageImportService,
          useValue: {
            getS3Credentials: jest.fn().mockResolvedValue(null),
            importProductImages: jest.fn().mockResolvedValue([]),
            updateProductImages: jest.fn().mockResolvedValue(undefined),
            calculateTotalImages: jest.fn().mockReturnValue(0),
          },
        },
        {
          provide: ImportEventService,
          useValue: {
            emitJobStarted: jest.fn(),
            emitProgress: jest.fn(),
            emitPhaseChanged: jest.fn(),
            emitProductImported: jest.fn(),
            emitProductSkipped: jest.fn(),
            emitProductError: jest.fn(),
            emitConflictDetected: jest.fn(),
            emitJobCompleted: jest.fn(),
            emitJobFailed: jest.fn(),
            emitJobCancelled: jest.fn(),
            subscribeToJob: jest.fn(),
            getSubscriptionCount: jest.fn().mockReturnValue(0),
          },
        },
      ],
    }).compile();

    processor = module.get<ProductImportProcessor>(ProductImportProcessor);
    prisma = module.get(PrismaService);
    roastifyService = module.get(RoastifyService);
    fieldMappingService = module.get(FieldMappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // PROCESS IMPORT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('processImport', () => {
    it('should process import job successfully', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001' }),
        createMockRoastifyProduct({ id: 'prod_2', sku: 'SKU-002' }),
      ];
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: `new_${args.data.sku}`, ...args.data }),
      );

      const result = await processor.processImport(job);

      expect(result.status).toBe(ImportJobStatus.COMPLETED);
      expect(result.importedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.importedIds).toHaveLength(2);
    });

    it('should skip duplicate products when skipDuplicates is enabled', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001' }),
        createMockRoastifyProduct({ id: 'prod_2', sku: 'SKU-002' }),
      ];
      const jobData = createMockJobData({
        config: {
          ...createMockJobData().config,
          skipDuplicates: true,
        },
      });
      const job = createMockJob(jobData);

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'existing_1', sku: 'SKU-001', externalId: null, importSource: null },
      ]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: `new_${args.data.sku}`, ...args.data }),
      );

      const result = await processor.processImport(job);

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it('should update existing products when updateExisting is enabled', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001' }),
      ];
      const jobData = createMockJobData({
        config: {
          ...createMockJobData().config,
          updateExisting: true,
          skipDuplicates: false,
        },
      });
      const job = createMockJob(jobData);

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'existing_1', sku: 'SKU-001', externalId: 'prod_1', importSource: 'ROASTIFY' },
      ]);
      (prisma.product.update as jest.Mock).mockResolvedValue({ id: 'existing_1' });

      const result = await processor.processImport(job);

      expect(prisma.product.update).toHaveBeenCalled();
      expect(prisma.product.create).not.toHaveBeenCalled();
      expect(result.importedCount).toBe(1);
    });

    it('should handle integration not found error', async () => {
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(processor.processImport(job)).rejects.toThrow(
        'Integration not found or credentials missing',
      );

      expect(prisma.productImportJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ImportJobStatus.FAILED,
          }),
        }),
      );
    });

    it('should handle import of selected products only', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001' }),
        createMockRoastifyProduct({ id: 'prod_2', sku: 'SKU-002' }),
        createMockRoastifyProduct({ id: 'prod_3', sku: 'SKU-003' }),
      ];
      const jobData = createMockJobData({
        config: {
          ...createMockJobData().config,
          selectedProductIds: ['prod_1', 'prod_3'],
        },
      });
      const job = createMockJob(jobData);

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: `new_${args.data.sku}`, ...args.data }),
      );

      const result = await processor.processImport(job);

      expect(result.importedCount).toBe(2);
      expect(prisma.product.create).toHaveBeenCalledTimes(2);
    });

    it('should continue processing on individual product errors', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001' }),
        createMockRoastifyProduct({ id: 'prod_2', sku: 'SKU-002' }),
      ];
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockImplementationOnce((args) =>
          Promise.resolve({ id: `new_${args.data.sku}`, ...args.data }),
        );

      const result = await processor.processImport(job);

      expect(result.importedCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });

    it('should use custom field mappings when provided', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001', name: 'Original Name' }),
      ];
      const jobData = createMockJobData({
        config: {
          ...createMockJobData().config,
          customMappings: [
            { sourceField: 'name', targetField: 'name', transform: 'uppercase' as const },
            { sourceField: 'price', targetField: 'price', transform: 'centsToDecimal' as const },
          ],
        },
      });
      const job = createMockJob(jobData);

      // Mock FieldMappingService to return uppercase transformed name
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue({
        data: { name: 'ORIGINAL NAME', description: 'Light roasted coffee', price: 18.99, currency: 'USD' },
        validation: { isValid: true, errors: [] },
      });

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: `new_${args.data.sku}`, ...args.data }),
      );

      await processor.processImport(job);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'ORIGINAL NAME',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // QUEUE LIFECYCLE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Queue Lifecycle Handlers', () => {
    it('should log on job active', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log');
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      processor.onActive(job);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Processing import job ${mockJobId}`),
      );
    });

    it('should log on job completed', () => {
      const logSpy = jest.spyOn(processor['logger'], 'log');
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      processor.onCompleted(job);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Completed import job ${mockJobId}`),
      );
    });

    it('should update job status on failure', async () => {
      const jobData = createMockJobData();
      const job = createMockJob(jobData);
      const error = new Error('Test error');

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});

      await processor.onFailed(job, error);

      expect(prisma.productImportJob.update).toHaveBeenCalledWith({
        where: { id: mockJobId },
        data: expect.objectContaining({
          status: ImportJobStatus.FAILED,
          errorLog: expect.arrayContaining([
            expect.objectContaining({
              message: 'Test error',
              code: 'UNKNOWN_ERROR',
            }),
          ]),
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FIELD MAPPING TRANSFORM TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Field Mapping Transforms', () => {
    it('should apply centsToDecimal transform', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ price: 1999 }),
      ];
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      // Mock FieldMappingService to return price converted from cents
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue({
        data: { name: 'Ethiopian Yirgacheffe', description: 'Light roasted coffee', price: 19.99, currency: 'USD' },
        validation: { isValid: true, errors: [] },
      });

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: 'new_product', ...args.data }),
      );

      await processor.processImport(job);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 19.99,
          }),
        }),
      );
    });

    it('should apply uppercase transform', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ name: 'test coffee' }),
      ];
      const jobData = createMockJobData({
        config: {
          ...createMockJobData().config,
          customMappings: [
            { sourceField: 'name', targetField: 'name', transform: 'uppercase' as const },
            { sourceField: 'price', targetField: 'price', transform: 'centsToDecimal' as const },
          ],
        },
      });
      const job = createMockJob(jobData);

      // Mock FieldMappingService to return uppercase transformed name
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue({
        data: { name: 'TEST COFFEE', description: 'Light roasted coffee', price: 18.99, currency: 'USD' },
        validation: { isValid: true, errors: [] },
      });

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: 'new_product', ...args.data }),
      );

      await processor.processImport(job);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'TEST COFFEE',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SLUG GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Slug Generation', () => {
    it('should generate proper slug from product name', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ name: 'Ethiopian Yirgacheffe Coffee', sku: 'ETH-001' }),
      ];
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      // Mock FieldMappingService to return the mapped product name
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue({
        data: { name: 'Ethiopian Yirgacheffe Coffee', description: 'Light roasted coffee', price: 18.99, currency: 'USD' },
        validation: { isValid: true, errors: [] },
      });

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: 'new_product', ...args.data }),
      );

      await processor.processImport(job);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/^ethiopian-yirgacheffe-coffee-eth-001$/),
          }),
        }),
      );
    });

    it('should handle special characters in slug generation', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ name: "Test & Coffee (Special) 100%", sku: 'SPE-001' }),
      ];
      const jobData = createMockJobData();
      const job = createMockJob(jobData);

      (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.create as jest.Mock).mockImplementation((args) =>
        Promise.resolve({ id: 'new_product', ...args.data }),
      );

      await processor.processImport(job);

      // Slug is generated from the mapped name ("Mapped Name" from mock) + SKU
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/^mapped-name-spe-001$/),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONFLICT RESOLUTION STRATEGY TESTS (Phase 5)
  // ═══════════════════════════════════════════════════════════════

  describe('Conflict Resolution Strategies', () => {
    describe('getEffectiveConflictStrategy (backward compatibility)', () => {
      it('should use conflictStrategy when provided', async () => {
        const jobData = createMockJobData({
          config: {
            ...createMockJobData().config,
            conflictStrategy: 'UPDATE',
            skipDuplicates: true,  // Should be ignored
            updateExisting: false,  // Should be ignored
          },
        });
        const job = createMockJob(jobData);

        const mockExistingProduct = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'rty_prod_123',
          importSource: 'ROASTIFY',
        };

        (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
        (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
        (roastifyService.importAllProducts as jest.Mock).mockResolvedValue([createMockRoastifyProduct()]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([mockExistingProduct]);
        (prisma.product.update as jest.Mock).mockResolvedValue({ id: 'existing_prod_1' });

        await processor.processImport(job);

        // Should UPDATE instead of SKIP
        expect(prisma.product.update).toHaveBeenCalled();
      });

      it('should fallback to updateExisting=true as UPDATE strategy', async () => {
        const jobData = createMockJobData({
          config: {
            ...createMockJobData().config,
            updateExisting: true,
            skipDuplicates: true,
          },
        });
        const job = createMockJob(jobData);

        const mockExistingProduct = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'rty_prod_123',
          importSource: 'ROASTIFY',
        };

        (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
        (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
        (roastifyService.importAllProducts as jest.Mock).mockResolvedValue([createMockRoastifyProduct()]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([mockExistingProduct]);
        (prisma.product.update as jest.Mock).mockResolvedValue({ id: 'existing_prod_1' });

        await processor.processImport(job);

        // Should UPDATE the existing product
        expect(prisma.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'existing_prod_1' },
          }),
        );
      });

      it('should fallback to skipDuplicates=true as SKIP strategy', async () => {
        const jobData = createMockJobData({
          config: {
            ...createMockJobData().config,
            skipDuplicates: true,
            updateExisting: false,
          },
        });
        const job = createMockJob(jobData);

        const mockExistingProduct = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'rty_prod_123',
          importSource: 'ROASTIFY',
        };

        (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
        (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
        (roastifyService.importAllProducts as jest.Mock).mockResolvedValue([createMockRoastifyProduct()]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([mockExistingProduct]);

        await processor.processImport(job);

        // Should not create or update (SKIP)
        expect(prisma.product.create).not.toHaveBeenCalled();
        expect(prisma.product.update).not.toHaveBeenCalled();
      });
    });

    describe('SKIP strategy', () => {
      it('should skip duplicate products and increment skippedCount', async () => {
        const jobData = createMockJobData({
          config: {
            ...createMockJobData().config,
            conflictStrategy: 'SKIP',
          },
        });
        const job = createMockJob(jobData);

        const mockExistingProduct = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'rty_prod_123',
          importSource: 'ROASTIFY',
        };

        (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
        (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
        (roastifyService.importAllProducts as jest.Mock).mockResolvedValue([createMockRoastifyProduct()]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([mockExistingProduct]);

        const result = await processor.processImport(job);

        expect(result.skippedCount).toBe(1);
        expect(result.importedCount).toBe(0);
        expect(prisma.product.create).not.toHaveBeenCalled();
      });
    });

    describe('UPDATE strategy', () => {
      it('should update existing product with new data', async () => {
        const jobData = createMockJobData({
          config: {
            ...createMockJobData().config,
            conflictStrategy: 'UPDATE',
          },
        });
        const job = createMockJob(jobData);

        const mockExistingProduct = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'rty_prod_123',
          importSource: 'ROASTIFY',
        };

        (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
        (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
        (roastifyService.importAllProducts as jest.Mock).mockResolvedValue([createMockRoastifyProduct()]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([mockExistingProduct]);
        (prisma.product.update as jest.Mock).mockResolvedValue({ id: 'existing_prod_1' });

        await processor.processImport(job);

        expect(prisma.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'existing_prod_1' },
            data: expect.objectContaining({
              name: expect.any(String),
              price: expect.any(Number),
              lastSyncedAt: expect.any(Date),
            }),
          }),
        );
      });
    });

    describe('MERGE strategy', () => {
      it('should merge data keeping existing non-empty fields', async () => {
        const jobData = createMockJobData({
          config: {
            ...createMockJobData().config,
            conflictStrategy: 'MERGE',
          },
        });
        const job = createMockJob(jobData);

        const mockExistingDbProduct = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'rty_prod_123',
          importSource: 'ROASTIFY',
          name: 'Existing Name',
          description: '', // Empty - should be replaced
          price: 24.99,
          currency: 'USD',
        };

        const mockExistingLookup = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'rty_prod_123',
          importSource: 'ROASTIFY',
        };

        (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
        (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
        (roastifyService.importAllProducts as jest.Mock).mockResolvedValue([createMockRoastifyProduct()]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([mockExistingLookup]);
        (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockExistingDbProduct);
        (prisma.product.update as jest.Mock).mockResolvedValue({ id: 'existing_prod_1' });

        await processor.processImport(job);

        expect(prisma.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'existing_prod_1' },
            data: expect.objectContaining({
              name: 'Existing Name', // Kept existing
              price: 24.99, // Kept existing
            }),
          }),
        );
      });
    });

    describe('FORCE_CREATE strategy', () => {
      it('should create with modified SKU when duplicate exists', async () => {
        const jobData = createMockJobData({
          config: {
            ...createMockJobData().config,
            conflictStrategy: 'FORCE_CREATE',
          },
        });
        const job = createMockJob(jobData);

        const mockExistingProduct = {
          id: 'existing_prod_1',
          sku: 'ETH-YIRG-001',
          externalId: 'other_ext_id', // Different external ID (SKU conflict only)
          importSource: 'OTHER',
        };

        (prisma.productImportJob.update as jest.Mock).mockResolvedValue({});
        (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
        (roastifyService.importAllProducts as jest.Mock).mockResolvedValue([createMockRoastifyProduct()]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([mockExistingProduct]);
        (prisma.product.create as jest.Mock).mockImplementation((args) =>
          Promise.resolve({ id: 'new_product', ...args.data }),
        );

        await processor.processImport(job);

        // Should create with modified SKU
        expect(prisma.product.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              sku: expect.stringMatching(/^ETH-YIRG-001-\d+$/), // Modified SKU with suffix
            }),
          }),
        );
      });
    });
  });
});
