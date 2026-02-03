import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IpThrottleGuard } from './ip-throttle.guard';
import { IpThrottleService } from './ip-throttle.service';
import {
  RateLimitConfig,
  RateLimitResult,
  RateLimitTier,
  RATE_LIMIT_CONFIGS,
} from './ip-throttle.types';
import {
  IP_THROTTLE_METADATA_KEY,
  SKIP_IP_THROTTLE_METADATA_KEY,
} from './ip-throttle.decorator';

describe('IpThrottleGuard', () => {
  let guard: IpThrottleGuard;
  let throttleService: jest.Mocked<IpThrottleService>;
  let reflector: jest.Mocked<Reflector>;

  const mockRequest = {
    path: '/api/test',
    method: 'GET',
    headers: {},
    socket: { remoteAddress: '192.168.1.100' },
    ip: '192.168.1.100',
  };

  const mockResponse = {
    setHeader: jest.fn(),
  };

  const createMockExecutionContext = (
    request = mockRequest,
    response = mockResponse,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockThrottleService = {
      checkRateLimit: jest.fn(),
      getRateLimitHeaders: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpThrottleGuard,
        { provide: IpThrottleService, useValue: mockThrottleService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<IpThrottleGuard>(IpThrottleGuard);
    throttleService = module.get(IpThrottleService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when rate limit is not exceeded', async () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue(result);
      throttleService.getRateLimitHeaders.mockReturnValue({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': '1234567890',
      });

      const context = createMockExecutionContext();
      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
    });

    it('should block request when rate limit is exceeded', async () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60000,
        retryAfter: 60,
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue(result);
      throttleService.getRateLimitHeaders.mockReturnValue({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '1234567890',
        'Retry-After': '60',
      });

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.retryAfter).toBe(60);
      }
    });

    it('should skip throttling when @SkipIpThrottle is applied', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === SKIP_IP_THROTTLE_METADATA_KEY) return true;
        return undefined;
      });

      const context = createMockExecutionContext();
      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(throttleService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('should use decorator config when @IpThrottle is applied', async () => {
      const customConfig: RateLimitConfig = {
        tier: RateLimitTier.AUTH,
        limit: 5,
        window: 60,
        blockDuration: 300,
      };

      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === SKIP_IP_THROTTLE_METADATA_KEY) return false;
        if (key === IP_THROTTLE_METADATA_KEY) return customConfig;
        return undefined;
      });

      const result: RateLimitResult = {
        allowed: true,
        remaining: 4,
        resetAt: Date.now() + 60000,
      };

      throttleService.checkRateLimit.mockResolvedValue(result);
      throttleService.getRateLimitHeaders.mockReturnValue({});

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(throttleService.checkRateLimit).toHaveBeenCalledWith(
        '192.168.1.100',
        customConfig,
        expect.any(Object),
      );
    });

    it('should show blocked message when IP is blocked', async () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 300000,
        retryAfter: 300,
        blocked: true,
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue(result);
      throttleService.getRateLimitHeaders.mockReturnValue({});

      const context = createMockExecutionContext();

      try {
        await guard.canActivate(context);
        fail('Expected exception to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.message).toContain('temporarily blocked');
      }
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      const request = {
        ...mockRequest,
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      });
      throttleService.getRateLimitHeaders.mockReturnValue({});

      const context = createMockExecutionContext(request);
      await guard.canActivate(context);

      expect(throttleService.checkRateLimit).toHaveBeenCalledWith(
        '10.0.0.1',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should extract IP from X-Real-IP header', async () => {
      const request = {
        ...mockRequest,
        headers: { 'x-real-ip': '172.16.0.50' },
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      });
      throttleService.getRateLimitHeaders.mockReturnValue({});

      const context = createMockExecutionContext(request);
      await guard.canActivate(context);

      expect(throttleService.checkRateLimit).toHaveBeenCalledWith(
        '172.16.0.50',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should extract IP from CF-Connecting-IP header (Cloudflare)', async () => {
      const request = {
        ...mockRequest,
        headers: { 'cf-connecting-ip': '203.0.113.50' },
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      });
      throttleService.getRateLimitHeaders.mockReturnValue({});

      const context = createMockExecutionContext(request);
      await guard.canActivate(context);

      expect(throttleService.checkRateLimit).toHaveBeenCalledWith(
        '203.0.113.50',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should handle IPv4-mapped IPv6 addresses', async () => {
      const request = {
        ...mockRequest,
        headers: {},
        socket: { remoteAddress: '::ffff:192.168.1.100' },
        ip: '::ffff:192.168.1.100',
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      });
      throttleService.getRateLimitHeaders.mockReturnValue({});

      const context = createMockExecutionContext(request);
      await guard.canActivate(context);

      expect(throttleService.checkRateLimit).toHaveBeenCalledWith(
        '192.168.1.100',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('tier detection', () => {
    const testTierDetection = async (path: string, expectedTier: RateLimitTier) => {
      const request = { ...mockRequest, path };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      });
      throttleService.getRateLimitHeaders.mockReturnValue({});

      const context = createMockExecutionContext(request);
      await guard.canActivate(context);

      const callArgs = throttleService.checkRateLimit.mock.calls[0];
      const config = callArgs[1] as RateLimitConfig;
      expect(config.tier).toBe(expectedTier);
    };

    it('should detect AUTH tier for login endpoint', async () => {
      await testTierDetection('/api/auth/login', RateLimitTier.AUTH);
    });

    it('should detect AUTH tier for forgot-password endpoint', async () => {
      await testTierDetection('/api/auth/forgot-password', RateLimitTier.AUTH);
    });

    it('should detect AUTH tier for reset-password endpoint', async () => {
      await testTierDetection('/api/auth/reset-password', RateLimitTier.AUTH);
    });

    it('should detect PAYMENT tier for payments endpoint', async () => {
      await testTierDetection('/api/payments/charge', RateLimitTier.PAYMENT);
    });

    it('should detect PAYMENT tier for checkout endpoint', async () => {
      await testTierDetection('/api/checkout', RateLimitTier.PAYMENT);
    });

    it('should detect PAYMENT tier for refund endpoint', async () => {
      await testTierDetection('/api/payments/123/refund', RateLimitTier.PAYMENT);
    });

    it('should detect ADMIN tier for admin endpoints', async () => {
      await testTierDetection('/api/admin/users', RateLimitTier.ADMIN);
    });

    it('should detect ADMIN tier for settings endpoints', async () => {
      await testTierDetection('/api/settings/integrations', RateLimitTier.ADMIN);
    });

    it('should detect API tier for general API endpoints', async () => {
      await testTierDetection('/api/products', RateLimitTier.API);
    });

    it('should default to PUBLIC tier for unknown paths', async () => {
      await testTierDetection('/unknown/path', RateLimitTier.PUBLIC);
    });
  });

  describe('rate limit headers', () => {
    it('should set all rate limit headers on response', async () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 50,
        resetAt: 1234567890000,
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue(result);
      throttleService.getRateLimitHeaders.mockReturnValue({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': '1234567890',
      });

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(mockResponse.setHeader).toHaveBeenCalledTimes(3);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '50');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', '1234567890');
    });

    it('should include Retry-After header when rate limited', async () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60000,
        retryAfter: 60,
      };

      reflector.getAllAndOverride.mockReturnValue(undefined);
      throttleService.checkRateLimit.mockResolvedValue(result);
      throttleService.getRateLimitHeaders.mockReturnValue({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '1234567890',
        'Retry-After': '60',
      });

      const context = createMockExecutionContext();

      try {
        await guard.canActivate(context);
      } catch {
        // Expected to throw
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    });
  });
});
