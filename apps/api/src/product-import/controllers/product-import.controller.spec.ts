import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from '../services/product-import.service';
import { ImportEventService } from '../services/import-event.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ImportJobStatus, ImportJobPhase } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('ProductImportController', () => {
  let controller: ProductImportController;
  let service: jest.Mocked<ProductImportService>;

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company_123';
  const mockClientId = 'client_456';
  const mockUserId = 'user_789';

  const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    id: mockUserId,
    email: 'test@example.com',
    organizationId: 'org_123',
    clientId: mockClientId,
    companyId: mockCompanyId,
    permissions: ['products:write', 'products:read'],
    ...overrides,
  } as AuthenticatedUser);

  const mockImportJob = {
    id: 'job_123',
    companyId: mockCompanyId,
    clientId: mockClientId,
    status: ImportJobStatus.PENDING,
    phase: ImportJobPhase.QUEUED,
    provider: 'ROASTIFY',
    config: { provider: 'ROASTIFY', integrationId: 'int_123' },
    totalProducts: 0,
    processedProducts: 0,
    importedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    progress: 0,
    totalImages: 0,
    processedImages: 0,
    createdAt: new Date(),
    createdBy: mockUserId,
  };

  const mockFieldMappingProfile = {
    id: 'profile_123',
    companyId: mockCompanyId,
    name: 'Test Profile',
    provider: 'ROASTIFY',
    mappings: [{ sourceField: 'name', targetField: 'name' }],
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductImportController],
      providers: [
        {
          provide: ProductImportService,
          useValue: {
            createImportJob: jest.fn(),
            previewImport: jest.fn(),
            listImportJobs: jest.fn(),
            getImportJob: jest.fn(),
            cancelImportJob: jest.fn(),
            retryImportJob: jest.fn(),
            createFieldMappingProfile: jest.fn(),
            listFieldMappingProfiles: jest.fn(),
            updateFieldMappingProfile: jest.fn(),
            deleteFieldMappingProfile: jest.fn(),
            // Phase 6: Storage & Billing
            getStorageUsage: jest.fn(),
            getImportHistory: jest.fn(),
            estimateImportCost: jest.fn(),
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductImportController>(ProductImportController);
    service = module.get(ProductImportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // CREATE IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createImportJob', () => {
    const createDto = {
      integrationId: 'int_123',
      skipDuplicates: true,
      updateExisting: false,
      importImages: false,
      generateThumbnails: false,
    };

    it('should create an import job successfully', async () => {
      const user = createMockUser();
      service.createImportJob.mockResolvedValue(mockImportJob);

      const result = await controller.createImportJob(createDto, mockCompanyId, user);

      expect(service.createImportJob).toHaveBeenCalledWith(
        createDto,
        mockCompanyId,
        mockClientId,
        mockUserId,
      );
      expect(result).toEqual(mockImportJob);
    });

    it('should use user companyId if query companyId not provided', async () => {
      const user = createMockUser();
      service.createImportJob.mockResolvedValue(mockImportJob);

      await controller.createImportJob(createDto, '', user);

      expect(service.createImportJob).toHaveBeenCalledWith(
        createDto,
        mockCompanyId,
        mockClientId,
        mockUserId,
      );
    });

    it('should throw BadRequestException if no companyId available', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.createImportJob(createDto, '', user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createImportJob(createDto, '', user)).rejects.toThrow(
        'Company ID is required',
      );
    });

    it('should throw BadRequestException if user has no clientId', async () => {
      const user = createMockUser({ clientId: undefined });

      await expect(controller.createImportJob(createDto, mockCompanyId, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createImportJob(createDto, mockCompanyId, user)).rejects.toThrow(
        'User must belong to a client to import products',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW IMPORT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('previewImport', () => {
    const previewDto = {
      integrationId: 'int_123',
      limit: 10,
    };

    const mockPreviewResponse = {
      provider: 'ROASTIFY',
      products: [
        {
          externalId: 'prod_1',
          name: 'Test Product',
          sku: 'SKU-001',
          price: 19.99,
          currency: 'USD',
          imageCount: 0,
          variantCount: 0,
          isDuplicate: false,
          willImport: true,
          mappedData: { name: 'Test Product', price: 19.99 },
        },
      ],
      totalProducts: 1,
      willImport: 1,
      willSkip: 0,
      estimatedImages: 0,
      suggestedMappings: [{ sourceField: 'name', targetField: 'name' }],
    };

    it('should return preview data successfully', async () => {
      const user = createMockUser();
      service.previewImport.mockResolvedValue(mockPreviewResponse);

      const result = await controller.previewImport(previewDto, mockCompanyId, user);

      expect(service.previewImport).toHaveBeenCalledWith(previewDto, mockCompanyId, mockClientId);
      expect(result).toEqual(mockPreviewResponse);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.previewImport(previewDto, '', user)).rejects.toThrow(
        'Company ID is required',
      );
    });

    it('should throw BadRequestException if no clientId', async () => {
      const user = createMockUser({ clientId: undefined });

      await expect(controller.previewImport(previewDto, mockCompanyId, user)).rejects.toThrow(
        'User must belong to a client to preview products',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LIST IMPORT JOBS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('listImportJobs', () => {
    const queryDto = { limit: '10', offset: '0' } as any;

    it('should list import jobs successfully', async () => {
      const user = createMockUser();
      const mockResponse = {
        items: [mockImportJob],
        total: 1,
        limit: 10,
        offset: 0,
      };
      service.listImportJobs.mockResolvedValue(mockResponse);

      const result = await controller.listImportJobs(queryDto, mockCompanyId, user);

      expect(service.listImportJobs).toHaveBeenCalledWith(mockCompanyId, queryDto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.listImportJobs(queryDto, '', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getImportJob', () => {
    it('should get import job by ID', async () => {
      const user = createMockUser();
      service.getImportJob.mockResolvedValue(mockImportJob);

      const result = await controller.getImportJob('job_123', mockCompanyId, user);

      expect(service.getImportJob).toHaveBeenCalledWith('job_123', mockCompanyId);
      expect(result).toEqual(mockImportJob);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.getImportJob('job_123', '', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CANCEL IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('cancelImportJob', () => {
    it('should cancel import job', async () => {
      const user = createMockUser();
      const cancelledJob = { ...mockImportJob, status: ImportJobStatus.CANCELLED };
      service.cancelImportJob.mockResolvedValue(cancelledJob);

      const result = await controller.cancelImportJob('job_123', mockCompanyId, user);

      expect(service.cancelImportJob).toHaveBeenCalledWith('job_123', mockCompanyId);
      expect(result.status).toBe(ImportJobStatus.CANCELLED);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.cancelImportJob('job_123', '', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RETRY IMPORT JOB TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('retryImportJob', () => {
    it('should retry a failed import job', async () => {
      const user = createMockUser();
      const retriedJob = { ...mockImportJob, status: ImportJobStatus.PENDING };
      service.retryImportJob.mockResolvedValue(retriedJob);

      const result = await controller.retryImportJob('job_123', mockCompanyId, user);

      expect(service.retryImportJob).toHaveBeenCalledWith('job_123', mockCompanyId, mockUserId);
      expect(result.status).toBe(ImportJobStatus.PENDING);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.retryImportJob('job_123', '', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FIELD MAPPING PROFILE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createFieldMappingProfile', () => {
    const createDto = {
      name: 'Test Profile',
      provider: 'ROASTIFY',
      mappings: [{ sourceField: 'name', targetField: 'name' }],
      isDefault: false,
    };

    it('should create a field mapping profile', async () => {
      const user = createMockUser();
      service.createFieldMappingProfile.mockResolvedValue(mockFieldMappingProfile);

      const result = await controller.createFieldMappingProfile(createDto, mockCompanyId, user);

      expect(service.createFieldMappingProfile).toHaveBeenCalledWith(
        createDto,
        mockCompanyId,
        mockUserId,
      );
      expect(result).toEqual(mockFieldMappingProfile);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.createFieldMappingProfile(createDto, '', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  describe('listFieldMappingProfiles', () => {
    it('should list field mapping profiles', async () => {
      const user = createMockUser();
      service.listFieldMappingProfiles.mockResolvedValue([mockFieldMappingProfile]);

      const result = await controller.listFieldMappingProfiles(mockCompanyId, 'ROASTIFY', user);

      expect(service.listFieldMappingProfiles).toHaveBeenCalledWith(mockCompanyId, 'ROASTIFY');
      expect(result).toEqual([mockFieldMappingProfile]);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.listFieldMappingProfiles('', 'ROASTIFY', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  describe('updateFieldMappingProfile', () => {
    const updateDto = {
      name: 'Updated Profile',
    };

    it('should update a field mapping profile', async () => {
      const user = createMockUser();
      const updatedProfile = { ...mockFieldMappingProfile, name: 'Updated Profile' };
      service.updateFieldMappingProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateFieldMappingProfile(
        'profile_123',
        updateDto,
        mockCompanyId,
        user,
      );

      expect(service.updateFieldMappingProfile).toHaveBeenCalledWith(
        'profile_123',
        updateDto,
        mockCompanyId,
      );
      expect(result.name).toBe('Updated Profile');
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(
        controller.updateFieldMappingProfile('profile_123', updateDto, '', user),
      ).rejects.toThrow('Company ID is required');
    });
  });

  describe('deleteFieldMappingProfile', () => {
    it('should delete a field mapping profile', async () => {
      const user = createMockUser();
      service.deleteFieldMappingProfile.mockResolvedValue(undefined);

      const result = await controller.deleteFieldMappingProfile('profile_123', mockCompanyId, user);

      expect(service.deleteFieldMappingProfile).toHaveBeenCalledWith('profile_123', mockCompanyId);
      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(
        controller.deleteFieldMappingProfile('profile_123', '', user),
      ).rejects.toThrow('Company ID is required');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: STORAGE & BILLING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getStorageUsage', () => {
    const mockStorageUsage = {
      companyId: mockCompanyId,
      totalStorageBytes: 1048576000, // ~1GB
      totalStorageFormatted: '1.0 GB',
      totalImages: 250,
      totalThumbnails: 720,
      breakdown: {
        originals: { count: 250, bytes: 750000000, formatted: '750 MB' },
        thumbnailsSmall: { count: 240, bytes: 12000000, formatted: '12 MB' },
        thumbnailsMedium: { count: 240, bytes: 48000000, formatted: '48 MB' },
        thumbnailsLarge: { count: 240, bytes: 238576000, formatted: '238 MB' },
      },
      lastUpdated: new Date(),
    };

    it('should return storage usage statistics', async () => {
      const user = createMockUser();
      service.getStorageUsage.mockResolvedValue(mockStorageUsage);

      const result = await controller.getStorageUsage(mockCompanyId, user);

      expect(service.getStorageUsage).toHaveBeenCalledWith(mockCompanyId);
      expect(result).toEqual(mockStorageUsage);
    });

    it('should use user companyId if query companyId not provided', async () => {
      const user = createMockUser();
      service.getStorageUsage.mockResolvedValue(mockStorageUsage);

      await controller.getStorageUsage('', user);

      expect(service.getStorageUsage).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.getStorageUsage('', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  describe('getImportHistory', () => {
    const mockImportHistory = {
      companyId: mockCompanyId,
      totalJobs: 15,
      successfulJobs: 12,
      failedJobs: 2,
      cancelledJobs: 1,
      totalProductsImported: 850,
      totalImagesImported: 2100,
      avgJobDurationSeconds: 180,
      jobsByProvider: { ROASTIFY: 10, SHOPIFY: 5 },
      jobsOverTime: [
        { date: '2025-01-01', count: 3 },
        { date: '2025-01-02', count: 2 },
      ],
    };

    it('should return import history statistics', async () => {
      const user = createMockUser();
      service.getImportHistory.mockResolvedValue(mockImportHistory);

      const result = await controller.getImportHistory(mockCompanyId, user);

      expect(service.getImportHistory).toHaveBeenCalledWith(mockCompanyId);
      expect(result).toEqual(mockImportHistory);
    });

    it('should use user companyId if query companyId not provided', async () => {
      const user = createMockUser();
      service.getImportHistory.mockResolvedValue(mockImportHistory);

      await controller.getImportHistory('', user);

      expect(service.getImportHistory).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(controller.getImportHistory('', user)).rejects.toThrow(
        'Company ID is required',
      );
    });
  });

  describe('estimateImportCost', () => {
    const mockCostEstimate = {
      productCount: 100,
      imageCount: 200,
      estimatedStorageBytes: 524288000, // 500MB
      estimatedStorageFormatted: '500 MB',
      estimatedThumbnails: 600,
      costs: {
        storagePerGbCents: 2300,
        imageProcessingCents: 10,
        thumbnailGenerationCents: 5,
        monthlyStorageCents: 1150,
        processingCostCents: 5000,
      },
      totalCostCents: 6150,
      currency: 'USD',
    };

    it('should return cost estimate for import', async () => {
      const user = createMockUser();
      service.estimateImportCost.mockResolvedValue(mockCostEstimate);

      const result = await controller.estimateImportCost(
        mockCompanyId,
        '100',
        '200',
        'true',
        user,
      );

      expect(service.estimateImportCost).toHaveBeenCalledWith(mockCompanyId, 100, 200, true);
      expect(result).toEqual(mockCostEstimate);
    });

    it('should parse generateThumbnails as false when set to "false"', async () => {
      const user = createMockUser();
      service.estimateImportCost.mockResolvedValue({
        ...mockCostEstimate,
        estimatedThumbnails: 0,
      });

      await controller.estimateImportCost(mockCompanyId, '100', '200', 'false', user);

      expect(service.estimateImportCost).toHaveBeenCalledWith(mockCompanyId, 100, 200, false);
    });

    it('should default to true for generateThumbnails when not specified', async () => {
      const user = createMockUser();
      service.estimateImportCost.mockResolvedValue(mockCostEstimate);

      await controller.estimateImportCost(mockCompanyId, '100', '200', undefined as any, user);

      expect(service.estimateImportCost).toHaveBeenCalledWith(mockCompanyId, 100, 200, true);
    });

    it('should throw BadRequestException for invalid productCount', async () => {
      const user = createMockUser();

      await expect(
        controller.estimateImportCost(mockCompanyId, 'invalid', '200', 'true', user),
      ).rejects.toThrow('Product count must be a non-negative number');
    });

    it('should throw BadRequestException for negative productCount', async () => {
      const user = createMockUser();

      await expect(
        controller.estimateImportCost(mockCompanyId, '-10', '200', 'true', user),
      ).rejects.toThrow('Product count must be a non-negative number');
    });

    it('should throw BadRequestException for invalid imageCount', async () => {
      const user = createMockUser();

      await expect(
        controller.estimateImportCost(mockCompanyId, '100', 'invalid', 'true', user),
      ).rejects.toThrow('Image count must be a non-negative number');
    });

    it('should throw BadRequestException for negative imageCount', async () => {
      const user = createMockUser();

      await expect(
        controller.estimateImportCost(mockCompanyId, '100', '-50', 'true', user),
      ).rejects.toThrow('Image count must be a non-negative number');
    });

    it('should throw BadRequestException if no companyId', async () => {
      const user = createMockUser({ companyId: undefined });

      await expect(
        controller.estimateImportCost('', '100', '200', 'true', user),
      ).rejects.toThrow('Company ID is required');
    });

    it('should default productCount and imageCount to 0 when empty', async () => {
      const user = createMockUser();
      service.estimateImportCost.mockResolvedValue({
        ...mockCostEstimate,
        productCount: 0,
        imageCount: 0,
      });

      await controller.estimateImportCost(mockCompanyId, '', '', 'true', user);

      expect(service.estimateImportCost).toHaveBeenCalledWith(mockCompanyId, 0, 0, true);
    });
  });
});
