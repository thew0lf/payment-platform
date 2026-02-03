import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RecaptchaService } from '../recaptcha.service';
import { RecaptchaApiResponse } from '../recaptcha.types';

describe('RecaptchaService', () => {
  let service: RecaptchaService;
  let configService: jest.Mocked<ConfigService>;
  let mockFetch: jest.SpyInstance;

  const mockSuccessResponse: RecaptchaApiResponse = {
    success: true,
    score: 0.9,
    action: 'checkout',
    challenge_ts: '2025-01-31T12:00:00Z',
    hostname: 'localhost',
  };

  const mockLowScoreResponse: RecaptchaApiResponse = {
    success: true,
    score: 0.1,
    action: 'checkout',
    challenge_ts: '2025-01-31T12:00:00Z',
    hostname: 'localhost',
  };

  const mockFailedResponse: RecaptchaApiResponse = {
    success: false,
    'error-codes': ['invalid-input-response'],
  };

  beforeEach(async () => {
    // Mock global fetch
    mockFetch = jest.spyOn(global, 'fetch');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              switch (key) {
                case 'RECAPTCHA_SECRET_KEY':
                  return 'test-secret-key';
                case 'RECAPTCHA_THRESHOLD':
                  return '0.3';
                case 'RECAPTCHA_ENABLED':
                  return 'true';
                default:
                  return defaultValue;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isEnabled', () => {
    it('should return true when secret key is configured', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when secret key is empty', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RecaptchaService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                if (key === 'RECAPTCHA_SECRET_KEY') return '';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<RecaptchaService>(RecaptchaService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('getScoreThreshold', () => {
    it('should return the configured threshold', () => {
      expect(service.getScoreThreshold()).toBe(0.3);
    });
  });

  describe('verify', () => {
    it('should pass verification for high score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      const result = await service.verify({
        token: 'valid-token',
        action: 'checkout',
      });

      expect(result.success).toBe(true);
      expect(result.score).toBe(0.9);
      expect(result.isSuspicious).toBe(false);
    });

    it('should flag as suspicious for low score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLowScoreResponse,
      } as Response);

      const result = await service.verify({
        token: 'low-score-token',
        action: 'checkout',
      });

      expect(result.success).toBe(true);
      expect(result.score).toBe(0.1);
      expect(result.isSuspicious).toBe(true);
      expect(result.failureReason).toContain('below threshold');
    });

    it('should handle verification failure from Google', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFailedResponse,
      } as Response);

      const result = await service.verify({
        token: 'invalid-token',
        action: 'checkout',
      });

      expect(result.success).toBe(false);
      expect(result.isSuspicious).toBe(true);
      expect(result.errorCodes).toContain('invalid-input-response');
    });

    it('should handle missing token', async () => {
      const result = await service.verify({
        token: '',
        action: 'checkout',
      });

      expect(result.success).toBe(false);
      expect(result.isSuspicious).toBe(true);
      expect(result.failureReason).toBe('Missing reCAPTCHA token');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.verify({
        token: 'valid-token',
        action: 'checkout',
      });

      expect(result.success).toBe(false);
      expect(result.isSuspicious).toBe(true);
      expect(result.failureReason).toContain('Network error');
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await service.verify({
        token: 'valid-token',
        action: 'checkout',
      });

      expect(result.success).toBe(false);
      expect(result.isSuspicious).toBe(true);
      expect(result.failureReason).toContain('500');
    });

    it('should detect action mismatch', async () => {
      const mismatchResponse: RecaptchaApiResponse = {
        ...mockSuccessResponse,
        action: 'login', // Different from expected 'checkout'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mismatchResponse,
      } as Response);

      const result = await service.verify({
        token: 'valid-token',
        action: 'checkout',
      });

      expect(result.success).toBe(false);
      expect(result.isSuspicious).toBe(true);
      expect(result.failureReason).toContain('Action mismatch');
    });

    it('should include remote IP in request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      await service.verify({
        token: 'valid-token',
        action: 'checkout',
        remoteIp: '192.168.1.1',
      });

      // Verify the request included the remoteip parameter
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('remoteip=192.168.1.1'),
        }),
      );
    });

    it('should skip verification when disabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RecaptchaService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                if (key === 'RECAPTCHA_SECRET_KEY') return '';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<RecaptchaService>(RecaptchaService);

      const result = await disabledService.verify({
        token: 'any-token',
        action: 'checkout',
      });

      expect(result.success).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.isSuspicious).toBe(false);
      // Fetch should not have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('shouldBlock', () => {
    it('should not block high score requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      const { blocked, result } = await service.shouldBlock('valid-token', 'checkout');

      expect(blocked).toBe(false);
      expect(result.score).toBe(0.9);
    });

    it('should block low score requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLowScoreResponse,
      } as Response);

      const { blocked, result } = await service.shouldBlock('low-score-token', 'checkout');

      expect(blocked).toBe(true);
      expect(result.score).toBe(0.1);
    });

    it('should block failed verification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFailedResponse,
      } as Response);

      const { blocked, result } = await service.shouldBlock('invalid-token', 'checkout');

      expect(blocked).toBe(true);
      expect(result.success).toBe(false);
    });
  });

  describe('threshold configuration', () => {
    it('should use default threshold of 0.3 when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RecaptchaService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                switch (key) {
                  case 'RECAPTCHA_SECRET_KEY':
                    return 'test-key';
                  case 'RECAPTCHA_THRESHOLD':
                    return defaultValue; // Return default
                  case 'RECAPTCHA_ENABLED':
                    return 'true';
                  default:
                    return defaultValue;
                }
              }),
            },
          },
        ],
      }).compile();

      const serviceWithDefault = module.get<RecaptchaService>(RecaptchaService);
      expect(serviceWithDefault.getScoreThreshold()).toBe(0.3);
    });

    it('should use custom threshold when configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RecaptchaService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                switch (key) {
                  case 'RECAPTCHA_SECRET_KEY':
                    return 'test-key';
                  case 'RECAPTCHA_THRESHOLD':
                    return '0.5';
                  case 'RECAPTCHA_ENABLED':
                    return 'true';
                  default:
                    return defaultValue;
                }
              }),
            },
          },
        ],
      }).compile();

      const serviceWithCustom = module.get<RecaptchaService>(RecaptchaService);
      expect(serviceWithCustom.getScoreThreshold()).toBe(0.5);
    });

    it('should correctly classify scores at threshold boundary', async () => {
      // Score exactly at threshold (0.3)
      const boundaryResponse: RecaptchaApiResponse = {
        success: true,
        score: 0.3,
        action: 'checkout',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => boundaryResponse,
      } as Response);

      const result = await service.verify({
        token: 'boundary-token',
        action: 'checkout',
      });

      // Score at threshold should NOT be suspicious (>= threshold is OK)
      expect(result.isSuspicious).toBe(false);
    });

    it('should flag score just below threshold as suspicious', async () => {
      const belowThresholdResponse: RecaptchaApiResponse = {
        success: true,
        score: 0.29,
        action: 'checkout',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => belowThresholdResponse,
      } as Response);

      const result = await service.verify({
        token: 'below-threshold-token',
        action: 'checkout',
      });

      expect(result.isSuspicious).toBe(true);
    });
  });

  describe('PCI/SOC2 compliance', () => {
    it('should not include sensitive data in error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLowScoreResponse,
      } as Response);

      const result = await service.verify({
        token: 'test-token-with-sensitive-info',
        action: 'checkout',
        remoteIp: '192.168.1.100',
      });

      // Failure reason should not contain the token
      expect(result.failureReason).not.toContain('test-token-with-sensitive-info');
    });

    it('should handle missing score in response', async () => {
      const noScoreResponse: RecaptchaApiResponse = {
        success: true,
        // score is missing
        action: 'checkout',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => noScoreResponse,
      } as Response);

      const result = await service.verify({
        token: 'valid-token',
        action: 'checkout',
      });

      // Should default to 0 and be suspicious
      expect(result.score).toBe(0);
      expect(result.isSuspicious).toBe(true);
    });
  });
});
