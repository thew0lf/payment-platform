/**
 * Pino Logger Configuration
 *
 * Structured JSON logging configuration for production (Loki-compatible)
 * and pretty-printed output for development.
 *
 * SOC2 Compliance - Redacted fields:
 * - Authorization headers
 * - Cookie headers
 * - Password fields in request body
 * - Token fields in request body
 * - Card number fields in request body
 * - SSN/Tax ID fields in request body
 *
 * Request Context:
 * - requestId: Unique identifier for distributed tracing
 * - method: HTTP method
 * - path: Request URL path
 * - userId: Authenticated user ID (when available)
 */
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

/**
 * Sensitive fields that should NEVER be logged (SOC2 compliance)
 */
export const REDACTED_FIELDS = [
  // Authentication & Authorization
  'password',
  'newPassword',
  'currentPassword',
  'oldPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'resetToken',
  'verificationToken',
  'apiKey',
  'secret',
  'secretKey',
  'privateKey',
  'clientSecret',

  // Payment Card Industry (PCI) data
  'cardNumber',
  'cvv',
  'cvc',
  'securityCode',
  'pan',
  'accountNumber',
  'routingNumber',

  // Personal Identifiable Information (PII)
  'ssn',
  'socialSecurityNumber',
  'taxId',
  'ein',
  'dateOfBirth',
  'dob',

  // Headers
  'authorization',
  'cookie',
  'x-auth-token',
];

/**
 * Header paths to redact in request logs
 */
export const REDACTED_HEADER_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-auth-token"]',
];

/**
 * Generate redaction paths for request body fields
 */
export function generateRedactionPaths(): string[] {
  const paths: string[] = [...REDACTED_HEADER_PATHS];

  // Add request body field paths
  REDACTED_FIELDS.forEach((field) => {
    paths.push(`req.body.${field}`);
    paths.push(`req.body.*.${field}`);
    paths.push(`*.${field}`);
  });

  return paths;
}

/**
 * Custom serializers to ensure no sensitive data leaks
 */
export const customSerializers = {
  req: (req: IncomingMessage & { id?: string; raw?: { body?: unknown } }) => {
    return {
      id: req.id,
      method: req.method,
      url: req.url,
      // Only log safe headers
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-request-id': req.headers['x-request-id'],
        host: req.headers.host,
        origin: req.headers.origin,
      },
    };
  },
  res: (res: { statusCode: number }) => {
    return {
      statusCode: res.statusCode,
    };
  },
  err: (err: Error & { statusCode?: number; code?: string }) => {
    return {
      type: err.constructor.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      code: err.code,
    };
  },
};

/**
 * Get log level based on environment
 */
export function getLogLevel(configService: ConfigService): string {
  const env = configService.get<string>('NODE_ENV', 'development');
  const configuredLevel = configService.get<string>('LOG_LEVEL');

  if (configuredLevel) {
    return configuredLevel;
  }

  switch (env) {
    case 'production':
      return 'info';
    case 'test':
      return 'silent';
    case 'development':
    default:
      return 'debug';
  }
}

/**
 * Check if pretty printing should be enabled
 */
export function shouldUsePrettyPrint(configService: ConfigService): boolean {
  const env = configService.get<string>('NODE_ENV', 'development');
  const prettyPrint = configService.get<string>('LOG_PRETTY_PRINT');

  if (prettyPrint !== undefined) {
    return prettyPrint === 'true';
  }

  // Pretty print in development, JSON in production
  return env === 'development';
}

/**
 * Main Pino configuration factory
 */
export function pinoLoggerConfig(configService: ConfigService): Params {
  const level = getLogLevel(configService);
  const usePrettyPrint = shouldUsePrettyPrint(configService);
  const serviceName = configService.get<string>(
    'SERVICE_NAME',
    'payment-platform-api',
  );
  const env = configService.get<string>('NODE_ENV', 'development');

  return {
    pinoHttp: {
      level,
      // Generate request ID for distributed tracing
      genReqId: (req, res) => {
        const existingId =
          req.headers['x-request-id'] ||
          req.headers['x-correlation-id'] ||
          (req as any).id;
        if (existingId) {
          res.setHeader('x-request-id', existingId.toString());
          return existingId.toString();
        }
        const newId = randomUUID();
        res.setHeader('x-request-id', newId);
        return newId;
      },
      // Custom serializers for safe logging
      serializers: customSerializers,
      // Redact sensitive fields
      redact: {
        paths: generateRedactionPaths(),
        censor: '[REDACTED]',
      },
      // Custom log level assignment
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      // Add custom props to each log entry
      customProps: (req) => ({
        service: serviceName,
        environment: env,
        requestId: (req as any).id,
      }),
      // Customize success and error messages
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} completed`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} errored: ${err.message}`;
      },
      // Only log completed requests
      autoLogging: {
        ignore: (req) => {
          // Skip health check endpoint from access logs
          return req.url === '/health' || req.url === '/api/health';
        },
      },
      // Transport configuration for pretty printing
      transport: usePrettyPrint
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
              messageFormat:
                '{levelLabel} - {if requestId}[{requestId}] {end}{msg}',
            },
          }
        : undefined,
      // Base context for all logs (Loki labels)
      base: {
        service: serviceName,
        env: env,
        pid: process.pid,
      },
      // Timestamp format
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    },
  };
}

/**
 * Helper function to create a child logger context
 * Use this when you need to add context to logs in services
 */
export function createLogContext(context: Record<string, unknown>): Record<string, unknown> {
  // Filter out any sensitive fields from the context
  const safeContext: Record<string, unknown> = {};
  const sensitiveFieldsLower = REDACTED_FIELDS.map((f) => f.toLowerCase());

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveFieldsLower.includes(key.toLowerCase())) {
      safeContext[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively filter nested objects
      safeContext[key] = createLogContext(value as Record<string, unknown>);
    } else {
      safeContext[key] = value;
    }
  }

  return safeContext;
}
