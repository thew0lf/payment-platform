import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HmacGuard } from './hmac.guard';
import { HmacService } from './hmac.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { HmacErrorCode } from './hmac.types';
import {
  REQUIRE_HMAC_METADATA_KEY,
  HMAC_OPTIONS_METADATA_KEY,
  SKIP_HMAC_METADATA_KEY,
} from './hmac.decorator';

describe('HmacGuard', () => {
  let guard: HmacGuard;
  let mockHmacService: jest.Mocked<HmacService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockAuditLogsService: jest.Mocked<AuditLogsService>;

  const createMockContext = (
    headers: Record<string, string> = {},
    body: any = {},
    method: string = 'POST',
    url: string = '/api/test',
  ): ExecutionContext => {
    const request = {
      method,
      url,
      originalUrl: url,
      body,
      headers: {
        ...headers,
      },
      query: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockHmacService = {
      verifySignature: jest.fn(),
    } as any;

    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockAuditLogsService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HmacGuard,
        { provide: HmacService, useValue: mockHmacService },
        { provide: Reflector, useValue: mockReflector },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    guard = module.get<HmacGuard>(HmacGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when HMAC is not required', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return false;
        return undefined;
      });

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockHmacService.verifySignature).not.toHaveBeenCalled();
    });

    it('should allow request when HMAC is skipped', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === SKIP_HMAC_METADATA_KEY) return true;
        return undefined;
      });

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockHmacService.verifySignature).not.toHaveBeenCalled();
    });

    it('should reject request without X-Signature header', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      const context = createMockContext({
        'x-timestamp': '1704067200',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: {
          code: HmacErrorCode.MISSING_SIGNATURE,
        },
      });
    });

    it('should reject request without X-Timestamp header', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      const context = createMockContext({
        'x-signature': 'some-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: {
          code: HmacErrorCode.MISSING_TIMESTAMP,
        },
      });
    });

    it('should reject request with invalid signature', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
        errorCode: HmacErrorCode.INVALID_SIGNATURE,
      });

      const context = createMockContext({
        'x-signature': 'invalid-signature',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: {
          code: HmacErrorCode.INVALID_SIGNATURE,
        },
      });
    });

    it('should reject request with expired timestamp', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({
        valid: false,
        error: 'Timestamp expired',
        errorCode: HmacErrorCode.TIMESTAMP_EXPIRED,
      });

      const context = createMockContext({
        'x-signature': 'some-signature',
        'x-timestamp': '1000000000', // Very old timestamp
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: {
          code: HmacErrorCode.TIMESTAMP_EXPIRED,
        },
      });
    });

    it('should allow request with valid signature', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({ valid: true });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockContext({
        'x-signature': 'valid-signature',
        'x-timestamp': timestamp,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockHmacService.verifySignature).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/test',
          timestamp,
        }),
        'valid-signature',
        expect.any(Object),
      );
    });

    it('should pass request body for signature verification', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({ valid: true });

      const body = { key: 'value', amount: 100 };
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockContext(
        {
          'x-signature': 'valid-signature',
          'x-timestamp': timestamp,
        },
        body,
      );

      await guard.canActivate(context);

      expect(mockHmacService.verifySignature).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(body),
        }),
        'valid-signature',
        expect.any(Object),
      );
    });

    it('should handle empty body for GET requests', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({ valid: true });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockContext(
        {
          'x-signature': 'valid-signature',
          'x-timestamp': timestamp,
        },
        {},
        'GET',
      );

      await guard.canActivate(context);

      expect(mockHmacService.verifySignature).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          body: '',
        }),
        'valid-signature',
        expect.any(Object),
      );
    });

    it('should pass company ID from header when allowCompanyKeys is true', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return { allowCompanyKeys: true };
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({ valid: true });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockContext({
        'x-signature': 'valid-signature',
        'x-timestamp': timestamp,
        'x-company-id': 'company-123',
      });

      await guard.canActivate(context);

      expect(mockHmacService.verifySignature).toHaveBeenCalledWith(
        expect.any(Object),
        'valid-signature',
        expect.objectContaining({
          companyId: 'company-123',
        }),
      );
    });

    it('should pass custom algorithm from options', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return { algorithm: 'sha512' };
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({ valid: true });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockContext({
        'x-signature': 'valid-signature',
        'x-timestamp': timestamp,
      });

      await guard.canActivate(context);

      expect(mockHmacService.verifySignature).toHaveBeenCalledWith(
        expect.any(Object),
        'valid-signature',
        expect.objectContaining({
          algorithm: 'sha512',
        }),
      );
    });

    it('should pass custom maxTimestampDrift from options', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return { maxTimestampDrift: 60 };
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({ valid: true });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockContext({
        'x-signature': 'valid-signature',
        'x-timestamp': timestamp,
      });

      await guard.canActivate(context);

      expect(mockHmacService.verifySignature).toHaveBeenCalledWith(
        expect.any(Object),
        'valid-signature',
        expect.objectContaining({
          maxTimestampDrift: 60,
        }),
      );
    });
  });

  describe('audit logging', () => {
    it('should log violation on missing signature', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      const context = createMockContext({
        'x-timestamp': '1704067200',
      });

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        'API_ABUSE_DETECTED',
        'System',
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'HMAC_VIOLATION',
            errorCode: HmacErrorCode.MISSING_SIGNATURE,
          }),
        }),
      );
    });

    it('should log violation on invalid signature', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      mockHmacService.verifySignature.mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
        errorCode: HmacErrorCode.INVALID_SIGNATURE,
      });

      const context = createMockContext({
        'x-signature': 'invalid-signature',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
      });

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        'API_ABUSE_DETECTED',
        'System',
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'HMAC_VIOLATION',
            errorCode: HmacErrorCode.INVALID_SIGNATURE,
          }),
        }),
      );
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      const context = createMockContext({
        'x-timestamp': '1704067200',
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        '192.168.1.100',
        expect.any(Object),
      );
    });

    it('should extract IP from X-Real-IP header', async () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_HMAC_METADATA_KEY) return true;
        if (key === HMAC_OPTIONS_METADATA_KEY) return {};
        return undefined;
      });

      const context = createMockContext({
        'x-timestamp': '1704067200',
        'x-real-ip': '192.168.1.200',
      });

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        '192.168.1.200',
        expect.any(Object),
      );
    });
  });
});
