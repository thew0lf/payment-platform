/**
 * Pino Logger Configuration Unit Tests
 *
 * Tests for:
 * - Log level configuration based on environment
 * - Pretty print toggle
 * - Sensitive field redaction (SOC2 compliance)
 * - Request serialization
 * - Custom log context creation
 */
import { ConfigService } from '@nestjs/config';
import {
  REDACTED_FIELDS,
  REDACTED_HEADER_PATHS,
  generateRedactionPaths,
  customSerializers,
  getLogLevel,
  shouldUsePrettyPrint,
  pinoLoggerConfig,
  createLogContext,
} from './pino.config';

// Type helper for pino-http options
interface PinoHttpOptions {
  level?: string;
  redact?: { paths: string[]; censor: string };
  serializers?: {
    req?: (req: any) => any;
    res?: (res: any) => any;
    err?: (err: any) => any;
  };
  genReqId?: (req: any, res: any) => string;
  customLogLevel?: (req: any, res: any, err: any) => string;
  transport?: { target: string; options?: any };
  base?: Record<string, unknown>;
}

describe('Pino Logger Configuration', () => {
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };
  });

  describe('REDACTED_FIELDS', () => {
    it('should include password fields', () => {
      expect(REDACTED_FIELDS).toContain('password');
      expect(REDACTED_FIELDS).toContain('newPassword');
      expect(REDACTED_FIELDS).toContain('currentPassword');
      expect(REDACTED_FIELDS).toContain('oldPassword');
      expect(REDACTED_FIELDS).toContain('confirmPassword');
    });

    it('should include token fields', () => {
      expect(REDACTED_FIELDS).toContain('token');
      expect(REDACTED_FIELDS).toContain('accessToken');
      expect(REDACTED_FIELDS).toContain('refreshToken');
      expect(REDACTED_FIELDS).toContain('resetToken');
      expect(REDACTED_FIELDS).toContain('verificationToken');
    });

    it('should include API key fields', () => {
      expect(REDACTED_FIELDS).toContain('apiKey');
      expect(REDACTED_FIELDS).toContain('secret');
      expect(REDACTED_FIELDS).toContain('secretKey');
      expect(REDACTED_FIELDS).toContain('privateKey');
      expect(REDACTED_FIELDS).toContain('clientSecret');
    });

    it('should include PCI data fields', () => {
      expect(REDACTED_FIELDS).toContain('cardNumber');
      expect(REDACTED_FIELDS).toContain('cvv');
      expect(REDACTED_FIELDS).toContain('cvc');
      expect(REDACTED_FIELDS).toContain('securityCode');
      expect(REDACTED_FIELDS).toContain('pan');
      expect(REDACTED_FIELDS).toContain('accountNumber');
      expect(REDACTED_FIELDS).toContain('routingNumber');
    });

    it('should include PII fields', () => {
      expect(REDACTED_FIELDS).toContain('ssn');
      expect(REDACTED_FIELDS).toContain('socialSecurityNumber');
      expect(REDACTED_FIELDS).toContain('taxId');
      expect(REDACTED_FIELDS).toContain('ein');
      expect(REDACTED_FIELDS).toContain('dateOfBirth');
      expect(REDACTED_FIELDS).toContain('dob');
    });

    it('should include header fields', () => {
      expect(REDACTED_FIELDS).toContain('authorization');
      expect(REDACTED_FIELDS).toContain('cookie');
      expect(REDACTED_FIELDS).toContain('x-auth-token');
    });
  });

  describe('REDACTED_HEADER_PATHS', () => {
    it('should include authorization header path', () => {
      expect(REDACTED_HEADER_PATHS).toContain('req.headers.authorization');
    });

    it('should include cookie header path', () => {
      expect(REDACTED_HEADER_PATHS).toContain('req.headers.cookie');
    });

    it('should include x-auth-token header path', () => {
      expect(REDACTED_HEADER_PATHS).toContain('req.headers["x-auth-token"]');
    });
  });

  describe('generateRedactionPaths', () => {
    it('should include header paths', () => {
      const paths = generateRedactionPaths();
      expect(paths).toContain('req.headers.authorization');
      expect(paths).toContain('req.headers.cookie');
    });

    it('should include request body field paths', () => {
      const paths = generateRedactionPaths();
      expect(paths).toContain('req.body.password');
      expect(paths).toContain('req.body.cardNumber');
      expect(paths).toContain('req.body.ssn');
    });

    it('should include nested field paths', () => {
      const paths = generateRedactionPaths();
      expect(paths).toContain('req.body.*.password');
      expect(paths).toContain('*.password');
    });

    it('should generate paths for all redacted fields', () => {
      const paths = generateRedactionPaths();
      // Check that each redacted field has at least one path
      REDACTED_FIELDS.forEach((field) => {
        expect(paths).toContain(`req.body.${field}`);
      });
    });
  });

  describe('customSerializers', () => {
    describe('req serializer', () => {
      it('should serialize request with safe headers only', () => {
        const mockReq = {
          id: 'test-id-123',
          method: 'POST',
          url: '/api/auth/login',
          headers: {
            'user-agent': 'Mozilla/5.0',
            'content-type': 'application/json',
            'x-request-id': 'req-123',
            host: 'localhost:3001',
            origin: 'http://localhost:3000',
            authorization: 'Bearer secret-token',
            cookie: 'session=secret-session',
          },
        };

        const result = customSerializers.req(mockReq as any);

        expect(result.id).toBe('test-id-123');
        expect(result.method).toBe('POST');
        expect(result.url).toBe('/api/auth/login');
        expect(result.headers['user-agent']).toBe('Mozilla/5.0');
        expect(result.headers['content-type']).toBe('application/json');
        expect(result.headers['x-request-id']).toBe('req-123');
        expect(result.headers.host).toBe('localhost:3001');
        expect(result.headers.origin).toBe('http://localhost:3000');
        // Should NOT include sensitive headers
        expect((result.headers as any).authorization).toBeUndefined();
        expect((result.headers as any).cookie).toBeUndefined();
      });
    });

    describe('res serializer', () => {
      it('should serialize response with status code only', () => {
        const mockRes = {
          statusCode: 200,
          headers: { 'set-cookie': 'secret' },
        };

        const result = customSerializers.res(mockRes as any);

        expect(result.statusCode).toBe(200);
        expect((result as any).headers).toBeUndefined();
      });
    });

    describe('err serializer', () => {
      it('should serialize error with type, message, and stack', () => {
        const error = new Error('Test error');
        (error as any).statusCode = 500;
        (error as any).code = 'TEST_ERROR';

        const result = customSerializers.err(error);

        expect(result.type).toBe('Error');
        expect(result.message).toBe('Test error');
        expect(result.stack).toBeDefined();
        expect(result.statusCode).toBe(500);
        expect(result.code).toBe('TEST_ERROR');
      });

      it('should handle errors without optional properties', () => {
        const error = new Error('Simple error');

        const result = customSerializers.err(error);

        expect(result.type).toBe('Error');
        expect(result.message).toBe('Simple error');
        expect(result.statusCode).toBeUndefined();
        expect(result.code).toBeUndefined();
      });
    });
  });

  describe('getLogLevel', () => {
    it('should return configured log level if provided', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce('warn'); // LOG_LEVEL

      const level = getLogLevel(mockConfigService as ConfigService);
      expect(level).toBe('warn');
    });

    it('should return info for production environment', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('production') // NODE_ENV
        .mockReturnValueOnce(undefined); // LOG_LEVEL

      const level = getLogLevel(mockConfigService as ConfigService);
      expect(level).toBe('info');
    });

    it('should return silent for test environment', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('test') // NODE_ENV
        .mockReturnValueOnce(undefined); // LOG_LEVEL

      const level = getLogLevel(mockConfigService as ConfigService);
      expect(level).toBe('silent');
    });

    it('should return debug for development environment', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined); // LOG_LEVEL

      const level = getLogLevel(mockConfigService as ConfigService);
      expect(level).toBe('debug');
    });

    it('should default to debug for unknown environment', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('unknown') // NODE_ENV
        .mockReturnValueOnce(undefined); // LOG_LEVEL

      const level = getLogLevel(mockConfigService as ConfigService);
      expect(level).toBe('debug');
    });
  });

  describe('shouldUsePrettyPrint', () => {
    it('should return true when LOG_PRETTY_PRINT is true', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('production') // NODE_ENV
        .mockReturnValueOnce('true'); // LOG_PRETTY_PRINT

      const result = shouldUsePrettyPrint(mockConfigService as ConfigService);
      expect(result).toBe(true);
    });

    it('should return false when LOG_PRETTY_PRINT is false', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce('false'); // LOG_PRETTY_PRINT

      const result = shouldUsePrettyPrint(mockConfigService as ConfigService);
      expect(result).toBe(false);
    });

    it('should return true for development environment by default', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined); // LOG_PRETTY_PRINT

      const result = shouldUsePrettyPrint(mockConfigService as ConfigService);
      expect(result).toBe(true);
    });

    it('should return false for production environment by default', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('production') // NODE_ENV
        .mockReturnValueOnce(undefined); // LOG_PRETTY_PRINT

      const result = shouldUsePrettyPrint(mockConfigService as ConfigService);
      expect(result).toBe(false);
    });
  });

  describe('pinoLoggerConfig', () => {
    beforeEach(() => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        const values: Record<string, string | undefined> = {
          NODE_ENV: 'development',
          LOG_LEVEL: undefined,
          LOG_PRETTY_PRINT: undefined,
          SERVICE_NAME: 'test-service',
        };
        return values[key] ?? defaultValue;
      });
    });

    it('should return valid pino configuration', () => {
      const config = pinoLoggerConfig(mockConfigService as ConfigService);

      expect(config).toBeDefined();
      expect(config.pinoHttp).toBeDefined();
    });

    it('should set correct log level', () => {
      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      expect(pinoHttp.level).toBe('debug');
    });

    it('should configure redaction paths', () => {
      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      expect(pinoHttp.redact).toBeDefined();
      expect(pinoHttp.redact!.censor).toBe('[REDACTED]');
      expect(pinoHttp.redact!.paths).toContain('req.headers.authorization');
    });

    it('should include custom serializers', () => {
      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      expect(pinoHttp.serializers).toBeDefined();
      expect(pinoHttp.serializers!.req).toBeDefined();
      expect(pinoHttp.serializers!.res).toBeDefined();
      expect(pinoHttp.serializers!.err).toBeDefined();
    });

    it('should configure genReqId function', () => {
      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      expect(pinoHttp.genReqId).toBeDefined();
      expect(typeof pinoHttp.genReqId).toBe('function');
    });

    it('should configure pretty print transport for development', () => {
      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      expect(pinoHttp.transport).toBeDefined();
      expect(pinoHttp.transport!.target).toBe('pino-pretty');
    });

    it('should not configure transport for production', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        const values: Record<string, string | undefined> = {
          NODE_ENV: 'production',
          LOG_LEVEL: undefined,
          LOG_PRETTY_PRINT: undefined,
          SERVICE_NAME: 'test-service',
        };
        return values[key] ?? defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      expect(pinoHttp.transport).toBeUndefined();
    });

    it('should configure base context with service name', () => {
      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      expect(pinoHttp.base!.service).toBe('test-service');
    });
  });

  describe('createLogContext', () => {
    it('should pass through safe fields', () => {
      const context = {
        userId: 'user-123',
        action: 'login',
        timestamp: Date.now(),
      };

      const result = createLogContext(context);

      expect(result.userId).toBe('user-123');
      expect(result.action).toBe('login');
      expect(result.timestamp).toBe(context.timestamp);
    });

    it('should redact password fields', () => {
      const context = {
        userId: 'user-123',
        password: 'secret123',
        newPassword: 'newsecret',
      };

      const result = createLogContext(context);

      expect(result.userId).toBe('user-123');
      expect(result.password).toBe('[REDACTED]');
      expect(result.newPassword).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      const context = {
        action: 'auth',
        token: 'jwt-token',
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
      };

      const result = createLogContext(context);

      expect(result.action).toBe('auth');
      expect(result.token).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
    });

    it('should redact PCI data fields', () => {
      const context = {
        paymentId: 'pay-123',
        cardNumber: '4111111111111111',
        cvv: '123',
        accountNumber: '123456789',
      };

      const result = createLogContext(context);

      expect(result.paymentId).toBe('pay-123');
      expect(result.cardNumber).toBe('[REDACTED]');
      expect(result.cvv).toBe('[REDACTED]');
      expect(result.accountNumber).toBe('[REDACTED]');
    });

    it('should redact PII fields', () => {
      const context = {
        customerId: 'cust-123',
        ssn: '123-45-6789',
        taxId: '12-3456789',
        dateOfBirth: '1990-01-01',
      };

      const result = createLogContext(context);

      expect(result.customerId).toBe('cust-123');
      expect(result.ssn).toBe('[REDACTED]');
      expect(result.taxId).toBe('[REDACTED]');
      expect(result.dateOfBirth).toBe('[REDACTED]');
    });

    it('should handle case-insensitive field matching', () => {
      const context = {
        PASSWORD: 'secret',
        Token: 'jwt',
        CardNumber: '4111111111111111',
      };

      const result = createLogContext(context);

      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.Token).toBe('[REDACTED]');
      expect(result.CardNumber).toBe('[REDACTED]');
    });

    it('should recursively redact nested objects', () => {
      const context = {
        user: {
          id: 'user-123',
          password: 'secret',
          profile: {
            ssn: '123-45-6789',
            name: 'John Doe',
          },
        },
      };

      const result = createLogContext(context);

      expect((result.user as any).id).toBe('user-123');
      expect((result.user as any).password).toBe('[REDACTED]');
      expect((result.user as any).profile.ssn).toBe('[REDACTED]');
      expect((result.user as any).profile.name).toBe('John Doe');
    });

    it('should handle null values', () => {
      const context = {
        userId: null,
        password: null,
      };

      const result = createLogContext(context);

      expect(result.userId).toBeNull();
      expect(result.password).toBe('[REDACTED]');
    });

    it('should handle empty object', () => {
      const context = {};
      const result = createLogContext(context);
      expect(result).toEqual({});
    });
  });

  describe('genReqId function', () => {
    it('should use existing x-request-id header', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      const genReqId = pinoHttp.genReqId!;

      const mockReq = {
        headers: { 'x-request-id': 'existing-id' },
      };
      const mockRes = {
        setHeader: jest.fn(),
      };

      const result = genReqId(mockReq as any, mockRes as any);

      expect(result).toBe('existing-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', 'existing-id');
    });

    it('should use existing x-correlation-id header', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      const genReqId = pinoHttp.genReqId!;

      const mockReq = {
        headers: { 'x-correlation-id': 'correlation-id' },
      };
      const mockRes = {
        setHeader: jest.fn(),
      };

      const result = genReqId(mockReq as any, mockRes as any);

      expect(result).toBe('correlation-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', 'correlation-id');
    });

    it('should generate new UUID when no request ID exists', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      const genReqId = pinoHttp.genReqId!;

      const mockReq = {
        headers: {},
      };
      const mockRes = {
        setHeader: jest.fn(),
      };

      const result = genReqId(mockReq as any, mockRes as any);

      // Should be a valid UUID format
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', result);
    });
  });

  describe('customLogLevel function', () => {
    it('should return error for 5xx status codes', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      const customLogLevel = pinoHttp.customLogLevel!;

      const result = customLogLevel({} as any, { statusCode: 500 } as any, undefined as any);
      expect(result).toBe('error');

      const result2 = customLogLevel({} as any, { statusCode: 503 } as any, undefined as any);
      expect(result2).toBe('error');
    });

    it('should return error when there is an error object', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      const customLogLevel = pinoHttp.customLogLevel!;

      const result = customLogLevel({} as any, { statusCode: 200 } as any, new Error('test') as any);
      expect(result).toBe('error');
    });

    it('should return warn for 4xx status codes', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      const customLogLevel = pinoHttp.customLogLevel!;

      const result = customLogLevel({} as any, { statusCode: 400 } as any, undefined as any);
      expect(result).toBe('warn');

      const result2 = customLogLevel({} as any, { statusCode: 404 } as any, undefined as any);
      expect(result2).toBe('warn');
    });

    it('should return info for 2xx and 3xx status codes', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const config = pinoLoggerConfig(mockConfigService as ConfigService);
      const pinoHttp = config.pinoHttp as PinoHttpOptions;
      const customLogLevel = pinoHttp.customLogLevel!;

      const result = customLogLevel({} as any, { statusCode: 200 } as any, undefined as any);
      expect(result).toBe('info');

      const result2 = customLogLevel({} as any, { statusCode: 201 } as any, undefined as any);
      expect(result2).toBe('info');

      const result3 = customLogLevel({} as any, { statusCode: 304 } as any, undefined as any);
      expect(result3).toBe('info');
    });
  });
});
