import { Test, TestingModule } from '@nestjs/testing';
import { ClickQueueService, RawClickData, EnrichedClick } from './click-queue.service';

describe('ClickQueueService', () => {
  let service: ClickQueueService;
  let processedClicks: EnrichedClick[] = [];

  beforeEach(async () => {
    processedClicks = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClickQueueService],
    }).compile();

    service = module.get<ClickQueueService>(ClickQueueService);

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
        ipAddress: '192.168.1.1',
      };

      const first = await service.ingestClick(click);
      expect(first.queued).toBe(true);
      expect(first.isDuplicate).toBe(false);

      // Same click should be deduplicated
      const second = await service.ingestClick(click);
      expect(second.queued).toBe(false);
      expect(second.isDuplicate).toBe(true);
    });

    it('should allow clicks from different IPs', async () => {
      const click1: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
      };

      const click2: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.2', // Different IP
      };

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
        ipAddress: '192.168.1.1',
      };

      const click2: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-2', // Different link
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
      };

      const first = await service.ingestClick(click1);
      const second = await service.ingestClick(click2);

      expect(first.queued).toBe(true);
      expect(second.queued).toBe(true);
    });

    it('should parse user agent correctly', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      };

      await service.ingestClick(click);
      await service.flush();

      expect(processedClicks.length).toBe(1);
      expect(processedClicks[0].deviceType).toBe('mobile');
      expect(processedClicks[0].browser).toBe('Safari');
      expect(processedClicks[0].os).toBe('iOS');
    });

    it('should flag clicks without user agent as suspicious', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
        // No userAgent
      };

      await service.ingestClick(click);
      await service.flush();

      expect(processedClicks.length).toBe(1);
      expect(processedClicks[0].fraudScore).toBeGreaterThan(0);
      expect(processedClicks[0].fraudReasons).toContain('missing_user_agent');
    });

    it('should flag bot user agents', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      };

      await service.ingestClick(click);
      await service.flush();

      expect(processedClicks.length).toBe(1);
      expect(processedClicks[0].fraudScore).toBeGreaterThanOrEqual(50);
      expect(processedClicks[0].fraudReasons).toContain('bot_user_agent');
    });

    it('should preserve SubID tracking variables', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
        subId1: 'campaign-123',
        subId2: 'placement-456',
        subId3: 'creative-789',
      };

      await service.ingestClick(click);
      await service.flush();

      expect(processedClicks.length).toBe(1);
      expect(processedClicks[0].subId1).toBe('campaign-123');
      expect(processedClicks[0].subId2).toBe('placement-456');
      expect(processedClicks[0].subId3).toBe('creative-789');
    });
  });

  describe('flush', () => {
    it('should process all queued clicks', async () => {
      for (let i = 0; i < 10; i++) {
        await service.ingestClick({
          partnerId: 'partner-1',
          linkId: `link-${i}`,
          companyId: 'company-1',
          ipAddress: '192.168.1.1',
        });
      }

      const flushed = await service.flush();
      expect(flushed).toBe(10);
      expect(processedClicks.length).toBe(10);
    });

    it('should return 0 when queue is empty', async () => {
      const flushed = await service.flush();
      expect(flushed).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track queue statistics', async () => {
      const stats = service.getStats();
      expect(stats.queueSize).toBe(0);
      expect(stats.processedCount).toBe(0);
      expect(stats.duplicateCount).toBe(0);

      await service.ingestClick({
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
      });

      const statsAfterIngest = service.getStats();
      expect(statsAfterIngest.queueSize).toBe(1);

      await service.flush();

      const statsAfterFlush = service.getStats();
      expect(statsAfterFlush.queueSize).toBe(0);
      expect(statsAfterFlush.processedCount).toBe(1);
    });

    it('should track duplicate count', async () => {
      const click: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
      };

      await service.ingestClick(click);
      await service.ingestClick(click); // Duplicate

      const stats = service.getStats();
      expect(stats.duplicateCount).toBe(1);
    });
  });

  describe('generateVisitorId', () => {
    it('should generate consistent visitor IDs for same fingerprint', async () => {
      const click1: RawClickData = {
        partnerId: 'partner-1',
        linkId: 'link-1',
        companyId: 'company-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const click2: RawClickData = {
        partnerId: 'partner-2',
        linkId: 'link-2',
        companyId: 'company-1',
        ipAddress: '192.168.1.1', // Same IP
        userAgent: 'Mozilla/5.0', // Same UA
      };

      await service.ingestClick(click1);
      await service.ingestClick(click2);
      await service.flush();

      // Same fingerprint should produce same visitor ID
      expect(processedClicks[0].visitorId).toBe(processedClicks[1].visitorId);
    });
  });
});
