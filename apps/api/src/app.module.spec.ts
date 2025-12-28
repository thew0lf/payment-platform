/**
 * Application Bootstrap Test
 *
 * This test validates that the NestJS application can bootstrap successfully,
 * catching dependency injection errors, missing providers, and circular dependencies
 * BEFORE deployment to production.
 *
 * These issues are NOT caught by unit tests because unit tests mock dependencies.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';

describe('AppModule Bootstrap', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  // Increase timeout for module compilation
  jest.setTimeout(60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should compile the application module without dependency injection errors', async () => {
    // This test will FAIL if:
    // - A provider is missing from a module
    // - A service is not exported from its module
    // - There are circular dependency issues
    // - Any @Injectable() decorator is missing

    try {
      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      expect(moduleRef).toBeDefined();
    } catch (error) {
      // Provide clear error message for debugging
      console.error('Module compilation failed:', error.message);
      throw new Error(
        `NestJS Module Compilation Failed!\n\n` +
        `This typically means:\n` +
        `1. A service is missing from providers[] in a module\n` +
        `2. A service is not exported from its source module\n` +
        `3. There's a circular dependency\n` +
        `4. An @Injectable() decorator is missing\n\n` +
        `Original error: ${error.message}`
      );
    }
  });

  it('should create the application instance', async () => {
    if (!moduleRef) {
      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
    }

    app = moduleRef.createNestApplication();
    await app.init();

    expect(app).toBeDefined();
  });

  it('should resolve ProductImportService with all dependencies', async () => {
    if (!moduleRef) {
      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
    }

    // This specifically tests the ProductImportService DI chain
    // which was the source of the RoastifyService missing error
    const productImportService = moduleRef.get('ProductImportService', { strict: false });

    // If this doesn't throw, the service and all its dependencies are properly configured
    expect(productImportService).toBeDefined();
  });

  it('should resolve all critical services', async () => {
    if (!moduleRef) {
      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
    }

    // List of critical services that must be resolvable
    const criticalServices = [
      'PrismaService',
      'AuthService',
      'UsersService',
      'CompaniesService',
      'ClientIntegrationService',
      'RoastifyService',
    ];

    for (const serviceName of criticalServices) {
      try {
        const service = moduleRef.get(serviceName, { strict: false });
        expect(service).toBeDefined();
      } catch (error) {
        throw new Error(`Failed to resolve ${serviceName}: ${error.message}`);
      }
    }
  });
});
