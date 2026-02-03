/**
 * Logging Module
 *
 * Provides structured JSON logging with Pino for Loki/Grafana compatibility.
 * Supports request context injection (requestId, method, path) for distributed tracing.
 *
 * SOC2 Compliance:
 * - Never logs sensitive data (passwords, tokens, card numbers, PII)
 * - Uses redaction for request headers and body fields
 * - Configurable log levels based on environment
 */
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { pinoLoggerConfig } from './pino.config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => pinoLoggerConfig(configService),
    }),
  ],
})
export class LoggingModule {}
