import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HmacService } from './hmac.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HmacAlgorithm, HmacErrorCode } from './hmac.types';

describe('HmacService', () => {
  let service: HmacService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const TEST_SECRET_KEY = 'test-secret-key-32-characters!!!';

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'HMAC_SECRET_KEY') return TEST_SECRET_KEY;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    } as any;

    mockPrismaService = {
      company: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HmacService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HmacService>(HmacService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize with platform secret key', async () => {
      const status = service.getPlatformKeyStatus();
      expect(status.configured).toBe(true);
    });

    it('should handle missing secret key gracefully', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HmacService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: PrismaService, useValue: mockPrismaService },
        ],
      }).compile();

      const newService = module.get<HmacService>(HmacService);
      await newService.onModuleInit();

      expect(newService.isConfigured()).toBe(false);
    });
  });

  describe('generateSignature', () => {
    it('should generate consistent signatures for same data', () => {
      const data = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp: '1704067200',
      };

      const sig1 = service.generateSignature(data, TEST_SECRET_KEY);
      const sig2 = service.generateSignature(data, TEST_SECRET_KEY);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should generate different signatures for different data', () => {
      const data1 = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value1"}',
        timestamp: '1704067200',
      };

      const data2 = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value2"}',
        timestamp: '1704067200',
      };

      const sig1 = service.generateSignature(data1, TEST_SECRET_KEY);
      const sig2 = service.generateSignature(data2, TEST_SECRET_KEY);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures with different keys', () => {
      const data = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp: '1704067200',
      };

      const sig1 = service.generateSignature(data, 'key1');
      const sig2 = service.generateSignature(data, 'key2');

      expect(sig1).not.toBe(sig2);
    });

    it('should support SHA512 algorithm', () => {
      const data = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp: '1704067200',
      };

      const sig256 = service.generateSignature(data, TEST_SECRET_KEY, HmacAlgorithm.SHA256);
      const sig512 = service.generateSignature(data, TEST_SECRET_KEY, HmacAlgorithm.SHA512);

      expect(sig256).toMatch(/^[a-f0-9]{64}$/); // SHA256
      expect(sig512).toMatch(/^[a-f0-9]{128}$/); // SHA512
    });

    it('should handle empty body', () => {
      const data = {
        method: 'GET',
        path: '/api/test',
        body: '',
        timestamp: '1704067200',
      };

      const signature = service.generateSignature(data, TEST_SECRET_KEY);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const data = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp,
      };

      const signature = service.generateSignature(data, TEST_SECRET_KEY);
      const result = await service.verifySignature(data, signature);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const data = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp,
      };

      const result = await service.verifySignature(data, 'invalid-signature');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.INVALID_SIGNATURE);
    });

    it('should reject tampered body', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const originalData = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp,
      };

      const signature = service.generateSignature(originalData, TEST_SECRET_KEY);

      const tamperedData = {
        ...originalData,
        body: '{"key":"tampered"}',
      };

      const result = await service.verifySignature(tamperedData, signature);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.INVALID_SIGNATURE);
    });

    it('should reject tampered method', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const originalData = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp,
      };

      const signature = service.generateSignature(originalData, TEST_SECRET_KEY);

      const tamperedData = {
        ...originalData,
        method: 'PUT',
      };

      const result = await service.verifySignature(tamperedData, signature);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.INVALID_SIGNATURE);
    });

    it('should reject tampered path', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const originalData = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp,
      };

      const signature = service.generateSignature(originalData, TEST_SECRET_KEY);

      const tamperedData = {
        ...originalData,
        path: '/api/admin',
      };

      const result = await service.verifySignature(tamperedData, signature);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.INVALID_SIGNATURE);
    });
  });

  describe('validateTimestamp', () => {
    it('should accept current timestamp', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const result = service.validateTimestamp(timestamp, 300);

      expect(result.valid).toBe(true);
    });

    it('should accept timestamp within drift tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000 - 60).toString(); // 1 minute ago
      const result = service.validateTimestamp(timestamp, 300);

      expect(result.valid).toBe(true);
    });

    it('should reject expired timestamp', () => {
      const timestamp = Math.floor(Date.now() / 1000 - 600).toString(); // 10 minutes ago
      const result = service.validateTimestamp(timestamp, 300);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.TIMESTAMP_EXPIRED);
    });

    it('should reject future timestamp beyond tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000 + 600).toString(); // 10 minutes in future
      const result = service.validateTimestamp(timestamp, 300);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.TIMESTAMP_EXPIRED);
    });

    it('should reject invalid timestamp format', () => {
      const result = service.validateTimestamp('not-a-number', 300);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.INVALID_TIMESTAMP);
    });

    it('should respect custom drift tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000 - 30).toString(); // 30 seconds ago

      const strictResult = service.validateTimestamp(timestamp, 10); // 10 second tolerance
      expect(strictResult.valid).toBe(false);

      const lenientResult = service.validateTimestamp(timestamp, 60); // 60 second tolerance
      expect(lenientResult.valid).toBe(true);
    });
  });

  describe('getSecretKey', () => {
    it('should return platform key when no company ID', async () => {
      const key = await service.getSecretKey();
      expect(key).toBe(TEST_SECRET_KEY);
    });

    it('should return company key when available', async () => {
      const companyKey = 'company-specific-secret-key!!!!!';
      mockPrismaService.company.findUnique = jest.fn().mockResolvedValue({
        settings: { hmacSecretKey: companyKey },
      });

      const key = await service.getSecretKey('company-123');
      expect(key).toBe(companyKey);
    });

    it('should fall back to platform key when company has no key', async () => {
      mockPrismaService.company.findUnique = jest.fn().mockResolvedValue({
        settings: {},
      });

      const key = await service.getSecretKey('company-123');
      expect(key).toBe(TEST_SECRET_KEY);
    });

    it('should fall back to platform key on database error', async () => {
      mockPrismaService.company.findUnique = jest.fn().mockRejectedValue(new Error('DB error'));

      const key = await service.getSecretKey('company-123');
      expect(key).toBe(TEST_SECRET_KEY);
    });
  });

  describe('replay attack prevention', () => {
    it('should reject old valid signature (replay attack)', async () => {
      // Create a signature with old timestamp
      const oldTimestamp = Math.floor(Date.now() / 1000 - 400).toString(); // 6+ minutes ago
      const data = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp: oldTimestamp,
      };

      const signature = service.generateSignature(data, TEST_SECRET_KEY);

      // Try to use the valid signature with the old timestamp
      const result = await service.verifySignature(data, signature);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(HmacErrorCode.TIMESTAMP_EXPIRED);
    });
  });

  describe('case sensitivity', () => {
    it('should be case-insensitive for method', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const dataUpper = {
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp,
      };

      const dataLower = {
        method: 'post',
        path: '/api/test',
        body: '{"key":"value"}',
        timestamp,
      };

      const sigUpper = service.generateSignature(dataUpper, TEST_SECRET_KEY);
      const sigLower = service.generateSignature(dataLower, TEST_SECRET_KEY);

      // Both should produce the same signature (method is normalized to uppercase)
      expect(sigUpper).toBe(sigLower);
    });
  });
});
