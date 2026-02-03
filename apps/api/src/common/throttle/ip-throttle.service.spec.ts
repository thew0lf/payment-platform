import { Test, TestingModule } from '@nestjs/testing';
import { IpThrottleService } from './ip-throttle.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import {
  RateLimitTier,
  RATE_LIMIT_CONFIGS,
  RateLimitConfig,
} from './ip-throttle.types';

describe('IpThrottleService', () => {
  let service: IpThrottleService;
  let mockRedis: jest.Mocked<any>;
  let mockAuditLogsService: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

    mockAuditLogsService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpThrottleService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<IpThrottleService>(IpThrottleService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should log success when Redis is available', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      await service.onModuleInit();
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should use fallback when Redis is unavailable', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpThrottleService,
          { provide: REDIS_CLIENT, useValue: mockRedis },
          { provide: AuditLogsService, useValue: mockAuditLogsService },
        ],
      }).compile();

      const newService = module.get<IpThrottleService>(IpThrottleService);
      await newService.onModuleInit();

      // Should not throw
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should use in-memory fallback when Redis client is null', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpThrottleService,
          { provide: REDIS_CLIENT, useValue: null },
          { provide: AuditLogsService, useValue: mockAuditLogsService },
        ],
      }).compile();

      const newService = module.get<IpThrottleService>(IpThrottleService);
      await newService.onModuleInit();

      // Should not throw - fallback enabled
      const result = await newService.checkRateLimit(
        '192.168.1.1',
        RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC],
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    const publicConfig = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];
    const authConfig = RATE_LIMIT_CONFIGS[RateLimitTier.AUTH];

    it('should allow first request', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.checkRateLimit('192.168.1.1', publicConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(publicConfig.limit - 1);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should track request count', async () => {
      const state = JSON.stringify({
        count: 50,
        firstRequestAt: Date.now() - 10000,
      });
      mockRedis.get.mockResolvedValue(state);

      const result = await service.checkRateLimit('192.168.1.1', publicConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(publicConfig.limit - 51);
    });

    it('should block when limit exceeded', async () => {
      const state = JSON.stringify({
        count: 100,
        firstRequestAt: Date.now() - 10000,
      });
      mockRedis.get.mockResolvedValue(state);

      const result = await service.checkRateLimit('192.168.1.1', publicConfig, {
        path: '/api/test',
        method: 'GET',
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should reset count when window expires', async () => {
      const state = JSON.stringify({
        count: 100,
        firstRequestAt: Date.now() - 120000, // 2 minutes ago (window expired)
      });
      mockRedis.get.mockResolvedValue(state);

      const result = await service.checkRateLimit('192.168.1.1', publicConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(publicConfig.limit - 1);
    });

    it('should return blocked status when IP is blocked', async () => {
      const blockedUntil = Date.now() + 60000; // Blocked for 1 minute
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('blocked:')) {
          return Promise.resolve(blockedUntil.toString());
        }
        return Promise.resolve(null);
      });

      const result = await service.checkRateLimit('192.168.1.1', authConfig);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should block IP after limit exceeded with blockDuration', async () => {
      const state = JSON.stringify({
        count: 10,
        firstRequestAt: Date.now() - 10000,
      });
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('blocked:')) return Promise.resolve(null);
        return Promise.resolve(state);
      });

      await service.checkRateLimit('192.168.1.1', authConfig, {
        path: '/api/auth/login',
        method: 'POST',
      });

      // Should have set the blocked key
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('blocked:'),
        authConfig.blockDuration,
        expect.any(String),
      );
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers', () => {
      const result = {
        allowed: true,
        remaining: 50,
        resetAt: 1234567890000,
      };
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];

      const headers = service.getRateLimitHeaders(result, config);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Reset']).toBe('1234567890');
    });

    it('should include Retry-After when provided', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: 1234567890000,
        retryAfter: 60,
      };
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];

      const headers = service.getRateLimitHeaders(result, config);

      expect(headers['Retry-After']).toBe('60');
    });
  });

  describe('blockIp', () => {
    it('should block IP for specified duration', async () => {
      await service.blockIp('192.168.1.1', 3600, RateLimitTier.PUBLIC, 'Suspicious activity');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('blocked:public:192.168.1.1'),
        3600,
        expect.any(String),
      );
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        'IP_BLOCKED',
        'System',
        '192.168.1.1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            durationSeconds: 3600,
            reason: 'Suspicious activity',
          }),
        }),
      );
    });
  });

  describe('unblockIp', () => {
    it('should unblock IP', async () => {
      await service.unblockIp('192.168.1.1', RateLimitTier.PUBLIC);

      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('blocked:public:192.168.1.1'),
      );
    });
  });

  describe('getBlockedIps', () => {
    it('should return list of blocked IPs', async () => {
      mockRedis.keys.mockResolvedValue([
        'rate_limit:blocked:public:192.168.1.1',
        'rate_limit:blocked:public:192.168.1.2',
      ]);

      const blockedIps = await service.getBlockedIps(RateLimitTier.PUBLIC);

      expect(blockedIps).toEqual(['192.168.1.1', '192.168.1.2']);
    });
  });

  describe('getIpStats', () => {
    it('should return current stats for IP', async () => {
      const now = Date.now();
      const state = JSON.stringify({
        count: 50,
        firstRequestAt: now - 30000, // 30 seconds ago
      });
      mockRedis.get.mockResolvedValue(state);

      const stats = await service.getIpStats('192.168.1.1', RateLimitTier.PUBLIC);

      expect(stats).toEqual({
        current: 50,
        limit: 100,
        windowEndsAt: expect.any(Number),
      });
    });

    it('should return null when no state exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const stats = await service.getIpStats('192.168.1.1', RateLimitTier.PUBLIC);

      expect(stats).toBeNull();
    });

    it('should return null when window has expired', async () => {
      const state = JSON.stringify({
        count: 50,
        firstRequestAt: Date.now() - 120000, // 2 minutes ago (expired)
      });
      mockRedis.get.mockResolvedValue(state);

      const stats = await service.getIpStats('192.168.1.1', RateLimitTier.PUBLIC);

      expect(stats).toBeNull();
    });
  });

  describe('anomaly detection', () => {
    it('should report anomaly after threshold violations', async () => {
      const state = JSON.stringify({
        count: 100,
        firstRequestAt: Date.now() - 10000,
      });
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('blocked:')) return Promise.resolve(null);
        return Promise.resolve(state);
      });

      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];

      // Simulate multiple violations from same IP
      for (let i = 0; i < 11; i++) {
        await service.checkRateLimit('192.168.1.100', config, {
          path: '/api/test',
          method: 'GET',
        });
      }

      // Should have logged abuse detection
      const abuseCalls = mockAuditLogsService.log.mock.calls.filter(
        (call) => call[0] === 'API_ABUSE_DETECTED',
      );
      expect(abuseCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('in-memory fallback', () => {
    let fallbackService: IpThrottleService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpThrottleService,
          { provide: REDIS_CLIENT, useValue: null },
          { provide: AuditLogsService, useValue: mockAuditLogsService },
        ],
      }).compile();

      fallbackService = module.get<IpThrottleService>(IpThrottleService);
      await fallbackService.onModuleInit();
    });

    it('should work without Redis', async () => {
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];

      const result1 = await fallbackService.checkRateLimit('192.168.1.1', config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(99);

      const result2 = await fallbackService.checkRateLimit('192.168.1.1', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(98);
    });

    it('should block IPs in memory', async () => {
      await fallbackService.blockIp('192.168.1.1', 60, RateLimitTier.PUBLIC, 'Test block');

      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];
      const result = await fallbackService.checkRateLimit('192.168.1.1', config);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should unblock IPs from memory', async () => {
      await fallbackService.blockIp('192.168.1.1', 60, RateLimitTier.PUBLIC);
      await fallbackService.unblockIp('192.168.1.1', RateLimitTier.PUBLIC);

      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];
      const result = await fallbackService.checkRateLimit('192.168.1.1', config);

      expect(result.allowed).toBe(true);
    });
  });

  describe('tier-specific limits', () => {
    it('should apply PUBLIC tier limits (100/min)', async () => {
      mockRedis.get.mockResolvedValue(null);
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PUBLIC];

      const result = await service.checkRateLimit('192.168.1.1', config);

      expect(result.remaining).toBe(99); // 100 - 1
    });

    it('should apply AUTH tier limits (10/min)', async () => {
      mockRedis.get.mockResolvedValue(null);
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.AUTH];

      const result = await service.checkRateLimit('192.168.1.1', config);

      expect(result.remaining).toBe(9); // 10 - 1
    });

    it('should apply PAYMENT tier limits (20/min)', async () => {
      mockRedis.get.mockResolvedValue(null);
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.PAYMENT];

      const result = await service.checkRateLimit('192.168.1.1', config);

      expect(result.remaining).toBe(19); // 20 - 1
    });

    it('should apply ADMIN tier limits (200/min)', async () => {
      mockRedis.get.mockResolvedValue(null);
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.ADMIN];

      const result = await service.checkRateLimit('192.168.1.1', config);

      expect(result.remaining).toBe(199); // 200 - 1
    });

    it('should apply API tier limits (60/min)', async () => {
      mockRedis.get.mockResolvedValue(null);
      const config = RATE_LIMIT_CONFIGS[RateLimitTier.API];

      const result = await service.checkRateLimit('192.168.1.1', config);

      expect(result.remaining).toBe(59); // 60 - 1
    });
  });
});
