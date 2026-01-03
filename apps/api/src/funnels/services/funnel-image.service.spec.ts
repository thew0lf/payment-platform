import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FunnelImageService } from './funnel-image.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StockImageService } from '../../integrations/services/providers/stock-image.service';
import { CloudinaryService } from '../../integrations/services/providers/cloudinary.service';
import { S3StorageService } from '../../integrations/services/providers/s3-storage.service';
import { ClientIntegrationService } from '../../integrations/services/client-integration.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import {
  IntegrationProvider,
  IntegrationMode,
  IntegrationEnvironment,
  IntegrationStatus,
  IntegrationCategory,
} from '../../integrations/types/integration.types';

describe('FunnelImageService', () => {
  let service: FunnelImageService;
  let stockImageService: jest.Mocked<StockImageService>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;
  let s3StorageService: jest.Mocked<S3StorageService>;
  let clientIntegrationService: jest.Mocked<ClientIntegrationService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockStockImage = {
    id: 'stock-1',
    url: 'https://images.unsplash.com/photo-test',
    thumbnailUrl: 'https://images.unsplash.com/photo-test?w=300',
    width: 1920,
    height: 1080,
    alt: 'Test image',
    photographer: 'Test Photographer',
    photographerUrl: 'https://unsplash.com/@test',
    source: 'unsplash' as const,
  };

  const mockProcessedResult = {
    processedUrl: 'https://res.cloudinary.com/processed',
    buffer: Buffer.from('test-image-data'),
    originalDimensions: { width: 1920, height: 1080 },
    newDimensions: { width: 1920, height: 1080 },
    operation: 'smart_crop',
  };

  const mockUploadResult = {
    key: 'funnels/uploads/test.webp',
    url: 'https://s3.amazonaws.com/bucket/funnels/uploads/test.webp',
    cdnUrl: 'https://cdn.example.com/funnels/uploads/test.webp',
    size: 12345,
    contentType: 'image/webp',
    thumbnails: {
      small: 'https://s3.amazonaws.com/bucket/funnels/uploads/test_small.webp',
      medium: 'https://s3.amazonaws.com/bucket/funnels/uploads/test_medium.webp',
      large: 'https://s3.amazonaws.com/bucket/funnels/uploads/test_large.webp',
    },
  };

  beforeEach(async () => {
    const mockStockImageService = {
      getHeroImage: jest.fn().mockReturnValue(mockStockImage),
      getSectionImages: jest.fn().mockReturnValue([mockStockImage]),
      getFallbackImages: jest.fn().mockReturnValue([mockStockImage]),
    };

    const mockCloudinaryService = {
      smartCrop: jest.fn().mockResolvedValue(mockProcessedResult),
      removeBackground: jest.fn().mockResolvedValue(mockProcessedResult),
      enhance: jest.fn().mockResolvedValue(mockProcessedResult),
      upscale: jest.fn().mockResolvedValue(mockProcessedResult),
    };

    const mockS3StorageService = {
      uploadFile: jest.fn().mockResolvedValue(mockUploadResult),
    };

    const mockClientIntegrationService = {
      list: jest.fn().mockResolvedValue([]),
    };

    const mockPrismaService = {
      clientIntegration: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const mockEncryptionService = {
      decrypt: jest.fn().mockImplementation((data) => data),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunnelImageService,
        { provide: StockImageService, useValue: mockStockImageService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
        { provide: S3StorageService, useValue: mockS3StorageService },
        { provide: ClientIntegrationService, useValue: mockClientIntegrationService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CredentialEncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<FunnelImageService>(FunnelImageService);
    stockImageService = module.get(StockImageService);
    cloudinaryService = module.get(CloudinaryService);
    s3StorageService = module.get(S3StorageService);
    clientIntegrationService = module.get(ClientIntegrationService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVisualContentCapabilities', () => {
    it('should return free tier when no integrations exist', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      const result = await service.getVisualContentCapabilities('company-1');

      expect(result.tier).toBe('free');
      expect(result.hasCloudinary).toBe(false);
      expect(result.hasRunway).toBe(false);
      expect(result.hasOpenAI).toBe(false);
      expect(result.maxImages).toBe(5);
      expect(result.features).toContain('Stock image fallback');
    });

    it('should return pro tier when Cloudinary integration is active', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'company-1',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      const result = await service.getVisualContentCapabilities('company-1');

      expect(result.tier).toBe('pro');
      expect(result.hasCloudinary).toBe(true);
      expect(result.maxImages).toBe(20);
      expect(result.features).toContain('AI background removal');
      expect(result.features).toContain('Smart cropping');
    });

    it('should return enterprise tier when Runway integration is active', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.RUNWAY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'company-1',
          category: IntegrationCategory.VIDEO_GENERATION,
          name: 'Runway',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      const result = await service.getVisualContentCapabilities('company-1');

      expect(result.tier).toBe('enterprise');
      expect(result.hasRunway).toBe(true);
      expect(result.maxImages).toBe(50);
      expect(result.maxVideoDuration).toBe(10);
      expect(result.features).toContain('AI video generation');
    });

    it('should handle errors gracefully and return free tier', async () => {
      clientIntegrationService.list.mockRejectedValue(new Error('Database error'));

      const result = await service.getVisualContentCapabilities('company-1');

      expect(result.tier).toBe('free');
      expect(result.maxImages).toBe(5);
    });
  });

  describe('resolveHeroImage', () => {
    it('should return stock image for free tier', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      const result = await service.resolveHeroImage('company-1', {
        keywords: ['winter', 'sale'],
      });

      expect(stockImageService.getHeroImage).toHaveBeenCalledWith(['winter', 'sale']);
      expect(result.source).toBe('stock');
      expect(result.url).toBe(mockStockImage.url);
      expect(result.attribution?.photographer).toBe(mockStockImage.photographer);
    });

    it('should enhance with Cloudinary for pro tier', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'company-1',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: {
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
      });

      const result = await service.resolveHeroImage('company-1', {
        keywords: ['coffee'],
        orientation: 'landscape',
      });

      expect(cloudinaryService.smartCrop).toHaveBeenCalled();
      expect(result.source).toBe('cloudinary');
      expect(result.url).toBe('https://res.cloudinary.com/processed');
    });

    it('should fall back to stock if Cloudinary fails', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'company-1',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: {
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
      });

      cloudinaryService.smartCrop.mockRejectedValue(new Error('Cloudinary API error'));

      const result = await service.resolveHeroImage('company-1', {
        keywords: ['coffee'],
      });

      expect(result.source).toBe('stock');
      expect(result.url).toBe(mockStockImage.url);
    });
  });

  describe('resolveSectionImages', () => {
    it('should return multiple stock images', async () => {
      const result = await service.resolveSectionImages(
        'company-1',
        { keywords: ['coffee', 'shop'] },
        3,
      );

      expect(stockImageService.getSectionImages).toHaveBeenCalledWith(['coffee', 'shop'], 3);
      expect(result).toHaveLength(1); // Mocked to return 1
      expect(result[0].source).toBe('stock');
    });

    it('should default to 3 images when count not specified', async () => {
      await service.resolveSectionImages('company-1', { keywords: ['business'] });

      expect(stockImageService.getSectionImages).toHaveBeenCalledWith(['business'], 3);
    });
  });

  describe('resolveFunnelMediaAssets', () => {
    it('should resolve hero image from suggested keywords', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      const result = await service.resolveFunnelMediaAssets('company-1', {
        hero: { suggestedImageKeywords: ['winter', 'sale', 'holiday'] },
      });

      expect(stockImageService.getHeroImage).toHaveBeenCalledWith(['winter', 'sale', 'holiday']);
      expect(result.hero).toBeDefined();
      expect(result.ogImage).toBeDefined();
      expect(result.hero?.url).toBe(mockStockImage.url);
    });

    it('should use default keywords when none provided', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      const result = await service.resolveFunnelMediaAssets('company-1', {});

      expect(stockImageService.getHeroImage).toHaveBeenCalledWith(['business', 'professional']);
      expect(result.hero).toBeDefined();
    });
  });

  describe('generateGradientFallback', () => {
    it('should generate gradient from hex color', () => {
      const gradient = service.generateGradientFallback('#6366f1');

      expect(gradient).toContain('linear-gradient');
      expect(gradient).toContain('#6366f1');
    });

    it('should add # prefix if missing', () => {
      const gradient = service.generateGradientFallback('6366f1');

      expect(gradient).toContain('#6366f1');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: CLOUDINARY PROCESSING PIPELINE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('processImage', () => {
    // Valid CUID-formatted company ID for tests
    const validCompanyId = 'cuid1234567890123456789012';

    const mockCloudinaryIntegration = {
      id: 'int-1',
      provider: IntegrationProvider.CLOUDINARY,
      status: IntegrationStatus.ACTIVE,
      clientId: validCompanyId,
      category: IntegrationCategory.IMAGE_PROCESSING,
      name: 'Cloudinary',
      mode: IntegrationMode.OWN,
      settings: {},
      environment: IntegrationEnvironment.PRODUCTION,
      isDefault: true,
      priority: 1,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
    };

    it('should throw error when Cloudinary is not configured', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      await expect(
        service.processImage(validCompanyId, {
          sourceUrl: 'https://images.unsplash.com/photo-test',
          operations: ['enhance'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process image with single operation', async () => {
      clientIntegrationService.list.mockResolvedValue([mockCloudinaryIntegration]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: {
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
      });

      const result = await service.processImage(validCompanyId, {
        sourceUrl: 'https://images.unsplash.com/photo-test',
        operations: ['enhance'],
        saveToS3: false,
      });

      expect(cloudinaryService.enhance).toHaveBeenCalled();
      expect(result.operationsApplied).toContain('enhance');
      expect(result.metadata.originalUrl).toBe('https://images.unsplash.com/photo-test');
    });

    it('should process image with multiple operations in sequence', async () => {
      clientIntegrationService.list.mockResolvedValue([mockCloudinaryIntegration]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: {
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
      });

      const result = await service.processImage(validCompanyId, {
        sourceUrl: 'https://images.unsplash.com/photo-test',
        operations: ['enhance', 'smart_crop'],
        cropOptions: { aspectRatio: '16:9' },
        saveToS3: false,
      });

      expect(cloudinaryService.enhance).toHaveBeenCalled();
      expect(cloudinaryService.smartCrop).toHaveBeenCalled();
      expect(result.operationsApplied).toEqual(['enhance', 'smart_crop']);
    });

    it('should save processed image to S3 when requested', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockCloudinaryIntegration,
        {
          id: 'int-2',
          provider: IntegrationProvider.AWS_S3,
          status: IntegrationStatus.ACTIVE,
          clientId: validCompanyId,
          category: IntegrationCategory.STORAGE,
          name: 'AWS S3',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'int-1',
          credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
        })
        .mockResolvedValueOnce({
          id: 'int-2',
          credentials: { region: 'us-east-1', bucket: 'test', accessKeyId: 'key', secretAccessKey: 'secret' },
        });

      const result = await service.processImage(validCompanyId, {
        sourceUrl: 'https://images.unsplash.com/photo-test',
        operations: ['enhance'],
        saveToS3: true,
        s3Folder: 'funnels/test',
      });

      expect(s3StorageService.uploadFile).toHaveBeenCalled();
      expect(result.s3Key).toBe(mockUploadResult.key);
      expect(result.thumbnails).toBeDefined();
    });
  });

  describe('uploadImage', () => {
    const mockS3Integration = {
      id: 'int-1',
      provider: IntegrationProvider.AWS_S3,
      status: IntegrationStatus.ACTIVE,
      clientId: 'company-1',
      category: IntegrationCategory.STORAGE,
      name: 'AWS S3',
      mode: IntegrationMode.OWN,
      settings: {},
      environment: IntegrationEnvironment.PRODUCTION,
      isDefault: true,
      priority: 1,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
    };

    it('should throw error when S3 is not configured', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      await expect(
        service.uploadImage('cuid1234567890123456789012', {
          buffer: Buffer.from('test'),
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid file type with friendly message', async () => {
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { region: 'us-east-1', bucket: 'test', accessKeyId: 'key', secretAccessKey: 'secret' },
      });

      await expect(
        service.uploadImage('cuid1234567890123456789012', {
          buffer: Buffer.from('test'),
          filename: 'test.txt',
          contentType: 'text/plain',
        }),
      ).rejects.toThrow('We only accept JPG, PNG, WebP, and GIF images');
    });

    it('should throw error for oversized files with friendly message', async () => {
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { region: 'us-east-1', bucket: 'test', accessKeyId: 'key', secretAccessKey: 'secret' },
      });

      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await expect(
        service.uploadImage('cuid1234567890123456789012', {
          buffer: largeBuffer,
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow("Whoa, that's a big file!");
    });

    it('should upload image to S3 successfully', async () => {
      const validCompanyId = 'cuid1234567890123456789012';
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { region: 'us-east-1', bucket: 'test', accessKeyId: 'key', secretAccessKey: 'secret' },
      });

      const result = await service.uploadImage(validCompanyId, {
        buffer: Buffer.from('test-image-data'),
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        folder: 'hero-images',
      });

      expect(s3StorageService.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        'test.jpg',
        expect.objectContaining({
          companyId: validCompanyId,
          folder: 'hero-images',
          contentType: 'image/jpeg',
        }),
      );
      expect(result.key).toBe(mockUploadResult.key);
      expect(result.url).toBe(mockUploadResult.url);
      expect(result.thumbnails).toBeDefined();
    });
  });

  describe('removeBackground', () => {
    const validCompanyId = 'cuid1234567890123456789012';

    it('should call processImage with background_removal operation', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: validCompanyId,
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
      });

      await service.removeBackground(validCompanyId, 'https://images.unsplash.com/photo-test', false);

      expect(cloudinaryService.removeBackground).toHaveBeenCalled();
    });
  });

  describe('smartCrop', () => {
    const validCompanyId = 'cuid1234567890123456789012';

    it('should call processImage with smart_crop operation and aspect ratio', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: validCompanyId,
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
      });

      await service.smartCrop(validCompanyId, 'https://images.unsplash.com/photo-test', '16:9', false);

      // smartCrop convenience method only runs smart_crop operation (not enhance)
      expect(cloudinaryService.smartCrop).toHaveBeenCalledWith(
        expect.any(Object),
        'https://images.unsplash.com/photo-test',
        expect.objectContaining({ aspectRatio: '16:9', gravity: 'auto:subject' }),
      );
    });
  });

  describe('processHeroImage', () => {
    const validCompanyId = 'cuid1234567890123456789012';

    it('should apply enhance and smart_crop for hero images', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: validCompanyId,
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
      });

      const result = await service.processHeroImage(
        validCompanyId,
        'https://images.unsplash.com/photo-test',
        'landscape',
      );

      expect(cloudinaryService.enhance).toHaveBeenCalled();
      expect(cloudinaryService.smartCrop).toHaveBeenCalled();
      expect(result.operationsApplied).toContain('enhance');
      expect(result.operationsApplied).toContain('smart_crop');
    });

    it('should use correct aspect ratio for portrait orientation', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: validCompanyId,
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
      });

      await service.processHeroImage(
        validCompanyId,
        'https://images.unsplash.com/photo-test',
        'portrait',
      );

      expect(cloudinaryService.smartCrop).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({ aspectRatio: '9:16' }),
      );
    });
  });

  describe('enhanceImage', () => {
    it('should call processImage with enhance operation', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
      });

      const result = await service.enhanceImage(
        'cuid1234567890123456789012',
        'https://images.unsplash.com/photo-test',
        false,
      );

      expect(cloudinaryService.enhance).toHaveBeenCalledWith(
        expect.any(Object),
        'https://images.unsplash.com/photo-test',
      );
      expect(result.operationsApplied).toContain('enhance');
    });

    it('should save enhanced image to S3 when requested', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
        {
          id: 'int-2',
          provider: IntegrationProvider.AWS_S3,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.STORAGE,
          name: 'AWS S3',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'int-1',
          credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
        })
        .mockResolvedValueOnce({
          id: 'int-2',
          credentials: { region: 'us-east-1', bucket: 'test', accessKeyId: 'key', secretAccessKey: 'secret' },
        });

      const result = await service.enhanceImage(
        'cuid1234567890123456789012',
        'https://images.unsplash.com/photo-test',
        true,
      );

      expect(s3StorageService.uploadFile).toHaveBeenCalled();
      expect(result.s3Key).toBe(mockUploadResult.key);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECURITY VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('security validations', () => {
    it('should reject invalid companyId format', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'company-1',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      await expect(
        service.processImage('invalid-id', {
          sourceUrl: 'https://images.unsplash.com/photo-test',
          operations: ['enhance'],
        }),
      ).rejects.toThrow('Invalid company ID format');
    });

    it('should reject empty companyId', async () => {
      await expect(
        service.processImage('', {
          sourceUrl: 'https://images.unsplash.com/photo-test',
          operations: ['enhance'],
        }),
      ).rejects.toThrow('Company ID is required');
    });

    it('should reject non-HTTPS URLs (SSRF protection)', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      await expect(
        service.processImage('cuid1234567890123456789012', {
          sourceUrl: 'http://example.com/image.jpg',
          operations: ['enhance'],
        }),
      ).rejects.toThrow('For security, we only accept HTTPS image URLs');
    });

    it('should reject URLs pointing to internal networks (SSRF protection)', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      await expect(
        service.processImage('cuid1234567890123456789012', {
          sourceUrl: 'https://localhost:8080/image.jpg',
          operations: ['enhance'],
        }),
      ).rejects.toThrow('This URL points to an internal network');

      await expect(
        service.processImage('cuid1234567890123456789012', {
          sourceUrl: 'https://169.254.169.254/image.jpg',
          operations: ['enhance'],
        }),
      ).rejects.toThrow('This URL points to an internal network');
    });

    it('should reject URLs from untrusted domains (SSRF protection)', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      await expect(
        service.processImage('cuid1234567890123456789012', {
          sourceUrl: 'https://evil-site.com/image.jpg',
          operations: ['enhance'],
        }),
      ).rejects.toThrow('We can only process images from Unsplash, Pexels, or your S3 bucket');
    });

    it('should accept URLs from allowed domains', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' },
      });

      // Should not throw for Unsplash
      await expect(
        service.processImage('cuid1234567890123456789012', {
          sourceUrl: 'https://images.unsplash.com/photo-test',
          operations: ['enhance'],
          saveToS3: false,
        }),
      ).resolves.toBeDefined();
    });

    it('should reject malformed URLs', async () => {
      clientIntegrationService.list.mockResolvedValue([
        {
          id: 'int-1',
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
          clientId: 'cuid1234567890123456789012',
          category: IntegrationCategory.IMAGE_PROCESSING,
          name: 'Cloudinary',
          mode: IntegrationMode.OWN,
          settings: {},
          environment: IntegrationEnvironment.PRODUCTION,
          isDefault: true,
          priority: 1,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ]);

      await expect(
        service.processImage('cuid1234567890123456789012', {
          sourceUrl: 'not-a-valid-url',
          operations: ['enhance'],
        }),
      ).rejects.toThrow("That URL doesn't look right");
    });
  });

  describe('credential validation', () => {
    it('should return null for invalid Cloudinary credential structure', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { invalid: 'structure' }, // Missing required fields
      });

      // The service should gracefully handle invalid credentials
      const result = await service.getVisualContentCapabilities('company-1');
      expect(result.hasCloudinary).toBe(false);
    });

    it('should return null for invalid S3 credential structure', async () => {
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { bucket: 'only-bucket' }, // Missing region, accessKeyId, secretAccessKey
      });

      // uploadImage should throw when S3 credentials are invalid
      await expect(
        service.uploadImage('cuid1234567890123456789012', {
          buffer: Buffer.from('test'),
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow("Image storage isn't set up yet");
    });
  });
});
