import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductImportService } from './product-import.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RoastifyService } from '../../integrations/services/providers/roastify.service';
import { FieldMappingService } from './field-mapping.service';
import { ImportEventService } from './import-event.service';
import { PRODUCT_IMPORT_QUEUE } from '../types/product-import.types';
import { ImportJobStatus, ImportJobPhase } from '@prisma/client';

describe('ProductImportService', () => {
  let service: ProductImportService;
  let prisma: jest.Mocked<PrismaService>;
  let roastifyService: jest.Mocked<RoastifyService>;
  let fieldMappingService: jest.Mocked<FieldMappingService>;
  let mockQueue: {
    add: jest.Mock;
    getJob: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company_123';
  const mockClientId = 'client_456';
  const mockUserId = 'user_789';
  const mockIntegrationId = 'integration_abc';

  const createMockIntegration = (overrides = {}) => ({
    id: mockIntegrationId,
    clientId: mockClientId,
    provider: 'ROASTIFY',
    credentials: { apiKey: 'test_api_key' },
    status: 'ACTIVE',
    ...overrides,
  });

  const createMockImportJob = (overrides = {}) => ({
    id: 'job_123',
    companyId: mockCompanyId,
    clientId: mockClientId,
    integrationId: mockIntegrationId,
    provider: 'ROASTIFY',
    status: ImportJobStatus.PENDING,
    phase: ImportJobPhase.QUEUED,
    config: {
      provider: 'ROASTIFY',
      integrationId: mockIntegrationId,
      importImages: true,
      generateThumbnails: true,
      skipDuplicates: true,
      updateExisting: false,
    },
    progress: 0,
    totalProducts: 0,
    processedProducts: 0,
    totalImages: 0,
    processedImages: 0,
    importedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    currentItem: null,
    estimatedSecondsRemaining: null,
    startedAt: null,
    completedAt: null,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockFieldMappingProfile = (overrides = {}) => ({
    id: 'profile_123',
    companyId: mockCompanyId,
    name: 'Test Profile',
    description: 'Test mapping profile',
    provider: 'ROASTIFY',
    mappings: [
      { sourceField: 'name', targetField: 'name' },
      { sourceField: 'price', targetField: 'price', transform: 'centsToDecimal' },
    ],
    isDefault: false,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  // ═══════════════════════════════════════════════════════════════
  // TEST SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'bull_job_123' }),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImportService,
        {
          provide: PrismaService,
          useValue: {
            clientIntegration: {
              findFirst: jest.fn(),
            },
            productImportJob: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            fieldMappingProfile: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
            },
            product: {
              findMany: jest.fn(),
            },
            productImage: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            applyMappings: jest.fn().mockReturnValue({
              data: { name: 'Mapped Name', price: 18.99 },
              validation: { isValid: true, errors: [] },
            }),
            evaluateCondition: jest.fn().mockReturnValue(true),
            validateField: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
          },
        },
        {
          provide: RoastifyService,
          useValue: {
            importAllProducts: jest.fn(),
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
            emitJobCompleted: jest.fn(),
            emitJobFailed: jest.fn(),
            emitJobCancelled: jest.fn(),
            subscribeToJob: jest.fn(),
            getSubscriptionCount: jest.fn().mockReturnValue(0),
          },
        },
        {
          provide: getQueueToken(PRODUCT_IMPORT_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ProductImportService>(ProductImportService);
    prisma = module.get(PrismaService);
    roastifyService = module.get(RoastifyService);
    fieldMappingService = module.get(FieldMappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // CREATE IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createImportJob', () => {
    const createJobDto = {
      integrationId: mockIntegrationId,
      provider: 'ROASTIFY',
      importImages: true,
      generateThumbnails: true,
      skipDuplicates: true,
      updateExisting: false,
    };

    it('should create a new import job and add to queue', async () => {
      const mockProducts = [createMockRoastifyProduct()];
      const mockJob = createMockImportJob({ totalProducts: 1, totalImages: 1 });

      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.productImportJob.create as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.createImportJob(createJobDto, mockCompanyId, mockClientId, mockUserId);

      expect(prisma.clientIntegration.findFirst).toHaveBeenCalledWith({
        where: { id: mockIntegrationId, clientId: mockClientId },
      });
      expect(prisma.productImportJob.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith('process-import', expect.objectContaining({
        jobId: mockJob.id,
        companyId: mockCompanyId,
      }), expect.any(Object));
      // Result is mapped to ImportJobProgress
      expect(result.id).toBe(mockJob.id);
      expect(result.status).toBe(ImportJobStatus.PENDING);
    });

    it('should throw NotFoundException when integration not found', async () => {
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createImportJob(createJobDto, mockCompanyId, mockClientId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when integration has no credentials', async () => {
      const mockProducts = [createMockRoastifyProduct()];
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(
        createMockIntegration({ credentials: null }),
      );
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);

      await expect(
        service.createImportJob(createJobDto, mockCompanyId, mockClientId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW IMPORT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('previewImport', () => {
    const previewDto = {
      integrationId: mockIntegrationId,
    };

    it('should preview products from Roastify provider', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001' }),
        createMockRoastifyProduct({ id: 'prod_2', sku: 'SKU-002' }),
      ];
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.fieldMappingProfile.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.previewImport(previewDto, mockCompanyId, mockClientId);

      expect(roastifyService.importAllProducts).toHaveBeenCalledWith({ apiKey: 'test_api_key' });
      expect(result.totalProducts).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.willSkip).toBe(0);
    });

    it('should identify existing SKUs in preview', async () => {
      const mockProducts = [
        createMockRoastifyProduct({ id: 'prod_1', sku: 'SKU-001' }),
        createMockRoastifyProduct({ id: 'prod_2', sku: 'SKU-002' }),
      ];
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(createMockIntegration());
      (roastifyService.importAllProducts as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'existing_1', sku: 'SKU-001', externalId: null, importSource: null },
      ]);
      (prisma.fieldMappingProfile.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.previewImport(previewDto, mockCompanyId, mockClientId);

      // willSkip should be 1 since SKU-001 exists
      expect(result.willSkip).toBe(1);
    });

    it('should throw NotFoundException for missing integration', async () => {
      (prisma.clientIntegration.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.previewImport(previewDto, mockCompanyId, mockClientId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LIST IMPORT JOBS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('listImportJobs', () => {
    it('should list import jobs with pagination', async () => {
      const mockJobs = [
        createMockImportJob({ id: 'job_1' }),
        createMockImportJob({ id: 'job_2' }),
      ];
      (prisma.productImportJob.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.productImportJob.count as jest.Mock).mockResolvedValue(2);

      const result = await service.listImportJobs(mockCompanyId, { limit: '10', offset: '0' });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.productImportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: mockCompanyId },
          take: 10,
          skip: 0,
        }),
      );
    });

    it('should filter jobs by status', async () => {
      (prisma.productImportJob.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.productImportJob.count as jest.Mock).mockResolvedValue(0);

      await service.listImportJobs(mockCompanyId, { status: ImportJobStatus.COMPLETED });

      expect(prisma.productImportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: mockCompanyId, status: ImportJobStatus.COMPLETED },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getImportJob', () => {
    it('should return import job by ID as ImportJobProgress', async () => {
      const mockJob = createMockImportJob();
      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.getImportJob('job_123', mockCompanyId);

      // Service returns mapped progress, not raw job
      expect(result.id).toBe('job_123');
      expect(result.status).toBe(ImportJobStatus.PENDING);
      expect(result.phase).toBe(ImportJobPhase.QUEUED);
      expect(result.progress).toBe(0);
      expect(prisma.productImportJob.findFirst).toHaveBeenCalledWith({
        where: { id: 'job_123', companyId: mockCompanyId },
      });
    });

    it('should throw NotFoundException when job not found', async () => {
      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getImportJob('nonexistent_job', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CANCEL IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('cancelImportJob', () => {
    it('should cancel a pending import job', async () => {
      const mockJob = createMockImportJob({ status: ImportJobStatus.PENDING });
      const cancelledJob = { ...mockJob, status: ImportJobStatus.CANCELLED, completedAt: new Date() };
      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(mockJob);
      (prisma.productImportJob.update as jest.Mock).mockResolvedValue(cancelledJob);
      mockQueue.getJob.mockResolvedValue(null);

      const result = await service.cancelImportJob('job_123', mockCompanyId);

      expect(result.status).toBe(ImportJobStatus.CANCELLED);
      expect(prisma.productImportJob.update).toHaveBeenCalledWith({
        where: { id: 'job_123' },
        data: expect.objectContaining({ status: ImportJobStatus.CANCELLED }),
      });
    });

    it('should cancel an in-progress import job', async () => {
      const mockJob = createMockImportJob({ status: ImportJobStatus.IN_PROGRESS });
      const cancelledJob = { ...mockJob, status: ImportJobStatus.CANCELLED, completedAt: new Date() };
      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(mockJob);
      (prisma.productImportJob.update as jest.Mock).mockResolvedValue(cancelledJob);
      mockQueue.getJob.mockResolvedValue(null);

      const result = await service.cancelImportJob('job_123', mockCompanyId);

      expect(result.status).toBe(ImportJobStatus.CANCELLED);
    });

    it('should remove job from queue if still pending', async () => {
      const mockJob = createMockImportJob({ status: ImportJobStatus.PENDING });
      const cancelledJob = { ...mockJob, status: ImportJobStatus.CANCELLED, completedAt: new Date() };
      const mockBullJob = { remove: jest.fn().mockResolvedValue(undefined) };

      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(mockJob);
      (prisma.productImportJob.update as jest.Mock).mockResolvedValue(cancelledJob);
      mockQueue.getJob.mockResolvedValue(mockBullJob);

      await service.cancelImportJob('job_123', mockCompanyId);

      expect(mockQueue.getJob).toHaveBeenCalledWith('job_123');
      expect(mockBullJob.remove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling completed job', async () => {
      const mockJob = createMockImportJob({ status: ImportJobStatus.COMPLETED });
      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(mockJob);

      await expect(
        service.cancelImportJob('job_123', mockCompanyId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RETRY IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('retryImportJob', () => {
    it('should retry a failed import job', async () => {
      const failedJob = createMockImportJob({ status: ImportJobStatus.FAILED });
      const resetJob = createMockImportJob({
        status: ImportJobStatus.PENDING,
        phase: ImportJobPhase.QUEUED,
        processedProducts: 0,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        progress: 0,
      });

      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(failedJob);
      (prisma.productImportJob.update as jest.Mock).mockResolvedValue(resetJob);

      const result = await service.retryImportJob('job_123', mockCompanyId, mockUserId);

      expect(prisma.productImportJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job_123' },
          data: expect.objectContaining({
            status: ImportJobStatus.PENDING,
            phase: ImportJobPhase.QUEUED,
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result.id).toBe('job_123');
      expect(result.status).toBe(ImportJobStatus.PENDING);
    });

    it('should throw BadRequestException when retrying non-failed job', async () => {
      const mockJob = createMockImportJob({ status: ImportJobStatus.IN_PROGRESS });
      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(mockJob);

      await expect(
        service.retryImportJob('job_123', mockCompanyId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when job not found', async () => {
      (prisma.productImportJob.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.retryImportJob('nonexistent_job', mockCompanyId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FIELD MAPPING PROFILE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createFieldMappingProfile', () => {
    const createProfileDto = {
      name: 'Test Profile',
      description: 'Test description',
      provider: 'ROASTIFY',
      mappings: [
        { sourceField: 'name', targetField: 'name' },
        { sourceField: 'price', targetField: 'price', transform: 'centsToDecimal' as const },
      ],
      isDefault: false,
    };

    it('should create a new field mapping profile', async () => {
      const mockProfile = createMockFieldMappingProfile();
      (prisma.fieldMappingProfile.create as jest.Mock).mockResolvedValue(mockProfile);

      const result = await service.createFieldMappingProfile(createProfileDto, mockCompanyId, mockUserId);

      expect(prisma.fieldMappingProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Profile',
          companyId: mockCompanyId,
          createdBy: mockUserId,
        }),
      });
      expect(result).toEqual(mockProfile);
    });

    it('should unset existing default profile when setting new default', async () => {
      const mockProfile = createMockFieldMappingProfile({ isDefault: true });
      (prisma.fieldMappingProfile.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.fieldMappingProfile.create as jest.Mock).mockResolvedValue(mockProfile);

      await service.createFieldMappingProfile(
        { ...createProfileDto, isDefault: true },
        mockCompanyId,
        mockUserId,
      );

      expect(prisma.fieldMappingProfile.updateMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, provider: 'ROASTIFY', isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('listFieldMappingProfiles', () => {
    it('should list all field mapping profiles for a company', async () => {
      const mockProfiles = [
        createMockFieldMappingProfile({ id: 'profile_1' }),
        createMockFieldMappingProfile({ id: 'profile_2' }),
      ];
      (prisma.fieldMappingProfile.findMany as jest.Mock).mockResolvedValue(mockProfiles);

      const result = await service.listFieldMappingProfiles(mockCompanyId);

      expect(result).toHaveLength(2);
      expect(prisma.fieldMappingProfile.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter profiles by provider', async () => {
      (prisma.fieldMappingProfile.findMany as jest.Mock).mockResolvedValue([]);

      await service.listFieldMappingProfiles(mockCompanyId, 'ROASTIFY');

      expect(prisma.fieldMappingProfile.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, provider: 'ROASTIFY' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('updateFieldMappingProfile', () => {
    const updateDto = {
      name: 'Updated Profile',
      mappings: [{ sourceField: 'name', targetField: 'name' }],
    };

    it('should update an existing field mapping profile', async () => {
      const existingProfile = createMockFieldMappingProfile();
      const updatedProfile = { ...existingProfile, name: 'Updated Profile' };
      (prisma.fieldMappingProfile.findFirst as jest.Mock).mockResolvedValue(existingProfile);
      (prisma.fieldMappingProfile.update as jest.Mock).mockResolvedValue(updatedProfile);

      const result = await service.updateFieldMappingProfile('profile_123', updateDto, mockCompanyId);

      expect(result.name).toBe('Updated Profile');
      expect(prisma.fieldMappingProfile.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when profile not found', async () => {
      (prisma.fieldMappingProfile.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateFieldMappingProfile('nonexistent', updateDto, mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFieldMappingProfile', () => {
    it('should delete a field mapping profile', async () => {
      const existingProfile = createMockFieldMappingProfile();
      (prisma.fieldMappingProfile.findFirst as jest.Mock).mockResolvedValue(existingProfile);
      (prisma.fieldMappingProfile.delete as jest.Mock).mockResolvedValue(existingProfile);

      await service.deleteFieldMappingProfile('profile_123', mockCompanyId);

      expect(prisma.fieldMappingProfile.delete).toHaveBeenCalledWith({
        where: { id: 'profile_123' },
      });
    });

    it('should throw NotFoundException when profile not found', async () => {
      (prisma.fieldMappingProfile.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteFieldMappingProfile('nonexistent', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: STORAGE & BILLING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getStorageUsage', () => {
    const createMockProductImage = (overrides = {}) => ({
      id: 'img_123',
      cdnUrl: 'https://cdn.example.com/image.jpg',
      s3Key: 'products/company_123/image.jpg',
      size: 500000, // 500KB
      thumbnailSmall: 'https://cdn.example.com/thumb-small.jpg',
      thumbnailMedium: 'https://cdn.example.com/thumb-medium.jpg',
      thumbnailLarge: 'https://cdn.example.com/thumb-large.jpg',
      thumbnailBytes: 50000,
      ...overrides,
    });

    it('should calculate storage usage with all thumbnail types', async () => {
      const mockImages = [
        createMockProductImage({ id: 'img_1', size: 500000 }),
        createMockProductImage({ id: 'img_2', size: 750000 }),
        createMockProductImage({ id: 'img_3', size: 250000, thumbnailSmall: null }),
      ];
      (prisma.productImage.findMany as jest.Mock).mockResolvedValue(mockImages);

      const result = await service.getStorageUsage(mockCompanyId);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.totalImages).toBe(3);
      expect(result.totalStorageBytes).toBeGreaterThan(0);
      expect(result.totalStorageFormatted).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.originals).toBeDefined();
      expect(result.breakdown.thumbnailsSmall).toBeDefined();
      expect(result.breakdown.thumbnailsMedium).toBeDefined();
      expect(result.breakdown.thumbnailsLarge).toBeDefined();
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return zero values when no images exist', async () => {
      (prisma.productImage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStorageUsage(mockCompanyId);

      expect(result.totalImages).toBe(0);
      expect(result.totalStorageBytes).toBe(0);
      expect(result.totalThumbnails).toBe(0);
      expect(result.breakdown.originals.count).toBe(0);
    });

    it('should count thumbnails correctly when some are missing', async () => {
      const mockImages = [
        createMockProductImage({ id: 'img_1', thumbnailSmall: 'url', thumbnailMedium: 'url', thumbnailLarge: 'url' }),
        createMockProductImage({ id: 'img_2', thumbnailSmall: null, thumbnailMedium: 'url', thumbnailLarge: null }),
        createMockProductImage({ id: 'img_3', thumbnailSmall: null, thumbnailMedium: null, thumbnailLarge: null }),
      ];
      (prisma.productImage.findMany as jest.Mock).mockResolvedValue(mockImages);

      const result = await service.getStorageUsage(mockCompanyId);

      expect(result.totalImages).toBe(3);
      // Only count non-null thumbnails
      expect(result.totalThumbnails).toBe(4); // 3 + 1 + 0
    });

    it('should format bytes correctly for different sizes', async () => {
      // Test with large file sizes (1GB + 50KB thumbnails)
      const mockImages = [
        createMockProductImage({ id: 'img_1', size: 1073741824, thumbnailBytes: 50000 }), // 1GB
      ];
      (prisma.productImage.findMany as jest.Mock).mockResolvedValue(mockImages);

      const result = await service.getStorageUsage(mockCompanyId);

      expect(result.totalStorageFormatted).toContain('GB');
    });
  });

  describe('getImportHistory', () => {
    it('should aggregate import history statistics', async () => {
      const mockJobs = [
        createMockImportJob({
          id: 'job_1',
          status: ImportJobStatus.COMPLETED,
          provider: 'ROASTIFY',
          importedCount: 50,
          processedImages: 100,
          startedAt: new Date('2025-01-01T10:00:00Z'),
          completedAt: new Date('2025-01-01T10:05:00Z'),
        }),
        createMockImportJob({
          id: 'job_2',
          status: ImportJobStatus.COMPLETED,
          provider: 'ROASTIFY',
          importedCount: 30,
          processedImages: 60,
          startedAt: new Date('2025-01-02T10:00:00Z'),
          completedAt: new Date('2025-01-02T10:03:00Z'),
        }),
        createMockImportJob({
          id: 'job_3',
          status: ImportJobStatus.FAILED,
          provider: 'SHOPIFY',
          importedCount: 0,
          processedImages: 0,
          startedAt: new Date('2025-01-03T10:00:00Z'),
          completedAt: new Date('2025-01-03T10:01:00Z'),
        }),
      ];

      (prisma.productImportJob.count as jest.Mock)
        .mockResolvedValueOnce(3)  // total
        .mockResolvedValueOnce(2)  // completed
        .mockResolvedValueOnce(1)  // failed
        .mockResolvedValueOnce(0); // cancelled

      (prisma.productImportJob.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          importedCount: 80,
          processedImages: 160,
        },
      });

      (prisma.productImportJob.groupBy as jest.Mock).mockResolvedValue([
        { provider: 'ROASTIFY', _count: { id: 2 } },
        { provider: 'SHOPIFY', _count: { id: 1 } },
      ]);

      (prisma.productImportJob.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getImportHistory(mockCompanyId);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.totalJobs).toBe(3);
      expect(result.successfulJobs).toBe(2);
      expect(result.failedJobs).toBe(1);
      expect(result.cancelledJobs).toBe(0);
      expect(result.totalProductsImported).toBe(80);
      expect(result.totalImagesImported).toBe(160);
      expect(result.jobsByProvider).toEqual({
        ROASTIFY: 2,
        SHOPIFY: 1,
      });
      expect(result.avgJobDurationSeconds).toBeGreaterThan(0);
    });

    it('should return zero values when no jobs exist', async () => {
      (prisma.productImportJob.count as jest.Mock).mockResolvedValue(0);
      (prisma.productImportJob.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          importedCount: null,
          processedImages: null,
        },
      });
      (prisma.productImportJob.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.productImportJob.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getImportHistory(mockCompanyId);

      expect(result.totalJobs).toBe(0);
      expect(result.successfulJobs).toBe(0);
      expect(result.totalProductsImported).toBe(0);
      expect(result.avgJobDurationSeconds).toBe(0);
      expect(result.jobsByProvider).toEqual({});
    });

    it('should generate jobsOverTime for last 30 days', async () => {
      (prisma.productImportJob.count as jest.Mock).mockResolvedValue(5);
      (prisma.productImportJob.aggregate as jest.Mock).mockResolvedValue({
        _sum: { importedCount: 100, processedImages: 200 },
      });
      (prisma.productImportJob.groupBy as jest.Mock).mockResolvedValue([
        { provider: 'ROASTIFY', _count: { id: 5 } },
      ]);
      (prisma.productImportJob.findMany as jest.Mock).mockResolvedValue([
        createMockImportJob({
          startedAt: new Date(),
          completedAt: new Date(Date.now() + 60000),
        }),
      ]);

      const result = await service.getImportHistory(mockCompanyId);

      expect(result.jobsOverTime).toBeDefined();
      expect(Array.isArray(result.jobsOverTime)).toBe(true);
      expect(result.jobsOverTime.length).toBeLessThanOrEqual(30);
    });
  });

  describe('estimateImportCost', () => {
    it('should estimate costs for product import', async () => {
      const result = await service.estimateImportCost(mockCompanyId, 100, 200, true);

      expect(result.productCount).toBe(100);
      expect(result.imageCount).toBe(200);
      expect(result.estimatedStorageBytes).toBeGreaterThan(0);
      expect(result.estimatedStorageFormatted).toBeDefined();
      expect(result.estimatedThumbnails).toBe(600); // 200 images * 3 sizes
      expect(result.currency).toBe('USD');
      expect(result.costs).toBeDefined();
      expect(result.costs.storagePerGbCents).toBeGreaterThan(0);
      expect(result.costs.imageProcessingCents).toBeGreaterThan(0);
      expect(result.costs.thumbnailGenerationCents).toBeGreaterThan(0);
      expect(result.totalCostCents).toBeGreaterThan(0);
    });

    it('should estimate costs without thumbnails', async () => {
      const withThumbnails = await service.estimateImportCost(mockCompanyId, 100, 200, true);
      const withoutThumbnails = await service.estimateImportCost(mockCompanyId, 100, 200, false);

      expect(withoutThumbnails.estimatedThumbnails).toBe(0);
      expect(withoutThumbnails.totalCostCents).toBeLessThan(withThumbnails.totalCostCents);
    });

    it('should handle zero images correctly', async () => {
      const result = await service.estimateImportCost(mockCompanyId, 50, 0, true);

      expect(result.productCount).toBe(50);
      expect(result.imageCount).toBe(0);
      expect(result.estimatedThumbnails).toBe(0);
      expect(result.costs.processingCostCents).toBe(0);
    });

    it('should calculate proportional costs based on count', async () => {
      const small = await service.estimateImportCost(mockCompanyId, 10, 20, true);
      const large = await service.estimateImportCost(mockCompanyId, 100, 200, true);

      expect(large.totalCostCents).toBeGreaterThan(small.totalCostCents);
      // Cost should scale roughly proportionally (within 10% margin)
      const ratio = large.totalCostCents / small.totalCostCents;
      expect(ratio).toBeGreaterThan(8);
      expect(ratio).toBeLessThan(12);
    });

    it('should include storage cost breakdown', async () => {
      const result = await service.estimateImportCost(mockCompanyId, 100, 200, true);

      expect(result.costs.monthlyStorageCents).toBeGreaterThan(0);
      expect(result.costs.processingCostCents).toBeGreaterThan(0);
      // Total should be sum of monthly storage and processing
      expect(result.totalCostCents).toBe(
        result.costs.monthlyStorageCents + result.costs.processingCostCents
      );
    });
  });
});
