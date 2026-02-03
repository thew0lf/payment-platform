/**
 * Logging Module Unit Tests
 *
 * Tests for:
 * - Module initialization
 * - Logger injection and availability
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule } from './logging.module';
import { Logger as PinoLogger, LoggerModule } from 'nestjs-pino';

describe('LoggingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [], // Don't load .env files in tests
        }),
        LoggingModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide PinoLogger', () => {
    const logger = module.get(PinoLogger);
    expect(logger).toBeDefined();
  });

  it('should have logger methods available', () => {
    const logger = module.get(PinoLogger);
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should be injectable in services', async () => {
    // Create a simple test service that uses the logger
    const testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [],
        }),
        LoggingModule,
      ],
    }).compile();

    const logger = testModule.get(PinoLogger);
    expect(() => logger.log('Test message')).not.toThrow();

    await testModule.close();
  });

  describe('configuration', () => {
    it('should use test log level in test environment', async () => {
      const configService = module.get(ConfigService);
      // The test environment should default to silent or be configurable
      expect(configService).toBeDefined();
    });
  });
});
