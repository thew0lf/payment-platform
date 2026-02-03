/**
 * Click Queue Service Tests
 *
 * Tests for the PostgreSQL-backed click queue service.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ClickQueueService, RawClickData, EnrichedClick, ClickQueueStats } from './click-queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClickQueueStatus } from '@prisma/client';

describe('ClickQueueService', () => {
  let service: ClickQueueService;
  let prismaService: jest.Mocked<PrismaService>;
  let processedClicks: EnrichedClick[] = [];

  const mockPrismaService = {
    affiliateClickQueue: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    processedClicks = [];
    jest.clearAllMocks();

    // Mock $transaction to execute the callback immediately
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return Promise.all(callback);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickQueueService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClickQueueService>(ClickQueueService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;

    // Set up batch processor mock
    service.setBatchProcessor(async (clicks: EnrichedClick[]) => {
      processedClicks.push(...clicks);
    });

    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('ingestClick', () => {
    it('should queue a valid click', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      };

      mockPrismaService.affiliateClickQueue.create.mockResolvedValue({
        id: 'click-1',
        ...click,
        status: 'PENDING',
        queuedAt: new Date(),
      });

      const result = await service.ingestClick(click);

      expect(result.queued).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.idempotencyKey).toBeDefined();
      expect(result.idempotencyKey.length).toBe(32);
    });

    it('should detect duplicate clicks within dedup window', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.100',
      };

      // First click - success
      mockPrismaService.affiliateClickQueue.create.mockResolvedValueOnce({
        id: 'click-1',
        ...click,
        status: 'PENDING',
        queuedAt: new Date(),
      });

      const first = await service.ingestClick(click);
      expect(first.queued).toBe(true);
      expect(first.isDuplicate).toBe(false);

      // Second click - duplicate detected in memory cache
      const second = await service.ingestClick(click);
      expect(second.queued).toBe(false);
      expect(second.isDuplicate).toBe(true);
    });

    it('should allow clicks from different IPs', async () => {
      const click1: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.2.1',
      };

      const click2: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.2.2', // Different IP
      };

      mockPrismaService.affiliateClickQueue.create.mockResolvedValue({
        id: 'click-1',
        status: 'PENDING',
        queuedAt: new Date(),
      });

      const first = await service.ingestClick(click1);
      const second = await service.ingestClick(click2);

      expect(first.queued).toBe(true);
      expect(second.queued).toBe(true);
    });

    it('should allow clicks from same IP to different links', async () => {
      const click1: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.3.1',
      };

      const click2: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-2', // Different link
        companyId: 'company-1',
        ipAddress: '192.168.3.1',
      };

      mockPrismaService.affiliateClickQueue.create.mockResolvedValue({
        id: 'click-1',
        status: 'PENDING',
        queuedAt: new Date(),
      });

      const first = await service.ingestClick(click1);
      const second = await service.ingestClick(click2);

      expect(first.queued).toBe(true);
      expect(second.queued).toBe(true);
    });

    it('should parse user agent correctly', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-parse-ua',
        companyId: 'company-1',
        ipAddress: '192.168.4.1',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      };

      mockPrismaService.affiliateClickQueue.create.mockImplementation(async (args) => ({
        id: 'click-1',
        ...args.data,
        queuedAt: new Date(),
      }));

      await service.ingestClick(click);

      // Verify the enriched click data was stored
      expect(mockPrismaService.affiliateClickQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceType: 'mobile',
            browser: 'Safari',
            os: 'iOS',
          }),
        }),
      );
    });

    it('should flag clicks without user agent as suspicious', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-no-ua',
        companyId: 'company-1',
        ipAddress: '192.168.5.1',
        // No userAgent
      };

      mockPrismaService.affiliateClickQueue.create.mockImplementation(async (args) => ({
        id: 'click-1',
        ...args.data,
        queuedAt: new Date(),
      }));

      await service.ingestClick(click);

      expect(mockPrismaService.affiliateClickQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fraudScore: expect.any(Number),
            fraudReasons: expect.arrayContaining(['missing_user_agent']),
          }),
        }),
      );
    });

    it('should flag bot user agents', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-bot',
        companyId: 'company-1',
        ipAddress: '192.168.6.1',
        userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      };

      mockPrismaService.affiliateClickQueue.create.mockImplementation(async (args) => ({
        id: 'click-1',
        ...args.data,
        queuedAt: new Date(),
      }));

      await service.ingestClick(click);

      expect(mockPrismaService.affiliateClickQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fraudScore: expect.any(Number),
            fraudReasons: expect.arrayContaining(['bot_user_agent']),
          }),
        }),
      );
    });

    it('should preserve SubID tracking variables', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-subids',
        companyId: 'company-1',
        ipAddress: '192.168.7.1',
        subId1: 'campaign-123',
        subId2: 'placement-456',
        subId3: 'creative-789',
      };

      mockPrismaService.affiliateClickQueue.create.mockImplementation(async (args) => ({
        id: 'click-1',
        ...args.data,
        queuedAt: new Date(),
      }));

      await service.ingestClick(click);

      expect(mockPrismaService.affiliateClickQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subId1: 'campaign-123',
            subId2: 'placement-456',
            subId3: 'creative-789',
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return queue statistics from database', async () => {
      mockPrismaService.affiliateClickQueue.count
        .mockResolvedValueOnce(5)  // pending count
        .mockResolvedValueOnce(3); // failed count

      const stats = await service.getStats();

      expect(stats.queueSize).toBe(5);
      expect(stats.pendingInDb).toBe(5);
      expect(stats.failedInDb).toBe(3);
      expect(stats).toHaveProperty('processedCount');
      expect(stats).toHaveProperty('duplicateCount');
      expect(stats).toHaveProperty('fraudCount');
      expect(stats).toHaveProperty('errorCount');
    });

    it('should return zero counts when queue is empty', async () => {
      mockPrismaService.affiliateClickQueue.count.mockResolvedValue(0);

      const stats = await service.getStats();

      expect(stats.queueSize).toBe(0);
      expect(stats.pendingInDb).toBe(0);
      expect(stats.failedInDb).toBe(0);
    });
  });

  describe('flush', () => {
    it('should process all pending clicks', async () => {
      const pendingClicks = Array.from({ length: 5 }, (_, i) => ({
        id: `click-${i}`,
        partnerId: 'partner-1',
        linkId: `link-${i}`,
        companyId: 'company-1',
        ipAddress: '192.168.8.1',
        status: ClickQueueStatus.PENDING,
        queuedAt: new Date(),
        retryCount: 0,
        fraudReasons: [],
      }));

      // First call returns 5 pending, second call returns 0 (all processed)
      mockPrismaService.affiliateClickQueue.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      mockPrismaService.affiliateClickQueue.findMany.mockResolvedValueOnce(pendingClicks);
      mockPrismaService.affiliateClickQueue.updateMany.mockResolvedValue({ count: 5 });

      const flushed = await service.flush();

      expect(flushed).toBe(5);
      expect(processedClicks.length).toBe(5);
    });

    it('should return 0 when queue is empty', async () => {
      mockPrismaService.affiliateClickQueue.count.mockResolvedValue(0);

      const flushed = await service.flush();

      expect(flushed).toBe(0);
    });
  });

  describe('generateVisitorId', () => {
    it('should generate consistent visitor IDs for same fingerprint', async () => {
      const click1: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-visitor-1',
        companyId: 'company-1',
        ipAddress: '192.168.9.1',
        userAgent: 'Mozilla/5.0',
      };

      const click2: RawClickData = {
        partnerId: 'partner-2',
        linkId: 'link-visitor-2',
        companyId: 'company-1',
        ipAddress: '192.168.9.1', // Same IP
        userAgent: 'Mozilla/5.0', // Same UA
      };

      let visitorId1: string | undefined;
      let visitorId2: string | undefined;

      mockPrismaService.affiliateClickQueue.create.mockImplementation(async (args) => {
        if (!visitorId1) {
          visitorId1 = args.data.visitorId;
        } else {
          visitorId2 = args.data.visitorId;
        }
        return { id: 'click-1', ...args.data, queuedAt: new Date() };
      });

      await service.ingestClick(click1);
      await service.ingestClick(click2);

      // Same fingerprint should produce same visitor ID
      expect(visitorId1).toBeDefined();
      expect(visitorId2).toBeDefined();
      expect(visitorId1).toBe(visitorId2);
    });
  });

  describe('setBatchProcessor', () => {
    it('should accept and use a custom batch processor', async () => {
      const customProcessor = jest.fn();
      service.setBatchProcessor(customProcessor);

      const pendingClicks = [{
        id: 'click-1',
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.10.1',
        status: ClickQueueStatus.PENDING,
        queuedAt: new Date(),
        retryCount: 0,
        fraudReasons: [],
      }];

      mockPrismaService.affiliateClickQueue.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      mockPrismaService.affiliateClickQueue.findMany.mockResolvedValueOnce(pendingClicks);
      mockPrismaService.affiliateClickQueue.updateMany.mockResolvedValue({ count: 1 });

      await service.flush();

      expect(customProcessor).toHaveBeenCalled();
    });
  });
});
