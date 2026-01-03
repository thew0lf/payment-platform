import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FunnelVideoService } from './funnel-video.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RunwayService } from '../../integrations/services/providers/runway.service';
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

describe('FunnelVideoService', () => {
  let service: FunnelVideoService;
  let runwayService: jest.Mocked<RunwayService>;
  let s3StorageService: jest.Mocked<S3StorageService>;
  let clientIntegrationService: jest.Mocked<ClientIntegrationService>;
  let prismaService: jest.Mocked<PrismaService>;

  const validCompanyId = 'cuid1234567890123456789012';

  const mockRunwayIntegration = {
    id: 'int-1',
    provider: IntegrationProvider.RUNWAY,
    status: IntegrationStatus.ACTIVE,
    clientId: validCompanyId,
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
  };

  const mockS3Integration = {
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
  };

  beforeEach(async () => {
    const mockRunwayService = {
      testConnection: jest.fn().mockResolvedValue({
        success: true,
        message: 'Connected',
        latencyMs: 100,
        creditsRemaining: 1000,
      }),
      generateVideo: jest.fn().mockResolvedValue({
        taskId: 'task-123',
        status: 'PENDING',
        progress: 0,
      }),
      getTaskStatus: jest.fn().mockResolvedValue({
        taskId: 'task-123',
        status: 'SUCCEEDED',
        progress: 100,
        videoUrl: 'https://runway.ai/video.mp4',
        metadata: {
          duration: 5,
          resolution: '1080p',
          creditsUsed: 10,
        },
      }),
      cancelTask: jest.fn().mockResolvedValue(undefined),
    };

    const mockS3StorageService = {
      uploadFile: jest.fn().mockResolvedValue({
        key: 'funnels/videos/video_123.mp4',
        url: 'https://s3.amazonaws.com/bucket/video.mp4',
        cdnUrl: 'https://cdn.example.com/video.mp4',
        size: 1024000,
        contentType: 'video/mp4',
      }),
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
        FunnelVideoService,
        { provide: RunwayService, useValue: mockRunwayService },
        { provide: S3StorageService, useValue: mockS3StorageService },
        { provide: ClientIntegrationService, useValue: mockClientIntegrationService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CredentialEncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<FunnelVideoService>(FunnelVideoService);
    runwayService = module.get(RunwayService);
    s3StorageService = module.get(S3StorageService);
    clientIntegrationService = module.get(ClientIntegrationService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVideoCapabilities', () => {
    it('should return unavailable when no integrations exist', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      const result = await service.getVideoCapabilities('company-1');

      expect(result.available).toBe(false);
      expect(result.message).toContain('Runway video generation');
    });

    it('should return unavailable when Runway is active but S3 is not', async () => {
      clientIntegrationService.list.mockResolvedValue([mockRunwayIntegration]);

      const result = await service.getVideoCapabilities(validCompanyId);

      expect(result.available).toBe(false);
      expect(result.message).toContain('connect your storage');
    });

    it('should return available when both Runway and S3 are configured', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });

      const result = await service.getVideoCapabilities(validCompanyId);

      expect(result.available).toBe(true);
      expect(result.maxDuration).toBe(10);
      expect(result.qualities).toContain('fast');
      expect(result.qualities).toContain('standard');
      expect(result.qualities).toContain('high');
      expect(result.creditsRemaining).toBe(1000);
    });

    it('should return unavailable if Runway connection fails', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'invalid-key' },
      });

      runwayService.testConnection.mockResolvedValue({
        success: false,
        message: 'Invalid API key',
        latencyMs: 100,
      });

      const result = await service.getVideoCapabilities(validCompanyId);

      expect(result.available).toBe(false);
      expect(result.message).toContain('Unable to connect to Runway');
    });
  });

  describe('queueHeroVideo', () => {
    beforeEach(() => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });
    });

    it('should reject invalid company ID', async () => {
      await expect(
        service.queueHeroVideo('invalid-id', {
          sourceImageUrl: 'https://images.unsplash.com/photo-test',
        }),
      ).rejects.toThrow('Invalid company ID format');
    });

    it('should reject non-HTTPS URLs', async () => {
      await expect(
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'http://example.com/image.jpg',
        }),
      ).rejects.toThrow('For security, we only accept HTTPS image URLs');
    });

    it('should reject URLs from untrusted domains', async () => {
      await expect(
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://evil-site.com/image.jpg',
        }),
      ).rejects.toThrow('We can only process images from');
    });

    it('should reject localhost URLs (SSRF protection)', async () => {
      await expect(
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://localhost:8080/image.jpg',
        }),
      ).rejects.toThrow('internal network');
    });

    it('should queue video generation job successfully', async () => {
      const job = await service.queueHeroVideo(validCompanyId, {
        sourceImageUrl: 'https://images.unsplash.com/photo-test',
        prompt: 'Smooth product rotation',
        duration: 5,
        orientation: 'landscape',
        quality: 'standard',
      });

      expect(job.id).toBeDefined();
      expect(job.id).toMatch(/^vj_/);
      // Job starts as QUEUED but transitions to PROCESSING async
      expect(['QUEUED', 'PROCESSING']).toContain(job.status);
      expect(job.companyId).toBe(validCompanyId);
      expect(job.request.sourceImageUrl).toBe('https://images.unsplash.com/photo-test');
    });

    it('should throw when video generation is not available', async () => {
      clientIntegrationService.list.mockResolvedValue([]);

      await expect(
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://images.unsplash.com/photo-test',
        }),
      ).rejects.toThrow('Runway video generation');
    });
  });

  describe('getJobStatus', () => {
    it('should return null for non-existent job', async () => {
      const result = await service.getJobStatus(validCompanyId, 'non-existent-job');
      expect(result).toBeNull();
    });

    it('should return job status for valid job', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });

      // Queue a job first
      const job = await service.queueHeroVideo(validCompanyId, {
        sourceImageUrl: 'https://images.unsplash.com/photo-test',
      });

      // Get job status
      const status = await service.getJobStatus(validCompanyId, job.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(job.id);
    });

    it('should return null for job from different company', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });

      // Queue a job
      const job = await service.queueHeroVideo(validCompanyId, {
        sourceImageUrl: 'https://images.unsplash.com/photo-test',
      });

      // Try to get status from different company
      const differentCompanyId = 'cuid9999888877776666555544';
      const status = await service.getJobStatus(differentCompanyId, job.id);

      expect(status).toBeNull();
    });
  });

  describe('cancelJob', () => {
    it('should return false for non-existent job', async () => {
      const result = await service.cancelJob(validCompanyId, 'non-existent-job');
      expect(result).toBe(false);
    });

    it('should return false for job from different company', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });

      const job = await service.queueHeroVideo(validCompanyId, {
        sourceImageUrl: 'https://images.unsplash.com/photo-test',
      });

      const differentCompanyId = 'cuid9999888877776666555544';
      const result = await service.cancelJob(differentCompanyId, job.id);

      expect(result).toBe(false);
    });
  });

  describe('listJobs', () => {
    it('should return empty array for company with no jobs', async () => {
      const jobs = await service.listJobs(validCompanyId);
      expect(jobs).toEqual([]);
    });

    it('should return jobs for company in descending order', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });

      // Queue multiple jobs
      const job1 = await service.queueHeroVideo(validCompanyId, {
        sourceImageUrl: 'https://images.unsplash.com/photo-1',
      });
      const job2 = await service.queueHeroVideo(validCompanyId, {
        sourceImageUrl: 'https://images.unsplash.com/photo-2',
      });

      const jobs = await service.listJobs(validCompanyId);

      expect(jobs.length).toBe(2);
      // Most recent first
      expect(jobs[0].id).toBe(job2.id);
      expect(jobs[1].id).toBe(job1.id);
    });

    it('should only return jobs for the specified company', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });

      await service.queueHeroVideo(validCompanyId, {
        sourceImageUrl: 'https://images.unsplash.com/photo-1',
      });

      const differentCompanyId = 'cuid9999888877776666555544';
      const jobs = await service.listJobs(differentCompanyId);

      expect(jobs.length).toBe(0);
    });

    it('should handle multiple jobs efficiently with secondary index', async () => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });

      // Queue several jobs
      const jobs = await Promise.all([
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://images.unsplash.com/photo-1',
        }),
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://images.unsplash.com/photo-2',
        }),
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://images.unsplash.com/photo-3',
        }),
      ]);

      const listedJobs = await service.listJobs(validCompanyId);

      expect(listedJobs.length).toBe(3);
      // All jobs should be in the list
      const jobIds = listedJobs.map((j) => j.id);
      for (const job of jobs) {
        expect(jobIds).toContain(job.id);
      }
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      clientIntegrationService.list.mockResolvedValue([
        mockRunwayIntegration,
        mockS3Integration,
      ]);

      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        id: 'int-1',
        credentials: { apiKey: 'test-key' },
      });
    });

    it('should handle malformed URLs gracefully', async () => {
      await expect(
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'not-a-valid-url',
        }),
      ).rejects.toThrow("That URL doesn't look right");
    });

    it('should reject IP addresses in URLs (SSRF protection)', async () => {
      await expect(
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://192.168.1.1/image.jpg',
        }),
      ).rejects.toThrow('We can only process images from');
    });

    it('should reject metadata endpoint URLs (SSRF protection)', async () => {
      await expect(
        service.queueHeroVideo(validCompanyId, {
          sourceImageUrl: 'https://169.254.169.254/latest/meta-data',
        }),
      ).rejects.toThrow('internal network');
    });
  });
});
