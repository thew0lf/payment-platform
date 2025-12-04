import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as crypto from 'crypto';

// Polyfill globalThis.crypto for Node.js 18 (required by some dependencies)
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto as Crypto;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get HTTP adapter for exception filter
  const httpAdapterHost = app.get(HttpAdapterHost);

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Security headers with helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Enable global validation with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  // Environment-based CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://dev.avnz.io:3000',
        'http://admin.dev.avnz.io:3002',
        'http://portal.dev.avnz.io:3003',
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:3003',
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix (exclude health endpoint for Docker healthchecks)
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  logger.log(`API Server running on http://api.dev.avnz.io:${port}`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  // Give the logger time to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

bootstrap();
