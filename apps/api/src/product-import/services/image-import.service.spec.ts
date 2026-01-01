import { Test, TestingModule } from '@nestjs/testing';
import { ImageImportService, ImageImportOptions, ImageImportProgress } from './image-import.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3StorageService, S3Credentials, UploadResult } from '../../integrations/services/providers/s3-storage.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { ExternalProductImage, ImportImageResult } from '../types/product-import.types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ImageImportService', () => {
  let service: ImageImportService;
  let mockTx: {
    productImage: { createMany: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock };
    productMedia: { createMany: jest.Mock; deleteMany: jest.Mock };
    product: { update: jest.Mock };
  };
  let mockPrisma: {
    clientIntegration: { findFirst: jest.Mock };
    platformIntegration: { findFirst: jest.Mock };
    productImage: { createMany: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock };
    productMedia: { createMany: jest.Mock; deleteMany: jest.Mock };
    product: { update: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockS3Storage: { uploadFile: jest.Mock };
  let mockCredentialEncryption: { decrypt: jest.Mock };

  const mockS3Credentials: S3Credentials = {
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    cloudfrontDomain: 'cdn.example.com',
    keyPrefix: 'products/test-company/',
  };

  const mockImageOptions: ImageImportOptions = {
    companyId: 'company-123',
    productId: 'product-456',
    jobId: 'job-789',
    generateThumbnails: true,
  };

  // Use allowlisted domains for SSRF protection tests
  const mockExternalImages: ExternalProductImage[] = [
    { id: 'img1', url: 'https://storage.roastify.app/image1.jpg', altText: 'Image 1', position: 0 },
    { id: 'img2', url: 'https://storage.roastify.app/image2.png', altText: 'Image 2', position: 1 },
  ];

  const createMockUploadResult = (overrides: Partial<UploadResult> = {}): UploadResult => ({
    url: 'https://s3.example.com/image.jpg',
    cdnUrl: 'https://cdn.example.com/image.jpg',
    key: 'products/test/image.jpg',
    contentType: 'image/jpeg',
    size: 1000,
    ...overrides,
  });

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create transaction mock that receives and calls the callback
    mockTx = {
      productImage: { createMany: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
      productMedia: { createMany: jest.fn(), deleteMany: jest.fn() },
      product: { update: jest.fn() },
    };

    mockPrisma = {
      clientIntegration: { findFirst: jest.fn() },
      platformIntegration: { findFirst: jest.fn() },
      productImage: { createMany: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
      productMedia: { createMany: jest.fn(), deleteMany: jest.fn() },
      product: { update: jest.fn() },
      $transaction: jest.fn((callback) => callback(mockTx)),
    };

    mockS3Storage = {
      uploadFile: jest.fn(),
    };

    mockCredentialEncryption = {
      decrypt: jest.fn(),
    };

    // Default mock for transaction findMany - returns images matching what was created
    mockTx.productImage.findMany.mockResolvedValue([
      { cdnUrl: 'https://cdn.example.com/image.jpg' },
    ]);
    mockTx.productImage.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.productMedia.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.productImage.createMany.mockResolvedValue({ count: 1 });
    mockTx.productMedia.createMany.mockResolvedValue({ count: 1 });
    mockTx.product.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageImportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3StorageService, useValue: mockS3Storage },
        { provide: CredentialEncryptionService, useValue: mockCredentialEncryption },
      ],
    }).compile();

    service = module.get<ImageImportService>(ImageImportService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('importProductImages', () => {
    it('should successfully import multiple images', async () => {
      // Mock successful image downloads
      const mockImageBuffer = Buffer.alloc(1000, 'x');
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
        headers: { 'content-type': 'image/jpeg' },
      });

      // Mock successful S3 uploads
      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult({
        thumbnails: {
          small: 'https://cdn.example.com/image_small.jpg',
          medium: 'https://cdn.example.com/image_medium.jpg',
          large: 'https://cdn.example.com/image_large.jpg',
        },
      }));

      const results = await service.importProductImages(
        mockExternalImages,
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].cdnUrl).toBe('https://cdn.example.com/image.jpg');
      expect(results[1].success).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockS3Storage.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should call progress callback with updates', async () => {
      const mockImageBuffer = Buffer.alloc(1000, 'x');
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      // Capture progress snapshots since the object is mutated
      const progressSnapshots: ImageImportProgress[] = [];
      const progressCallback = jest.fn((progress: ImageImportProgress) => {
        progressSnapshots.push({ ...progress });
      });

      await service.importProductImages(
        mockExternalImages,
        mockImageOptions,
        mockS3Credentials,
        progressCallback,
      );

      expect(progressCallback).toHaveBeenCalledTimes(2);

      // First progress update
      expect(progressSnapshots[0]).toEqual(expect.objectContaining({
        total: 2,
        processed: 1,
        successful: 1,
        failed: 0,
      }));

      // Second progress update
      expect(progressSnapshots[1]).toEqual(expect.objectContaining({
        total: 2,
        processed: 2,
        successful: 2,
        failed: 0,
      }));
    });

    it('should handle download failures gracefully', async () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
      };
      mockedAxios.get.mockRejectedValue(axiosError);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      const results = await service.importProductImages(
        mockExternalImages,
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Download timeout');
      expect(results[1].success).toBe(false);
    });

    it('should handle S3 upload failures gracefully', async () => {
      const mockImageBuffer = Buffer.alloc(1000, 'x');
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockRejectedValue(new Error('S3 upload failed'));

      const results = await service.importProductImages(
        mockExternalImages,
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('S3 upload failed');
    });

    it('should handle mixed success and failure results', async () => {
      const mockImageBuffer = Buffer.alloc(1000, 'x');

      // First call succeeds
      mockedAxios.get
        .mockResolvedValueOnce({
          data: mockImageBuffer,
          headers: { 'content-type': 'image/jpeg' },
        })
        // Second call fails
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 404 },
        });

      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      const progressCallback = jest.fn();
      const results = await service.importProductImages(
        mockExternalImages,
        mockImageOptions,
        mockS3Credentials,
        progressCallback,
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('HTTP 404');

      // Check final progress
      expect(progressCallback).toHaveBeenLastCalledWith(expect.objectContaining({
        successful: 1,
        failed: 1,
      }));
    });

    it('should reject non-image content types', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'text/html' },
      });

      const results = await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Invalid content type: text/html');
    });

    it('should reject images that are too small', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(50, 'x'), // Only 50 bytes
        headers: { 'content-type': 'image/jpeg' },
      });

      const results = await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Image file too small or corrupted');
    });

    it('should handle empty image array', async () => {
      const results = await service.importProductImages(
        [],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results).toHaveLength(0);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        code: 'ENOTFOUND',
      });
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      const results = await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Network error: ENOTFOUND');
    });

    it('should use correct file extensions based on content type', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/png' },
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult({
        contentType: 'image/png',
      }));

      await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
        mockS3Credentials,
        expect.any(Buffer),
        expect.stringMatching(/\.png$/),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should include metadata in S3 upload', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
        mockS3Credentials,
        expect.any(Buffer),
        expect.any(String),
        {
          companyId: 'company-123',
          folder: 'product-images',
          metadata: {
            productId: 'product-456',
            importJobId: 'job-789',
            originalUrl: 'https://storage.roastify.app/image1.jpg',
            altText: 'Image 1',
            position: '0',
          },
        },
        { generateThumbnails: true },
      );
    });
  });

  describe('SSRF protection', () => {
    it('should reject HTTP URLs (require HTTPS)', async () => {
      const httpImage: ExternalProductImage = {
        id: 'img1',
        url: 'http://storage.roastify.app/image.jpg',
        position: 0,
      };

      const results = await service.importProductImages(
        [httpImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Only HTTPS URLs are allowed');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should reject URLs from non-allowlisted domains', async () => {
      const blockedDomainImage: ExternalProductImage = {
        id: 'img1',
        url: 'https://evil-site.com/image.jpg',
        position: 0,
      };

      const results = await service.importProductImages(
        [blockedDomainImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Domain not in allowlist');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should reject localhost URLs', async () => {
      const localhostImage: ExternalProductImage = {
        id: 'img1',
        url: 'https://localhost/image.jpg',
        position: 0,
      };

      const results = await service.importProductImages(
        [localhostImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('URL points to blocked host');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should reject private IP addresses', async () => {
      const privateIpImage: ExternalProductImage = {
        id: 'img1',
        url: 'https://192.168.1.1/image.jpg',
        position: 0,
      };

      const results = await service.importProductImages(
        [privateIpImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('URL points to blocked network range');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should reject cloud metadata endpoints', async () => {
      const metadataImage: ExternalProductImage = {
        id: 'img1',
        url: 'https://169.254.169.254/latest/meta-data/',
        position: 0,
      };

      const results = await service.importProductImages(
        [metadataImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('URL points to blocked network range');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should allow URLs from storage.roastify.app', async () => {
      const allowedImage: ExternalProductImage = {
        id: 'img1',
        url: 'https://storage.roastify.app/images/product.jpg',
        position: 0,
      };

      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });
      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      const results = await service.importProductImages(
        [allowedImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should allow URLs from cdn.shopify.com', async () => {
      const shopifyImage: ExternalProductImage = {
        id: 'img1',
        url: 'https://cdn.shopify.com/s/files/1/image.jpg',
        position: 0,
      };

      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });
      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      const results = await service.importProductImages(
        [shopifyImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should reject invalid URLs', async () => {
      const invalidUrlImage: ExternalProductImage = {
        id: 'img1',
        url: 'not-a-valid-url',
        position: 0,
      };

      const results = await service.importProductImages(
        [invalidUrlImage],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Invalid URL format');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('updateProductImages', () => {
    const mockSuccessfulImages: ImportImageResult[] = [
      {
        success: true,
        originalUrl: 'https://storage.roastify.app/image1.jpg',
        cdnUrl: 'https://cdn.example.com/image1.jpg',
        s3Key: 'products/test/image1.jpg',
        filename: 'product-456_0_123456.jpg',
        contentType: 'image/jpeg',
        size: 1000,
        thumbnails: {
          small: 'https://cdn.example.com/image1_small.jpg',
          medium: 'https://cdn.example.com/image1_medium.jpg',
          large: 'https://cdn.example.com/image1_large.jpg',
        },
      },
      {
        success: true,
        originalUrl: 'https://storage.roastify.app/image2.png',
        cdnUrl: 'https://cdn.example.com/image2.png',
        s3Key: 'products/test/image2.png',
        filename: 'product-456_1_123457.png',
        contentType: 'image/png',
        size: 2000,
      },
    ];

    it('should use a transaction for atomicity', async () => {
      await service.updateProductImages(
        'product-456',
        'company-123',
        mockSuccessfulImages,
        'SHOPIFY',
      );

      // Verify transaction was used
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should delete existing ProductImage and ProductMedia records before creating new ones', async () => {
      await service.updateProductImages(
        'product-456',
        'company-123',
        mockSuccessfulImages,
        'SHOPIFY',
      );

      // Verify delete operations were called within transaction
      expect(mockTx.productImage.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'product-456' },
      });
      expect(mockTx.productMedia.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'product-456' },
      });
    });

    it('should create ProductImage records for successful images', async () => {
      mockTx.productImage.createMany.mockResolvedValue({ count: 2 });

      await service.updateProductImages(
        'product-456',
        'company-123',
        mockSuccessfulImages,
        'SHOPIFY',
      );

      expect(mockTx.productImage.createMany).toHaveBeenCalledWith({
        data: [
          {
            productId: 'product-456',
            companyId: 'company-123',
            s3Key: 'products/test/image1.jpg',
            cdnUrl: 'https://cdn.example.com/image1.jpg',
            originalUrl: 'https://storage.roastify.app/image1.jpg',
            importSource: 'SHOPIFY',
            filename: 'product-456_0_123456.jpg',
            contentType: 'image/jpeg',
            size: 1000,
            altText: '',
            position: 0,
            isPrimary: true,
            thumbnailSmall: 'https://cdn.example.com/image1_small.jpg',
            thumbnailMedium: 'https://cdn.example.com/image1_medium.jpg',
            thumbnailLarge: 'https://cdn.example.com/image1_large.jpg',
          },
          {
            productId: 'product-456',
            companyId: 'company-123',
            s3Key: 'products/test/image2.png',
            cdnUrl: 'https://cdn.example.com/image2.png',
            originalUrl: 'https://storage.roastify.app/image2.png',
            importSource: 'SHOPIFY',
            filename: 'product-456_1_123457.png',
            contentType: 'image/png',
            size: 2000,
            altText: '',
            position: 1,
            isPrimary: false,
            thumbnailSmall: undefined,
            thumbnailMedium: undefined,
            thumbnailLarge: undefined,
          },
        ],
      });
    });

    it('should create ProductMedia records for the admin dashboard UI', async () => {
      await service.updateProductImages(
        'product-456',
        'company-123',
        mockSuccessfulImages,
        'SHOPIFY',
      );

      expect(mockTx.productMedia.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            productId: 'product-456',
            type: 'IMAGE',
            url: 'https://cdn.example.com/image1.jpg',
            storageProvider: 'S3',
            storageKey: 'products/test/image1.jpg',
          }),
        ]),
      });
    });

    it('should update product images JSON array with verified URLs from database', async () => {
      // Mock findMany within transaction to return the images that were created
      mockTx.productImage.findMany.mockResolvedValue([
        { cdnUrl: 'https://cdn.example.com/image1.jpg' },
        { cdnUrl: 'https://cdn.example.com/image2.png' },
      ]);

      await service.updateProductImages(
        'product-456',
        'company-123',
        mockSuccessfulImages,
      );

      // Verify findMany was called to get verified URLs within transaction
      expect(mockTx.productImage.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-456' },
        orderBy: { position: 'asc' },
        select: { cdnUrl: true },
      });

      // Verify product.update uses verified URLs from database within transaction
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-456' },
        data: {
          images: [
            'https://cdn.example.com/image1.jpg',
            'https://cdn.example.com/image2.png',
          ],
        },
      });
    });

    it('should skip failed images when updating', async () => {
      const mixedResults: ImportImageResult[] = [
        { success: false, originalUrl: 'https://storage.roastify.app/failed.jpg', error: 'Download failed' },
        mockSuccessfulImages[0],
      ];

      mockTx.productImage.findMany.mockResolvedValue([
        { cdnUrl: 'https://cdn.example.com/image1.jpg' },
      ]);

      await service.updateProductImages(
        'product-456',
        'company-123',
        mixedResults,
      );

      expect(mockTx.productImage.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({
          cdnUrl: 'https://cdn.example.com/image1.jpg',
        })],
      });
    });

    it('should not update anything if all images failed', async () => {
      const failedResults: ImportImageResult[] = [
        { success: false, originalUrl: 'https://storage.roastify.app/failed1.jpg', error: 'Error 1' },
        { success: false, originalUrl: 'https://storage.roastify.app/failed2.jpg', error: 'Error 2' },
      ];

      await service.updateProductImages(
        'product-456',
        'company-123',
        failedResults,
      );

      // Transaction should not be called when there are no successful images
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should use default values for missing fields', async () => {
      const minimalImages: ImportImageResult[] = [
        {
          success: true,
          originalUrl: 'https://storage.roastify.app/minimal.jpg',
          cdnUrl: 'https://cdn.example.com/minimal.jpg',
          s3Key: 'products/test/minimal.jpg',
          // Missing filename, contentType, size
        },
      ];

      mockTx.productImage.findMany.mockResolvedValue([
        { cdnUrl: 'https://cdn.example.com/minimal.jpg' },
      ]);

      await service.updateProductImages(
        'product-456',
        'company-123',
        minimalImages,
      );

      expect(mockTx.productImage.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({
          filename: 'image_0',
          contentType: 'image/jpeg',
          size: 0,
        })],
      });
    });
  });

  describe('getS3Credentials', () => {
    const mockClientCredentials = {
      region: 'us-west-2',
      bucket: 'client-bucket',
      accessKeyId: 'client-key',
      secretAccessKey: 'client-secret',
      cloudfrontDomain: 'client-cdn.example.com',
    };

    const mockPlatformCredentials = {
      region: 'eu-west-1',
      bucket: 'platform-bucket',
      accessKeyId: 'platform-key',
      secretAccessKey: 'platform-secret',
      cloudfrontDomain: 'platform-cdn.example.com',
    };

    it('should return client integration credentials when available', async () => {
      mockPrisma.clientIntegration.findFirst.mockResolvedValue({
        id: 'int-1',
        credentials: { encrypted: 'data' }, // Encrypted credentials
      });
      mockCredentialEncryption.decrypt.mockReturnValue(mockClientCredentials);

      const result = await service.getS3Credentials('company-123', 'client-456');

      expect(result).toEqual({
        region: 'us-west-2',
        bucket: 'client-bucket',
        accessKeyId: 'client-key',
        secretAccessKey: 'client-secret',
        cloudfrontDomain: 'client-cdn.example.com',
        keyPrefix: 'products/company-123/',
      });

      expect(mockPrisma.clientIntegration.findFirst).toHaveBeenCalledWith({
        where: {
          clientId: 'client-456',
          provider: 'AWS_S3',
          status: 'ACTIVE',
        },
      });
    });

    it('should fall back to platform integration when client integration not found', async () => {
      mockPrisma.clientIntegration.findFirst.mockResolvedValue(null);
      mockPrisma.platformIntegration.findFirst.mockResolvedValue({
        id: 'plat-1',
        credentials: { encrypted: 'data' }, // Encrypted credentials
      });
      mockCredentialEncryption.decrypt.mockReturnValue(mockPlatformCredentials);

      const result = await service.getS3Credentials('company-123', 'client-456');

      expect(result).toEqual({
        region: 'eu-west-1',
        bucket: 'platform-bucket',
        accessKeyId: 'platform-key',
        secretAccessKey: 'platform-secret',
        cloudfrontDomain: 'platform-cdn.example.com',
        keyPrefix: 'clients/client-456/products/company-123/',
      });

      expect(mockPrisma.platformIntegration.findFirst).toHaveBeenCalledWith({
        where: {
          provider: 'AWS_S3',
          isSharedWithClients: true,
          status: 'ACTIVE',
        },
      });
    });

    it('should return null when no integration found', async () => {
      mockPrisma.clientIntegration.findFirst.mockResolvedValue(null);
      mockPrisma.platformIntegration.findFirst.mockResolvedValue(null);

      const result = await service.getS3Credentials('company-123', 'client-456');

      expect(result).toBeNull();
    });

    it('should use default region when not specified', async () => {
      const credsWithoutRegion = { ...mockClientCredentials };
      delete (credsWithoutRegion as any).region;

      mockPrisma.clientIntegration.findFirst.mockResolvedValue({
        id: 'int-1',
        credentials: { encrypted: 'data' },
      });
      mockCredentialEncryption.decrypt.mockReturnValue(credsWithoutRegion);

      const result = await service.getS3Credentials('company-123', 'client-456');

      expect(result?.region).toBe('us-east-1');
    });

    it('should return null when client integration has no credentials', async () => {
      mockPrisma.clientIntegration.findFirst.mockResolvedValue({
        id: 'int-1',
        credentials: null,
      });
      mockPrisma.platformIntegration.findFirst.mockResolvedValue(null);

      const result = await service.getS3Credentials('company-123', 'client-456');

      expect(result).toBeNull();
    });
  });

  describe('calculateTotalImages', () => {
    it('should calculate total images across multiple products', () => {
      const products = [
        { images: mockExternalImages },
        { images: [mockExternalImages[0]] },
        { images: [] },
      ];

      const total = service.calculateTotalImages(products);

      expect(total).toBe(3);
    });

    it('should handle products with no images property', () => {
      const products = [
        { images: mockExternalImages },
        { images: undefined as any },
        { images: null as any },
      ];

      const total = service.calculateTotalImages(products);

      expect(total).toBe(2);
    });

    it('should return 0 for empty product array', () => {
      const total = service.calculateTotalImages([]);

      expect(total).toBe(0);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle unexpected non-Error exceptions', async () => {
      mockedAxios.get.mockRejectedValue('string error');
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(false);

      const results = await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Download failed');
    });

    it('should handle S3 upload with non-Error exceptions', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockRejectedValue('string error');

      const results = await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Upload failed');
    });

    it('should handle images without position', async () => {
      const imageWithoutPosition: ExternalProductImage = {
        id: 'img1',
        url: 'https://storage.roastify.app/no-position.jpg',
        position: undefined as any,
      };

      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      await service.importProductImages(
        [imageWithoutPosition],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
        mockS3Credentials,
        expect.any(Buffer),
        expect.stringMatching(/product-456_0_\d+\.jpg$/),
        expect.objectContaining({
          metadata: expect.objectContaining({
            position: '0',
          }),
        }),
        expect.any(Object),
      );
    });

    it('should handle images without altText', async () => {
      const imageWithoutAltText: ExternalProductImage = {
        id: 'img1',
        url: 'https://storage.roastify.app/no-alt.jpg',
        position: 0,
      };

      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      await service.importProductImages(
        [imageWithoutAltText],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            altText: '',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('content type handling', () => {
    const contentTypeTests = [
      { contentType: 'image/jpeg', expectedExt: '.jpg' },
      { contentType: 'image/png', expectedExt: '.png' },
      { contentType: 'image/gif', expectedExt: '.gif' },
      { contentType: 'image/webp', expectedExt: '.webp' },
      { contentType: 'image/avif', expectedExt: '.avif' },
      { contentType: 'image/svg+xml', expectedExt: '.svg' },
      { contentType: 'image/bmp', expectedExt: '.jpg' }, // Unknown type defaults to .jpg
    ];

    contentTypeTests.forEach(({ contentType, expectedExt }) => {
      it(`should use ${expectedExt} extension for ${contentType}`, async () => {
        mockedAxios.get.mockResolvedValue({
          data: Buffer.alloc(1000, 'x'),
          headers: { 'content-type': contentType },
        });

        mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult({
          contentType,
        }));

        await service.importProductImages(
          [mockExternalImages[0]],
          mockImageOptions,
          mockS3Credentials,
        );

        expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Buffer),
          expect.stringMatching(new RegExp(`\\${expectedExt}$`)),
          expect.any(Object),
          expect.any(Object),
        );
      });
    });

    it('should use default content-type when header is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: {}, // No content-type header
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      // Should use .jpg extension (default for image/jpeg)
      expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        expect.stringMatching(/\.jpg$/),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('thumbnail handling', () => {
    it('should pass generateThumbnails option to S3 upload', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult());

      // Test with thumbnails enabled
      await service.importProductImages(
        [mockExternalImages[0]],
        { ...mockImageOptions, generateThumbnails: true },
        mockS3Credentials,
      );

      expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        expect.any(String),
        expect.any(Object),
        { generateThumbnails: true },
      );

      jest.clearAllMocks();

      // Test with thumbnails disabled
      await service.importProductImages(
        [mockExternalImages[0]],
        { ...mockImageOptions, generateThumbnails: false },
        mockS3Credentials,
      );

      expect(mockS3Storage.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        expect.any(String),
        expect.any(Object),
        { generateThumbnails: false },
      );
    });

    it('should include thumbnail URLs in result when provided', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.alloc(1000, 'x'),
        headers: { 'content-type': 'image/jpeg' },
      });

      mockS3Storage.uploadFile.mockResolvedValue(createMockUploadResult({
        thumbnails: {
          small: 'https://cdn.example.com/image_small.jpg',
          medium: 'https://cdn.example.com/image_medium.jpg',
          large: 'https://cdn.example.com/image_large.jpg',
        },
      }));

      const results = await service.importProductImages(
        [mockExternalImages[0]],
        mockImageOptions,
        mockS3Credentials,
      );

      expect(results[0].thumbnails).toEqual({
        small: 'https://cdn.example.com/image_small.jpg',
        medium: 'https://cdn.example.com/image_medium.jpg',
        large: 'https://cdn.example.com/image_large.jpg',
      });
    });
  });
});
